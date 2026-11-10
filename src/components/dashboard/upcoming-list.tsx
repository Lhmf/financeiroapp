import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, CalendarDays } from "lucide-react";
import { Badge, Dot } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCents } from "@/lib/money";
import { cn } from "@/lib/utils";

type UpcomingItem = {
  id: string;
  description: string;
  amountCents: number;
  dateLabel: string;
  dateISO: string;
  categoryName: string;
  categoryColor: string;
  days: number;
  kind: "expense" | "income";
};

function DateBadge({ dateISO }: { dateISO: string }) {
  const date = new Date(dateISO);
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    timeZone: "UTC",
  })
    .format(date)
    .replace(".", "");

  return (
    <span className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl bg-slate-50 text-slate-600 ring-1 ring-slate-200">
      <span className="text-[13px] font-semibold leading-none text-slate-800">
        {day}
      </span>
      <span className="mt-0.5 text-[10px] font-medium uppercase leading-none">
        {month}
      </span>
    </span>
  );
}

function dueLabel(days: number, kind: "expense" | "income") {
  if (days < 0) {
    return {
      text:
        kind === "expense"
          ? `Atrasada há ${Math.abs(days)}d`
          : `Prevista há ${Math.abs(days)}d`,
      tone: "red" as const,
    };
  }
  if (days === 0) {
    return { text: "Hoje", tone: "amber" as const };
  }
  if (days === 1) {
    return { text: "Amanhã", tone: "amber" as const };
  }
  return { text: `Em ${days} dias`, tone: "slate" as const };
}

export function UpcomingList({
  title,
  description,
  items,
  hrefBase,
  kind,
  emptyTitle,
}: {
  title: string;
  description: string;
  items: UpcomingItem[];
  hrefBase: string;
  kind: "expense" | "income";
  emptyTitle: string;
}) {
  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <p className="mt-0.5 text-xs text-slate-600">{description}</p>
        </div>
        <Link
          href={hrefBase}
          className="text-xs font-medium text-emerald-700 hover:text-emerald-800"
        >
          Ver todos
        </Link>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="h-5 w-5" />}
          title={emptyTitle}
          className="border-0 bg-transparent py-8"
        />
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((item) => {
            const due = dueLabel(item.days, kind);
            return (
              <li key={`${kind}-${item.id}`}>
                <Link
                  href={`${hrefBase}/${item.id}/editar`}
                  className="flex items-center gap-3 py-3 transition hover:opacity-80"
                >
                  <DateBadge dateISO={item.dateISO} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-slate-800">
                      {item.description}
                    </p>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-600">
                      <Dot color={item.categoryColor} />
                      <span className="truncate">{item.categoryName}</span>
                      <span>·</span>
                      <span>{item.dateLabel}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={cn(
                        "tabular text-xs font-semibold",
                        kind === "expense"
                          ? "text-rose-600"
                          : "text-emerald-700",
                      )}
                    >
                      {kind === "expense" ? "−" : "+"}
                      {formatCents(item.amountCents)}
                    </p>
                    <Badge tone={due.tone} className="mt-1">
                      {kind === "expense" ? (
                        <ArrowUpRight className="h-3 w-3" />
                      ) : (
                        <ArrowDownLeft className="h-3 w-3" />
                      )}
                      {due.text}
                    </Badge>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
