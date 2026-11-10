import { prisma } from "@/lib/prisma";
import { DEFAULT_CATEGORIES } from "@/lib/constants";
import type { CategoryType } from "@/generated/prisma/enums";

export async function ensureDefaultCategories(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { categoriesSeeded: true },
  });

  if (!user || user.categoriesSeeded) return;

  await prisma.$transaction([
    prisma.category.createMany({
      data: DEFAULT_CATEGORIES.map((category) => ({
        ...category,
        userId,
      })),
      skipDuplicates: true,
    }),
    prisma.user.update({
      where: { id: userId },
      data: { categoriesSeeded: true },
    }),
  ]);
}

export async function listCategories(userId: string, type?: CategoryType) {
  return prisma.category.findMany({
    where: { userId, ...(type ? { type } : {}) },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });
}

export async function getCategory(userId: string, id: string) {
  return prisma.category.findFirst({
    where: { id, userId },
  });
}
