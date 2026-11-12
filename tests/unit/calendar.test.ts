import { describe, expect, it } from "vitest";
import { buildMonthGrid } from "@/lib/calendar";

describe("buildMonthGrid", () => {
  it("alinha o primeiro dia na coluna correta e completa semanas", () => {
    // 1º de novembro de 2026 é domingo; o mês tem 30 dias.
    const grid = buildMonthGrid(new Date("2026-11-01T00:00:00.000Z"));
    expect(grid).toHaveLength(35);
    expect(grid[0]).toEqual({
      day: 1,
      date: new Date("2026-11-01T00:00:00.000Z"),
    });
    expect(grid[29]?.day).toBe(30);
    expect(grid[34]).toBeNull();
  });

  it("preenche o início quando o mês não começa no domingo", () => {
    // 1º de outubro de 2026 é quinta-feira.
    const grid = buildMonthGrid(new Date("2026-10-01T00:00:00.000Z"));
    expect(grid.slice(0, 4)).toEqual([null, null, null, null]);
    expect(grid[4]?.day).toBe(1);
    expect(grid).toHaveLength(35);
  });

  it("lida com fevereiro em ano não bissexto", () => {
    const grid = buildMonthGrid(new Date("2026-02-01T00:00:00.000Z"));
    expect(grid.filter(Boolean)).toHaveLength(28);
    expect(grid[27]?.day).toBe(28);
  });
});
