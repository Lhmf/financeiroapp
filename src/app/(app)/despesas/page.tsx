import Link from "next/link";
import {
  ArrowUpRight,
  Filter,
  Pencil,
  Plus,
  Search,
  Trash2,
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
import { SubmitButton } from "@/components/ui/submit-button";
import {
  EXPENSE_STATUS_LABELS,
  EXPENSE_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
} from "@/lib/constants";
import { daysUntil, formatDate, monthKey, resolveMonth } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { requireUser } from "@/lib/session";
import { listCategories } from "@/services/categories";
import { listExpenses } from "@/services/expenses";
import { deleteExpense, markExpensePaid } from "@/actions/expenses";

export const metadata = {
  title: "Despesas",
};

export default async function ExpensesPage({
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

  const [expenses, categories] = await Promise.all([
    listExpenses(user.id, {
      month: params.mes,
      status: params.status,
      categoryId: params.categoria,
      q: params.q,
      all,
    }),
    listCategories(user.id, "EXPENSE"),
  ]);

  const filterQuery = new URLSearchParams();
  if (params.status) filterQuery.set("status", params.status);
  if (params.categoria) filterQuery.set("categoria", params.categoria);
  if (params.q) filterQuery.set("q", params.q);
  const querySuffix = filterQuery.toString();
  const historyHref = `/despesas?todos=1${querySuffix ? `&${querySuffix}` : ""}`;
  const monthHref = `/despesas?mes=${currentMonth}${
    querySuffix ? `&${querySuffix}` : ""
  }`;
  const hasFilters = Boolean(
    params.status || params.categoria || params.q || all,
  );

  return (
    <div className="animate-fade-up space-y-6">
      <PageHeader
        title="Despesas"
        description="Contas fixas, variáveis, eventuais e parceladas."
        action={
          <LinkButton href="/despesas/nova">
            <Plus className="h-4 w-4" />
            Nova despesa
          </LinkButton>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <MonthNavigator month={currentMonth} basePath="/despesas" />
        <Link
          href={all ? monthHref : historyHref}
          className="text-xs font-medium text-emerald-700 hover:text-emerald-800"
        >
          {all ? "Ver apenas este mês" : "Ver todo o histórico"}
        </Link>
      </div>

      <Card>
        <CardContent>
          <form
            method="get"
            action="/despesas"
            className="flex flex-wrap items-end gap-3"
          >
            <input type="hidden" name="mes" value={currentMonth} />
            {all ? <input type="hidden" name="todos" value="1" /> : null}

            <div className="min-w-[200px] flex-1">
              <Label htmlFor="q">Buscar</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="q"
                  name="q"
                  defaultValue={params.q}
                  placeholder="Descrição da despesa"
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
                <option value="PENDING">Pendente</option>
                <option value="PAID">Paga</option>
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
                href={`/despesas?mes=${currentMonth}`}
                className="pb-2 text-xs font-medium text-slate-500 hover:text-slate-800"
              >
                Limpar filtros
              </Link>
            ) : null}
          </form>
        </CardContent>
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
          <p className="text-xs font-medium text-slate-500">
            {expenses.length} {expenses.length === 1 ? "despesa" : "despesas"}
            {all ? " no histórico" : " neste mês"}
          </p>
        </div>

        {expenses.length === 0 ? (
          <CardContent>
            <EmptyState
              icon={<ArrowUpRight className="h-5 w-5" />}
              title="Nenhuma despesa encontrada"
              description="Cadastre contas fixas, variáveis, eventuais ou parceladas para saber exatamente quanto saiu."
              action={
                <LinkButton href="/despesas/nova" size="sm">
                  <Plus className="h-3.5 w-3.5" />
                  Cadastrar despesa
                </LinkButton>
              }
            />
          </CardContent>
        ) : (
          <ul className="divide-y divide-slate-100">
            {expenses.map((expense) => {
              const paid = expense.status === "PAID";
              const overdue =
                !paid && daysUntil(expense.dueDate) < 0;
              const installment =
                expense.type === "INSTALLMENT" && expense.installmentTotal
                  ? `Parcela ${expense.installmentNumber ?? "?"}/${
                      expense.installmentTotal
                    }`
                  : null;

              return (
                <li
                  key={expense.id}
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                      <ArrowUpRight className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium text-slate-800">
                          {expense.description}
                        </p>
                        <Badge tone={paid ? "green" : overdue ? "red" : "amber"}>
                          {overdue
                            ? "Atrasada"
                            : EXPENSE_STATUS_LABELS[expense.status]}
                        </Badge>
                        <Badge tone="slate">
                          {EXPENSE_TYPE_LABELS[expense.type]}
                        </Badge>
                        {expense.debtPayment ? (
                          <Badge tone="violet">Dívida</Badge>
                        ) : null}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-400">
                        {expense.category ? (
                          <span className="inline-flex items-center gap-1">
                            <Dot color={expense.category.color} />
                            {expense.category.name}
                          </span>
                        ) : (
                          <span>Sem categoria</span>
                        )}
                        <span>·</span>
                        <span>Vence: {formatDate(expense.dueDate)}</span>
                        {expense.paidDate ? (
                          <>
                            <span>·</span>
                            <span className="text-emerald-600">
                              Paga: {formatDate(expense.paidDate)}
                            </span>
                          </>
                        ) : null}
                        {installment ? (
                          <>
                            <span>·</span>
                            <span>{installment}</span>
                          </>
                        ) : null}
                        {expense.paymentMethod ? (
                          <>
                            <span>·</span>
                            <span>
                              {PAYMENT_METHOD_LABELS[expense.paymentMethod]}
                            </span>
                          </>
                        ) : null}
                        {expense.financialAccount ? (
                          <>
                            <span>·</span>
                            <span>{expense.financialAccount.name}</span>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 sm:justify-end">
                    <p className="tabular text-sm font-semibold text-rose-600">
                      −{formatCents(expense.amountCents)}
                    </p>

                    <div className="flex items-center gap-0.5">
                      {!paid && expense.financialAccountId ? (
                        <form action={markExpensePaid}>
                          <input type="hidden" name="id" value={expense.id} />
                          <SubmitButton
                            size="sm"
                            variant="outline"
                            pendingLabel="Pagando..."
                          >
                            Pagar
                          </SubmitButton>
                        </form>
                      ) : null}

                      <Link
                        href={`/despesas/${expense.id}/editar`}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                      </Link>

                      <form action={deleteExpense}>
                        <input type="hidden" name="id" value={expense.id} />
                        <SubmitButton
                          size="sm"
                          variant="ghost"
                          pendingLabel="Excluindo..."
                          confirmMessage="Excluir esta despesa? Essa ação não pode ser desfeita."
                          className="text-rose-500 hover:bg-rose-50 hover:text-rose-700"
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
