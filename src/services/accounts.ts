import { prisma } from "@/lib/prisma";
import { calculateAccountBalance } from "@/lib/finance";
import type { AccountType } from "@/generated/prisma/enums";

export async function listAccounts(userId: string) {
  return prisma.financialAccount.findMany({
    where: { userId },
    orderBy: [{ archived: "asc" }, { createdAt: "asc" }],
  });
}

export async function listActiveAccounts(userId: string) {
  return prisma.financialAccount.findMany({
    where: { userId, archived: false },
    orderBy: { name: "asc" },
  });
}

export async function getAccount(userId: string, id: string) {
  return prisma.financialAccount.findFirst({
    where: { id, userId },
  });
}

type GroupedSum = {
  financialAccountId: string | null;
  _sum: { amountCents: number | null };
};

function toSumMap(rows: GroupedSum[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    if (!row.financialAccountId) continue;
    map.set(row.financialAccountId, row._sum.amountCents ?? 0);
  }
  return map;
}

export type AccountBalance = Awaited<ReturnType<typeof listAccounts>>[number] & {
  balanceCents: number;
};

export async function getAccountBalances(
  userId: string,
): Promise<AccountBalance[]> {
  const [accounts, receivedIncomes, paidExpenses, unlinkedDebtPayments] =
    await Promise.all([
      listAccounts(userId),
      prisma.income.groupBy({
        by: ["financialAccountId"],
        where: {
          userId,
          status: "RECEIVED",
          receivedDate: { not: null },
          financialAccountId: { not: null },
        },
        _sum: { amountCents: true },
      }),
      prisma.expense.groupBy({
        by: ["financialAccountId"],
        where: {
          userId,
          status: "PAID",
          paidDate: { not: null },
          financialAccountId: { not: null },
        },
        _sum: { amountCents: true },
      }),
      prisma.debtPayment.groupBy({
        by: ["financialAccountId"],
        where: {
          userId,
          expenseId: null,
          financialAccountId: { not: null },
        },
        _sum: { amountCents: true },
      }),
    ]);

  const incomeMap = toSumMap(receivedIncomes);
  const expenseMap = toSumMap(paidExpenses);
  const debtMap = toSumMap(unlinkedDebtPayments);

  return accounts.map((account) => ({
    ...account,
    balanceCents: calculateAccountBalance({
      initialBalanceCents: account.initialBalanceCents,
      receivedIncomeCents: incomeMap.get(account.id) ?? 0,
      paidExpenseCents: expenseMap.get(account.id) ?? 0,
      unlinkedDebtPaymentCents: debtMap.get(account.id) ?? 0,
    }),
  }));
}

export async function getTotalBalance(userId: string): Promise<number> {
  const accounts = await getAccountBalances(userId);
  return accounts.reduce((total, account) => total + account.balanceCents, 0);
}

export async function accountHasRecords(userId: string, accountId: string) {
  const [incomes, expenses, payments] = await Promise.all([
    prisma.income.count({ where: { userId, financialAccountId: accountId } }),
    prisma.expense.count({ where: { userId, financialAccountId: accountId } }),
    prisma.debtPayment.count({
      where: { userId, financialAccountId: accountId },
    }),
  ]);

  return incomes + expenses + payments > 0;
}

export type AccountOption = {
  id: string;
  name: string;
  type: AccountType;
  color: string;
  balanceCents?: number;
};
