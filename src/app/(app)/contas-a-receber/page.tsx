import Link from "next/link";
import {
  CalendarClock,
  Clock3,
  TrendingUp,
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
import { listIncomes } from "@/services/incomes";
import { buildAgendaItems } from "@/services/agenda";

export const metadata = {
  title: "Contas a receber",
};

export default async function ContasAReceberPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; todos?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const month = resolveMonth(params.mes);
  const currentMonth = monthKey(month);
  const all = params.todos === "1";

  const incomes = await listIncomes(user.id, {
    month: currentMonth,
    status: "EXPECTED",
    all,
  });

  const sorted = [...incomes].sort(
    (a, b) => a.expectedDate.getTime() - b.expectedDate.getTime(),
  );
  const items = buildAgendaItems([], sorted, "receber");

  const expectedCents = incomes.reduce(
    (sum, income) => sum + income.amountCents,
    0,
  );
  const overdueCents = incomes.reduce(
    (sum, income) =>
      daysUntil(income.expectedDate) < 0 ? sum + income.amountCents : sum,
    0,
  );
  const nextExpected = sorted[0]?.expectedDate ?? null;

  const query = new URLSearchParams();
  query.set("mes", currentMonth);
  if (all) query.set("todos", "1");
  const redirectTo = `/contas-a-receber?${query.toString()}`;

  return (
    <div className="animate-fade-up space-y-6">
      <PageHeader
        title="Contas a receber"
        description="Receitas previstas, ordenadas pela data esperada."
        action={
          <LinkButton href="/receitas/nova">
            <TrendingUp className="h-4 w-4" />
            Nova receita
          </LinkButton>
        }
      />

      <AgendaTabs active="receber" month={currentMonth} />

      <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard
          label="Total previsto"
          value={formatCents(expectedCents)}
          hint={`${incomes.length} receita(s) a receber`}
          icon={Wallet}
          tone="emerald"
        />
        <StatCard
          label="Atrasadas"
          value={formatCents(overdueCents)}
          hint="Data passou e ainda não entrou"
          icon={Clock3}
          tone="amber"
        />
        <StatCard
          label="Próximo recebimento"
          value={nextExpected ? formatDate(nextExpected) : "—"}
          hint={
            nextExpected
              ? `${daysUntil(nextExpected)} dia(s)`
              : "Nenhuma prevista"
          }
          icon={CalendarClock}
          tone="slate"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <MonthNavigator month={currentMonth} basePath="/contas-a-receber" />
        <Link
          href={
            all ? `/contas-a-receber?mes=${currentMonth}` : "/contas-a-receber?todos=1"
          }
          className="text-xs font-medium text-emerald-700 hover:text-emerald-800"
        >
          {all ? "Ver apenas este mês" : "Ver todo o histórico"}
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="green">{monthLabelTitle(month)}</Badge>
        {all ? <Badge tone="slate">Histórico completo</Badge> : null}
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<TrendingUp className="h-5 w-5" />}
          title="Nenhuma conta a receber"
          description="Não há receitas previstas com os filtros atuais. Cadastre uma receita para acompanhar a data esperada."
          action={
            <LinkButton href="/receitas/nova" size="sm">
              <TrendingUp className="h-3.5 w-3.5" />
              Cadastrar receita
            </LinkButton>
          }
        />
      ) : (
        <Card>
          <div className="border-b border-slate-100 px-5 py-3">
            <p className="text-xs font-medium text-slate-600">
              {items.length} {items.length === 1 ? "receita" : "receitas"}
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
