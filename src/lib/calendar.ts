export type MonthGridCell = { day: number; date: Date } | null;

/**
 * Monta a grade do mês em semanas de domingo a sábado.
 * Células vazias no início e no fim completam a última semana.
 */
export function buildMonthGrid(month: Date): MonthGridCell[] {
  const year = month.getUTCFullYear();
  const monthIndex = month.getUTCMonth();
  const firstWeekday = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
  const daysInMonth = new Date(
    Date.UTC(year, monthIndex + 1, 0),
  ).getUTCDate();

  const cells: MonthGridCell[] = [];

  for (let i = 0; i < firstWeekday; i++) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({
      day,
      date: new Date(Date.UTC(year, monthIndex, day)),
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}
