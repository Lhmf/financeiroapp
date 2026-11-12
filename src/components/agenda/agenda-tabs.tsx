import Link from "next/link";
import { cn } from "@/lib/utils";

export type AgendaTab = "calendario" | "lista" | "pagar" | "receber";

const TABS: Array<{ key: AgendaTab; href: string; label: string }> = [
  { key: "calendario", href: "/calendario", label: "Calendário" },
  { key: "lista", href: "/lista", label: "Lista" },
  { key: "pagar", href: "/contas-a-pagar", label: "Contas a pagar" },
  { key: "receber", href: "/contas-a-receber", label: "Contas a receber" },
];

export function AgendaTabs({
  active,
  month,
}: {
  active: AgendaTab;
  month?: string;
}) {
  const suffix = month ? `?mes=${month}` : "";

  return (
    <div
      role="navigation"
      aria-label="Áreas da agenda financeira"
      className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm"
    >
      {TABS.map((tab) => {
        const isActive = tab.key === active;

        return (
          <Link
            key={tab.key}
            href={`${tab.href}${suffix}`}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "inline-flex h-8 items-center rounded-lg px-3 text-xs font-medium transition-colors",
              isActive
                ? "bg-emerald-700 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
