import { prisma } from "@/lib/prisma";
import { resolveMonth, monthRangeUTC } from "@/lib/dates";
import type { Prisma } from "@/generated/prisma/client";
import type { IncomeStatus } from "@/generated/prisma/enums";

export type IncomeFilters = {
  month?: string;
  status?: string;
  categoryId?: string;
  q?: string;
  all?: boolean;
};

export async function listIncomes(userId: string, filters: IncomeFilters = {}) {
  const month = resolveMonth(filters.month);
  const { start, end } = monthRangeUTC(month);

  const where: Prisma.IncomeWhereInput = { userId };

  if (!filters.all) {
    where.expectedDate = { gte: start, lt: end };
  }

  if (filters.status === "EXPECTED" || filters.status === "RECEIVED") {
    where.status = filters.status as IncomeStatus;
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

  return prisma.income.findMany({
    where,
    include: {
      category: true,
      financialAccount: true,
    },
    orderBy: [{ expectedDate: "desc" }, { createdAt: "desc" }],
    take: 200,
  });
}

export async function getIncome(userId: string, id: string) {
  return prisma.income.findFirst({
    where: { id, userId },
    include: {
      category: true,
      financialAccount: true,
    },
  });
}

export async function getIncomeFormOptions(userId: string) {
  const [categories, accounts] = await Promise.all([
    prisma.category.findMany({
      where: { userId, type: "INCOME" },
      orderBy: { name: "asc" },
    }),
    prisma.financialAccount.findMany({
      where: { userId, archived: false },
      orderBy: { name: "asc" },
    }),
  ]);

  return { categories, accounts };
}
