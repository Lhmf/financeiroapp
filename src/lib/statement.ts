import { parseDateInput, todayUTC, toDateInput } from "./dates";

/**
 * Leitura e normalização de extratos bancários em CSV, OFX e PDF.
 *
 * O parser é puro para poder ser testado sem banco e executado no navegador.
 * O PDF é convertido em texto por uma Server Action antes de chegar aqui; a
 * prévia continua sendo revisada antes da importação.
 *
 * Ele não grava nada: a prévia é revisada antes da Server Action importar.
 */

export const MAX_STATEMENT_ENTRIES = 500;
export const MAX_STATEMENT_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_STATEMENT_PDF_PAGES = 40;
const AMOUNT_LIMIT_CENTS = 9_999_999_999;
const MAX_WARNINGS = 6;

export type StatementEntryKind = "income" | "expense";
export type StatementPositiveMeans = "auto" | "income" | "expense";
export type StatementFormat = "csv" | "ofx" | "pdf";

export type ParsedStatementEntry = {
  /** Índice estável dentro do arquivo, usado na proteção contra reimportação. */
  sourceIndex: number;
  date: string;
  description: string;
  amountCents: number;
  kind: StatementEntryKind;
  isTransfer: boolean;
};

export type StatementParseResult = {
  format: StatementFormat;
  entries: ParsedStatementEntry[];
  warnings: string[];
};

export type StatementCategory = {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
};

export type ParseStatementOptions = {
  fallbackDate?: string;
  positiveMeans?: StatementPositiveMeans;
  maxEntries?: number;
  /** Quando informado, evita detectar o formato só pelo conteúdo. */
  format?: StatementFormat;
};

export type StatementPdfTextResult =
  | { ok: true; text: string }
  | { ok: false; error: string };

export type ParsedStatementAmount = {
  cents: number;
  sign: 1 | -1;
  explicitSign: boolean;
};

export type StatementImportResult =
  | {
      ok: true;
      importedIncomes: number;
      importedExpenses: number;
      skipped: number;
    }
  | {
      ok: false;
      error: string;
      fieldErrors?: Record<string, string[]>;
    };

type CategoryRule = {
  keywords: string[];
  category: string;
};

type CsvColumns = {
  date: number;
  description: number;
  amount?: number;
  debit?: number;
  credit?: number;
  type?: number;
};

const DATE_HEADERS = [
  "data",
  "date",
  "dt",
  "data_lancamento",
  "data_movimento",
  "data_transacao",
  "data_operacao",
  "data_do_movimento",
  "data_da_transacao",
  "data_do_lancamento",
  "data_vencimento",
  "data_da_operacao",
];

const DESCRIPTION_HEADERS = [
  "descricao",
  "description",
  "historico",
  "history",
  "lancamento",
  "memo",
  "titulo",
  "title",
  "detalhes",
  "detalhe",
  "estabelecimento",
  "nome",
  "name",
  "favorecido",
  "pagador",
  "recebedor",
  "comercio",
  "transaction",
  "transacao",
  "descricao_da_transacao",
  "descricao_do_lancamento",
  "historico_da_transacao",
];

const AMOUNT_HEADERS = [
  "valor",
  "amount",
  "montante",
  "value",
  "valor_transacao",
  "valor_lancamento",
  "valor_do_lancamento",
  "valor_da_transacao",
  "valor_da_operacao",
  "valor_do_movimento",
  "valor_total",
  "total",
];

const DEBIT_HEADERS = [
  "debito",
  "debit",
  "saida",
  "saidas",
  "valor_debito",
  "valor_saida",
  "valor_de_compra",
];

const CREDIT_HEADERS = [
  "credito",
  "credit",
  "entrada",
  "entradas",
  "valor_credito",
  "valor_entrada",
];

const TYPE_HEADERS = [
  "tipo",
  "type",
  "natureza",
  "operacao",
  "dc",
  "debito_credito",
  "credito_debito",
  "entrada_saida",
  "movimento",
  "lancamento_tipo",
  "tipo_de_transacao",
];

const INCOME_RULES: CategoryRule[] = [
  {
    keywords: ["salario", "folha de pagamento", "pagamento salario"],
    category: "Salário",
  },
  { keywords: ["comissao"], category: "Comissões" },
  { keywords: ["laudo"], category: "Laudos técnicos" },
  {
    keywords: [
      "servico",
      "servicos",
      "freelance",
      "consultoria",
      "honorario",
    ],
    category: "Serviços",
  },
];

const EXPENSE_RULES: CategoryRule[] = [
  {
    keywords: [
      "supermercado",
      "mercado",
      "padaria",
      "restaurante",
      "lanchonete",
      "ifood",
      "rappi",
      "uber eats",
      "acougue",
      "hortifruti",
      "pizza",
      "cafe",
      "padoca",
    ],
    category: "Alimentação",
  },
  {
    keywords: [
      "uber",
      "99",
      "taxi",
      "combustivel",
      "gasolina",
      "etanol",
      "posto shell",
      "posto ipiranga",
      "estacionamento",
      "pedagio",
      "onibus",
      "metro",
      "passagem",
    ],
    category: "Transporte",
  },
  {
    keywords: [
      "aluguel",
      "condominio",
      "energia",
      "luz",
      "agua",
      "gas",
      "internet",
      "telefone",
      "celular",
    ],
    category: "Moradia",
  },
  {
    keywords: [
      "farmacia",
      "drogaria",
      "medico",
      "hospital",
      "clinica",
      "dentista",
      "exame",
      "laboratorio",
      "plano de saude",
    ],
    category: "Saúde",
  },
  {
    keywords: [
      "escola",
      "faculdade",
      "curso",
      "mensalidade",
      "livraria",
      "livro",
    ],
    category: "Educação",
  },
  {
    keywords: [
      "netflix",
      "spotify",
      "cinema",
      "teatro",
      "show",
      "viagem",
      "hotel",
      "passagem aerea",
      "lazer",
      "jogo",
    ],
    category: "Lazer",
  },
  {
    keywords: [
      "fatura",
      "cartao de credito",
      "cartao credito",
      "emprestimo",
      "financiamento",
      "parcela",
      "divida",
    ],
    category: "Dívidas",
  },
  {
    keywords: [
      "imposto",
      "das",
      "icms",
      "iptu",
      "ipva",
      "taxa",
      "tributo",
      "inss",
    ],
    category: "Impostos",
  },
];

const TRANSFER_PATTERNS = [
  /\b(aplicacao|resgate)\b/,
  /\b(fatura|cartao de credito|cartao credito)\b/,
  /\b(saque|deposito|deposito em dinheiro)\b/,
  /\b(transferencia entre contas|transferencia propria|mesma titularidade|conta propria)\b/,
];

/** Remove acentos, normaliza caixa e espaços para comparações. */
export function normalizeStatementText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function safeFromCodePoint(code: number): string {
  if (!Number.isInteger(code) || code < 0 || code > 0x10ffff) return "";
  return String.fromCodePoint(code);
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_match: string, code: string) =>
      safeFromCodePoint(Number(code)),
    )
    .replace(/&#x([0-9a-f]+);/gi, (_match: string, code: string) =>
      safeFromCodePoint(parseInt(code, 16)),
    )
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'");
}

/**
 * Decodifica o arquivo tentando UTF-8 e caindo para Windows-1252 quando
 * necessário. Muitos extratos OFX brasileiros ainda usam 1252.
 */
export function decodeStatementBuffer(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);

  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(bytes.subarray(2));
  }
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder("utf-16be").decode(bytes.subarray(2));
  }
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder("utf-8").decode(bytes.subarray(3));
  }

  const head = new TextDecoder("windows-1252").decode(
    bytes.subarray(0, Math.min(bytes.length, 512)),
  );
  const charset = /CHARSET\s*:\s*([A-Za-z0-9_-]+)/i.exec(head)?.[1]?.toLowerCase();

  if (
    charset === "1252" ||
    charset === "windows-1252" ||
    charset === "iso-8859-1" ||
    charset === "latin1"
  ) {
    return new TextDecoder("windows-1252").decode(bytes);
  }
  if (charset === "utf-8" || charset === "utf8" || charset === "65001") {
    return new TextDecoder("utf-8").decode(bytes);
  }

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

/**
 * Converte um valor monetário de extrato em centavos e sinal.
 * Aceita "1.234,56", "1,234.56", "-45,90", "45,90 D", "(120,00)" e "R$ 10,00".
 */
export function parseStatementAmount(raw: string): ParsedStatementAmount | null {
  let value = raw
    .replace(/\u00a0/g, " ")
    .trim()
    .replace(/R\$\s?/gi, "")
    .replace(/\bBRL\b/gi, "")
    .trim();

  if (!value) return null;

  let sign: 1 | -1 = 1;
  let explicitSign = false;

  if (/^\(.*\)$/.test(value)) {
    sign = -1;
    explicitSign = true;
    value = value.slice(1, -1).trim();
  }

  const trailingDc = /^([\d.,\s]+?)\s*([DC])$/i.exec(value);
  const leadingDc = /^([DC])\s*([\d.,\s]+)$/i.exec(value);
  if (trailingDc) {
    value = trailingDc[1].trim();
    sign = trailingDc[2].toUpperCase() === "D" ? -1 : 1;
    explicitSign = true;
  } else if (leadingDc) {
    value = leadingDc[2].trim();
    sign = leadingDc[1].toUpperCase() === "D" ? -1 : 1;
    explicitSign = true;
  }

  if (value.startsWith("-")) {
    sign = -1;
    explicitSign = true;
    value = value.slice(1);
  } else if (value.startsWith("+")) {
    explicitSign = true;
    value = value.slice(1);
  }
  if (value.endsWith("-")) {
    sign = -1;
    explicitSign = true;
    value = value.slice(0, -1);
  }

  if (/[A-Za-z]/.test(value)) return null;
  value = value.replace(/[^\d.,]/g, "");
  if (!value) return null;

  const normalized = normalizeAmountSeparators(value);
  if (!normalized) return null;

  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const cents = Math.round(amount * 100);
  if (cents <= 0 || cents > AMOUNT_LIMIT_CENTS) return null;

  return { cents, sign, explicitSign };
}

function normalizeAmountSeparators(value: string): string | null {
  const lastComma = value.lastIndexOf(",");
  const lastDot = value.lastIndexOf(".");

  if (lastComma === -1 && lastDot === -1) {
    return /^\d+$/.test(value) ? value : null;
  }

  if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) {
      return value.replace(/\./g, "").replace(/,/g, ".");
    }
    return value.replace(/,/g, "");
  }

  if (lastComma !== -1) {
    if (/^\d{1,3}(,\d{3})+$/.test(value)) {
      return value.replace(/,/g, "");
    }
    return value.replace(/,/g, ".");
  }

  // Apenas ponto: "1.234" é milhar no formato brasileiro; "45.90" é decimal.
  if (/^\d{1,3}(\.\d{3})+$/.test(value)) {
    return value.replace(/\./g, "");
  }
  return value;
}

/** Converte datas comuns de extratos em "YYYY-MM-DD". */
export function parseStatementDate(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;

  const compact = /^(\d{4})(\d{2})(\d{2})/.exec(value);
  if (compact) {
    const key = `${compact[1]}-${compact[2]}-${compact[3]}`;
    return parseDateInput(key) ? key : null;
  }

  const candidate = value.split(/[T\s]/)[0];
  const yearFirst = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(candidate);
  if (yearFirst) {
    const key = `${yearFirst[1]}-${yearFirst[2].padStart(2, "0")}-${yearFirst[3].padStart(2, "0")}`;
    return parseDateInput(key) ? key : null;
  }

  const dayFirst = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/.exec(candidate);
  if (!dayFirst) return null;

  const first = Number(dayFirst[1]);
  const second = Number(dayFirst[2]);
  const yearValue = Number(dayFirst[3]);
  const year =
    yearValue < 100 ? (yearValue < 70 ? 2000 + yearValue : 1900 + yearValue) : yearValue;

  let day = first;
  let month = second;
  if (first > 12 && second <= 12) {
    day = first;
    month = second;
  } else if (second > 12 && first <= 12) {
    day = second;
    month = first;
  }

  const key = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return parseDateInput(key) ? key : null;
}

/** Dica de transferência/aplicação/fatura para desmarcar na prévia. */
export function isTransferDescription(
  description: string,
  typeText = "",
): boolean {
  const type = normalizeStatementText(typeText);
  if (/\b(xfer|transfer|transferencia)\b/.test(type)) return true;

  const text = normalizeStatementText(description);
  return TRANSFER_PATTERNS.some((pattern) => pattern.test(text));
}

export function cleanStatementDescription(value: string): string {
  const text = decodeHtmlEntities(value).replace(/\s+/g, " ").trim();
  return text.slice(0, 120) || "Lançamento importado";
}

/**
 * Sugere uma categoria padrão pelo texto do lançamento. Se o usuário renomeou
 * a categoria, a função devolve null e a prévia permite escolher manualmente.
 */
export function suggestCategoryId(
  entry: Pick<ParsedStatementEntry, "description" | "kind">,
  categories: readonly StatementCategory[],
): string | null {
  const type = entry.kind === "income" ? "INCOME" : "EXPENSE";
  const text = normalizeStatementText(entry.description);
  const rules = entry.kind === "income" ? INCOME_RULES : EXPENSE_RULES;
  const fallbackName =
    entry.kind === "income" ? "Outras receitas" : "Outras despesas";

  const suggestedName =
    rules.find((rule) =>
      rule.keywords.some((keyword) =>
        text.includes(normalizeStatementText(keyword)),
      ),
    )?.category ?? fallbackName;

  const target = normalizeStatementText(suggestedName);
  return (
    categories.find(
      (category) =>
        category.type === type &&
        normalizeStatementText(category.name) === target,
    )?.id ?? null
  );
}

/** Lê o arquivo e decide entre CSV, OFX e PDF pelo conteúdo/extensão. */
export function parseStatementFile(
  content: string,
  fileName: string,
  options: ParseStatementOptions = {},
): StatementParseResult {
  const fallbackDate =
    options.fallbackDate && parseDateInput(options.fallbackDate)
      ? options.fallbackDate
      : toDateInput(todayUTC());
  const positiveMeans = options.positiveMeans ?? "auto";
  const maxEntries = Math.max(
    1,
    Math.min(options.maxEntries ?? MAX_STATEMENT_ENTRIES, MAX_STATEMENT_ENTRIES),
  );

  const pdfExtension = /\.pdf$/i.test(fileName.trim());
  if (options.format === "pdf" || pdfExtension) {
    return {
      format: "pdf",
      ...parsePdf(content, fallbackDate, positiveMeans, maxEntries),
    };
  }

  const looksLikeOfx =
    /<OFX[\s>]/i.test(content) || /<STMTTRN\b/i.test(content);
  const ofxExtension = /\.(ofx|qfx)$/i.test(fileName);

  if (options.format === "ofx" || looksLikeOfx || ofxExtension) {
    return {
      format: "ofx",
      ...parseOfx(content, fallbackDate, maxEntries),
    };
  }

  return {
    format: "csv",
    ...parseCsv(content, fallbackDate, positiveMeans, maxEntries),
  };
}

function parseCsv(
  content: string,
  fallbackDate: string,
  positiveMeans: StatementPositiveMeans,
  maxEntries: number,
): { entries: ParsedStatementEntry[]; warnings: string[] } {
  const warnings: string[] = [];
  const delimiter = detectDelimiter(content);
  const rows = parseDelimited(content, delimiter);

  if (rows.length === 0) {
    return { entries: [], warnings: ["O arquivo está vazio."] };
  }

  let headerIndex = -1;
  let columns: CsvColumns | null = null;
  const limit = Math.min(rows.length, 30);

  for (let index = 0; index < limit; index += 1) {
    const candidate = mapCsvHeader(rows[index]);
    if (candidate) {
      headerIndex = index;
      columns = candidate;
      break;
    }
  }

  if (!columns) {
    return {
      entries: [],
      warnings: [
        "Não encontramos as colunas de data, descrição e valor. Exporte o extrato em CSV com cabeçalho, por exemplo: Data;Descrição;Valor.",
      ],
    };
  }

  const entries: ParsedStatementEntry[] = [];
  let warnedAutoPositive = false;

  for (let index = headerIndex + 1; index < rows.length; index += 1) {
    if (entries.length >= maxEntries) {
      addWarning(
        warnings,
        `Limite de ${maxEntries} lançamentos por importação; os demais foram ignorados.`,
      );
      break;
    }

    const row = rows[index];
    const lineNumber = index + 1;
    const dateRaw = cellAt(row, columns.date);
    const date =
      columns.date >= 0 ? parseStatementDate(dateRaw) : fallbackDate;

    if (!date) {
      const amountRaw =
        columns.amount !== undefined
          ? cellAt(row, columns.amount)
          : `${cellAt(row, columns.debit)} ${cellAt(row, columns.credit)}`;
      if (dateRaw || amountRaw.trim()) {
        addWarning(
          warnings,
          `Linha ${lineNumber}: data inválida; lançamento ignorado.`,
        );
      }
      continue;
    }

    const description = cleanStatementDescription(
      cellAt(row, columns.description),
    );
    if (isSummaryDescription(description)) continue;

    const typeText = cellAt(row, columns.type).trim();
    let signedCents: number | null = null;

    if (columns.amount !== undefined) {
      const amountRaw = cellAt(row, columns.amount);
      if (!amountRaw) continue;

      const parsed = parseStatementAmount(amountRaw);
      if (!parsed) {
        addWarning(
          warnings,
          `Linha ${lineNumber}: valor inválido; lançamento ignorado.`,
        );
        continue;
      }

      let sign = parsed.sign;
      let explicit = parsed.explicitSign;

      if (!explicit) {
        const typeSign = signFromType(typeText);
        if (typeSign !== 0) {
          sign = typeSign;
          explicit = true;
        }
      }
      if (!explicit) {
        const descriptionSign = signFromDescription(description);
        if (descriptionSign !== 0) {
          sign = descriptionSign;
          explicit = true;
        }
      }
      if (!explicit) {
        if (positiveMeans === "expense") {
          sign = -1;
        } else if (positiveMeans === "income") {
          sign = 1;
        } else {
          sign = 1;
          if (!warnedAutoPositive) {
            addWarning(
              warnings,
              "Alguns valores positivos sem tipo foram tratados como entradas. Ajuste em “Valores positivos” se necessário.",
            );
            warnedAutoPositive = true;
          }
        }
      }

      signedCents = parsed.cents * sign;
    } else {
      const debit = parseStatementAmount(cellAt(row, columns.debit));
      const credit = parseStatementAmount(cellAt(row, columns.credit));
      const debitCents = debit?.cents ?? 0;
      const creditCents = credit?.cents ?? 0;

      if (debitCents === 0 && creditCents === 0) continue;

      if (debitCents > 0 && creditCents > 0) {
        signedCents = creditCents - debitCents;
        addWarning(
          warnings,
          `Linha ${lineNumber}: débito e crédito preenchidos; usado o valor líquido.`,
        );
      } else if (debitCents > 0) {
        signedCents = -debitCents;
      } else {
        signedCents = creditCents;
      }
    }

    if (!signedCents) continue;

    entries.push({
      sourceIndex: entries.length + 1,
      date,
      description,
      amountCents: Math.abs(signedCents),
      kind: signedCents < 0 ? "expense" : "income",
      isTransfer: isTransferDescription(description, typeText),
    });
  }

  if (entries.length === 0 && warnings.length === 0) {
    warnings.push("Nenhum lançamento válido encontrado no CSV.");
  }

  return { entries, warnings };
}

function parseOfx(
  content: string,
  fallbackDate: string,
  maxEntries: number,
): { entries: ParsedStatementEntry[]; warnings: string[] } {
  const warnings: string[] = [];
  const blocks = content.split(/<STMTTRN\b[^>]*>/i).slice(1);

  if (blocks.length === 0) {
    return {
      entries: [],
      warnings: ["Não encontramos transações OFX (<STMTTRN>) no arquivo."],
    };
  }

  const entries: ParsedStatementEntry[] = [];

  for (const block of blocks) {
    if (entries.length >= maxEntries) {
      addWarning(
        warnings,
        `Limite de ${maxEntries} lançamentos por importação; os demais foram ignorados.`,
      );
      break;
    }

    const typeText = ofxTag(block, "TRNTYPE");
    const dateRaw = ofxTag(block, "DTPOSTED") || ofxTag(block, "DTUSER");
    const parsedDate = dateRaw ? parseStatementDate(dateRaw) : null;
    if (dateRaw && !parsedDate) {
      addWarning(
        warnings,
        "Uma transação OFX tinha data inválida; foi usada a data de referência.",
      );
    }
    const date = parsedDate ?? fallbackDate;

    const parsedAmount = parseStatementAmount(ofxTag(block, "TRNAMT"));
    if (!parsedAmount) {
      addWarning(
        warnings,
        "Uma transação OFX sem valor válido foi ignorada.",
      );
      continue;
    }

    let sign = parsedAmount.sign;
    if (!parsedAmount.explicitSign) {
      const typeSign = signFromType(typeText);
      if (typeSign !== 0) sign = typeSign;
    }

    const description = cleanStatementDescription(
      ofxTag(block, "NAME") || ofxTag(block, "MEMO"),
    );

    entries.push({
      sourceIndex: entries.length + 1,
      date,
      description,
      amountCents: parsedAmount.cents,
      kind: sign < 0 ? "expense" : "income",
      isTransfer: isTransferDescription(description, typeText),
    });
  }

  if (entries.length === 0 && warnings.length === 0) {
    warnings.push("Nenhuma transação OFX válida encontrada.");
  }

  return { entries, warnings };
}

type PdfAmountMatch = {
  index: number;
  text: string;
  parsed: ParsedStatementAmount;
};

type PdfPendingEntry = {
  date: string;
  parts: string[];
};

const PDF_DATE_PREFIX =
  /^\s*(?:\d{4,10}\s+)?(\d{1,2}[/.-]\d{1,2}(?:[/.-]\d{2,4})?|\d{4}-\d{2}-\d{2})\b/;
const PDF_DATE_LIKE = /\b\d{1,4}[/.-]\d{1,2}(?:[/.-]\d{2,4})?\b/g;
const PDF_AMOUNT_PATTERN =
  /(?:[+-]\s*)?(?:R\$\s*)?[+-]?\s?(?:\d{1,3}(?:\.\d{3})+,\d{2}|\d{1,3}(?:,\d{3})+\.\d{2}|\d+,\d{2}|\d+\.\d{2})(?:\s*[DC])?-?/gi;

/**
 * PDFs são extraídos para texto antes de chegar ao parser. Como cada banco
 * desenha a tabela de um jeito, a leitura é heurística: procuramos uma data no
 * início da linha, acumulamos a descrição (inclusive em várias linhas) e
 * escolhemos o primeiro valor monetário depois dela. O saldo, quando aparece na
 * mesma linha, fica de fora.
 */
function parsePdf(
  content: string,
  fallbackDate: string,
  positiveMeans: StatementPositiveMeans,
  maxEntries: number,
): { entries: ParsedStatementEntry[]; warnings: string[] } {
  const warnings: string[] = [];
  const entries: ParsedStatementEntry[] = [];
  const lines = normalizePdfLines(content);
  let pending: PdfPendingEntry | null = null;
  let pendingWithoutAmount = 0;
  let invalidDates = 0;
  let ambiguous = 0;
  let limitWarned = false;
  const undated: Array<{ text: string }> = [];

  function warnLimit() {
    if (limitWarned) return;
    addWarning(
      warnings,
      `Limite de ${maxEntries} lançamentos por importação; os demais foram ignorados.`,
    );
    limitWarned = true;
  }

  function pushEntry(
    date: string,
    description: string,
    amount: PdfAmountMatch,
    lineText: string,
  ) {
    if (entries.length >= maxEntries) {
      warnLimit();
      return;
    }

    const cleaned = cleanPdfDescription(description);
    if (isSummaryDescription(cleaned)) return;

    let sign = amount.parsed.sign;
    let explicit = amount.parsed.explicitSign;

    if (!explicit) {
      const tail = lineText.slice(amount.index + amount.text.length);
      const typeSign = pdfSignMarker(tail) || pdfSignMarker(lineText);
      if (typeSign !== 0) {
        sign = typeSign;
        explicit = true;
      }
    }
    if (!explicit) {
      const descriptionSign = signFromDescription(cleaned);
      if (descriptionSign !== 0) {
        sign = descriptionSign;
        explicit = true;
      }
    }
    if (!explicit) {
      if (positiveMeans === "income") {
        sign = 1;
      } else if (positiveMeans === "expense") {
        sign = -1;
      } else {
        ambiguous += 1;
        return;
      }
    }

    entries.push({
      sourceIndex: entries.length + 1,
      date,
      description: cleanStatementDescription(cleaned),
      amountCents: amount.parsed.cents,
      kind: sign < 0 ? "expense" : "income",
      isTransfer: isTransferDescription(cleaned),
    });
  }

  for (let index = 0; index < lines.length; index += 1) {
    if (entries.length >= maxEntries) {
      warnLimit();
      break;
    }

    const line = lines[index];
    if (isPdfHeaderLine(line)) continue;

    const datePrefix = PDF_DATE_PREFIX.exec(line);
    if (datePrefix) {
      const date = parsePdfDate(datePrefix[1], fallbackDate);
      if (!date) {
        invalidDates += 1;
        if (pending) {
          pendingWithoutAmount += 1;
          pending = null;
        }
        continue;
      }

      if (pending) {
        pendingWithoutAmount += 1;
        pending = null;
      }

      const rest = line.slice(datePrefix[0].length).trim();
      const amounts = findPdfAmounts(rest);

      if (amounts.length === 0) {
        pending = { date, parts: rest ? [rest] : [] };
        continue;
      }

      const amount = amounts[0];
      const before = cleanPdfDescription(rest.slice(0, amount.index));
      let description = before;
      if (!before || /^[dc]$/i.test(before)) {
        const after = cleanPdfDescription(
          rest.slice(amount.index + amount.text.length),
        );
        if (/[A-Za-zÀ-ÿ]{2}/.test(after)) description = after;
      }

      pushEntry(date, description, amount, rest);
      continue;
    }

    const amounts = findPdfAmounts(line);

    if (!pending) {
      if (amounts.length > 0) undated.push({ text: line });
      continue;
    }

    if (amounts.length === 0) {
      const continuation = cleanPdfDescription(line);
      if (
        pending.parts.length >= 4 ||
        pending.parts.join(" ").length > 240
      ) {
        pendingWithoutAmount += 1;
        pending = null;
      } else if (continuation) {
        pending.parts.push(continuation);
      }
      continue;
    }

    const amount = amounts[0];
    const lineBefore = cleanPdfDescription(line.slice(0, amount.index));
    const description = [...pending.parts, lineBefore]
      .filter(Boolean)
      .join(" ");
    pushEntry(pending.date, description, amount, line);
    pending = null;
  }

  if (pending) pendingWithoutAmount += 1;

  if (pendingWithoutAmount > 0) {
    addWarning(
      warnings,
      `${pendingWithoutAmount} lançamento(s) sem valor foram ignorados.`,
    );
  }
  if (invalidDates > 0) {
    addWarning(
      warnings,
      `${invalidDates} linha(s) com data inválida foram ignoradas.`,
    );
  }
  if (ambiguous > 0) {
    addWarning(
      warnings,
      `${ambiguous} lançamento(s) sem sinal ou tipo foram ignorados. Em “Valores positivos”, escolha Entradas ou Saídas para importá-los.`,
    );
  }

  if (entries.length === 0 && undated.length > 0) {
    addWarning(
      warnings,
      "O PDF não trouxe datas legíveis; foi usada a data de referência do mês.",
    );

    for (const candidate of undated) {
      if (entries.length >= maxEntries) {
        warnLimit();
        break;
      }

      const amounts = findPdfAmounts(candidate.text);
      if (amounts.length === 0) continue;

      const amount = amounts[0];
      const before = cleanPdfDescription(candidate.text.slice(0, amount.index));
      let description = before;
      if (!before || /^[dc]$/i.test(before)) {
        const after = cleanPdfDescription(
          candidate.text.slice(amount.index + amount.text.length),
        );
        if (/[A-Za-zÀ-ÿ]{2}/.test(after)) description = after;
      }

      pushEntry(fallbackDate, description, amount, candidate.text);
    }
  }

  if (entries.length === 0) {
    warnings.unshift(
      "Não encontramos lançamentos no PDF. Verifique se o texto é selecionável; se o arquivo for digitalizado, exporte em CSV com cabeçalho (Data;Descrição;Valor).",
    );
  }

  return { entries, warnings };
}

function normalizePdfLines(content: string): string[] {
  return content
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter((line) => line.length > 0);
}

function maskPdfDateLike(value: string): string {
  return value.replace(
    new RegExp(PDF_DATE_LIKE.source, "g"),
    (match) => " ".repeat(match.length),
  );
}

function findPdfAmounts(value: string): PdfAmountMatch[] {
  const masked = maskPdfDateLike(value);
  const pattern = new RegExp(PDF_AMOUNT_PATTERN.source, "gi");
  const matches: PdfAmountMatch[] = [];
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(masked)) !== null) {
    const parsed = parseStatementAmount(match[0]);
    if (!parsed) continue;

    let adjusted = parsed;
    const before = value[match.index - 1];
    const after = value[match.index + match[0].length];
    if (before === "(" && after === ")") {
      adjusted = { ...parsed, sign: -1, explicitSign: true };
    }

    matches.push({ index: match.index, text: match[0], parsed: adjusted });
  }

  return matches;
}

function pdfSignMarker(value: string): 1 | -1 | 0 {
  const markers = value.match(/\b[DC]\b/gi);
  if (!markers) return 0;

  for (const marker of markers) {
    if (marker.toUpperCase() === "D") return -1;
  }
  for (const marker of markers) {
    if (marker.toUpperCase() === "C") return 1;
  }
  return 0;
}

function parsePdfDate(raw: string, fallbackDate: string): string | null {
  const full = parseStatementDate(raw);
  if (full) return full;

  const short = /^(\d{1,2})[/.-](\d{1,2})$/.exec(raw.trim());
  if (!short) return null;

  const first = Number(short[1]);
  const second = Number(short[2]);
  let day = first;
  let month = second;

  if (first > 12 && second <= 12) {
    day = first;
    month = second;
  } else if (second > 12 && first <= 12) {
    day = second;
    month = first;
  }

  const fallback = parseDateInput(fallbackDate) ?? todayUTC();
  const fallbackMonth = fallback.getUTCMonth() + 1;
  let year = fallback.getUTCFullYear();

  if (month - fallbackMonth > 6) year -= 1;
  else if (fallbackMonth - month > 6) year += 1;

  const key = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return parseDateInput(key) ? key : null;
}

function cleanPdfDescription(value: string): string {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/[|•·]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+[DC]$/i, "")
    .replace(/^[\s:;,\-–—]+/, "")
    .replace(/[\s:;,\-–—]+$/, "")
    .trim();
}

function isPdfHeaderLine(value: string): boolean {
  const text = normalizeStatementText(value);
  if (!text) return true;

  if (
    /^(data|date)\b/.test(text) &&
    /(descricao|historico|description|valor|amount|saldo)/.test(text)
  ) {
    return true;
  }

  return /^(extrato|resumo|total|saldo|conta corrente|agencia|periodo|pagina)\b/.test(
    text,
  );
}

function ofxTag(block: string, tag: string): string {
  const match = new RegExp(`<${tag}>([^<\\r\\n]*)`, "i").exec(block);
  return match?.[1] ? decodeHtmlEntities(match[1].trim()) : "";
}

function addWarning(warnings: string[], message: string) {
  if (warnings.length < MAX_WARNINGS) {
    warnings.push(message);
  } else if (warnings.length === MAX_WARNINGS) {
    warnings.push("Outros avisos foram omitidos.");
  }
}

function headerKey(value: string): string {
  return normalizeStatementText(value)
    .replace(/r\$/g, " ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function findColumn(headers: string[], aliases: readonly string[]): number {
  return headers.findIndex((header) => aliases.includes(header));
}

function mapCsvHeader(row: string[]): CsvColumns | null {
  const headers = row.map(headerKey);
  const date = findColumn(headers, DATE_HEADERS);
  const description = findColumn(headers, DESCRIPTION_HEADERS);
  const amount = findColumn(headers, AMOUNT_HEADERS);
  const debit = findColumn(headers, DEBIT_HEADERS);
  const credit = findColumn(headers, CREDIT_HEADERS);
  const type = findColumn(headers, TYPE_HEADERS);

  if (description < 0) return null;
  if (amount < 0 && debit < 0 && credit < 0) return null;

  return {
    date,
    description,
    amount: amount >= 0 ? amount : undefined,
    debit: debit >= 0 ? debit : undefined,
    credit: credit >= 0 ? credit : undefined,
    type: type >= 0 ? type : undefined,
  };
}

function detectDelimiter(content: string): string {
  const lines = content
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .slice(0, 30);
  const candidates = [";", ",", "\t", "|"];
  let best = { delimiter: ";", score: 0 };

  for (const delimiter of candidates) {
    const counts = lines
      .map((line) => countDelimiter(line, delimiter))
      .filter((count) => count > 0);
    if (counts.length === 0) continue;

    const score = counts.length * 100 + Math.min(...counts);
    if (score > best.score) best = { delimiter, score };
  }

  return best.delimiter;
}

function countDelimiter(line: string, delimiter: string): number {
  let count = 0;
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (!inQuotes && char === delimiter) {
      count += 1;
    }
  }

  return count;
}

function parseDelimited(content: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];

    if (inQuotes) {
      if (char === '"') {
        if (content[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(cell.trim());
      cell = "";
    } else if (char === "\r") {
      if (content[index + 1] === "\n") index += 1;
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = "";
    } else if (char === "\n") {
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  if (cell !== "" || row.length > 0) {
    row.push(cell.trim());
    rows.push(row);
  }

  return rows.filter((line) => line.some((value) => value !== ""));
}

function cellAt(row: string[], index: number | undefined): string {
  if (index === undefined || index < 0) return "";
  return row[index] ?? "";
}

function isSummaryDescription(description: string): boolean {
  const text = normalizeStatementText(description);
  return /^(saldo|resumo|extrato)\b/.test(text) || text === "total";
}

function signFromType(typeText: string): 1 | -1 | 0 {
  const text = normalizeStatementText(typeText);
  if (!text) return 0;

  const hasDebit =
    text === "d" ||
    text === "debito" ||
    text === "debit" ||
    text === "saida" ||
    text.includes("debito") ||
    text.includes("saida") ||
    text.includes("pagamento") ||
    text.includes("compra");

  const hasCredit =
    text === "c" ||
    text === "credito" ||
    text === "credit" ||
    text === "entrada" ||
    text.includes("credito") ||
    text.includes("entrada") ||
    text.includes("recebimento") ||
    text.includes("deposito");

  if (hasDebit && hasCredit) return 0;
  if (hasDebit) return -1;
  if (hasCredit) return 1;
  return 0;
}

function signFromDescription(description: string): 1 | -1 | 0 {
  const text = normalizeStatementText(description);

  if (
    /\b(recebimento|recebido|pix recebido|transferencia recebida|salario|credito|deposito|estorno|reembolso|rendimento|juros|dividendo)\b/.test(
      text,
    )
  ) {
    return 1;
  }
  if (
    /\b(compra|pagamento|pix enviado|transferencia enviada|saque|debito|fatura|boleto|tarifa|mensalidade|parcela)\b/.test(
      text,
    )
  ) {
    return -1;
  }
  return 0;
}
