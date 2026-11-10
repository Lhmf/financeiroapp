import Link from "next/link";
import {
  Archive,
  ArchiveRestore,
  Pencil,
  Plus,
  Trash2,
  Wallet,
} from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/link-button";
import { PageHeader } from "@/components/ui/page-header";
import { SubmitButton } from "@/components/ui/submit-button";
import { ACCOUNT_TYPE_LABELS } from "@/lib/constants";
import { formatCents } from "@/lib/money";
import { requireUser } from "@/lib/session";
import { getAccountBalances } from "@/services/accounts";
import {
  deleteAccount,
  toggleAccountArchive,
} from "@/actions/accounts";

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
  const total = accounts.reduce((sum, account) => sum + account.balanceCents, 0);
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

      <Card className="p-5">
        <p className="text-xs font-medium text-slate-500">
          Saldo total{hasArchived ? " (inclui contas arquivadas)" : ""}
        </p>
        <p className="tabular mt-2 text-3xl font-semibold tracking-tight text-slate-900">
          {formatCents(total)}
        </p>
        <p className="mt-1 text-[11px] text-slate-400">
          Saldo inicial + receitas recebidas − despesas pagas − pagamentos de
          dívida sem despesa vinculada.
        </p>
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
        <div className="grid gap-4 md:grid-cols-2">
          {accounts.map((account) => (
            <Card
              key={account.id}
              className={account.archived ? "opacity-70" : undefined}
            >
              <CardContent className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
                      style={{ backgroundColor: account.color }}
                    >
                      <Wallet className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-sm font-semibold text-slate-900">
                          {account.name}
                        </h2>
                        {account.archived ? (
                          <Badge tone="slate">Arquivada</Badge>
                        ) : null}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {ACCOUNT_TYPE_LABELS[account.type]}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                      Saldo atual
                    </p>
                    <p className="tabular text-lg font-semibold text-slate-900">
                      {formatCents(account.balanceCents)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                  <span className="text-[11px] text-slate-500">
                    Saldo inicial
                  </span>
                  <span className="tabular text-xs font-medium text-slate-700">
                    {formatCents(account.initialBalanceCents)}
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-1.5 border-t border-slate-100 pt-3">
                  <Link
                    href={`/contas/${account.id}/editar`}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
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
                      className="text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Excluir
                    </SubmitButton>
                  </form>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
