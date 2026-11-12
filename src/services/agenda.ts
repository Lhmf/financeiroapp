import type { AgendaKind } from "@/lib/agenda";
import { listExpenses } from "@/services/expenses";
import { listIncomes } from "@/services/incomes";

export type AgendaItem = {
  kind: "expense" | "income";
  id: string;
  description: string;
  amountCents: number;
  date: Date;
  categoryName: string | null;
  categoryColor: string | null;
  accountName: string | null;
  financialAccountId: string | null;
};

type ExpenseRecord = Awaited<ReturnType<typeof listExpenses>>[number];
type IncomeRecord = Awaited<ReturnType<typeof listIncomes>>[number];

/** Busca as contas a pagar (PENDING) e a receber (EXPECTED) do período. */
export async function listAgenda(
  userId: string,
  options: { month?: string; all?: boolean } = {},
) {
  const [expenses, incomes] = await Promise.all([
    listExpenses(userId, {
      month: options.month,
      status: "PENDING",
      all: options.all,
    }),
    listIncomes(userId, {
      month: options.month,
      status: "EXPECTED",
      all: options.all,
    }),
  ]);

  return { expenses, incomes };
}

/** Combina os dois tipos em uma lista tipada e ordenada por data. */
export function buildAgendaItems(
  expenses: ExpenseRecord[],
  incomes: IncomeRecord[],
  kind: AgendaKind = "todos",
): AgendaItem[] {
  const items: AgendaItem[] = [];

  if (kind !== "receber") {
    for (const expense of expenses) {
      items.push({
        kind: "expense",
        id: expense.id,
        description: expense.description,
        amountCents: expense.amountCents,
        date: expense.dueDate,
        categoryName: expense.category?.name ?? null,
        categoryColor: expense.category?.color ?? null,
        accountName: expense.financialAccount?.name ?? null,
        financialAccountId: expense.financialAccountId,
      });
    }
  }

  if (kind !== "pagar") {
    for (const income of incomes) {
      items.push({
        kind: "income",
        id: income.id,
        description: income.description,
        amountCents: income.amountCents,
        date: income.expectedDate,
        categoryName: income.category?.name ?? null,
        categoryColor: income.category?.color ?? null,
        accountName: income.financialAccount?.name ?? null,
        financialAccountId: income.financialAccountId,
      });
    }
  }

  return items.sort((a, b) => a.date.getTime() - b.date.getTime());
}
