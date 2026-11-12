import Link from "next/link";
import { AGENDA_KINDS, type AgendaKind } from "@/lib/agenda";
import { cn } from "@/lib/utils";

export function AgendaKindFilter({
  basePath,
  month,
  kind,
  day,
  all = false,
}: {
  basePath: string;
  month: string;
  kind: AgendaKind;
  day?: number | null;
  all?: boolean;
}) {
  function hrefFor(value: AgendaKind) {
    const params = new URLSearchParams();
    params.set("mes", month);
    if (day) params.set("dia", String(day));
    if (all) params.set("todos", "1");
    if (value !== "todos") params.set("tipo", value);
    return `${basePath}?${params.toString()}`;
  }

  return (
    <div
      role="group"
      aria-label="Filtrar por tipo"
      className="inline-flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm"
    >
      {AGENDA_KINDS.map((option) => {
        const isActive = option.value === kind;

        return (
          <Link
            key={option.value}
            href={hrefFor(option.value)}
            aria-current={isActive ? "true" : undefined}
            className={cn(
              "inline-flex h-8 items-center rounded-lg px-3 text-xs font-medium transition-colors",
              isActive
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
            )}
          >
            {option.label}
          </Link>
        );
      })}
    </div>
  );
}
