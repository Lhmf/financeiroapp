import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Tone = "emerald" | "rose" | "amber" | "sky" | "violet" | "slate";

const toneClasses: Record<Tone, string> = {
  emerald: "bg-emerald-50 text-emerald-700",
  rose: "bg-rose-50 text-rose-600",
  amber: "bg-amber-50 text-amber-600",
  sky: "bg-sky-50 text-sky-600",
  violet: "bg-violet-50 text-violet-600",
  slate: "bg-slate-100 text-slate-600",
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "slate",
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: Tone;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "flex items-start justify-between gap-2 p-3.5 transition-shadow hover:shadow-md sm:gap-3 sm:p-4",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-[10px] font-medium text-slate-600 sm:text-[11px]">
          {label}
        </p>
        <p className="tabular mt-1 text-base font-semibold tracking-tight text-slate-900 sm:text-lg">
          {value}
        </p>
        {hint ? (
          <p className="mt-0.5 text-[10px] text-slate-600 sm:text-[11px]">
            {hint}
          </p>
        ) : null}
      </div>
      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg sm:h-8 sm:w-8",
          toneClasses[tone],
        )}
      >
        <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </span>
    </Card>
  );
}
