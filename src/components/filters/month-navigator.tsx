"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  addMonthsUTC,
  monthKey,
  monthLabelTitle,
  parseMonthKey,
} from "@/lib/dates";
import { cn } from "@/lib/utils";

export function MonthNavigator({
  month,
  basePath,
  params,
  className,
}: {
  month: string;
  basePath: string;
  params?: Record<string, string | undefined>;
  className?: string;
}) {
  const router = useRouter();
  const date = parseMonthKey(month) ?? new Date();
  const previous = monthKey(addMonthsUTC(date, -1));
  const next = monthKey(addMonthsUTC(date, 1));

  function goTo(value: string) {
    const query = new URLSearchParams();
    for (const [key, item] of Object.entries(params ?? {})) {
      if (item) query.set(key, item);
    }
    query.set("mes", value);
    router.push(`${basePath}?${query.toString()}`);
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm",
        className,
      )}
    >
      <button
        type="button"
        aria-label="Mês anterior"
        onClick={() => goTo(previous)}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="min-w-[144px] text-center text-xs font-semibold text-slate-700">
        {monthLabelTitle(date)}
      </span>
      <button
        type="button"
        aria-label="Próximo mês"
        onClick={() => goTo(next)}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
