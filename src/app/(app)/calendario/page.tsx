import Link from "next/link";
import {
  CalendarClock,
  Clock3,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { AgendaKindFilter } from "@/components/agenda/agenda-kind-filter";
import { AgendaTabs } from "@/components/agenda/agenda-tabs";
import { MonthNavigator } from "@/components/filters/month-navigator";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/link-button";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { parseAgendaKind } from "@/lib/agenda";
import { buildMonthGrid } from "@/lib/calendar";
import {
  monthKey,
  monthLabelTitle,
  resolveMonth,
  toDateInput,
  todayUTC,
} from "@/lib/dates";
import { formatCents, formatSignedCents } from "@/lib/money";
import { requireUser } from "@/lib/session";
import { buildAgendaItems, listAgenda } from "@/services/agenda";

export const metadata = {
  title: "Calendário financeiro",
};

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; tipo?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const month = resolveMonth(params.mes);
  const currentMonth = monthKey(month);
  const kind = parseAgendaKind(params.tipo);
  const today = toDateInput(todayUTC());

  const { expenses, incomes } = await listAgenda(user.id, {
    month: currentMonth,
  });
  const items = buildAgendaItems(expenses, incomes, kind);

  const pendingCents = expenses.reduce(
    (sum, expense) => sum + expense.amountCents,
    0,
  );
  const expectedCents = incomes.reduce(
    (sum, income) => sum + income.amountCents,
    0,
  );

  const itemsByDate = new Map<string, typeof items>();
  for (const item of items) {
    const key = toDateInput(item.date);
    const list = itemsByDate.get(key);
    if (list) {
      list.push(item);
    } else {
      itemsByDate.set(key, [item]);
    }
  }

  const grid = buildMonthGrid(month);

  return (
    <div className="animate-fade-up space-y-6">
      <PageHeader
        title="Calendário financeiro"
        description="Contas a pagar e a receber no mesmo lugar, com filtro por tipo."
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

      <AgendaTabs active="calendario" month={currentMonth} />

      <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard
          label="Contas a pagar"
          value={formatCents(pendingCents)}
          hint={`${expenses.length} pendente(s) em ${monthLabelTitle(month)}`}
          icon={TrendingDown}
          tone="rose"
        />
        <StatCard
          label="Contas a receber"
          value={formatCents(expectedCents)}
          hint={`${incomes.length} prevista(s) em ${monthLabelTitle(month)}`}
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

      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <MonthNavigator
                month={currentMonth}
                basePath="/calendario"
                params={{
                  tipo: kind === "todos" ? undefined : kind,
                }}
              />
              <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-600">
                <CalendarClock className="h-3.5 w-3.5" />
                {monthLabelTitle(month)}
              </span>
            </div>
            <AgendaKindFilter
              basePath="/calendario"
              month={currentMonth}
              kind={kind}
            />
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            {WEEKDAYS.map((weekday) => (
              <div key={weekday} className="py-1">
                {weekday}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {grid.map((cell, index) => {
              if (!cell) {
                return (
                  <div
                    key={`empty-${index}`}
                    className="min-h-16 rounded-lg bg-slate-50/50 sm:min-h-24"
                  />
                );
              }

              const key = toDateInput(cell.date);
              const dayItems = itemsByDate.get(key) ?? [];
              const toPay = dayItems.filter(
                (item) => item.kind === "expense",
              ).length;
              const toReceive = dayItems.filter(
                (item) => item.kind === "income",
              ).length;
              const isToday = key === today;
              const href = `/lista?mes=${currentMonth}${
                kind === "todos" ? "" : `&tipo=${kind}`
              }&dia=${cell.day}`;

              return (
                <Link
                  key={key}
                  href={href}
                  className={
                    "min-h-16 rounded-lg border p-1.5 transition-colors sm:min-h-24 " +
                    (isToday
                      ? "border-emerald-500 bg-emerald-50/70 hover:bg-emerald-100/70"
                      : "border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/40")
                  }
                >
                  <span
                    className={
                      "inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold " +
                      (isToday
                        ? "bg-emerald-700 text-white"
                        : "text-slate-700")
                    }
                  >
                    {cell.day}
                  </span>

                  <div className="mt-1 flex flex-wrap gap-1">
                    {toPay > 0 ? (
                      <span className="inline-flex items-center gap-0.5 rounded bg-rose-50 px-1 text-[10px] font-semibold text-rose-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                        {toPay}
                      </span>
                    ) : null}
                    {toReceive > 0 ? (
                      <span className="inline-flex items-center gap-0.5 rounded bg-emerald-50 px-1 text-[10px] font-semibold text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {toReceive}
                      </span>
                    ) : null}
                  </div>

                  {dayItems[0] ? (
                    <span className="mt-1 block truncate text-[10px] leading-tight text-slate-600">
                      {dayItems[0].description}
                    </span>
                  ) : null}
                  {dayItems.length > 1 ? (
                    <span className="block text-[10px] text-slate-500">
                      +{dayItems.length - 1} lançamento(s)
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-[11px] text-slate-600">
            <span className="inline-flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                A pagar
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                A receber
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock3 className="h-3 w-3" />
                Clique em um dia para abrir a lista
              </span>
            </span>
            <Link
              href={`/lista?mes=${currentMonth}${
                kind === "todos" ? "" : `&tipo=${kind}`
              }`}
              className="font-medium text-emerald-700 hover:text-emerald-800"
            >
              Ver lista completa
            </Link>
          </div>

          {items.length === 0 ? (
            <EmptyState
              title="Nenhuma conta neste mês"
              description="Cadastre uma despesa pendente ou uma receita prevista para ela aparecer aqui."
              action={
                <div className="flex flex-wrap items-center justify-center gap-2">
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
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
