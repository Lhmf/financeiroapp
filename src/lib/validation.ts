import { z } from "zod";
import { parseBRLToCents, parseBRLToCentsAllowZero } from "./money";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const money = z
  .string()
  .trim()
  .min(1, "Informe o valor.")
  .refine((value) => parseBRLToCents(value) !== null, "Valor inválido.");

const moneyAllowZero = z
  .string()
  .trim()
  .min(1, "Informe o valor.")
  .refine(
    (value) => parseBRLToCentsAllowZero(value) !== null,
    "Valor inválido.",
  );

const dateString = z
  .string()
  .trim()
  .regex(DATE_RE, "Informe uma data válida.");

const optionalDateString = z.preprocess(
  (value) => (value === "" || value == null ? undefined : value),
  z.string().trim().regex(DATE_RE, "Informe uma data válida.").optional(),
);

const optionalId = z.preprocess(
  (value) => (value === "" || value == null ? undefined : value),
  z.string().trim().min(1).optional(),
);

const optionalText = z.preprocess(
  (value) => (value === "" || value == null ? undefined : value),
  z.string().trim().max(500, "Máximo de 500 caracteres.").optional(),
);

const optionalShortText = z.preprocess(
  (value) => (value === "" || value == null ? undefined : value),
  z.string().trim().max(120, "Máximo de 120 caracteres.").optional(),
);

const optionalPositiveInt = z.preprocess(
  (value) =>
    value === "" || value == null
      ? undefined
      : typeof value === "string"
        ? Number(value)
        : value,
  z.number().int().positive().optional(),
);

const color = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida.");

export const incomeStatusSchema = z.enum(["EXPECTED", "RECEIVED"]);
export const expenseStatusSchema = z.enum(["PENDING", "PAID"]);
export const expenseTypeSchema = z.enum([
  "FIXED",
  "VARIABLE",
  "OCCASIONAL",
  "INSTALLMENT",
]);
export const paymentMethodSchema = z.enum([
  "PIX",
  "CASH",
  "DEBIT",
  "CREDIT",
  "BOLETO",
  "TRANSFER",
  "OTHER",
]);
export const accountTypeSchema = z.enum([
  "CHECKING",
  "SAVINGS",
  "CASH",
  "INVESTMENT",
  "CREDIT_CARD",
  "OTHER",
]);
export const debtTypeSchema = z.enum([
  "CREDIT_CARD",
  "LOAN",
  "FINANCING",
  "INSTALLMENT",
  "TAX",
  "OTHER",
]);
export const categoryTypeSchema = z.enum(["INCOME", "EXPENSE"]);

export const incomeSchema = z
  .object({
    description: z
      .string()
      .trim()
      .min(1, "Informe a descrição.")
      .max(120, "Máximo de 120 caracteres."),
    amount: money,
    categoryId: optionalId,
    source: optionalShortText,
    expectedDate: dateString,
    receivedDate: optionalDateString,
    financialAccountId: optionalId,
    status: incomeStatusSchema,
    notes: optionalText,
  })
  .superRefine((data, ctx) => {
    if (data.status === "RECEIVED") {
      if (!data.receivedDate) {
        ctx.addIssue({
          code: "custom",
          path: ["receivedDate"],
          message: "Informe a data de recebimento.",
        });
      }
      if (!data.financialAccountId) {
        ctx.addIssue({
          code: "custom",
          path: ["financialAccountId"],
          message: "Selecione a conta de destino.",
        });
      }
    }
  });

export const expenseSchema = z
  .object({
    description: z
      .string()
      .trim()
      .min(1, "Informe a descrição.")
      .max(120, "Máximo de 120 caracteres."),
    amount: money,
    categoryId: optionalId,
    dueDate: dateString,
    paidDate: optionalDateString,
    type: expenseTypeSchema,
    paymentMethod: paymentMethodSchema.optional(),
    financialAccountId: optionalId,
    status: expenseStatusSchema,
    installmentNumber: optionalPositiveInt,
    installmentTotal: optionalPositiveInt,
    notes: optionalText,
  })
  .superRefine((data, ctx) => {
    if (data.status === "PAID") {
      if (!data.paidDate) {
        ctx.addIssue({
          code: "custom",
          path: ["paidDate"],
          message: "Informe a data de pagamento.",
        });
      }
      if (!data.financialAccountId) {
        ctx.addIssue({
          code: "custom",
          path: ["financialAccountId"],
          message: "Selecione a conta utilizada.",
        });
      }
    }

    if (data.type === "INSTALLMENT") {
      if (!data.installmentTotal || data.installmentTotal < 2) {
        ctx.addIssue({
          code: "custom",
          path: ["installmentTotal"],
          message: "Informe o total de parcelas (mínimo 2).",
        });
      }
      if (!data.installmentNumber) {
        ctx.addIssue({
          code: "custom",
          path: ["installmentNumber"],
          message: "Informe o número da parcela.",
        });
      } else if (
        data.installmentTotal &&
        data.installmentNumber > data.installmentTotal
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["installmentNumber"],
          message: "A parcela não pode ser maior que o total.",
        });
      }
    }
  });

export const debtSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Informe o nome da dívida.")
    .max(120, "Máximo de 120 caracteres."),
  creditor: optionalShortText,
  type: debtTypeSchema,
  initialAmount: money,
  dueDay: z.preprocess(
    (value) =>
      value === "" || value == null
        ? undefined
        : typeof value === "string"
          ? Number(value)
          : value,
    z.number().int().min(1).max(31).optional(),
  ),
  notes: optionalText,
});

export const debtPaymentSchema = z
  .object({
    debtId: z.string().trim().min(1),
    amount: money,
    paidAt: dateString,
    financialAccountId: optionalId,
    paymentMethod: paymentMethodSchema.optional(),
    createExpense: z.preprocess(
      (value) => value === "on" || value === "true" || value === true,
      z.boolean(),
    ),
    notes: optionalText,
  })
  .superRefine((data, ctx) => {
    if (data.createExpense && !data.financialAccountId) {
      ctx.addIssue({
        code: "custom",
        path: ["financialAccountId"],
        message: "Selecione a conta usada no pagamento.",
      });
    }
  });

export const accountSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Informe o nome da conta.")
    .max(60, "Máximo de 60 caracteres."),
  type: accountTypeSchema,
  initialBalance: moneyAllowZero,
  color,
  archived: z.preprocess(
    (value) => value === "on" || value === "true" || value === true,
    z.boolean(),
  ),
});

export const categorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Informe o nome da categoria.")
    .max(60, "Máximo de 60 caracteres."),
  type: categoryTypeSchema,
  color,
});

export const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Informe seu nome.")
    .max(80, "Máximo de 80 caracteres."),
});

export type ActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

/** Converte erros do Zod em um formato simples para os formulários. */
export function validationError(error: z.ZodError): ActionState {
  const fieldErrors: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
  }

  return {
    error: error.issues[0]?.message ?? "Dados inválidos.",
    fieldErrors,
  };
}

export type IncomeInput = z.infer<typeof incomeSchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;
export type DebtInput = z.infer<typeof debtSchema>;
export type DebtPaymentInput = z.infer<typeof debtPaymentSchema>;
export type AccountInput = z.infer<typeof accountSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
