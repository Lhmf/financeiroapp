/**
 * Cálculos financeiros puros. Nenhuma dependência de banco ou UI.
 *
 * Regra de ouro: uma dívida paga só entra no fluxo de caixa UMA vez.
 * - Se o pagamento gerou/está vinculado a uma Expense, quem conta é a Expense.
 * - Se não há Expense vinculada, o próprio DebtPayment conta como saída.
 */

export type Cents = number;

/** Tipos de conta que compõem o saldo investido. */
export const INVESTMENT_ACCOUNT_TYPES = ["SAVINGS", "INVESTMENT"] as const;

export type InvestmentAccountType = (typeof INVESTMENT_ACCOUNT_TYPES)[number];

/** Poupança e investimento ficam separados do dinheiro disponível em conta. */
export function isInvestmentAccountType(type: string): boolean {
  return INVESTMENT_ACCOUNT_TYPES.includes(
    type.toUpperCase() as InvestmentAccountType,
  );
}

export type BalanceAccount = {
  type: string;
  balanceCents: number;
};

export type AccountBalanceSummary = {
  accountBalanceCents: number;
  investedBalanceCents: number;
  totalPatrimonyCents: number;
  accountCount: number;
  investedCount: number;
};

/**
 * Separa o patrimônio em:
 * - saldo em conta: contas correntes, carteira e demais tipos não investidos;
 * - saldo investido: poupança e investimento.
 */
export function summarizeAccountBalances(
  accounts: Iterable<BalanceAccount>,
): AccountBalanceSummary {
  let accountBalanceCents = 0;
  let investedBalanceCents = 0;
  let accountCount = 0;
  let investedCount = 0;

  for (const account of accounts) {
    if (isInvestmentAccountType(account.type)) {
      investedBalanceCents += account.balanceCents;
      investedCount += 1;
    } else {
      accountBalanceCents += account.balanceCents;
      accountCount += 1;
    }
  }

  return {
    accountBalanceCents,
    investedBalanceCents,
    totalPatrimonyCents: accountBalanceCents + investedBalanceCents,
    accountCount,
    investedCount,
  };
}

export function sumCents(values: Iterable<number>): number {
  let total = 0;
  for (const value of values) total += value;
  return total;
}

/**
 * Saldo de uma conta:
 * saldo inicial + receitas recebidas - despesas pagas - pagamentos de dívida sem despesa vinculada.
 */
export function calculateAccountBalance({
  initialBalanceCents,
  receivedIncomeCents,
  paidExpenseCents,
  unlinkedDebtPaymentCents,
}: {
  initialBalanceCents: number;
  receivedIncomeCents: number;
  paidExpenseCents: number;
  unlinkedDebtPaymentCents: number;
}): number {
  return (
    initialBalanceCents +
    receivedIncomeCents -
    paidExpenseCents -
    unlinkedDebtPaymentCents
  );
}

/**
 * Resultado do mês (dinheiro realizado):
 * receitas recebidas - despesas pagas - pagamentos de dívida sem despesa vinculada.
 */
export function calculateMonthResult({
  receivedIncomeCents,
  paidExpenseCents,
  unlinkedDebtPaymentCents,
}: {
  receivedIncomeCents: number;
  paidExpenseCents: number;
  unlinkedDebtPaymentCents: number;
}): number {
  return receivedIncomeCents - paidExpenseCents - unlinkedDebtPaymentCents;
}

/** Saldo devedor restante de uma dívida. Nunca negativo. */
export function calculateDebtBalance(
  initialAmountCents: number,
  payments: Iterable<number>,
): number {
  return Math.max(0, initialAmountCents - sumCents(payments));
}

/** Total já pago de uma dívida. */
export function calculateDebtPaid(payments: Iterable<number>): number {
  return sumCents(payments);
}

/** Percentual pago de uma dívida (0 a 100). */
export function calculateDebtProgress(
  initialAmountCents: number,
  paidCents: number,
): number {
  if (initialAmountCents <= 0) return 0;
  return Math.min(100, Math.round((paidCents / initialAmountCents) * 100));
}

export function isDebtPaid(
  initialAmountCents: number,
  paidCents: number,
): boolean {
  return paidCents >= initialAmountCents;
}

/** Soma apenas pagamentos que ainda não têm despesa vinculada. */
export function sumUnlinkedDebtPayments(
  payments: Array<{ amountCents: number; expenseId: string | null }>,
): number {
  return sumCents(
    payments
      .filter((payment) => payment.expenseId === null)
      .map((payment) => payment.amountCents),
  );
}

/** Variação percentual entre dois valores. */
export function variationPercent(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
}

/** Percentual inteiro de uma parte sobre o total, tolerando total zero. */
export function safePercent(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((part / total) * 100));
}
