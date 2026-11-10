import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ExpenseForm } from "@/components/forms/expense-form";
import { createExpense } from "@/actions/expenses";
import { todayUTC, toDateInput } from "@/lib/dates";
import { requireUser } from "@/lib/session";
import { getExpenseFormOptions } from "@/services/expenses";

export const metadata = {
  title: "Nova despesa",
};

export default async function NewExpensePage() {
  const user = await requireUser();
  const { categories, accounts } = await getExpenseFormOptions(user.id);
  const today = toDateInput(todayUTC());

  return (
    <div className="mx-auto max-w-3xl animate-fade-up space-y-6">
      <PageHeader
        title="Nova despesa"
        description="Registre uma conta a pagar ou um pagamento já realizado."
      />
      <Card>
        <CardContent>
          <ExpenseForm
            action={createExpense}
            categories={categories}
            accounts={accounts}
            defaultValues={{
              dueDate: today,
              paidDate: "",
              status: "PENDING",
              type: "VARIABLE",
              financialAccountId: accounts[0]?.id,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
