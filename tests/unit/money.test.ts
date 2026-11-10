import { describe, expect, it } from "vitest";
import {
  centsToInput,
  formatSignedCents,
  parseBRLToCents,
  parseBRLToCentsAllowZero,
} from "@/lib/money";

describe("parseBRLToCents", () => {
  it("aceita vírgula como separador decimal", () => {
    expect(parseBRLToCents("1234,56")).toBe(123456);
    expect(parseBRLToCents("0,99")).toBe(99);
    expect(parseBRLToCents("10,5")).toBe(1050);
  });

  it("aceita ponto de milhar e símbolo de moeda", () => {
    expect(parseBRLToCents("R$ 1.234,56")).toBe(123456);
    expect(parseBRLToCents("1.000,00")).toBe(100000);
  });

  it("aceita ponto como separador decimal", () => {
    expect(parseBRLToCents("1234.56")).toBe(123456);
  });

  it("rejeita zero, negativos, texto e mais de duas casas", () => {
    expect(parseBRLToCents("0")).toBeNull();
    expect(parseBRLToCents("-10,00")).toBeNull();
    expect(parseBRLToCents("abc")).toBeNull();
    expect(parseBRLToCents("10,999")).toBeNull();
    expect(parseBRLToCents("")).toBeNull();
  });

  it("rejeita valores acima do limite do app", () => {
    expect(parseBRLToCents("100.000.000,00")).toBeNull();
  });
});

describe("parseBRLToCentsAllowZero", () => {
  it("aceita zero para saldo inicial", () => {
    expect(parseBRLToCentsAllowZero("0")).toBe(0);
    expect(parseBRLToCentsAllowZero("0,00")).toBe(0);
  });

  it("continua rejeitando negativos e texto", () => {
    expect(parseBRLToCentsAllowZero("-1")).toBeNull();
    expect(parseBRLToCentsAllowZero("abc")).toBeNull();
  });
});

describe("centsToInput", () => {
  it("converte centavos para o formato de edição", () => {
    expect(centsToInput(123456)).toBe("1234,56");
    expect(centsToInput(0)).toBe("0,00");
    expect(centsToInput(5)).toBe("0,05");
  });
});

describe("formatSignedCents", () => {
  it("adiciona sinal positivo e mantém o negativo", () => {
    expect(formatSignedCents(1000)).toMatch(/^\+/);
    expect(formatSignedCents(-1000)).not.toMatch(/^\+/);
  });
});
