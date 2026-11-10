const BRL_FORMATTER = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const COMPACT_FORMATTER = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

/** Formata centavos como R$ 1.234,56. */
export function formatCents(cents: number): string {
  return BRL_FORMATTER.format(cents / 100);
}

/** Formata centavos de forma compacta (R$ 1,2 mil). */
export function formatCentsCompact(cents: number): string {
  return COMPACT_FORMATTER.format(cents / 100);
}

/**
 * Converte texto digitado em reais para centavos.
 * Aceita "1234,56", "1.234,56", "1234.56", "R$ 1.234,56".
 * Retorna null para valores inválidos, zero ou negativos.
 */
export function parseBRLToCents(input: string): number | null {
  const cleaned = input
    .trim()
    .replace(/R\$\s?/gi, "")
    .replace(/\s/g, "")
    .replace(/\u00a0/g, "");

  if (!cleaned) return null;

  let normalized = cleaned;
  const hasComma = normalized.includes(",");

  if (hasComma) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  }

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;

  const value = Number(normalized);
  if (!Number.isFinite(value) || value <= 0) return null;

  const cents = Math.round(value * 100);
  if (cents > 9_999_999_999) return null;

  return cents;
}

/** Igual a parseBRLToCents, mas aceita zero (saldo inicial). */
export function parseBRLToCentsAllowZero(input: string): number | null {
  const cleaned = input
    .trim()
    .replace(/R\$\s?/gi, "")
    .replace(/\s/g, "")
    .replace(/\u00a0/g, "");

  if (!cleaned) return null;

  let normalized = cleaned;
  if (normalized.includes(",")) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  }

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;

  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) return null;

  const cents = Math.round(value * 100);
  if (cents > 9_999_999_999) return null;

  return cents;
}

/** Converte centavos para o formato usado em inputs: 1234,56. */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

/** Formata uma diferença em centavos com sinal explícito. */
export function formatSignedCents(cents: number): string {
  const sign = cents > 0 ? "+" : "";
  return `${sign}${formatCents(cents)}`;
}
