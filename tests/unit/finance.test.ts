import { describe, expect, it } from "vitest";
import {
  calculateAccountBalance,
  calculateDebtBalance,
  calculateDebtPaid,
  calculateDebtProgress,
  calculateMonthResult,
  isDebtPaid,
  safePercent,
  sumCents,
  sumUnlinkedDebtPayments,
  variationPercent,
} from "@/lib/finance";

describe("sumCents", () => {
  it("soma valores iteráveis", () => {
    expect(sumCents([100, 250, 5])).toBe(355);
    expect(sumCents([])).toBe(0);
  });
});

describe("calculateAccountBalance", () => {
  it("considera apenas dinheiro realizado e pagamentos sem despesa", () => {
    expect(
      calculateAccountBalance({
        initialBalanceCents: 100_000,
        receivedIncomeCents: 659_000,
        paidExpenseCents: 515_900,
        unlinkedDebtPaymentCents: 20_000,
      }),
    ).toBe(223_100);
  });

  it("não desconta pagamento de dívida que já tem despesa vinculada", () => {
    const withLinkedExpense = calculateAccountBalance({
      initialBalanceCents: 0,
      receivedIncomeCents: 100_000,
      paidExpenseCents: 50_000,
      unlinkedDebtPaymentCents: 0,
    });
    expect(withLinkedExpense).toBe(50_000);
  });
});

describe("calculateMonthResult", () => {
  it("subtrai despesas pagas e dívidas sem vínculo", () => {
    expect(
      calculateMonthResult({
        receivedIncomeCents: 700_000,
        paidExpenseCents: 400_000,
        unlinkedDebtPaymentCents: 50_000,
      }),
    ).toBe(250_000);
  });
});

describe("dívidas", () => {
  const payments = [50_000, 30_000];

  it("calcula total pago e saldo devedor", () => {
    expect(calculateDebtPaid(payments)).toBe(80_000);
    expect(calculateDebtBalance(100_000, payments)).toBe(20_000);
  });

  it("nunca deixa o saldo devedor negativo", () => {
    expect(calculateDebtBalance(100_000, [90_000, 30_000])).toBe(0);
  });

  it("calcula progresso limitado a 100%", () => {
    expect(calculateDebtProgress(100_000, 0)).toBe(0);
    expect(calculateDebtProgress(100_000, 50_000)).toBe(50);
    expect(calculateDebtProgress(100_000, 150_000)).toBe(100);
    expect(calculateDebtProgress(0, 100)).toBe(0);
  });

  it("identifica quitação", () => {
    expect(isDebtPaid(100_000, 100_000)).toBe(true);
    expect(isDebtPaid(100_000, 99_999)).toBe(false);
  });
});

describe("sumUnlinkedDebtPayments", () => {
  it("soma somente pagamentos sem despesa vinculada", () => {
    expect(
      sumUnlinkedDebtPayments([
        { amountCents: 10_000, expenseId: null },
        { amountCents: 25_000, expenseId: "expense-1" },
        { amountCents: 5_000, expenseId: null },
      ]),
    ).toBe(15_000);
  });
});

describe("percentuais", () => {
  it("calcula variação percentual", () => {
    expect(variationPercent(150, 100)).toBe(50);
    expect(variationPercent(50, 100)).toBe(-50);
    expect(variationPercent(0, 0)).toBe(0);
    expect(variationPercent(100, 0)).toBe(100);
  });

  it("calcula participação com total zero sem divisão por zero", () => {
    expect(safePercent(25, 100)).toBe(25);
    expect(safePercent(30, 0)).toBe(0);
    expect(safePercent(150, 100)).toBe(100);
  });
});
