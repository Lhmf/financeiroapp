import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { DebtForm } from "@/components/forms/debt-form";
import { updateDebt } from "@/actions/debts";
import { centsToInput } from "@/lib/money";
import { requireUser } from "@/lib/session";
import { getDebt } from "@/services/debts";

export const metadata = {
  title: "Editar dívida",
};

export default async function EditDebtPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const debt = await getDebt(user.id, id);

  if (!debt) notFound();

  return (
    <div className="mx-auto max-w-3xl animate-fade-up space-y-6">
      <PageHeader
        title="Editar dívida"
        description="Ajuste o valor inicial, credor ou vencimento."
      />
      <Card>
        <CardContent>
          <DebtForm
            action={updateDebt}
            submitLabel="Salvar alterações"
            cancelHref={`/dividas/${debt.id}`}
            defaultValues={{
              id: debt.id,
              name: debt.name,
              creditor: debt.creditor ?? "",
              type: debt.type,
              initialAmount: centsToInput(debt.initialAmountCents),
              dueDay: debt.dueDay?.toString(),
              notes: debt.notes ?? "",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
