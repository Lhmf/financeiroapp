"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  addMonthsUTC,
  monthKey,
  monthLabel,
  parseMonthKey,
} from "@/lib/dates";
import { cn } from "@/lib/utils";

export function MonthNavigator({
  month,
  basePath,
  className,
}: {
  month: string;
  basePath: string;
  className?: string;
}) {
  const router = useRouter();
  const date = parseMonthKey(month) ?? new Date();
  const previous = monthKey(addMonthsUTC(date, -1));
  const next = monthKey(addMonthsUTC(date, 1));

  function goTo(value: string) {
    router.push(`${basePath}?mes=${value}`);
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
        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="min-w-[144px] text-center text-xs font-semibold capitalize text-slate-700">
        {monthLabel(date)}
      </span>
      <button
        type="button"
        aria-label="Próximo mês"
        onClick={() => goTo(next)}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
