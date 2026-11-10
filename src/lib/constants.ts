import type {
  AccountType,
  CategoryType,
  DebtStatus,
  DebtType,
  ExpenseStatus,
  ExpenseType,
  IncomeStatus,
  PaymentMethod,
} from "@/generated/prisma/enums";

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  CHECKING: "Conta corrente",
  SAVINGS: "Poupança",
  CASH: "Dinheiro",
  INVESTMENT: "Investimento",
  CREDIT_CARD: "Cartão de crédito",
  OTHER: "Outra",
};

export const INCOME_STATUS_LABELS: Record<IncomeStatus, string> = {
  EXPECTED: "Prevista",
  RECEIVED: "Recebida",
};

export const EXPENSE_STATUS_LABELS: Record<ExpenseStatus, string> = {
  PENDING: "Pendente",
  PAID: "Paga",
};

export const EXPENSE_TYPE_LABELS: Record<ExpenseType, string> = {
  FIXED: "Fixa",
  VARIABLE: "Variável",
  OCCASIONAL: "Eventual",
  INSTALLMENT: "Parcelada",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  PIX: "Pix",
  CASH: "Dinheiro",
  DEBIT: "Débito",
  CREDIT: "Crédito",
  BOLETO: "Boleto",
  TRANSFER: "Transferência",
  OTHER: "Outro",
};

export const DEBT_TYPE_LABELS: Record<DebtType, string> = {
  CREDIT_CARD: "Cartão de crédito",
  LOAN: "Empréstimo",
  FINANCING: "Financiamento",
  INSTALLMENT: "Parcelamento",
  TAX: "Imposto",
  OTHER: "Outra",
};

export const DEBT_STATUS_LABELS: Record<DebtStatus, string> = {
  ACTIVE: "Ativa",
  PAID: "Quitada",
};

export const CATEGORY_TYPE_LABELS: Record<CategoryType, string> = {
  INCOME: "Receita",
  EXPENSE: "Despesa",
};

export const CHART_COLORS = [
  "#059669",
  "#0ea5e9",
  "#8b5cf6",
  "#f59e0b",
  "#ef4444",
  "#14b8a6",
  "#ec4899",
  "#64748b",
];

export const CATEGORY_COLORS = [
  "#059669",
  "#10b981",
  "#0ea5e9",
  "#3b82f6",
  "#8b5cf6",
  "#a855f7",
  "#f59e0b",
  "#f97316",
  "#ef4444",
  "#ec4899",
  "#14b8a6",
  "#64748b",
];

export const DEFAULT_CATEGORIES: Array<{
  name: string;
  type: CategoryType;
  color: string;
}> = [
  { name: "Salário", type: "INCOME", color: "#059669" },
  { name: "Comissões", type: "INCOME", color: "#10b981" },
  { name: "Laudos técnicos", type: "INCOME", color: "#0ea5e9" },
  { name: "Serviços", type: "INCOME", color: "#8b5cf6" },
  { name: "Outras receitas", type: "INCOME", color: "#64748b" },
  { name: "Moradia", type: "EXPENSE", color: "#0ea5e9" },
  { name: "Alimentação", type: "EXPENSE", color: "#f59e0b" },
  { name: "Transporte", type: "EXPENSE", color: "#8b5cf6" },
  { name: "Saúde", type: "EXPENSE", color: "#ef4444" },
  { name: "Educação", type: "EXPENSE", color: "#3b82f6" },
  { name: "Lazer", type: "EXPENSE", color: "#ec4899" },
  { name: "Dívidas", type: "EXPENSE", color: "#dc2626" },
  { name: "Impostos", type: "EXPENSE", color: "#64748b" },
  { name: "Outras despesas", type: "EXPENSE", color: "#94a3b8" },
];

export const EXPENSE_TYPE_OPTIONS = (
  Object.keys(EXPENSE_TYPE_LABELS) as ExpenseType[]
).map((value) => ({ value, label: EXPENSE_TYPE_LABELS[value] }));

export const PAYMENT_METHOD_OPTIONS = (
  Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]
).map((value) => ({ value, label: PAYMENT_METHOD_LABELS[value] }));

export const ACCOUNT_TYPE_OPTIONS = (
  Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[]
).map((value) => ({ value, label: ACCOUNT_TYPE_LABELS[value] }));

export const DEBT_TYPE_OPTIONS = (
  Object.keys(DEBT_TYPE_LABELS) as DebtType[]
).map((value) => ({ value, label: DEBT_TYPE_LABELS[value] }));
