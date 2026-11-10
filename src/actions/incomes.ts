"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { formString, formValues } from "@/lib/forms";
import { revalidateFinance } from "@/lib/revalidate";
import { monthKey, parseDateInput, todayUTC } from "@/lib/dates";
import { parseBRLToCents } from "@/lib/money";
import {
  incomeSchema,
  validationError,
  type ActionState,
} from "@/lib/validation";

export async function createIncome(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = incomeSchema.safeParse(formValues(formData));

  if (!parsed.success) return validationError(parsed.error);

  const data = parsed.data;
  const amountCents = parseBRLToCents(data.amount);
  const expectedDate = parseDateInput(data.expectedDate);
  const receivedDate = data.receivedDate
    ? parseDateInput(data.receivedDate)
    : null;

  if (amountCents === null || !expectedDate) {
    return { error: "Valor ou data inválidos." };
  }

  if (data.categoryId) {
    const category = await prisma.category.findFirst({
      where: {
        id: data.categoryId,
        userId: user.id,
        type: "INCOME",
      },
      select: { id: true },
    });
    if (!category) return { error: "Categoria inválida." };
  }

  if (data.financialAccountId) {
    const account = await prisma.financialAccount.findFirst({
      where: { id: data.financialAccountId, userId: user.id },
      select: { id: true },
    });
    if (!account) return { error: "Conta inválida." };
  }

  await prisma.income.create({
    data: {
      userId: user.id,
      description: data.description,
      amountCents,
      categoryId: data.categoryId ?? null,
      source: data.source ?? null,
      expectedDate,
      receivedDate,
      financialAccountId: data.financialAccountId ?? null,
      status: data.status,
      notes: data.notes ?? null,
    },
  });

  revalidateFinance();
  redirect(`/receitas?mes=${monthKey(expectedDate)}`);
}

export async function updateIncome(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const id = formString(formData, "id");

  const existing = await prisma.income.findFirst({
    where: { id, userId: user.id },
  });

  if (!existing) return { error: "Receita não encontrada." };

  const parsed = incomeSchema.safeParse(formValues(formData));
  if (!parsed.success) return validationError(parsed.error);

  const data = parsed.data;
  const amountCents = parseBRLToCents(data.amount);
  const expectedDate = parseDateInput(data.expectedDate);
  const receivedDate = data.receivedDate
    ? parseDateInput(data.receivedDate)
    : null;

  if (amountCents === null || !expectedDate) {
    return { error: "Valor ou data inválidos." };
  }

  if (data.categoryId) {
    const category = await prisma.category.findFirst({
      where: {
        id: data.categoryId,
        userId: user.id,
        type: "INCOME",
      },
      select: { id: true },
    });
    if (!category) return { error: "Categoria inválida." };
  }

  if (data.financialAccountId) {
    const account = await prisma.financialAccount.findFirst({
      where: { id: data.financialAccountId, userId: user.id },
      select: { id: true },
    });
    if (!account) return { error: "Conta inválida." };
  }

  await prisma.income.update({
    where: { id: existing.id },
    data: {
      description: data.description,
      amountCents,
      categoryId: data.categoryId ?? null,
      source: data.source ?? null,
      expectedDate,
      receivedDate,
      financialAccountId: data.financialAccountId ?? null,
      status: data.status,
      notes: data.notes ?? null,
    },
  });

  revalidateFinance();
  redirect(`/receitas?mes=${monthKey(expectedDate)}`);
}

export async function deleteIncome(formData: FormData) {
  const user = await requireUser();
  const id = formString(formData, "id");

  const income = await prisma.income.findFirst({
    where: { id, userId: user.id },
  });

  if (income) {
    await prisma.income.delete({ where: { id: income.id } });
  }

  revalidateFinance();
  redirect("/receitas");
}

export async function markIncomeReceived(formData: FormData) {
  const user = await requireUser();
  const id = formString(formData, "id");

  const income = await prisma.income.findFirst({
    where: { id, userId: user.id },
  });

  if (!income) redirect("/receitas");

  const accountId =
    income.financialAccountId || formString(formData, "financialAccountId");

  if (!accountId) {
    redirect(`/receitas/${income.id}/editar?erro=conta`);
  }

  const account = await prisma.financialAccount.findFirst({
    where: { id: accountId, userId: user.id },
    select: { id: true },
  });

  if (!account) {
    redirect(`/receitas/${income.id}/editar?erro=conta`);
  }

  const receivedDate =
    parseDateInput(formString(formData, "receivedDate")) ?? todayUTC();

  await prisma.income.update({
    where: { id: income.id },
    data: {
      status: "RECEIVED",
      receivedDate,
      financialAccountId: account.id,
    },
  });

  revalidateFinance();
  redirect(`/receitas?mes=${monthKey(receivedDate)}`);
}
