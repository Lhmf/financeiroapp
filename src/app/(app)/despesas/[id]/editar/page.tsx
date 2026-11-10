import { notFound } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import { PageHeader } from "@/components/ui/page-header";
import { ExpenseForm } from "@/components/forms/expense-form";
import { updateExpense } from "@/actions/expenses";
import { centsToInput } from "@/lib/money";
import { toDateInput } from "@/lib/dates";
import { requireUser } from "@/lib/session";
import { getExpense, getExpenseFormOptions } from "@/services/expenses";

export const metadata = {
  title: "Editar despesa",
};

export default async function EditExpensePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const [expense, options] = await Promise.all([
    getExpense(user.id, id),
    getExpenseFormOptions(user.id),
  ]);

  if (!expense) notFound();

  if (expense.debtPayment) {
    return (
      <div className="mx-auto max-w-3xl animate-fade-up space-y-6">
        <PageHeader
          title="Despesa vinculada a uma dívida"
          description="Esta saída foi criada automaticamente por um pagamento de dívida."
        />
        <Alert tone="info">
          A despesa <strong>{expense.description}</strong> está vinculada ao
          pagamento da dívida{" "}
          <strong>{expense.debtPayment.debt.name}</strong>. Para alterar valor,
          data ou conta, edite o pagamento na página da dívida. Assim o saldo
          devedor e o fluxo de caixa permanecem consistentes.
        </Alert>
        <div className="flex flex-wrap gap-2">
          <LinkButton href={`/dividas/${expense.debtPayment.debtId}`}>
            Ver dívida
          </LinkButton>
          <LinkButton href="/despesas" variant="outline">
            Voltar para despesas
          </LinkButton>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl animate-fade-up space-y-6">
      <PageHeader
        title="Editar despesa"
        description="Atualize valores, datas, tipo ou status do pagamento."
      />
      <Card>
        <CardContent>
          <ExpenseForm
            action={updateExpense}
            categories={options.categories}
            accounts={options.accounts}
            submitLabel="Salvar alterações"
            cancelHref="/despesas"
            defaultValues={{
              id: expense.id,
              description: expense.description,
              amount: centsToInput(expense.amountCents),
              categoryId: expense.categoryId ?? "",
              dueDate: toDateInput(expense.dueDate),
              paidDate: toDateInput(expense.paidDate),
              type: expense.type,
              paymentMethod: expense.paymentMethod ?? undefined,
              financialAccountId: expense.financialAccountId ?? "",
              status: expense.status,
              installmentNumber: expense.installmentNumber?.toString(),
              installmentTotal: expense.installmentTotal?.toString(),
              notes: expense.notes ?? "",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
