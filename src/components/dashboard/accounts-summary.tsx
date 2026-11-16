import Link from "next/link";
import { Wallet } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { ACCOUNT_TYPE_LABELS } from "@/lib/constants";
import { isInvestmentAccountType } from "@/lib/finance";
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
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Suas contas</h3>
          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
            Saldo realizado por conta · investimentos separados
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {accounts.length} {accounts.length === 1 ? "conta" : "contas"}
          </span>
          <Link
            href="/contas"
            className="text-xs font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-400"
          >
            Gerenciar
          </Link>
        </div>
      </div>

      {accounts.length === 0 ? (
        <EmptyState
          icon={<Wallet className="h-5 w-5" />}
          title="Nenhuma conta cadastrada"
          description="Cadastre sua conta bancária, carteira ou investimento para começar."
          className="border-0 bg-transparent py-6"
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {accounts.map((account) => (
            <li
              key={account.id}
              className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3 transition-colors hover:border-slate-200 hover:bg-white hover:shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700 dark:hover:bg-slate-800/60"
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white"
                style={{ backgroundColor: account.color }}
              >
                <Wallet className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-slate-800 dark:text-slate-100">
                  {account.name}
                  {account.archived ? (
                    <span className="ml-1.5 text-[10px] font-normal text-slate-600 dark:text-slate-400">
                      (arquivada)
                    </span>
                  ) : null}
                </p>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  {ACCOUNT_TYPE_LABELS[account.type]}
                  {isInvestmentAccountType(account.type) ? " · investido" : ""}
                </p>
              </div>
              <p className="tabular shrink-0 text-xs font-semibold text-slate-700 dark:text-slate-300">
                {formatCents(account.balanceCents)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
