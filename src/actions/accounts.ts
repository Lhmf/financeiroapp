"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { formString, formValues } from "@/lib/forms";
import { revalidateFinance } from "@/lib/revalidate";
import { parseBRLToCentsAllowZero } from "@/lib/money";
import { accountHasRecords } from "@/services/accounts";
import {
  accountSchema,
  validationError,
  type ActionState,
} from "@/lib/validation";

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

export async function createAccount(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = accountSchema.safeParse(formValues(formData));

  if (!parsed.success) return validationError(parsed.error);

  const data = parsed.data;
  const initialBalanceCents = parseBRLToCentsAllowZero(data.initialBalance);

  if (initialBalanceCents === null) {
    return { error: "Saldo inicial inválido." };
  }

  try {
    await prisma.financialAccount.create({
      data: {
        userId: user.id,
        name: data.name,
        type: data.type,
        initialBalanceCents,
        color: data.color,
        archived: data.archived,
      },
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { error: "Já existe uma conta com esse nome." };
    }
    throw error;
  }

  revalidateFinance();
  redirect("/contas");
}

export async function updateAccount(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const id = formString(formData, "id");

  const existing = await prisma.financialAccount.findFirst({
    where: { id, userId: user.id },
  });

  if (!existing) return { error: "Conta não encontrada." };

  const parsed = accountSchema.safeParse(formValues(formData));
  if (!parsed.success) return validationError(parsed.error);

  const data = parsed.data;
  const initialBalanceCents = parseBRLToCentsAllowZero(data.initialBalance);

  if (initialBalanceCents === null) {
    return { error: "Saldo inicial inválido." };
  }

  try {
    await prisma.financialAccount.update({
      where: { id: existing.id },
      data: {
        name: data.name,
        type: data.type,
        initialBalanceCents,
        color: data.color,
        archived: data.archived,
      },
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { error: "Já existe uma conta com esse nome." };
    }
    throw error;
  }

  revalidateFinance();
  redirect("/contas");
}

export async function toggleAccountArchive(formData: FormData) {
  const user = await requireUser();
  const id = formString(formData, "id");

  const account = await prisma.financialAccount.findFirst({
    where: { id, userId: user.id },
  });

  if (!account) redirect("/contas");

  await prisma.financialAccount.update({
    where: { id: account.id },
    data: { archived: !account.archived },
  });

  revalidateFinance();
  redirect("/contas");
}

export async function deleteAccount(formData: FormData) {
  const user = await requireUser();
  const id = formString(formData, "id");

  const account = await prisma.financialAccount.findFirst({
    where: { id, userId: user.id },
  });

  if (!account) redirect("/contas");

  if (await accountHasRecords(user.id, account.id)) {
    redirect("/contas?erro=conta-com-movimentacoes");
  }

  await prisma.financialAccount.delete({ where: { id: account.id } });

  revalidateFinance();
  redirect("/contas");
}
