import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { IncomeForm } from "@/components/forms/income-form";
import { updateIncome } from "@/actions/incomes";
import { centsToInput } from "@/lib/money";
import { toDateInput } from "@/lib/dates";
import { requireUser } from "@/lib/session";
import { getIncome, getIncomeFormOptions } from "@/services/incomes";

export const metadata = {
  title: "Editar receita",
};

export default async function EditIncomePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const [income, options] = await Promise.all([
    getIncome(user.id, id),
    getIncomeFormOptions(user.id),
  ]);

  if (!income) notFound();

  return (
    <div className="mx-auto max-w-3xl animate-fade-up space-y-6">
      <PageHeader
        title="Editar receita"
        description="Atualize valores, datas ou o status da entrada."
      />
      <Card>
        <CardContent>
          <IncomeForm
            action={updateIncome}
            categories={options.categories}
            accounts={options.accounts}
            submitLabel="Salvar alterações"
            cancelHref="/receitas"
            defaultValues={{
              id: income.id,
              description: income.description,
              amount: centsToInput(income.amountCents),
              categoryId: income.categoryId ?? "",
              source: income.source ?? "",
              expectedDate: toDateInput(income.expectedDate),
              receivedDate: toDateInput(income.receivedDate),
              financialAccountId: income.financialAccountId ?? "",
              status: income.status,
              notes: income.notes ?? "",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
