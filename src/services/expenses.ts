import { prisma } from "@/lib/prisma";
import { resolveMonth, monthRangeUTC } from "@/lib/dates";
import type { Prisma } from "@/generated/prisma/client";
import type { ExpenseStatus } from "@/generated/prisma/enums";

export type ExpenseFilters = {
  month?: string;
  status?: string;
  categoryId?: string;
  q?: string;
  all?: boolean;
};

export async function listExpenses(
  userId: string,
  filters: ExpenseFilters = {},
) {
  const month = resolveMonth(filters.month);
  const { start, end } = monthRangeUTC(month);

  const where: Prisma.ExpenseWhereInput = { userId };

  if (!filters.all) {
    where.dueDate = { gte: start, lt: end };
  }

  if (filters.status === "PENDING" || filters.status === "PAID") {
    where.status = filters.status as ExpenseStatus;
  }

  if (filters.categoryId) {
    where.categoryId = filters.categoryId;
  }

  if (filters.q?.trim()) {
    where.description = {
      contains: filters.q.trim(),
      mode: "insensitive",
    };
  }

  return prisma.expense.findMany({
    where,
    include: {
      category: true,
      financialAccount: true,
      debtPayment: {
        select: {
          id: true,
          debtId: true,
          debt: { select: { name: true } },
        },
      },
    },
    orderBy: [{ dueDate: "desc" }, { createdAt: "desc" }],
    take: 200,
  });
}

export async function getExpense(userId: string, id: string) {
  return prisma.expense.findFirst({
    where: { id, userId },
    include: {
      category: true,
      financialAccount: true,
    },
  });
}

export async function getExpenseFormOptions(userId: string) {
  const [categories, accounts] = await Promise.all([
    prisma.category.findMany({
      where: { userId, type: "EXPENSE" },
      orderBy: { name: "asc" },
    }),
    prisma.financialAccount.findMany({
      where: { userId, archived: false },
      orderBy: { name: "asc" },
    }),
  ]);

  return { categories, accounts };
}
