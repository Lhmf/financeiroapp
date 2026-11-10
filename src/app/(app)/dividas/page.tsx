import Link from "next/link";
import { CreditCard, Pencil, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/link-button";
import { PageHeader } from "@/components/ui/page-header";
import { DEBT_STATUS_LABELS, DEBT_TYPE_LABELS } from "@/lib/constants";
import { formatCents } from "@/lib/money";
import { requireUser } from "@/lib/session";
import { listDebts } from "@/services/debts";

export const metadata = {
  title: "Dívidas",
};

export default async function DebtsPage() {
  const user = await requireUser();
  const debts = await listDebts(user.id);
  const active = debts.filter((debt) => debt.status === "ACTIVE");
  const paid = debts.filter((debt) => debt.status === "PAID");
  const totalDebt = active.reduce((sum, debt) => sum + debt.balanceCents, 0);

  return (
    <div className="animate-fade-up space-y-6">
      <PageHeader
        title="Dívidas"
        description="Acompanhe saldo devedor, pagamentos e quitação."
        action={
          <LinkButton href="/dividas/nova">
            <Plus className="h-4 w-4" />
            Nova dívida
          </LinkButton>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs font-medium text-slate-500">Total devedor</p>
          <p className="tabular mt-2 text-2xl font-semibold text-violet-700">
            {formatCents(totalDebt)}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            Somente dívidas ativas
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium text-slate-500">Dívidas ativas</p>
          <p className="tabular mt-2 text-2xl font-semibold text-slate-900">
            {active.length}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            Em acompanhamento
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium text-slate-500">Quitadas</p>
          <p className="tabular mt-2 text-2xl font-semibold text-emerald-700">
            {paid.length}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            Histórico concluído
          </p>
        </Card>
      </div>

      {debts.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={<CreditCard className="h-5 w-5" />}
              title="Nenhuma dívida cadastrada"
              description="Cadastre cartão de crédito, financiamento, parcelamento ou impostos para acompanhar o saldo devedor sem duplicar despesas."
              action={
                <LinkButton href="/dividas/nova" size="sm">
                  <Plus className="h-3.5 w-3.5" />
                  Cadastrar dívida
                </LinkButton>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {active.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-900">
                Dívidas ativas
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {active.map((debt) => (
                  <Card key={debt.id} className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-sm font-semibold text-slate-900">
                            {debt.name}
                          </h3>
                          <Badge tone="violet">
                            {DEBT_TYPE_LABELS[debt.type]}
                          </Badge>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-400">
                          {debt.creditor || "Credor não informado"}
                          {debt.dueDay ? ` · vence dia ${debt.dueDay}` : ""}
                        </p>
                      </div>
                      <Badge tone="amber">
                        {DEBT_STATUS_LABELS[debt.status]}
                      </Badge>
                    </div>

                    <div className="mt-4 flex items-end justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                          Saldo devedor
                        </p>
                        <p className="tabular text-lg font-semibold text-slate-900">
                          {formatCents(debt.balanceCents)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                          Já pago
                        </p>
                        <p className="tabular text-sm font-medium text-emerald-600">
                          {formatCents(debt.paidCents)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-violet-500"
                        style={{ width: `${Math.max(3, debt.progress)}%` }}
                      />
                    </div>
                    <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                      <span>{debt.progress}% pago</span>
                      <span>Inicial: {formatCents(debt.initialAmountCents)}</span>
                    </div>

                    <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                      <Link
                        href={`/dividas/${debt.id}/editar`}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                      </Link>
                      <LinkButton href={`/dividas/${debt.id}`} size="sm">
                        Ver detalhes
                      </LinkButton>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          ) : null}

          {paid.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-900">
                Dívidas quitadas
              </h2>
              <Card>
                <ul className="divide-y divide-slate-100">
                  {paid.map((debt) => (
                    <li
                      key={debt.id}
                      className="flex items-center justify-between gap-3 px-5 py-3"
                    >
                      <div className="min-w-0">
                        <Link
                          href={`/dividas/${debt.id}`}
                          className="truncate text-sm font-medium text-slate-800 hover:text-emerald-700"
                        >
                          {debt.name}
                        </Link>
                        <p className="text-[11px] text-slate-400">
                          {debt.creditor || "Credor não informado"} ·{" "}
                          {formatCents(debt.initialAmountCents)} pagos
                        </p>
                      </div>
                      <Badge tone="green">
                        {DEBT_STATUS_LABELS[debt.status]}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </Card>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
