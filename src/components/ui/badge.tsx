import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "green" | "red" | "amber" | "blue" | "violet" | "slate";

const toneClasses: Record<Tone, string> = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/10",
  red: "bg-rose-50 text-rose-700 ring-rose-600/10",
  amber: "bg-amber-50 text-amber-700 ring-amber-600/10",
  blue: "bg-sky-50 text-sky-700 ring-sky-600/10",
  violet: "bg-violet-50 text-violet-700 ring-violet-600/10",
  slate: "bg-slate-100 text-slate-600 ring-slate-500/10",
};

export function Badge({
  tone = "slate",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}

export function Dot({ color }: { color: string }) {
  return (
    <span
      className="inline-block h-2 w-2 shrink-0 rounded-full"
      style={{ backgroundColor: color }}
    />
  );
}
