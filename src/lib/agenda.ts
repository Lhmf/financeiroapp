export type AgendaKind = "todos" | "pagar" | "receber";

export const AGENDA_KINDS = [
  { value: "todos", label: "Todos" },
  { value: "pagar", label: "A pagar" },
  { value: "receber", label: "A receber" },
] as const satisfies ReadonlyArray<{ value: AgendaKind; label: string }>;

/** Normaliza o filtro de tipo vindo da URL. */
export function parseAgendaKind(value?: string | null): AgendaKind {
  return value === "pagar" || value === "receber" ? value : "todos";
}
