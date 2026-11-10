import Link from "next/link";
import { Wallet } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { ACCOUNT_TYPE_LABELS } from "@/lib/constants";
import { formatCents } from "@/lib/money";
import type { AccountType } from "@/generated/prisma/enums";

export function AccountsSummary({
  accounts,
}: {
  accounts: Array<{
    id: string;
    name: string;
    type: AccountType;
    color: string;
    balanceCents: number;
    archived: boolean;
  }>;
}) {
  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Suas contas</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Saldo realizado por conta
          </p>
        </div>
        <Link
          href="/contas"
          className="text-xs font-medium text-emerald-700 hover:text-emerald-800"
        >
          Gerenciar
        </Link>
      </div>

      {accounts.length === 0 ? (
        <EmptyState
          icon={<Wallet className="h-5 w-5" />}
          title="Nenhuma conta cadastrada"
          description="Cadastre sua conta bancária, carteira ou investimento para começar."
          className="border-0 bg-transparent py-6"
        />
      ) : (
        <ul className="divide-y divide-slate-100">
          {accounts.map((account) => (
            <li
              key={account.id}
              className="flex items-center gap-3 py-2.5"
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: account.color }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-slate-800">
                  {account.name}
                  {account.archived ? (
                    <span className="ml-1.5 text-[10px] font-normal text-slate-400">
                      (arquivada)
                    </span>
                  ) : null}
                </p>
                <p className="text-[11px] text-slate-400">
                  {ACCOUNT_TYPE_LABELS[account.type]}
                </p>
              </div>
              <p className="tabular text-xs font-semibold text-slate-700">
                {formatCents(account.balanceCents)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
