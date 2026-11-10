import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { AccountForm } from "@/components/forms/account-form";
import { createAccount } from "@/actions/accounts";
import { requireUser } from "@/lib/session";

export const metadata = {
  title: "Nova conta",
};

export default async function NewAccountPage() {
  await requireUser();

  return (
    <div className="mx-auto max-w-2xl animate-fade-up space-y-6">
      <PageHeader
        title="Nova conta"
        description="Informe o saldo real da conta no momento em que começa a usar o app."
      />
      <Card>
        <CardContent>
          <AccountForm action={createAccount} />
        </CardContent>
      </Card>
    </div>
  );
}
