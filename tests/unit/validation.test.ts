import { describe, expect, it } from "vitest";
import { debtPaymentSchema, expenseSchema } from "@/lib/validation";

const validExpense = {
  description: "Despesa de teste",
  amount: "10,00",
  categoryId: "",
  dueDate: "2026-11-10",
  paidDate: "2026-11-10",
  type: "VARIABLE",
  paymentMethod: "",
  financialAccountId: "account-id",
  status: "PAID",
  installmentNumber: "",
  installmentTotal: "",
  notes: "",
};

describe("expenseSchema", () => {
  it("aceita forma de pagamento vazia como não informada", () => {
    const result = expenseSchema.safeParse(validExpense);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.paymentMethod).toBeUndefined();
    }
  });

  it("continua aceitando uma forma de pagamento válida", () => {
    const result = expenseSchema.safeParse({
      ...validExpense,
      paymentMethod: "PIX",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.paymentMethod).toBe("PIX");
    }
  });

  it("rejeita uma forma de pagamento desconhecida", () => {
    const result = expenseSchema.safeParse({
      ...validExpense,
      paymentMethod: "CHEQUE",
    });

    expect(result.success).toBe(false);
  });
});

describe("debtPaymentSchema", () => {
  it("aceita forma de pagamento vazia como não informada", () => {
    const result = debtPaymentSchema.safeParse({
      debtId: "debt-id",
      amount: "30,00",
      paidAt: "2026-11-10",
      financialAccountId: "account-id",
      paymentMethod: "",
      createExpense: "on",
      notes: "",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.paymentMethod).toBeUndefined();
      expect(result.data.createExpense).toBe(true);
    }
  });
});
