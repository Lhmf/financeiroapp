import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Pencil,
  Receipt,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/link-button";
import { PageHeader } from "@/components/ui/page-header";
import { SubmitButton } from "@/components/ui/submit-button";
import { DebtPaymentForm } from "@/components/forms/debt-payment-form";
import { DEBT_STATUS_LABELS, DEBT_TYPE_LABELS } from "@/lib/constants";
import { formatDate, toDateInput, todayUTC } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { requireUser } from "@/lib/session";
import { getDebt, getDebtFormOptions } from "@/services/debts";
import { addDebtPayment, deleteDebt, deleteDebtPayment } from "@/actions/debts";

export const metadata = {
  title: "Detalhes da dívida",
};

export default async function DebtDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const [debt, options] = await Promise.all([
    getDebt(user.id, id),
    getDebtFormOptions(user.id),
  ]);

  if (!debt) notFound();

  const isPaid = debt.status === "PAID" || debt.balanceCents === 0;

  return (
    <div className="animate-fade-up space-y-6">
      <Link
        href="/dividas"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar para dívidas
      </Link>

      <PageHeader
        title={debt.name}
        description={`${DEBT_TYPE_LABELS[debt.type]}${
          debt.creditor ? ` · ${debt.creditor}` : ""
        }${debt.dueDay ? ` · vence dia ${debt.dueDay}` : ""}`}
        action={
          <LinkButton href={`/dividas/${debt.id}/editar`} variant="outline">
            <Pencil className="h-4 w-4" />
            Editar dívida
          </LinkButton>
        }
      />

      {isPaid ? (
        <Alert tone="success">
          <span className="font-medium">Dívida quitada.</span> Todos os
          pagamentos registrados cobrem o valor inicial.
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs font-medium text-slate-500">Valor inicial</p>
          <p className="tabular mt-2 text-xl font-semibold text-slate-900">
            {formatCents(debt.initialAmountCents)}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium text-slate-500">Já pago</p>
          <p className="tabular mt-2 text-xl font-semibold text-emerald-600">
            {formatCents(debt.paidCents)}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium text-slate-500">Saldo devedor</p>
          <p className="tabular mt-2 text-xl font-semibold text-violet-700">
            {formatCents(debt.balanceCents)}
          </p>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-medium text-slate-500">Progresso</p>
          <Badge tone={isPaid ? "green" : "amber"}>
            {DEBT_STATUS_LABELS[debt.status]}
          </Badge>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-violet-500"
            style={{ width: `${Math.max(3, debt.progress)}%` }}
          />
        </div>
        <p className="mt-1 text-right text-[10px] text-slate-400">
          {debt.progress}% pago
        </p>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Histórico de pagamentos</CardTitle>
                <p className="mt-0.5 text-xs text-slate-500">
                  Cada pagamento reduz o saldo devedor.
                </p>
              </div>
              <Badge tone="slate">{debt.payments.length}</Badge>
            </CardHeader>

            {debt.payments.length === 0 ? (
              <CardContent>
                <EmptyState
                  icon={<Receipt className="h-5 w-5" />}
                  title="Nenhum pagamento registrado"
                  description="Use o formulário ao lado para registrar o primeiro pagamento."
                  className="border-0 bg-transparent py-6"
                />
              </CardContent>
            ) : (
              <ul className="divide-y divide-slate-100">
                {debt.payments.map((payment) => (
                  <li
                    key={payment.id}
                    className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center"
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                        <CheckCircle2 className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800">
                          Pagamento em {formatDate(payment.paidAt)}
                        </p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-slate-400">
                          <CalendarDays className="h-3 w-3" />
                          {payment.financialAccount?.name ??
                            "Conta não informada"}
                          <span>·</span>
                          <span>
                            {payment.expenseId
                              ? "Despesa vinculada"
                              : "Sem despesa vinculada"}
                          </span>
                          {payment.notes ? (
                            <>
                              <span>·</span>
                              <span>{payment.notes}</span>
                            </>
                          ) : null}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 sm:justify-end">
                      <p className="tabular text-sm font-semibold text-emerald-600">
                        −{formatCents(payment.amountCents)}
                      </p>
                      <form action={deleteDebtPayment}>
                        <input type="hidden" name="id" value={payment.id} />
                        <SubmitButton
                          size="sm"
                          variant="ghost"
                          pendingLabel="Excluindo..."
                          confirmMessage="Excluir este pagamento? A despesa vinculada também será removida."
                          className="text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Excluir
                        </SubmitButton>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Zona de risco</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs leading-relaxed text-slate-500">
                Excluir a dívida remove também o histórico de pagamentos. As
                despesas vinculadas permanecem no fluxo de caixa, pois
                representam dinheiro que realmente saiu.
              </p>
              <form action={deleteDebt} className="mt-3">
                <input type="hidden" name="id" value={debt.id} />
                <SubmitButton
                  variant="danger"
                  size="sm"
                  pendingLabel="Excluindo..."
                  confirmMessage="Excluir esta dívida e todo o histórico de pagamentos?"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Excluir dívida
                </SubmitButton>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {!isPaid ? (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Registrar pagamento</CardTitle>
                  <p className="mt-0.5 text-xs text-slate-500">
                    O saldo devedor é atualizado automaticamente.
                  </p>
                </div>
              </CardHeader>
              <CardContent>
                <DebtPaymentForm
                  action={addDebtPayment}
                  debtId={debt.id}
                  balanceCents={debt.balanceCents}
                  accounts={options.accounts.map((account) => ({
                    id: account.id,
                    name: account.name,
                  }))}
                  today={toDateInput(todayUTC())}
                />
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Como funciona</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-[11px] leading-relaxed text-slate-500">
              <p>
                Ao registrar um pagamento, o app cria uma despesa paga
                vinculada e reduz o saldo devedor.
              </p>
              <p>
                Assim, o pagamento entra no fluxo de caixa{" "}
                <strong className="text-slate-700">uma única vez</strong> e não
                é contado novamente como dívida.
              </p>
              <p>
                Se você já lançou a despesa manualmente, desmarque a opção de
                criar despesa para evitar duplicidade.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
