import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarClock,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { AgendaKindFilter } from "@/components/agenda/agenda-kind-filter";
import { AgendaRow } from "@/components/agenda/agenda-row";
import { AgendaTabs } from "@/components/agenda/agenda-tabs";
import { MonthNavigator } from "@/components/filters/month-navigator";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/link-button";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { parseAgendaKind } from "@/lib/agenda";
import {
  formatDate,
  formatDateLong,
  monthKey,
  monthLabelTitle,
  resolveMonth,
  toDateInput,
} from "@/lib/dates";
import { formatCents, formatSignedCents } from "@/lib/money";
import { requireUser } from "@/lib/session";
import { buildAgendaItems, listAgenda } from "@/services/agenda";

export const metadata = {
  title: "Lista financeira",
};

export default async function ListaPage({
  searchParams,
}: {
  searchParams: Promise<{
    mes?: string;
    tipo?: string;
    dia?: string;
    todos?: string;
  }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const month = resolveMonth(params.mes);
  const currentMonth = monthKey(month);
  const kind = parseAgendaKind(params.tipo);
  const all = params.todos === "1";

  const dayValue = Number(params.dia);
  const dayFilter =
    Number.isInteger(dayValue) && dayValue >= 1 && dayValue <= 31
      ? dayValue
      : null;

  const { expenses, incomes } = await listAgenda(user.id, {
    month: currentMonth,
    all,
  });

  const items = buildAgendaItems(expenses, incomes, kind).filter(
    (item) => !dayFilter || item.date.getUTCDate() === dayFilter,
  );

  const pendingCents = expenses.reduce(
    (sum, expense) => sum + expense.amountCents,
    0,
  );
  const expectedCents = incomes.reduce(
    (sum, income) => sum + income.amountCents,
    0,
  );

  const groups = new Map<string, typeof items>();
  for (const item of items) {
    const key = toDateInput(item.date);
    const list = groups.get(key);
    if (list) {
      list.push(item);
    } else {
      groups.set(key, [item]);
    }
  }

  const filterQuery = new URLSearchParams();
  if (kind !== "todos") filterQuery.set("tipo", kind);
  if (dayFilter) filterQuery.set("dia", String(dayFilter));
  const querySuffix = filterQuery.toString();
  const historyHref = `/lista?todos=1${querySuffix ? `&${querySuffix}` : ""}`;
  const monthHref = `/lista?mes=${currentMonth}${
    querySuffix ? `&${querySuffix}` : ""
  }`;
  const redirectQuery = new URLSearchParams(filterQuery);
  redirectQuery.set("mes", currentMonth);
  if (all) redirectQuery.set("todos", "1");
  const redirectTo = `/lista?${redirectQuery.toString()}`;

  return (
    <div className="animate-fade-up space-y-6">
      <PageHeader
        title="Lista financeira"
        description="Todos os lançamentos previstos, ordenados por data."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <LinkButton href="/despesas/nova" variant="outline" size="sm">
              <TrendingDown className="h-3.5 w-3.5" />
              Nova despesa
            </LinkButton>
            <LinkButton href="/receitas/nova" size="sm">
              <TrendingUp className="h-3.5 w-3.5" />
              Nova receita
            </LinkButton>
          </div>
        }
      />

      <AgendaTabs active="lista" month={currentMonth} />

      <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard
          label="Contas a pagar"
          value={formatCents(pendingCents)}
          hint={`${expenses.length} pendente(s)`}
          icon={TrendingDown}
          tone="rose"
        />
        <StatCard
          label="Contas a receber"
          value={formatCents(expectedCents)}
          hint={`${incomes.length} prevista(s)`}
          icon={TrendingUp}
          tone="emerald"
        />
        <StatCard
          label="Saldo previsto"
          value={formatSignedCents(expectedCents - pendingCents)}
          hint="A receber − a pagar"
          icon={Wallet}
          tone={expectedCents - pendingCents < 0 ? "amber" : "slate"}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <MonthNavigator
          month={currentMonth}
          basePath="/lista"
          params={{ tipo: kind === "todos" ? undefined : kind }}
        />
        <Link
          href={all ? monthHref : historyHref}
          className="text-xs font-medium text-emerald-700 hover:text-emerald-800"
        >
          {all ? "Ver apenas este mês" : "Ver todo o histórico"}
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <AgendaKindFilter
          basePath="/lista"
          month={currentMonth}
          kind={kind}
          day={dayFilter}
          all={all}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="blue">
            {monthLabelTitle(month)}
            {all ? " · histórico" : ""}
          </Badge>
          {dayFilter ? (
            <Link
              href={`/lista?mes=${currentMonth}${
                kind === "todos" ? "" : `&tipo=${kind}`
              }`}
              className="text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              Limpar dia {dayFilter}
            </Link>
          ) : null}
          {kind !== "todos" || dayFilter || all ? (
            <Link
              href={`/lista?mes=${currentMonth}`}
              className="text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              Limpar filtros
            </Link>
          ) : null}
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<CalendarClock className="h-5 w-5" />}
          title="Nenhum lançamento encontrado"
          description={
            dayFilter
              ? `Não há contas para o dia ${dayFilter} neste período.`
              : "Não há contas a pagar ou a receber com os filtros atuais."
          }
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <LinkButton href="/despesas/nova" variant="outline" size="sm">
                <ArrowUpRight className="h-3.5 w-3.5" />
                Nova despesa
              </LinkButton>
              <LinkButton href="/receitas/nova" size="sm">
                <ArrowDownLeft className="h-3.5 w-3.5" />
                Nova receita
              </LinkButton>
            </div>
          }
        />
      ) : (
        <div className="space-y-4">
          {Array.from(groups.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([dateKey, group]) => (
              <Card key={dateKey}>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {formatDateLong(dateKey)}
                    </p>
                    <p className="text-[11px] text-slate-600">
                      {group.length}{" "}
                      {group.length === 1 ? "lançamento" : "lançamentos"}
                    </p>
                  </div>
                  <Badge tone="slate">{formatDate(dateKey)}</Badge>
                </div>
                <ul className="divide-y divide-slate-100">
                  {group.map((item) => (
                    <AgendaRow
                      key={`${item.kind}-${item.id}`}
                      item={item}
                      redirectTo={redirectTo}
                    />
                  ))}
                </ul>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
}
