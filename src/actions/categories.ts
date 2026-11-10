"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { formString, formValues } from "@/lib/forms";
import { revalidateFinance } from "@/lib/revalidate";
import {
  categorySchema,
  validationError,
  type ActionState,
} from "@/lib/validation";

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

export async function createCategory(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = categorySchema.safeParse(formValues(formData));

  if (!parsed.success) return validationError(parsed.error);

  const data = parsed.data;

  try {
    await prisma.category.create({
      data: {
        userId: user.id,
        name: data.name,
        type: data.type,
        color: data.color,
      },
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { error: "Já existe uma categoria com esse nome e tipo." };
    }
    throw error;
  }

  revalidateFinance();
  redirect("/configuracoes");
}

export async function updateCategory(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const id = formString(formData, "id");

  const existing = await prisma.category.findFirst({
    where: { id, userId: user.id },
  });

  if (!existing) return { error: "Categoria não encontrada." };

  const parsed = categorySchema.safeParse(formValues(formData));
  if (!parsed.success) return validationError(parsed.error);

  const data = parsed.data;

  try {
    await prisma.category.update({
      where: { id: existing.id },
      data: {
        name: data.name,
        type: data.type,
        color: data.color,
      },
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { error: "Já existe uma categoria com esse nome e tipo." };
    }
    throw error;
  }

  revalidateFinance();
  redirect("/configuracoes");
}

export async function deleteCategory(formData: FormData) {
  const user = await requireUser();
  const id = formString(formData, "id");

  const category = await prisma.category.findFirst({
    where: { id, userId: user.id },
  });

  if (!category) redirect("/configuracoes");

  const [incomes, expenses] = await Promise.all([
    prisma.income.count({ where: { userId: user.id, categoryId: category.id } }),
    prisma.expense.count({
      where: { userId: user.id, categoryId: category.id },
    }),
  ]);

  if (incomes + expenses > 0) {
    redirect("/configuracoes?erro=categoria-em-uso");
  }

  await prisma.category.delete({ where: { id: category.id } });

  revalidateFinance();
  redirect("/configuracoes");
}
