import { prisma } from "@/lib/prisma";
import {
  calculateDebtBalance,
  calculateDebtPaid,
  calculateDebtProgress,
  isDebtPaid,
} from "@/lib/finance";

export async function listDebts(userId: string) {
  const debts = await prisma.debt.findMany({
    where: { userId },
    include: {
      payments: {
        select: { amountCents: true },
      },
    },
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
  });

  return debts.map((debt) => {
    const paidCents = calculateDebtPaid(
      debt.payments.map((payment) => payment.amountCents),
    );
    const balanceCents = calculateDebtBalance(
      debt.initialAmountCents,
      debt.payments.map((payment) => payment.amountCents),
    );

    return {
      ...debt,
      paidCents,
      balanceCents,
      progress: calculateDebtProgress(debt.initialAmountCents, paidCents),
      isPaid: isDebtPaid(debt.initialAmountCents, paidCents),
    };
  });
}

export async function getDebt(userId: string, id: string) {
  const debt = await prisma.debt.findFirst({
    where: { id, userId },
    include: {
      payments: {
        include: {
          financialAccount: true,
          expense: true,
        },
        orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
      },
    },
  });

  if (!debt) return null;

  const paidCents = calculateDebtPaid(
    debt.payments.map((payment) => payment.amountCents),
  );
  const balanceCents = calculateDebtBalance(
    debt.initialAmountCents,
    debt.payments.map((payment) => payment.amountCents),
  );

  return {
    ...debt,
    paidCents,
    balanceCents,
    progress: calculateDebtProgress(debt.initialAmountCents, paidCents),
    isPaid: isDebtPaid(debt.initialAmountCents, paidCents),
  };
}

export async function getDebtFormOptions(userId: string) {
  const accounts = await prisma.financialAccount.findMany({
    where: { userId, archived: false },
    orderBy: { name: "asc" },
  });

  return { accounts };
}

export async function getDebtSummary(userId: string) {
  const debts = await listDebts(userId);
  const active = debts.filter((debt) => debt.status === "ACTIVE");

  return {
    totalDebtCents: active.reduce((total, debt) => total + debt.balanceCents, 0),
    activeCount: active.length,
    paidCount: debts.filter((debt) => debt.status === "PAID").length,
    debts: active,
  };
}
