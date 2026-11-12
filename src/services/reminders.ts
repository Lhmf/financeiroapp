import { addDaysUTC, formatDate, todayUTC } from "@/lib/dates";
import { isEmailConfigured, sendEmail } from "@/lib/email";
import { formatCents } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export type ReminderRunResult = {
  referenceDate: string;
  usersChecked: number;
  usersWithDueItems: number;
  emailsSent: number;
  emailsFailed: number;
  skipped: string | null;
};

function agendaUrl(): string {
  const base = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  try {
    return new URL("/calendario", base).toString();
  } catch {
    return base;
  }
}

/**
 * Envia, para cada usuário, um e-mail com as contas a pagar e a receber
 * que vencem no dia seguinte. Consulta sempre por `userId`.
 */
export async function sendDueDateReminders(
  reference = todayUTC(),
): Promise<ReminderRunResult> {
  const tomorrow = addDaysUTC(reference, 1);
  const dayAfterTomorrow = addDaysUTC(reference, 2);
  const configured = isEmailConfigured();

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true },
  });

  let usersWithDueItems = 0;
  let emailsSent = 0;
  let emailsFailed = 0;

  for (const user of users) {
    const [expenses, incomes] = await Promise.all([
      prisma.expense.findMany({
        where: {
          userId: user.id,
          status: "PENDING",
          dueDate: { gte: tomorrow, lt: dayAfterTomorrow },
        },
        orderBy: { dueDate: "asc" },
      }),
      prisma.income.findMany({
        where: {
          userId: user.id,
          status: "EXPECTED",
          expectedDate: { gte: tomorrow, lt: dayAfterTomorrow },
        },
        orderBy: { expectedDate: "asc" },
      }),
    ]);

    if (expenses.length === 0 && incomes.length === 0) continue;
    usersWithDueItems++;

    if (!configured) continue;

    const lines: string[] = [];

    if (expenses.length > 0) {
      lines.push("A pagar:");
      for (const expense of expenses) {
        lines.push(
          `- ${expense.description}: ${formatCents(
            expense.amountCents,
          )} (vence ${formatDate(expense.dueDate)})`,
        );
      }
      lines.push("");
    }

    if (incomes.length > 0) {
      lines.push("A receber:");
      for (const income of incomes) {
        lines.push(
          `- ${income.description}: ${formatCents(
            income.amountCents,
          )} (prevista ${formatDate(income.expectedDate)})`,
        );
      }
      lines.push("");
    }

    const text = [
      `Olá, ${user.name}!`,
      "",
      `Lembrete das contas com vencimento em ${formatDate(tomorrow)}:`,
      "",
      ...lines,
      `Abra a agenda financeira: ${agendaUrl()}`,
      "",
      "— FinanceiroApp",
    ].join("\n");

    try {
      const sent = await sendEmail({
        to: user.email,
        subject: "Contas vencendo amanhã — FinanceiroApp",
        text,
      });
      if (sent) emailsSent++;
    } catch {
      emailsFailed++;
    }
  }

  return {
    referenceDate: formatDate(reference),
    usersChecked: users.length,
    usersWithDueItems,
    emailsSent,
    emailsFailed,
    skipped: configured ? null : "smtp-not-configured",
  };
}
