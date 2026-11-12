"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { formString, formValues, safeRedirectPath } from "@/lib/forms";
import { revalidateFinance } from "@/lib/revalidate";
import { monthKey, parseDateInput, todayUTC } from "@/lib/dates";
import { parseBRLToCents } from "@/lib/money";
import {
  expenseSchema,
  validationError,
  type ActionState,
} from "@/lib/validation";

export async function createExpense(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = expenseSchema.safeParse(formValues(formData));

  if (!parsed.success) return validationError(parsed.error);

  const data = parsed.data;
  const amountCents = parseBRLToCents(data.amount);
  const dueDate = parseDateInput(data.dueDate);
  const paidDate = data.paidDate ? parseDateInput(data.paidDate) : null;

  if (amountCents === null || !dueDate) {
    return { error: "Valor ou data inválidos." };
  }

  if (data.categoryId) {
    const category = await prisma.category.findFirst({
      where: {
        id: data.categoryId,
        userId: user.id,
        type: "EXPENSE",
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

  await prisma.expense.create({
    data: {
      userId: user.id,
      description: data.description,
      amountCents,
      categoryId: data.categoryId ?? null,
      dueDate,
      paidDate,
      type: data.type,
      paymentMethod: data.paymentMethod ?? null,
      financialAccountId: data.financialAccountId ?? null,
      status: data.status,
      installmentNumber:
        data.type === "INSTALLMENT" ? (data.installmentNumber ?? null) : null,
      installmentTotal:
        data.type === "INSTALLMENT" ? (data.installmentTotal ?? null) : null,
      notes: data.notes ?? null,
    },
  });

  revalidateFinance();
  redirect(`/despesas?mes=${monthKey(dueDate)}`);
}

export async function updateExpense(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const id = formString(formData, "id");

  const existing = await prisma.expense.findFirst({
    where: { id, userId: user.id },
    include: { debtPayment: { select: { id: true, debtId: true } } },
  });

  if (!existing) return { error: "Despesa não encontrada." };

  if (existing.debtPayment) {
    return {
      error:
        "Esta despesa foi gerada por um pagamento de dívida. Edite o pagamento na página da dívida para manter o saldo consistente.",
    };
  }

  const parsed = expenseSchema.safeParse(formValues(formData));
  if (!parsed.success) return validationError(parsed.error);

  const data = parsed.data;
  const amountCents = parseBRLToCents(data.amount);
  const dueDate = parseDateInput(data.dueDate);
  const paidDate = data.paidDate ? parseDateInput(data.paidDate) : null;

  if (amountCents === null || !dueDate) {
    return { error: "Valor ou data inválidos." };
  }

  if (data.categoryId) {
    const category = await prisma.category.findFirst({
      where: {
        id: data.categoryId,
        userId: user.id,
        type: "EXPENSE",
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

  await prisma.expense.update({
    where: { id: existing.id },
    data: {
      description: data.description,
      amountCents,
      categoryId: data.categoryId ?? null,
      dueDate,
      paidDate,
      type: data.type,
      paymentMethod: data.paymentMethod ?? null,
      financialAccountId: data.financialAccountId ?? null,
      status: data.status,
      installmentNumber:
        data.type === "INSTALLMENT" ? (data.installmentNumber ?? null) : null,
      installmentTotal:
        data.type === "INSTALLMENT" ? (data.installmentTotal ?? null) : null,
      notes: data.notes ?? null,
    },
  });

  revalidateFinance();
  redirect(`/despesas?mes=${monthKey(dueDate)}`);
}

export async function deleteExpense(formData: FormData) {
  const user = await requireUser();
  const id = formString(formData, "id");

  const expense = await prisma.expense.findFirst({
    where: { id, userId: user.id },
  });

  if (expense) {
    await prisma.expense.delete({ where: { id: expense.id } });
  }

  revalidateFinance();
  redirect("/despesas");
}

export async function markExpensePaid(formData: FormData) {
  const user = await requireUser();
  const id = formString(formData, "id");

  const expense = await prisma.expense.findFirst({
    where: { id, userId: user.id },
  });

  if (!expense) redirect("/despesas");

  const accountId =
    expense.financialAccountId || formString(formData, "financialAccountId");

  if (!accountId) {
    redirect(`/despesas/${expense.id}/editar?erro=conta`);
  }

  const account = await prisma.financialAccount.findFirst({
    where: { id: accountId, userId: user.id },
    select: { id: true },
  });

  if (!account) {
    redirect(`/despesas/${expense.id}/editar?erro=conta`);
  }

  const paidDate =
    parseDateInput(formString(formData, "paidDate")) ?? todayUTC();

  await prisma.expense.update({
    where: { id: expense.id },
    data: {
      status: "PAID",
      paidDate,
      financialAccountId: account.id,
    },
  });

  revalidateFinance();
  redirect(
    safeRedirectPath(
      formString(formData, "redirectTo"),
      `/despesas?mes=${monthKey(paidDate)}`,
    ),
  );
}
