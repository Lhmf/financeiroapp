import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { IncomeForm } from "@/components/forms/income-form";
import { createIncome } from "@/actions/incomes";
import { todayUTC, toDateInput } from "@/lib/dates";
import { requireUser } from "@/lib/session";
import { getIncomeFormOptions } from "@/services/incomes";

export const metadata = {
  title: "Nova receita",
};

export default async function NewIncomePage() {
  const user = await requireUser();
  const { categories, accounts } = await getIncomeFormOptions(user.id);
  const today = toDateInput(todayUTC());

  return (
    <div className="mx-auto max-w-3xl animate-fade-up space-y-6">
      <PageHeader
        title="Nova receita"
        description="Registre uma entrada prevista ou que já aconteceu."
      />
      <Card>
        <CardContent>
          <IncomeForm
            action={createIncome}
            categories={categories}
            accounts={accounts}
            defaultValues={{
              expectedDate: today,
              receivedDate: "",
              status: "EXPECTED",
              financialAccountId: accounts[0]?.id,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
