import { prisma } from "@/lib/prisma";
import { getAccountBalances } from "./accounts";
import {
  daysUntil,
  formatDate,
  lastMonths,
  monthKeyOf,
  monthLabel,
  monthRangeUTC,
  resolveMonth,
  todayUTC,
} from "@/lib/dates";
import {
  calculateDebtBalance,
  calculateDebtPaid,
  calculateDebtProgress,
  calculateMonthResult,
  safePercent,
} from "@/lib/finance";

export async function getDashboardData(
  userId: string,
  monthParam?: string,
) {
  const monthStart = resolveMonth(monthParam);
  const { start: monthStartDate, end: monthEndDate } =
    monthRangeUTC(monthStart);
  const today = todayUTC();
  const months = lastMonths(6, monthStart);
  const evolutionStart = months[0].start;
  const monthKeyValue = `${monthStart.getUTCFullYear()}-${String(
    monthStart.getUTCMonth() + 1,
  ).padStart(2, "0")}`;

  const [
    accountBalances,
    monthReceived,
    monthPaid,
    monthUnlinkedDebt,
    pendingExpenses,
    expectedIncomes,
    paidByCategory,
    expenseCategories,
    upcomingExpenses,
    overdueExpenses,
    upcomingIncomes,
    activeDebts,
    evolutionIncomes,
    evolutionExpenses,
    evolutionDebtPayments,
  ] = await Promise.all([
    getAccountBalances(userId),
    prisma.income.aggregate({
      where: {
        userId,
        status: "RECEIVED",
        receivedDate: { gte: monthStartDate, lt: monthEndDate },
      },
      _sum: { amountCents: true },
    }),
    prisma.expense.aggregate({
      where: {
        userId,
        status: "PAID",
        paidDate: { gte: monthStartDate, lt: monthEndDate },
      },
      _sum: { amountCents: true },
    }),
    prisma.debtPayment.aggregate({
      where: {
        userId,
        expenseId: null,
        paidAt: { gte: monthStartDate, lt: monthEndDate },
      },
      _sum: { amountCents: true },
    }),
    prisma.expense.aggregate({
      where: { userId, status: "PENDING" },
      _sum: { amountCents: true },
      _count: true,
    }),
    prisma.income.aggregate({
      where: { userId, status: "EXPECTED" },
      _sum: { amountCents: true },
      _count: true,
    }),
    prisma.expense.groupBy({
      by: ["categoryId"],
      where: {
        userId,
        status: "PAID",
        paidDate: { gte: monthStartDate, lt: monthEndDate },
      },
      _sum: { amountCents: true },
    }),
    prisma.category.findMany({
      where: { userId, type: "EXPENSE" },
      select: { id: true, name: true, color: true },
    }),
    prisma.expense.findMany({
      where: {
        userId,
        status: "PENDING",
        dueDate: { gte: today },
      },
      include: { category: true },
      orderBy: { dueDate: "asc" },
      take: 6,
    }),
    prisma.expense.findMany({
      where: {
        userId,
        status: "PENDING",
        dueDate: { lt: today },
      },
      include: { category: true },
      orderBy: { dueDate: "asc" },
      take: 6,
    }),
    prisma.income.findMany({
      where: { userId, status: "EXPECTED" },
      include: { category: true },
      orderBy: { expectedDate: "asc" },
      take: 6,
    }),
    prisma.debt.findMany({
      where: { userId, status: "ACTIVE" },
      include: { payments: { select: { amountCents: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.income.findMany({
      where: {
        userId,
        status: "RECEIVED",
        receivedDate: { gte: evolutionStart, lt: monthEndDate },
      },
      select: { amountCents: true, receivedDate: true },
    }),
    prisma.expense.findMany({
      where: {
        userId,
        status: "PAID",
        paidDate: { gte: evolutionStart, lt: monthEndDate },
      },
      select: { amountCents: true, paidDate: true },
    }),
    prisma.debtPayment.findMany({
      where: {
        userId,
        expenseId: null,
        paidAt: { gte: evolutionStart, lt: monthEndDate },
      },
      select: { amountCents: true, paidAt: true },
    }),
  ]);

  const monthReceivedCents = monthReceived._sum.amountCents ?? 0;
  const monthPaidCents = monthPaid._sum.amountCents ?? 0;
  const monthUnlinkedDebtCents = monthUnlinkedDebt._sum.amountCents ?? 0;
  const monthResultCents = calculateMonthResult({
    receivedIncomeCents: monthReceivedCents,
    paidExpenseCents: monthPaidCents,
    unlinkedDebtPaymentCents: monthUnlinkedDebtCents,
  });

  const categoryMap = new Map(expenseCategories.map((c) => [c.id, c]));
  const totalByCategory = paidByCategory.reduce(
    (total, row) => total + (row._sum.amountCents ?? 0),
    0,
  );

  const expensesByCategory = paidByCategory
    .map((row) => {
      const category = row.categoryId
        ? categoryMap.get(row.categoryId)
        : undefined;
      const amountCents = row._sum.amountCents ?? 0;
      return {
        name: category?.name ?? "Sem categoria",
        color: category?.color ?? "#94a3b8",
        amountCents,
        percent: safePercent(amountCents, totalByCategory),
      };
    })
    .filter((row) => row.amountCents > 0)
    .sort((a, b) => b.amountCents - a.amountCents);

  const evolutionMap = new Map<
    string,
    { received: number; paid: number; debt: number }
  >();
  for (const month of months) {
    evolutionMap.set(month.key, { received: 0, paid: 0, debt: 0 });
  }

  for (const income of evolutionIncomes) {
    const key = monthKeyOf(income.receivedDate);
    const bucket = key ? evolutionMap.get(key) : undefined;
    if (bucket) bucket.received += income.amountCents;
  }
  for (const expense of evolutionExpenses) {
    const key = monthKeyOf(expense.paidDate);
    const bucket = key ? evolutionMap.get(key) : undefined;
    if (bucket) bucket.paid += expense.amountCents;
  }
  for (const payment of evolutionDebtPayments) {
    const key = monthKeyOf(payment.paidAt);
    const bucket = key ? evolutionMap.get(key) : undefined;
    if (bucket) bucket.debt += payment.amountCents;
  }

  const evolution = months.map((month) => {
    const bucket = evolutionMap.get(month.key) ?? {
      received: 0,
      paid: 0,
      debt: 0,
    };
    const expenses = bucket.paid + bucket.debt;
    return {
      month: month.label,
      receitas: bucket.received / 100,
      despesas: expenses / 100,
      resultado: (bucket.received - expenses) / 100,
    };
  });

  const debts = activeDebts
    .map((debt) => {
      const payments = debt.payments.map((payment) => payment.amountCents);
      const paidCents = calculateDebtPaid(payments);
      const balanceCents = calculateDebtBalance(
        debt.initialAmountCents,
        payments,
      );
      return {
        id: debt.id,
        name: debt.name,
        creditor: debt.creditor,
        type: debt.type,
        initialAmountCents: debt.initialAmountCents,
        paidCents,
        balanceCents,
        progress: calculateDebtProgress(debt.initialAmountCents, paidCents),
        dueDay: debt.dueDay,
      };
    })
    .sort((a, b) => b.balanceCents - a.balanceCents);

  const totalDebtCents = debts.reduce(
    (total, debt) => total + debt.balanceCents,
    0,
  );

  const totalBalanceCents = accountBalances.reduce(
    (total, account) => total + account.balanceCents,
    0,
  );

  return {
    month: {
      key: monthKeyValue,
      label: monthLabel(monthStart),
    },
    totalBalanceCents,
    monthReceivedCents,
    monthPaidCents,
    monthUnlinkedDebtCents,
    monthResultCents,
    pendingExpenseCents: pendingExpenses._sum.amountCents ?? 0,
    pendingExpenseCount: pendingExpenses._count,
    expectedIncomeCents: expectedIncomes._sum.amountCents ?? 0,
    expectedIncomeCount: expectedIncomes._count,
    totalDebtCents,
    activeDebtCount: debts.length,
    expensesByCategory,
    evolution,
    accounts: accountBalances.map((account) => ({
      id: account.id,
      name: account.name,
      type: account.type,
      color: account.color,
      balanceCents: account.balanceCents,
      archived: account.archived,
    })),
    upcomingExpenses: upcomingExpenses.map((expense) => ({
      id: expense.id,
      description: expense.description,
      amountCents: expense.amountCents,
      dueDate: expense.dueDate.toISOString(),
      dueDateLabel: formatDate(expense.dueDate),
      dueInDays: daysUntil(expense.dueDate),
      categoryName: expense.category?.name ?? "Sem categoria",
      categoryColor: expense.category?.color ?? "#94a3b8",
    })),
    overdueExpenses: overdueExpenses.map((expense) => ({
      id: expense.id,
      description: expense.description,
      amountCents: expense.amountCents,
      dueDate: expense.dueDate.toISOString(),
      dueDateLabel: formatDate(expense.dueDate),
      overdueDays: Math.abs(daysUntil(expense.dueDate)),
      categoryName: expense.category?.name ?? "Sem categoria",
      categoryColor: expense.category?.color ?? "#94a3b8",
    })),
    upcomingIncomes: upcomingIncomes.map((income) => ({
      id: income.id,
      description: income.description,
      amountCents: income.amountCents,
      expectedDate: income.expectedDate.toISOString(),
      expectedDateLabel: formatDate(income.expectedDate),
      dueInDays: daysUntil(income.expectedDate),
      categoryName: income.category?.name ?? "Sem categoria",
      categoryColor: income.category?.color ?? "#94a3b8",
    })),
    debts,
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
