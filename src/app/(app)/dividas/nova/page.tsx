import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { DebtForm } from "@/components/forms/debt-form";
import { createDebt } from "@/actions/debts";
import { requireUser } from "@/lib/session";

export const metadata = {
  title: "Nova dívida",
};

export default async function NewDebtPage() {
  await requireUser();

  return (
    <div className="mx-auto max-w-3xl animate-fade-up space-y-6">
      <PageHeader
        title="Nova dívida"
        description="Cadastre o saldo devedor inicial e acompanhe os pagamentos."
      />
      <Card>
        <CardContent>
          <DebtForm action={createDebt} />
        </CardContent>
      </Card>
    </div>
  );
}
