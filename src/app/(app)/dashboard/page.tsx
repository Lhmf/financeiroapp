import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { MonthNavigator } from "@/components/filters/month-navigator";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { EvolutionChart } from "@/components/dashboard/evolution-chart";
import { ExpenseCategoryChart } from "@/components/dashboard/expense-category-chart";
import { UpcomingList } from "@/components/dashboard/upcoming-list";
import { DebtSummary } from "@/components/dashboard/debt-summary";
import { AccountsSummary } from "@/components/dashboard/accounts-summary";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/session";
import { getDashboardData } from "@/services/dashboard";

export const metadata = {
  title: "Dashboard",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const data = await getDashboardData(user.id, params.mes);
  const firstName = user.name.split(" ")[0] || user.name;

  return (
    <div className="animate-fade-up space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-emerald-700">
            Visão geral
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
            Olá, {firstName}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Seu retrato financeiro em{" "}
            <span className="font-medium text-slate-700">
              {data.month.label}
            </span>
            .
          </p>
        </div>
        <MonthNavigator month={data.month.key} basePath="/dashboard" />
      </div>

      {data.overdueExpenses.length > 0 ? (
        <Alert tone="error">
          <span className="font-medium">Existem contas atrasadas.</span> A mais
          antiga é &quot;{data.overdueExpenses[0].description}&quot;, com{" "}
          {data.overdueExpenses[0].overdueDays} dias de atraso.{" "}
          <Link
            href="/despesas?status=PENDING&todos=1"
            className="font-semibold underline underline-offset-2"
          >
            Revisar pendências
          </Link>
        </Alert>
      ) : null}

      <SummaryCards data={data} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Evolução financeira</CardTitle>
                <p className="mt-0.5 text-xs text-slate-600">
                  Receitas recebidas e despesas pagas nos últimos 6 meses
                </p>
              </div>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                <BarChart3 className="h-4 w-4" />
              </span>
            </CardHeader>
            <CardContent>
              <EvolutionChart data={data.evolution} />
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardContent>
                <UpcomingList
                  title="Próximos vencimentos"
                  description="Contas pendentes a partir de hoje"
                  items={data.upcomingExpenses.map((expense) => ({
                    id: expense.id,
                    description: expense.description,
                    amountCents: expense.amountCents,
                    dateLabel: expense.dueDateLabel,
                    dateISO: expense.dueDate,
                    categoryName: expense.categoryName,
                    categoryColor: expense.categoryColor,
                    days: expense.dueInDays,
                    kind: "expense",
                  }))}
                  hrefBase="/despesas"
                  kind="expense"
                  emptyTitle="Nenhuma conta a vencer"
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <UpcomingList
                  title="Receitas previstas"
                  description="Entradas ainda não recebidas"
                  items={data.upcomingIncomes.map((income) => ({
                    id: income.id,
                    description: income.description,
                    amountCents: income.amountCents,
                    dateLabel: income.expectedDateLabel,
                    dateISO: income.expectedDate,
                    categoryName: income.categoryName,
                    categoryColor: income.categoryColor,
                    days: income.dueInDays,
                    kind: "income",
                  }))}
                  hrefBase="/receitas"
                  kind="income"
                  emptyTitle="Nenhuma receita prevista"
                />
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Despesas por categoria</CardTitle>
                <p className="mt-0.5 text-xs text-slate-600">
                  Somente despesas pagas no mês
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <ExpenseCategoryChart data={data.expensesByCategory} />
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <DebtSummary
                debts={data.debts}
                totalDebtCents={data.totalDebtCents}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardContent>
          <AccountsSummary accounts={data.accounts} />
        </CardContent>
      </Card>
    </div>
  );
}
