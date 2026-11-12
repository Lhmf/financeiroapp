"use server";

import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { revalidateFinance } from "@/lib/revalidate";
import { parseDateInput } from "@/lib/dates";
import {
  MAX_STATEMENT_FILE_BYTES,
  MAX_STATEMENT_PDF_PAGES,
  normalizeStatementText,
  type StatementImportResult,
  type StatementPdfTextResult,
} from "@/lib/statement";
import { extractPdfText } from "@/lib/statement-pdf";
import {
  statementImportSchema,
  validationError,
  type StatementImportInput,
} from "@/lib/validation";

const MARKER_PREFIX = "[extrato:";
const NOTE_FILE_NAME_LIMIT = 100;

type PreparedEntry = {
  transaction: StatementImportInput["transactions"][number];
  date: Date;
  marker: string;
};

function importMarkerFor({
  fileName,
  accountId,
  transaction,
}: {
  fileName: string;
  accountId: string;
  transaction: StatementImportInput["transactions"][number];
}): string {
  const payload = [
    fileName,
    accountId,
    transaction.sourceIndex,
    transaction.date,
    transaction.kind,
    transaction.amountCents,
    normalizeStatementText(transaction.description),
  ].join("|");
  const hash = createHash("sha1").update(payload).digest("hex").slice(0, 16);
  return `${MARKER_PREFIX}${hash}]`;
}

function extractMarker(notes: string | null): string | null {
  if (!notes) return null;
  const start = notes.indexOf(MARKER_PREFIX);
  if (start < 0) return null;
  const end = notes.indexOf("]", start);
  if (end < 0) return null;
  return notes.slice(start, end + 1);
}

function safeFileName(fileName: string): string {
  return fileName.replace(/["\r\n]/g, "'").slice(0, NOTE_FILE_NAME_LIMIT);
}

/**
 * Extrai o texto de um PDF no servidor. O cliente não envia o binário para o
 * banco: o texto volta apenas para montar a prévia local, que depois é revisada
 * e importada pela action `importStatement`.
 */
export async function extractStatementPdfText(
  formData: FormData,
): Promise<StatementPdfTextResult> {
  await requireUser();

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, error: "Selecione um arquivo PDF." };
  }
  if (file.size === 0) {
    return { ok: false, error: "O arquivo está vazio." };
  }
  if (file.size > MAX_STATEMENT_FILE_BYTES) {
    return { ok: false, error: "Arquivo muito grande. O limite é 5 MB." };
  }

  const buffer = await file.arrayBuffer();
  const head = new TextDecoder("latin1").decode(
    buffer.slice(0, Math.min(buffer.byteLength, 1024)),
  );
  if (!head.includes("%PDF-")) {
    return { ok: false, error: "O arquivo não parece ser um PDF válido." };
  }

  try {
    const text = await extractPdfText(buffer);
    if (!text.trim()) {
      return {
        ok: false,
        error:
          "O PDF não tem texto selecionável. Se ele for digitalizado, exporte o extrato em CSV ou OFX.",
      };
    }
    return { ok: true, text };
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "statement-pdf-too-many-pages"
    ) {
      return {
        ok: false,
        error: `O PDF tem mais de ${MAX_STATEMENT_PDF_PAGES} páginas. Envie um período menor.`,
      };
    }
    return {
      ok: false,
      error:
        "Não foi possível ler o PDF. Verifique se ele está protegido por senha ou exporte o extrato em CSV/OFX.",
    };
  }
}

/**
 * Importa a prévia revisada do extrato. Cada linha vira uma receita recebida
 * ou despesa paga; a conta, as categorias e o mês são validados por usuário.
 * O marcador em `notes` evita duplicar a mesma linha em reimportações.
 */
export async function importStatement(
  input: StatementImportInput,
): Promise<StatementImportResult> {
  const user = await requireUser();
  const parsed = statementImportSchema.safeParse(input);

  if (!parsed.success) {
    const validation = validationError(parsed.error);
    return {
      ok: false,
      error: validation.error ?? "Dados inválidos.",
      fieldErrors: validation.fieldErrors,
    };
  }

  const data = parsed.data;
  const account = await prisma.financialAccount.findFirst({
    where: {
      id: data.financialAccountId,
      userId: user.id,
      archived: false,
    },
    select: { id: true },
  });

  if (!account) {
    return { ok: false, error: "Selecione uma conta ativa." };
  }

  const prepared: PreparedEntry[] = [];
  const categoryIds = new Set<string>();

  for (const transaction of data.transactions) {
    const date = parseDateInput(transaction.date);
    if (!date) {
      return { ok: false, error: "Um lançamento tem data inválida." };
    }
    if (transaction.categoryId) categoryIds.add(transaction.categoryId);
    prepared.push({
      transaction,
      date,
      marker: importMarkerFor({
        fileName: data.fileName,
        accountId: account.id,
        transaction,
      }),
    });
  }

  const categories =
    categoryIds.size > 0
      ? await prisma.category.findMany({
          where: {
            userId: user.id,
            id: { in: [...categoryIds] },
          },
          select: { id: true, type: true },
        })
      : [];
  const categoryTypeMap = new Map(
    categories.map((category) => [category.id, category.type]),
  );

  for (const entry of prepared) {
    const categoryId = entry.transaction.categoryId;
    if (!categoryId) continue;

    const categoryType = categoryTypeMap.get(categoryId);
    if (!categoryType) {
      return {
        ok: false,
        error: "Uma categoria selecionada não existe mais. Revise a prévia.",
      };
    }

    const expectedType =
      entry.transaction.kind === "income" ? "INCOME" : "EXPENSE";
    if (categoryType !== expectedType) {
      return {
        ok: false,
        error: "A categoria não corresponde ao tipo do lançamento.",
      };
    }
  }

  const timestamps = prepared.map((entry) => entry.date.getTime());
  const minDate = new Date(Math.min(...timestamps));
  const maxDate = new Date(Math.max(...timestamps));

  const [existingIncomes, existingExpenses] = await Promise.all([
    prisma.income.findMany({
      where: {
        userId: user.id,
        financialAccountId: account.id,
        notes: { startsWith: MARKER_PREFIX },
        receivedDate: { gte: minDate, lte: maxDate },
      },
      select: { notes: true },
    }),
    prisma.expense.findMany({
      where: {
        userId: user.id,
        financialAccountId: account.id,
        notes: { startsWith: MARKER_PREFIX },
        paidDate: { gte: minDate, lte: maxDate },
      },
      select: { notes: true },
    }),
  ]);

  const existingMarkers = new Set<string>();
  for (const row of [...existingIncomes, ...existingExpenses]) {
    const marker = extractMarker(row.notes);
    if (marker) existingMarkers.add(marker);
  }

  const fileName = safeFileName(data.fileName);
  let importedIncomes = 0;
  let importedExpenses = 0;
  let skipped = 0;
  const operations: Array<
    | ReturnType<typeof prisma.income.create>
    | ReturnType<typeof prisma.expense.create>
  > = [];

  for (const entry of prepared) {
    if (existingMarkers.has(entry.marker)) {
      skipped += 1;
      continue;
    }
    existingMarkers.add(entry.marker);

    const transaction = entry.transaction;
    const note = `${entry.marker} Importado do extrato "${fileName}" (item ${transaction.sourceIndex}).`;

    if (transaction.kind === "income") {
      operations.push(
        prisma.income.create({
          data: {
            userId: user.id,
            description: transaction.description,
            amountCents: transaction.amountCents,
            categoryId: transaction.categoryId ?? null,
            expectedDate: entry.date,
            receivedDate: entry.date,
            financialAccountId: account.id,
            status: "RECEIVED",
            notes: note,
          },
        }),
      );
      importedIncomes += 1;
    } else {
      operations.push(
        prisma.expense.create({
          data: {
            userId: user.id,
            description: transaction.description,
            amountCents: transaction.amountCents,
            categoryId: transaction.categoryId ?? null,
            dueDate: entry.date,
            paidDate: entry.date,
            type: "VARIABLE",
            paymentMethod: "OTHER",
            financialAccountId: account.id,
            status: "PAID",
            notes: note,
          },
        }),
      );
      importedExpenses += 1;
    }
  }

  if (operations.length > 0) {
    try {
      await prisma.$transaction(operations);
    } catch {
      return {
        ok: false,
        error: "Não foi possível importar o extrato. Tente novamente.",
      };
    }
    revalidateFinance();
  }

  return {
    ok: true,
    importedIncomes,
    importedExpenses,
    skipped,
  };
}
