import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarClock,
  Clock3,
  CreditCard,
  PiggyBank,
  Wallet,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatCents } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { DashboardData } from "@/services/dashboard";

function MetricCard({
  label,
  value,
  hint,
  icon,
  tone = "slate",
  valueClassName,
  variant = "default",
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
  tone?: "slate" | "emerald" | "rose" | "amber" | "violet";
  valueClassName?: string;
  variant?: "default" | "primary";
}) {
  const tones = {
    slate: "bg-slate-100 text-slate-600",
    emerald: "bg-emerald-50 text-emerald-600",
    rose: "bg-rose-50 text-rose-600",
    amber: "bg-amber-50 text-amber-600",
    violet: "bg-violet-50 text-violet-600",
  } as const;
  const primary = variant === "primary";

  return (
    <Card
      className={cn(
        "relative overflow-hidden p-5 transition-shadow hover:shadow-md",
        primary &&
          "border-emerald-500/20 bg-gradient-to-br from-emerald-600 via-emerald-600 to-teal-700 text-white shadow-lg shadow-emerald-900/10",
      )}
    >
      {primary ? (
        <span
          aria-hidden
          className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl"
        />
      ) : null}
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p
            className={cn(
              "text-xs font-medium",
              primary ? "text-emerald-50/80" : "text-slate-500",
            )}
          >
            {label}
          </p>
          <p
            className={cn(
              "tabular mt-2 text-2xl font-semibold tracking-tight",
              primary ? "text-white" : "text-slate-900",
              valueClassName,
            )}
          >
            {value}
          </p>
          <p
            className={cn(
              "mt-1 text-[11px]",
              primary ? "text-emerald-50/60" : "text-slate-400",
            )}
          >
            {hint}
          </p>
        </div>
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
            primary ? "bg-white/15 text-white" : tones[tone],
          )}
        >
          {icon}
        </span>
      </div>
    </Card>
  );
}

export function SummaryCards({ data }: { data: DashboardData }) {
  const resultPositive = data.monthResultCents >= 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Saldo atual"
          value={formatCents(data.totalBalanceCents)}
          hint="Somente dinheiro realizado"
          icon={<Wallet className="h-4 w-4" />}
          tone="slate"
          variant="primary"
        />
        <MetricCard
          label="Receitas recebidas"
          value={formatCents(data.monthReceivedCents)}
          hint="Entrou de fato neste mês"
          icon={<ArrowDownLeft className="h-4 w-4" />}
          tone="emerald"
          valueClassName="text-emerald-700"
        />
        <MetricCard
          label="Despesas pagas"
          value={formatCents(data.monthPaidCents)}
          hint="Saiu de fato neste mês"
          icon={<ArrowUpRight className="h-4 w-4" />}
          tone="rose"
          valueClassName="text-rose-700"
        />
        <MetricCard
          label="Resultado do mês"
          value={formatCents(data.monthResultCents)}
          hint="Receitas recebidas − despesas pagas"
          icon={<PiggyBank className="h-4 w-4" />}
          tone={resultPositive ? "emerald" : "rose"}
          valueClassName={resultPositive ? "text-emerald-700" : "text-rose-700"}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="flex items-center gap-3 p-4 transition-shadow hover:shadow-md">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
            <Clock3 className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium text-slate-500">
              Receitas previstas
            </p>
            <p className="tabular text-base font-semibold text-slate-900">
              {formatCents(data.expectedIncomeCents)}
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
            {data.expectedIncomeCount}
          </span>
        </Card>

        <Card className="flex items-center gap-3 p-4 transition-shadow hover:shadow-md">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <CalendarClock className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium text-slate-500">
              Despesas pendentes
            </p>
            <p className="tabular text-base font-semibold text-slate-900">
              {formatCents(data.pendingExpenseCents)}
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
            {data.pendingExpenseCount}
          </span>
        </Card>

        <Card className="flex items-center gap-3 p-4 transition-shadow hover:shadow-md">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <CreditCard className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium text-slate-500">
              Dívidas ativas
            </p>
            <p className="tabular text-base font-semibold text-slate-900">
              {formatCents(data.totalDebtCents)}
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
            {data.activeDebtCount}
          </span>
        </Card>
      </div>
    </div>
  );
}
