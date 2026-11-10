import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { AccountForm } from "@/components/forms/account-form";
import { updateAccount } from "@/actions/accounts";
import { centsToInput } from "@/lib/money";
import { requireUser } from "@/lib/session";
import { getAccount } from "@/services/accounts";

export const metadata = {
  title: "Editar conta",
};

export default async function EditAccountPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const account = await getAccount(user.id, id);

  if (!account) notFound();

  return (
    <div className="mx-auto max-w-2xl animate-fade-up space-y-6">
      <PageHeader
        title="Editar conta"
        description="Ajuste o nome, tipo, saldo inicial ou arquive a conta."
      />
      <Card>
        <CardContent>
          <AccountForm
            action={updateAccount}
            submitLabel="Salvar alterações"
            defaultValues={{
              id: account.id,
              name: account.name,
              type: account.type,
              initialBalance: centsToInput(account.initialBalanceCents),
              color: account.color,
              archived: account.archived,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
