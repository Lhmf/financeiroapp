import Link from "next/link";
import {
  CalendarClock,
  Clock3,
  TrendingDown,
  Wallet,
} from "lucide-react";
import { AgendaRow } from "@/components/agenda/agenda-row";
import { AgendaTabs } from "@/components/agenda/agenda-tabs";
import { MonthNavigator } from "@/components/filters/month-navigator";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/link-button";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import {
  daysUntil,
  formatDate,
  monthKey,
  monthLabelTitle,
  resolveMonth,
} from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { requireUser } from "@/lib/session";
import { listExpenses } from "@/services/expenses";
import { buildAgendaItems } from "@/services/agenda";

export const metadata = {
  title: "Contas a pagar",
};

export default async function ContasAPagarPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; todos?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const month = resolveMonth(params.mes);
  const currentMonth = monthKey(month);
  const all = params.todos === "1";

  const expenses = await listExpenses(user.id, {
    month: currentMonth,
    status: "PENDING",
    all,
  });

  const sorted = [...expenses].sort(
    (a, b) => a.dueDate.getTime() - b.dueDate.getTime(),
  );
  const items = buildAgendaItems(sorted, [], "pagar");

  const pendingCents = expenses.reduce(
    (sum, expense) => sum + expense.amountCents,
    0,
  );
  const overdueCents = expenses.reduce(
    (sum, expense) =>
      daysUntil(expense.dueDate) < 0 ? sum + expense.amountCents : sum,
    0,
  );
  const nextDue = sorted[0]?.dueDate ?? null;

  const query = new URLSearchParams();
  query.set("mes", currentMonth);
  if (all) query.set("todos", "1");
  const redirectTo = `/contas-a-pagar?${query.toString()}`;

  return (
    <div className="animate-fade-up space-y-6">
      <PageHeader
        title="Contas a pagar"
        description="Despesas pendentes, ordenadas por vencimento."
        action={
          <LinkButton href="/despesas/nova">
            <TrendingDown className="h-4 w-4" />
            Nova despesa
          </LinkButton>
        }
      />

      <AgendaTabs active="pagar" month={currentMonth} />

      <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard
          label="Total pendente"
          value={formatCents(pendingCents)}
          hint={`${expenses.length} conta(s) a pagar`}
          icon={Wallet}
          tone="rose"
        />
        <StatCard
          label="Em atraso"
          value={formatCents(overdueCents)}
          hint="Vencidas e ainda pendentes"
          icon={Clock3}
          tone="amber"
        />
        <StatCard
          label="Próximo vencimento"
          value={nextDue ? formatDate(nextDue) : "—"}
          hint={nextDue ? `${daysUntil(nextDue)} dia(s)` : "Nenhuma pendência"}
          icon={CalendarClock}
          tone="slate"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <MonthNavigator month={currentMonth} basePath="/contas-a-pagar" />
        <Link
          href={all ? `/contas-a-pagar?mes=${currentMonth}` : "/contas-a-pagar?todos=1"}
          className="text-xs font-medium text-emerald-700 hover:text-emerald-800"
        >
          {all ? "Ver apenas este mês" : "Ver todo o histórico"}
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="red">{monthLabelTitle(month)}</Badge>
        {all ? <Badge tone="slate">Histórico completo</Badge> : null}
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<TrendingDown className="h-5 w-5" />}
          title="Nenhuma conta a pagar"
          description="Não há despesas pendentes com os filtros atuais. Cadastre uma despesa para acompanhar o vencimento."
          action={
            <LinkButton href="/despesas/nova" size="sm">
              <TrendingDown className="h-3.5 w-3.5" />
              Cadastrar despesa
            </LinkButton>
          }
        />
      ) : (
        <Card>
          <div className="border-b border-slate-100 px-5 py-3">
            <p className="text-xs font-medium text-slate-600">
              {items.length} {items.length === 1 ? "conta" : "contas"}
              {all ? " no histórico" : " neste mês"}
            </p>
          </div>
          <ul className="divide-y divide-slate-100">
            {items.map((item) => (
              <AgendaRow
                key={`${item.kind}-${item.id}`}
                item={item}
                redirectTo={redirectTo}
              />
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
