import { getDashboardData, type DashboardData } from "./dashboard";

export type MonthlyReport = {
  app: "FinanceiroApp";
  version: 1;
  generatedAt: string;
  month: DashboardData["month"];
  receitasRecebidasCents: number;
  despesasPagasCents: number;
  pagamentosDividasCents: number;
  saldoDoMesCents: number;
  patrimonioAtualCents: number;
  saldoInvestidoCents: number;
  despesasPorCategoria: DashboardData["expensesByCategory"];
};

/**
 * Relatório financeiro mensal do usuário autenticado: receitas, despesas,
 * saldo do mês e patrimônio. Reaproveita os cálculos do dashboard para não
 * duplicar regras de negócio.
 */
export async function getMonthlyReport(
  userId: string,
  monthParam?: string,
): Promise<MonthlyReport> {
  const data = await getDashboardData(userId, monthParam);

  return {
    app: "FinanceiroApp",
    version: 1,
    generatedAt: new Date().toISOString(),
    month: data.month,
    receitasRecebidasCents: data.monthReceivedCents,
    despesasPagasCents: data.monthPaidCents,
    pagamentosDividasCents: data.monthUnlinkedDebtCents,
    saldoDoMesCents: data.monthResultCents,
    patrimonioAtualCents: data.totalPatrimonyCents,
    saldoInvestidoCents: data.investedBalanceCents,
    despesasPorCategoria: data.expensesByCategory,
  };
}
