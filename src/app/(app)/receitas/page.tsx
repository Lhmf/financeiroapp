import Link from "next/link";
import {
  ArrowDownLeft,
  Clock3,
  Filter,
  Pencil,
  Plus,
  Search,
  Trash2,
  Wallet,
} from "lucide-react";
import { MonthNavigator } from "@/components/filters/month-navigator";
import { Badge, Dot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LinkButton } from "@/components/ui/link-button";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { StatCard } from "@/components/ui/stat-card";
import { SubmitButton } from "@/components/ui/submit-button";
import { INCOME_STATUS_LABELS } from "@/lib/constants";
import {
  formatDate,
  monthKey,
  resolveMonth,
} from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { requireUser } from "@/lib/session";
import { listCategories } from "@/services/categories";
import { listIncomes } from "@/services/incomes";
import { deleteIncome, markIncomeReceived } from "@/actions/incomes";

export const metadata = {
  title: "Receitas",
};

export default async function IncomesPage({
  searchParams,
}: {
  searchParams: Promise<{
    mes?: string;
    status?: string;
    categoria?: string;
    q?: string;
    todos?: string;
  }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const all = params.todos === "1";
  const month = resolveMonth(params.mes);
  const currentMonth = monthKey(month);

  const [incomes, categories] = await Promise.all([
    listIncomes(user.id, {
      month: params.mes,
      status: params.status,
      categoryId: params.categoria,
      q: params.q,
      all,
    }),
    listCategories(user.id, "INCOME"),
  ]);

  const filterQuery = new URLSearchParams();
  if (params.status) filterQuery.set("status", params.status);
  if (params.categoria) filterQuery.set("categoria", params.categoria);
  if (params.q) filterQuery.set("q", params.q);
  const querySuffix = filterQuery.toString();
  const historyHref = `/receitas?todos=1${querySuffix ? `&${querySuffix}` : ""}`;
  const monthHref = `/receitas?mes=${currentMonth}${
    querySuffix ? `&${querySuffix}` : ""
  }`;

  const hasFilters = Boolean(
    params.status || params.categoria || params.q || all,
  );
  const receivedCents = incomes.reduce(
    (sum, income) =>
      income.status === "RECEIVED" ? sum + income.amountCents : sum,
    0,
  );
  const expectedCents = incomes.reduce(
    (sum, income) =>
      income.status === "EXPECTED" ? sum + income.amountCents : sum,
    0,
  );
  const totalCents = receivedCents + expectedCents;

  return (
    <div className="animate-fade-up space-y-6">
      <PageHeader
        title="Receitas"
        description="Separe o que já entrou do que ainda está previsto."
        action={
          <LinkButton href="/receitas/nova">
            <Plus className="h-4 w-4" />
            Nova receita
          </LinkButton>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <MonthNavigator month={currentMonth} basePath="/receitas" />
        <Link
          href={all ? monthHref : historyHref}
          className="text-xs font-medium text-emerald-700 hover:text-emerald-800"
        >
          {all ? "Ver apenas este mês" : "Ver todo o histórico"}
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard
          label="Recebido"
          value={formatCents(receivedCents)}
          hint="No período filtrado"
          icon={ArrowDownLeft}
          tone="emerald"
        />
        <StatCard
          label="Previsto"
          value={formatCents(expectedCents)}
          hint="Ainda não entrou"
          icon={Clock3}
          tone="amber"
        />
        <StatCard
          label="Total"
          value={formatCents(totalCents)}
          hint="Recebido + previsto"
          icon={Wallet}
          tone="slate"
          className="col-span-2 sm:col-span-1"
        />
      </div>

      <Card>
        <CardContent>
          <form
            method="get"
            className="flex flex-wrap items-end gap-3"
            action="/receitas"
          >
            <input type="hidden" name="mes" value={currentMonth} />
            {all ? <input type="hidden" name="todos" value="1" /> : null}

            <div className="min-w-[200px] flex-1">
              <Label htmlFor="q">Buscar</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  id="q"
                  name="q"
                  defaultValue={params.q}
                  placeholder="Descrição da receita"
                  className="pl-9"
                />
              </div>
            </div>

            <div className="w-full sm:w-40">
              <Label htmlFor="status">Status</Label>
              <Select
                id="status"
                name="status"
                defaultValue={params.status ?? ""}
              >
                <option value="">Todos</option>
                <option value="EXPECTED">Prevista</option>
                <option value="RECEIVED">Recebida</option>
              </Select>
            </div>

            <div className="w-full sm:w-48">
              <Label htmlFor="categoria">Categoria</Label>
              <Select
                id="categoria"
                name="categoria"
                defaultValue={params.categoria ?? ""}
              >
                <option value="">Todas</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </div>

            <Button type="submit" variant="outline">
              <Filter className="h-4 w-4" />
              Filtrar
            </Button>

            {hasFilters ? (
              <Link
                href={`/receitas?mes=${currentMonth}`}
                className="pb-2 text-xs font-medium text-slate-600 hover:text-slate-800"
              >
                Limpar filtros
              </Link>
            ) : null}
          </form>
        </CardContent>
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
          <p className="text-xs font-medium text-slate-600">
            {incomes.length} {incomes.length === 1 ? "receita" : "receitas"}
            {all ? " no histórico" : " neste mês"}
          </p>
        </div>

        {incomes.length === 0 ? (
          <CardContent>
            <EmptyState
              icon={<ArrowDownLeft className="h-5 w-5" />}
              title="Nenhuma receita encontrada"
              description="Cadastre salário, comissões, laudos ou outras entradas para acompanhar o que já entrou e o que está previsto."
              action={
                <LinkButton href="/receitas/nova" size="sm">
                  <Plus className="h-3.5 w-3.5" />
                  Cadastrar receita
                </LinkButton>
              }
            />
          </CardContent>
        ) : (
          <ul className="divide-y divide-slate-100">
            {incomes.map((income) => {
              const received = income.status === "RECEIVED";
              return (
                <li
                  key={income.id}
                  className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-slate-50/70 sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                      <ArrowDownLeft className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium text-slate-800">
                          {income.description}
                        </p>
                        <Badge tone={received ? "green" : "amber"}>
                          {INCOME_STATUS_LABELS[income.status]}
                        </Badge>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-600">
                        {income.category ? (
                          <span className="inline-flex items-center gap-1">
                            <Dot color={income.category.color} />
                            {income.category.name}
                          </span>
                        ) : (
                          <span>Sem categoria</span>
                        )}
                        <span>·</span>
                        <span>Prevista: {formatDate(income.expectedDate)}</span>
                        {income.receivedDate ? (
                          <>
                            <span>·</span>
                            <span className="text-emerald-700">
                              Recebida: {formatDate(income.receivedDate)}
                            </span>
                          </>
                        ) : null}
                        {income.financialAccount ? (
                          <>
                            <span>·</span>
                            <span>{income.financialAccount.name}</span>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 sm:justify-end">
                    <p className="tabular text-sm font-semibold text-emerald-700">
                      +{formatCents(income.amountCents)}
                    </p>

                    <div className="flex items-center gap-0.5">
                      {!received && income.financialAccountId ? (
                        <form action={markIncomeReceived}>
                          <input type="hidden" name="id" value={income.id} />
                          <SubmitButton
                            size="sm"
                            variant="outline"
                            pendingLabel="Recebendo..."
                          >
                            Receber
                          </SubmitButton>
                        </form>
                      ) : null}

                      <Link
                        href={`/receitas/${income.id}/editar`}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-800"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                      </Link>

                      <form action={deleteIncome}>
                        <input type="hidden" name="id" value={income.id} />
                        <SubmitButton
                          size="sm"
                          variant="ghost"
                          pendingLabel="Excluindo..."
                          confirmMessage="Excluir esta receita? Essa ação não pode ser desfeita."
                          className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Excluir
                        </SubmitButton>
                      </form>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
