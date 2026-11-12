import { describe, expect, it } from "vitest";
import {
  addDaysUTC,
  addMonthsUTC,
  daysUntil,
  formatDate,
  lastMonths,
  monthKey,
  monthLabel,
  monthLabelTitle,
  monthRangeUTC,
  parseDateInput,
  parseMonthKey,
  resolveMonth,
  startOfMonthUTC,
  toDateInput,
} from "@/lib/dates";

describe("parseDateInput", () => {
  it("converte uma data válida em UTC", () => {
    const date = parseDateInput("2026-11-10");
    expect(date).not.toBeNull();
    expect(date?.toISOString()).toBe("2026-11-10T00:00:00.000Z");
  });

  it("rejeita formatos e datas impossíveis", () => {
    expect(parseDateInput("10/11/2026")).toBeNull();
    expect(parseDateInput("2026-02-30")).toBeNull();
    expect(parseDateInput("2026-13-01")).toBeNull();
  });
});

describe("toDateInput", () => {
  it("devolve YYYY-MM-DD para inputs", () => {
    expect(toDateInput(new Date("2026-11-10T00:00:00.000Z"))).toBe(
      "2026-11-10",
    );
    expect(toDateInput("2026-11-10T12:00:00.000Z")).toBe("2026-11-10");
  });

  it("devolve string vazia para valores ausentes ou inválidos", () => {
    expect(toDateInput(null)).toBe("");
    expect(toDateInput(undefined)).toBe("");
    expect(toDateInput("data-invalida")).toBe("");
  });
});

describe("formatDate", () => {
  it("formata no padrão brasileiro usando UTC", () => {
    expect(formatDate("2026-11-10T00:00:00.000Z")).toBe("10/11/2026");
    expect(formatDate(null)).toBe("—");
  });
});

describe("meses", () => {
  it("calcula início do mês e intervalo", () => {
    const date = new Date("2026-11-10T00:00:00.000Z");
    expect(startOfMonthUTC(date).toISOString()).toBe(
      "2026-11-01T00:00:00.000Z",
    );
    const range = monthRangeUTC(date);
    expect(range.start.toISOString()).toBe("2026-11-01T00:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-12-01T00:00:00.000Z");
  });

  it("avança meses e gera a chave YYYY-MM", () => {
    const date = new Date("2026-11-10T00:00:00.000Z");
    expect(addMonthsUTC(date, 2).toISOString()).toBe(
      "2027-01-01T00:00:00.000Z",
    );
    expect(monthKey(date)).toBe("2026-11");
  });

  it("valida e resolve chaves de mês", () => {
    expect(parseMonthKey("2026-11")?.toISOString()).toBe(
      "2026-11-01T00:00:00.000Z",
    );
    expect(parseMonthKey("2026-13")).toBeNull();
    expect(parseMonthKey("2026-11-01")).toBeNull();
    expect(resolveMonth("2026-11").toISOString()).toBe(
      "2026-11-01T00:00:00.000Z",
    );
  });

  it("lista os últimos meses em ordem cronológica", () => {
    const months = lastMonths(3, new Date("2026-11-10T00:00:00.000Z"));
    expect(months.map((month) => month.key)).toEqual([
      "2026-09",
      "2026-10",
      "2026-11",
    ]);
  });

  it("gera rótulos com a preposição em minúscula", () => {
    const date = new Date("2026-11-10T00:00:00.000Z");
    expect(monthLabel(date)).toBe("novembro de 2026");
    expect(monthLabelTitle(date)).toBe("Novembro de 2026");
  });
});

describe("daysUntil", () => {
  it("conta dias futuros e passados", () => {
    const reference = new Date("2026-11-10T00:00:00.000Z");
    expect(daysUntil(new Date("2026-11-15T00:00:00.000Z"), reference)).toBe(5);
    expect(daysUntil(new Date("2026-11-05T00:00:00.000Z"), reference)).toBe(
      -5,
    );
    expect(daysUntil(reference, reference)).toBe(0);
  });
});

describe("addDaysUTC", () => {
  it("soma dias atravessando meses e anos", () => {
    expect(
      addDaysUTC(new Date("2026-11-30T00:00:00.000Z"), 1).toISOString(),
    ).toBe("2026-12-01T00:00:00.000Z");
    expect(
      addDaysUTC(new Date("2026-12-31T00:00:00.000Z"), 1).toISOString(),
    ).toBe("2027-01-01T00:00:00.000Z");
  });
});
