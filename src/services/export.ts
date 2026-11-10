import { prisma } from "@/lib/prisma";

/** Exporta somente os dados do usuário autenticado, sem credenciais. */
export async function exportUserData(userId: string) {
  const [user, accounts, categories, incomes, expenses, debts, debtPayments] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
        },
      }),
      prisma.financialAccount.findMany({ where: { userId } }),
      prisma.category.findMany({ where: { userId } }),
      prisma.income.findMany({ where: { userId } }),
      prisma.expense.findMany({ where: { userId } }),
      prisma.debt.findMany({ where: { userId } }),
      prisma.debtPayment.findMany({ where: { userId } }),
    ]);

  return {
    app: "FinanceiroApp",
    version: 1,
    exportedAt: new Date().toISOString(),
    user,
    accounts,
    categories,
    incomes,
    expenses,
    debts,
    debtPayments,
  };
}
