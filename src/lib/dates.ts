const MONTHS_PT = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

const WEEKDAYS_PT = [
  "domingo",
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
];

/** Data de hoje no fuso local, normalizada para UTC (meia-noite). */
export function todayUTC(now = new Date()): Date {
  return new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
  );
}

/** Converte "YYYY-MM-DD" em Date UTC. Retorna null se inválida. */
export function parseDateInput(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

/** Converte Date (ou string ISO) em "YYYY-MM-DD" para inputs. */
export function toDateInput(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

/** Formata como dd/MM/yyyy usando UTC. */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

/** Formata como "10 de novembro". */
export function formatDateShort(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  })
    .format(d)
    .replace(".", "");
}

/** Formata como "segunda-feira, 10 de novembro". */
export function formatDateLong(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  return `${WEEKDAYS_PT[d.getUTCDay()]}, ${d.getUTCDate()} de ${
    MONTHS_PT[d.getUTCMonth()]
  }`;
}

export function startOfMonthUTC(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function addMonthsUTC(date: Date, months: number): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1),
  );
}

/** Soma dias inteiros preservando o horário UTC. */
export function addDaysUTC(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

/** Intervalo [início, início do mês seguinte). */
export function monthRangeUTC(date: Date): { start: Date; end: Date } {
  const start = startOfMonthUTC(date);
  return { start, end: addMonthsUTC(start, 1) };
}

/** "YYYY-MM" a partir de uma data. */
export function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(
    2,
    "0",
  )}`;
}

/** Valida "YYYY-MM" e devolve o início do mês. */
export function parseMonthKey(value: string | undefined | null): Date | null {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return null;
  const [year, month] = value.split("-").map(Number);
  if (month < 1 || month > 12) return null;
  const date = new Date(Date.UTC(year, month - 1, 1));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1) {
    return null;
  }
  return date;
}

/** Mês atual ou o informado em ?mes=YYYY-MM. */
export function resolveMonth(value?: string | null): Date {
  return parseMonthKey(value) ?? startOfMonthUTC(todayUTC());
}

/** Rótulo "novembro de 2026". */
export function monthLabel(date: Date): string {
  return `${MONTHS_PT[date.getUTCMonth()]} de ${date.getUTCFullYear()}`;
}

/** Rótulo "Novembro de 2026", para títulos e navegadores. */
export function monthLabelTitle(date: Date): string {
  const label = monthLabel(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Rótulo curto "nov/2026". */
export function monthLabelShort(date: Date): string {
  return `${MONTHS_PT[date.getUTCMonth()].slice(0, 3)}/${date.getUTCFullYear()}`;
}

/** Últimos N meses (incluindo o mês de referência), do mais antigo ao atual. */
export function lastMonths(
  count: number,
  reference: Date,
): Array<{ key: string; label: string; start: Date; end: Date }> {
  const result = [];
  for (let i = count - 1; i >= 0; i--) {
    const start = addMonthsUTC(startOfMonthUTC(reference), -i);
    const end = addMonthsUTC(start, 1);
    result.push({
      key: monthKey(start),
      label: monthLabelShort(start),
      start,
      end,
    });
  }
  return result;
}

/** Dias inteiros entre hoje e a data (UTC). Negativo = atrasado. */
export function daysUntil(date: Date, reference = todayUTC()): number {
  const MS_PER_DAY = 86_400_000;
  return Math.round((date.getTime() - reference.getTime()) / MS_PER_DAY);
}

/** Chave de mês de uma data possivelmente nula. */
export function monthKeyOf(date: Date | null | undefined): string | null {
  return date ? monthKey(date) : null;
}
