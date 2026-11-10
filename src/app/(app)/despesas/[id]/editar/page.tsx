import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
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
