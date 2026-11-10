"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { formString, formValues } from "@/lib/forms";
import { revalidateFinance } from "@/lib/revalidate";
import { parseDateInput } from "@/lib/dates";
import { parseBRLToCents } from "@/lib/money";
import {
  calculateDebtBalance,
  calculateDebtPaid,
  isDebtPaid,
} from "@/lib/finance";
import {
  debtPaymentSchema,
  debtSchema,
  validationError,
  type ActionState,
} from "@/lib/validation";

export async function createDebt(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = debtSchema.safeParse(formValues(formData));

  if (!parsed.success) return validationError(parsed.error);

  const data = parsed.data;
  const initialAmountCents = parseBRLToCents(data.initialAmount);

  if (initialAmountCents === null) return { error: "Valor inválido." };

  const debt = await prisma.debt.create({
    data: {
      userId: user.id,
      name: data.name,
      creditor: data.creditor ?? null,
      type: data.type,
      initialAmountCents,
      dueDay: data.dueDay ?? null,
      notes: data.notes ?? null,
    },
  });

  revalidateFinance();
  redirect(`/dividas/${debt.id}`);
}

export async function updateDebt(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const id = formString(formData, "id");

  const existing = await prisma.debt.findFirst({
    where: { id, userId: user.id },
    include: { payments: { select: { amountCents: true } } },
  });

  if (!existing) return { error: "Dívida não encontrada." };

  const parsed = debtSchema.safeParse(formValues(formData));
  if (!parsed.success) return validationError(parsed.error);

  const data = parsed.data;
  const initialAmountCents = parseBRLToCents(data.initialAmount);
  if (initialAmountCents === null) return { error: "Valor inválido." };

  const paidCents = calculateDebtPaid(
    existing.payments.map((payment) => payment.amountCents),
  );

  await prisma.debt.update({
    where: { id: existing.id },
    data: {
      name: data.name,
      creditor: data.creditor ?? null,
      type: data.type,
      initialAmountCents,
      dueDay: data.dueDay ?? null,
      notes: data.notes ?? null,
      status: isDebtPaid(initialAmountCents, paidCents) ? "PAID" : "ACTIVE",
    },
  });

  revalidateFinance();
  redirect(`/dividas/${existing.id}`);
}

export async function deleteDebt(formData: FormData) {
  const user = await requireUser();
  const id = formString(formData, "id");

  const debt = await prisma.debt.findFirst({
    where: { id, userId: user.id },
  });

  if (debt) {
    await prisma.debt.delete({ where: { id: debt.id } });
  }

  revalidateFinance();
  redirect("/dividas");
}

export async function addDebtPayment(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = debtPaymentSchema.safeParse(formValues(formData));

  if (!parsed.success) return validationError(parsed.error);

  const data = parsed.data;
  const amountCents = parseBRLToCents(data.amount);
  const paidAt = parseDateInput(data.paidAt);

  if (amountCents === null || !paidAt) {
    return { error: "Valor ou data inválidos." };
  }

  const debt = await prisma.debt.findFirst({
    where: { id: data.debtId, userId: user.id },
    include: { payments: { select: { amountCents: true } } },
  });

  if (!debt) return { error: "Dívida não encontrada." };
  if (debt.status === "PAID") return { error: "Esta dívida já está quitada." };

  if (data.financialAccountId) {
    const account = await prisma.financialAccount.findFirst({
      where: { id: data.financialAccountId, userId: user.id },
      select: { id: true },
    });
    if (!account) return { error: "Conta inválida." };
  }

  const paidCents = calculateDebtPaid(
    debt.payments.map((payment) => payment.amountCents),
  );
  const balanceCents = calculateDebtBalance(
    debt.initialAmountCents,
    debt.payments.map((payment) => payment.amountCents),
  );

  if (amountCents > balanceCents) {
    return {
      error: `O pagamento não pode ser maior que o saldo devedor (R$ ${(
        balanceCents / 100
      ).toFixed(2).replace(".", ",")}).`,
    };
  }

  const newStatus =
    paidCents + amountCents >= debt.initialAmountCents ? "PAID" : "ACTIVE";

  await prisma.$transaction(async (tx) => {
    let expenseId: string | null = null;

    if (data.createExpense) {
      const category = await tx.category.upsert({
        where: {
          userId_name_type: {
            userId: user.id,
            name: "Dívidas",
            type: "EXPENSE",
          },
        },
        create: {
          userId: user.id,
          name: "Dívidas",
          type: "EXPENSE",
          color: "#dc2626",
        },
        update: {},
      });

      const expense = await tx.expense.create({
        data: {
          userId: user.id,
          description: `Pagamento — ${debt.name}`,
          amountCents,
          categoryId: category.id,
          dueDate: paidAt,
          paidDate: paidAt,
          type:
            debt.type === "INSTALLMENT" ? "INSTALLMENT" : "FIXED",
          paymentMethod: data.paymentMethod ?? "OTHER",
          financialAccountId: data.financialAccountId ?? null,
          status: "PAID",
          notes: data.notes
            ? `Pagamento de dívida — ${data.notes}`
            : "Pagamento de dívida",
        },
      });

      expenseId = expense.id;
    }

    await tx.debtPayment.create({
      data: {
        userId: user.id,
        debtId: debt.id,
        amountCents,
        paidAt,
        financialAccountId: data.financialAccountId ?? null,
        expenseId,
        notes: data.notes ?? null,
      },
    });

    await tx.debt.update({
      where: { id: debt.id },
      data: { status: newStatus },
    });
  });

  revalidateFinance();
  redirect(`/dividas/${debt.id}`);
}

export async function deleteDebtPayment(formData: FormData) {
  const user = await requireUser();
  const id = formString(formData, "id");

  const payment = await prisma.debtPayment.findFirst({
    where: { id, userId: user.id },
  });

  if (!payment) redirect("/dividas");

  await prisma.$transaction(async (tx) => {
    if (payment.expenseId) {
      await tx.expense.delete({ where: { id: payment.expenseId } });
    }

    await tx.debtPayment.delete({ where: { id: payment.id } });

    const remaining = await tx.debtPayment.aggregate({
      where: { debtId: payment.debtId },
      _sum: { amountCents: true },
    });

    const debt = await tx.debt.findUnique({
      where: { id: payment.debtId },
      select: { initialAmountCents: true },
    });

    if (debt) {
      const paid = remaining._sum.amountCents ?? 0;
      await tx.debt.update({
        where: { id: payment.debtId },
        data: {
          status: isDebtPaid(debt.initialAmountCents, paid) ? "PAID" : "ACTIVE",
        },
      });
    }
  });

  revalidateFinance();
  redirect(`/dividas/${payment.debtId}`);
}
