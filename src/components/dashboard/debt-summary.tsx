import Link from "next/link";
import { CreditCard } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCents } from "@/lib/money";

export function DebtSummary({
  debts,
  totalDebtCents,
}: {
  debts: Array<{
    id: string;
    name: string;
    creditor: string | null;
    balanceCents: number;
    progress: number;
  }>;
  totalDebtCents: number;
}) {
  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Dívidas ativas</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Saldo devedor restante
          </p>
        </div>
        <Link
          href="/dividas"
          className="text-xs font-medium text-emerald-700 hover:text-emerald-800"
        >
          Gerenciar
        </Link>
      </div>

      <div className="mb-4 rounded-xl bg-violet-50 px-4 py-3">
        <p className="text-[10px] font-medium uppercase tracking-wide text-violet-500">
          Total devedor
        </p>
        <p className="tabular text-lg font-semibold text-violet-800">
          {formatCents(totalDebtCents)}
        </p>
      </div>

      {debts.length === 0 ? (
        <EmptyState
          icon={<CreditCard className="h-5 w-5" />}
          title="Nenhuma dívida ativa"
          description="Cadastre cartão, financiamento ou parcelamento para acompanhar o saldo devedor."
          className="border-0 bg-transparent py-6"
        />
      ) : (
        <ul className="space-y-4">
          {debts.slice(0, 3).map((debt) => (
            <li key={debt.id}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-slate-800">
                    {debt.name}
                  </p>
                  <p className="truncate text-[11px] text-slate-400">
                    {debt.creditor || "Sem credor informado"}
                  </p>
                </div>
                <p className="tabular shrink-0 text-xs font-semibold text-slate-700">
                  {formatCents(debt.balanceCents)}
                </p>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-violet-500"
                  style={{ width: `${Math.max(3, debt.progress)}%` }}
                />
              </div>
              <p className="mt-1 text-right text-[10px] text-slate-400">
                {debt.progress}% pago
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
