import Link from "next/link";
import {
  Archive,
  ArchiveRestore,
  CircleDollarSign,
  CreditCard,
  Landmark,
  Pencil,
  PiggyBank,
  Plus,
  Trash2,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/link-button";
import { PageHeader } from "@/components/ui/page-header";
import { SubmitButton } from "@/components/ui/submit-button";
import { ACCOUNT_TYPE_LABELS } from "@/lib/constants";
import {
  isInvestmentAccountType,
  summarizeAccountBalances,
} from "@/lib/finance";
import { formatCents } from "@/lib/money";
import { requireUser } from "@/lib/session";
import { cn } from "@/lib/utils";
import type { AccountType } from "@/generated/prisma/enums";
import { getAccountBalances } from "@/services/accounts";
import {
  deleteAccount,
  toggleAccountArchive,
} from "@/actions/accounts";

const ACCOUNT_ICONS: Record<AccountType, LucideIcon> = {
  CHECKING: Landmark,
  SAVINGS: PiggyBank,
  CASH: Wallet,
  INVESTMENT: TrendingUp,
  CREDIT_CARD: CreditCard,
  OTHER: CircleDollarSign,
};

export const metadata = {
  title: "Contas",
};

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const accounts = await getAccountBalances(user.id);
  const summary = summarizeAccountBalances(accounts);
  const hasArchived = accounts.some((account) => account.archived);

  return (
    <div className="animate-fade-up space-y-6">
      <PageHeader
        title="Contas"
        description="Saldos realizados por conta bancária, carteira ou investimento."
        action={
          <LinkButton href="/contas/nova">
            <Plus className="h-4 w-4" />
            Nova conta
          </LinkButton>
        }
      />

      {params.erro === "conta-com-movimentacoes" ? (
        <Alert tone="error">
          Esta conta possui movimentações e não pode ser excluída. Arquive-a
          para tirá-la das novas movimentações sem perder o histórico.
        </Alert>
      ) : null}

      <Card
        className="relative overflow-hidden border-emerald-500/20 bg-gradient-to-br from-emerald-700 via-emerald-700 to-teal-800 p-5 text-white shadow-lg shadow-emerald-900/15"
        style={{ backgroundColor: "#047857" }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/10 blur-2xl"
        />
        <div className="relative">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <p className="text-xs font-medium text-white">
              Saldos
              {hasArchived ? " (inclui contas arquivadas)" : ""}
            </p>
            <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-medium text-white">
              {accounts.length} {accounts.length === 1 ? "conta" : "contas"}
            </span>
          </div>

          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-[11px] font-medium text-emerald-50">
                Saldo em conta
              </p>
              <p className="tabular mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                {formatCents(summary.accountBalanceCents)}
              </p>
              <p className="mt-1 text-[11px] text-emerald-50/85">
                Conta corrente, carteira e demais contas
              </p>
            </div>
            <div className="sm:border-l sm:border-white/15 sm:pl-5">
              <p className="text-[11px] font-medium text-emerald-50">
                Saldo investido
              </p>
              <p className="tabular mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                {formatCents(summary.investedBalanceCents)}
              </p>
              <p className="mt-1 text-[11px] text-emerald-50/85">
                Poupança e investimentos
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-white/15 pt-3 text-[11px] text-emerald-50">
            <span>
              Patrimônio total:{" "}
              <strong className="font-semibold text-white">
                {formatCents(summary.totalPatrimonyCents)}
              </strong>
            </span>
            <span className="text-emerald-50/75">
              Saldo inicial + receitas recebidas − despesas pagas − pagamentos de
              dívida sem despesa vinculada.
            </span>
          </div>
        </div>
      </Card>

      {accounts.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={<Wallet className="h-5 w-5" />}
              title="Nenhuma conta cadastrada"
              description="Cadastre sua conta principal com o saldo inicial para que o dashboard reflita a realidade."
              action={
                <LinkButton href="/contas/nova" size="sm">
                  <Plus className="h-3.5 w-3.5" />
                  Cadastrar conta
                </LinkButton>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {accounts.map((account) => {
            const AccountIcon = ACCOUNT_ICONS[account.type];
            const invested = isInvestmentAccountType(account.type);

            return (
              <Card
                key={account.id}
                className={cn(
                  "overflow-hidden border-t-2 transition-shadow hover:shadow-md",
                  account.archived && "opacity-70",
                )}
                style={{ borderTopColor: account.color }}
              >
                <CardContent className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
                        style={{ backgroundColor: account.color }}
                      >
                        <AccountIcon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="truncate text-sm font-semibold text-slate-900">
                            {account.name}
                          </h2>
                          {account.archived ? (
                            <Badge tone="slate">Arquivada</Badge>
                          ) : null}
                          {invested ? (
                            <Badge tone="violet">Investido</Badge>
                          ) : null}
                        </div>
                        <p className="text-[11px] text-slate-600">
                          {ACCOUNT_TYPE_LABELS[account.type]}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-600">
                        {invested ? "Saldo investido" : "Saldo em conta"}
                      </p>
                      <p className="tabular text-lg font-semibold text-slate-900">
                        {formatCents(account.balanceCents)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                    <span className="text-[11px] text-slate-600">
                      Saldo inicial
                    </span>
                    <span className="tabular text-xs font-medium text-slate-700">
                      {formatCents(account.initialBalanceCents)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-1.5 border-t border-slate-100 pt-3">
                    <Link
                      href={`/contas/${account.id}/editar`}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-800"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </Link>

                    <form action={toggleAccountArchive}>
                      <input type="hidden" name="id" value={account.id} />
                      <SubmitButton
                        size="sm"
                        variant="ghost"
                        pendingLabel="Atualizando..."
                      >
                        {account.archived ? (
                          <>
                            <ArchiveRestore className="h-3.5 w-3.5" />
                            Desarquivar
                          </>
                        ) : (
                          <>
                            <Archive className="h-3.5 w-3.5" />
                            Arquivar
                          </>
                        )}
                      </SubmitButton>
                    </form>

                    <form action={deleteAccount}>
                      <input type="hidden" name="id" value={account.id} />
                      <SubmitButton
                        size="sm"
                        variant="ghost"
                        pendingLabel="Excluindo..."
                        confirmMessage="Excluir esta conta? Se houver movimentações, a exclusão será bloqueada."
                        className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Excluir
                      </SubmitButton>
                    </form>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
