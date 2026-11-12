import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Pencil } from "lucide-react";
import { markExpensePaid } from "@/actions/expenses";
import { markIncomeReceived } from "@/actions/incomes";
import { Badge, Dot } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDate } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import type { AgendaItem } from "@/services/agenda";

export function AgendaRow({
  item,
  redirectTo,
}: {
  item: AgendaItem;
  redirectTo?: string;
}) {
  const isExpense = item.kind === "expense";
  const editHref = isExpense
    ? `/despesas/${item.id}/editar`
    : `/receitas/${item.id}/editar`;
  const action = isExpense ? markExpensePaid : markIncomeReceived;

  return (
    <li className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-slate-50/70 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span
          className={
            isExpense
              ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600"
              : "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"
          }
        >
          {isExpense ? (
            <ArrowUpRight className="h-4 w-4" />
          ) : (
            <ArrowDownLeft className="h-4 w-4" />
          )}
        </span>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-medium text-slate-800">
              {item.description}
            </p>
            <Badge tone={isExpense ? "red" : "green"}>
              {isExpense ? "A pagar" : "A receber"}
            </Badge>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-600">
            {item.categoryName ? (
              <span className="inline-flex items-center gap-1">
                <Dot color={item.categoryColor ?? "#64748b"} />
                {item.categoryName}
              </span>
            ) : (
              <span>Sem categoria</span>
            )}
            <span>·</span>
            <span>
              {isExpense ? "Vence" : "Prevista"}: {formatDate(item.date)}
            </span>
            {item.accountName ? (
              <>
                <span>·</span>
                <span>{item.accountName}</span>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 sm:justify-end">
        <p
          className={
            isExpense
              ? "tabular text-sm font-semibold text-rose-600"
              : "tabular text-sm font-semibold text-emerald-700"
          }
        >
          {isExpense ? "−" : "+"}
          {formatCents(item.amountCents)}
        </p>

        <div className="flex items-center gap-0.5">
          {item.financialAccountId ? (
            <form action={action}>
              <input type="hidden" name="id" value={item.id} />
              {redirectTo ? (
                <input type="hidden" name="redirectTo" value={redirectTo} />
              ) : null}
              <SubmitButton
                size="sm"
                variant="outline"
                pendingLabel={isExpense ? "Pagando..." : "Recebendo..."}
              >
                {isExpense ? "Pagar" : "Receber"}
              </SubmitButton>
            </form>
          ) : (
            <Link
              href={editHref}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-amber-700 transition hover:bg-amber-50 hover:text-amber-800"
            >
              Definir conta
            </Link>
          )}

          <Link
            href={editHref}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-800"
          >
            <Pencil className="h-3.5 w-3.5" />
            Editar
          </Link>
        </div>
      </div>
    </li>
  );
}
