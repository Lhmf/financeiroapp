"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { PAYMENT_METHOD_OPTIONS } from "@/lib/constants";
import { formatCents } from "@/lib/money";
import type { ActionState } from "@/lib/validation";

type Option = { id: string; name: string };

export function DebtPaymentForm({
  action,
  debtId,
  balanceCents,
  accounts,
  today,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  debtId: string;
  balanceCents: number;
  accounts: Option[];
  today: string;
}) {
  const [state, formAction, pending] = React.useActionState(action, {});
  const [createExpense, setCreateExpense] = React.useState(true);
  const errorFor = (field: string) => state.fieldErrors?.[field]?.[0];
  const hasAccounts = accounts.length > 0;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="debtId" value={debtId} />

      {state.error ? <Alert tone="error">{state.error}</Alert> : null}

      {!hasAccounts ? (
        <Alert tone="info">
          Cadastre uma conta em{" "}
          <Link href="/contas/nova" className="font-semibold underline">
            Contas
          </Link>{" "}
          para que o pagamento altere o saldo da conta.
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Valor pago (R$)"
          htmlFor="amount"
          error={errorFor("amount")}
          hint={`Saldo devedor atual: ${formatCents(balanceCents)}`}
        >
          <Input
            id="amount"
            name="amount"
            inputMode="decimal"
            placeholder="0,00"
            required
          />
        </Field>

        <Field label="Data do pagamento" htmlFor="paidAt" error={errorFor("paidAt")}>
          <Input
            id="paidAt"
            name="paidAt"
            type="date"
            defaultValue={today}
            required
          />
        </Field>

        <Field
          label="Conta utilizada"
          htmlFor="financialAccountId"
          error={errorFor("financialAccountId")}
        >
          <Select
            id="financialAccountId"
            name="financialAccountId"
            defaultValue={accounts[0]?.id ?? ""}
            required={createExpense}
          >
            <option value="">Selecione uma conta</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Forma de pagamento"
          htmlFor="paymentMethod"
          error={errorFor("paymentMethod")}
        >
          <Select id="paymentMethod" name="paymentMethod" defaultValue="PIX">
            <option value="">Não informado</option>
            {PAYMENT_METHOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Observações"
          htmlFor="notes"
          error={errorFor("notes")}
          className="sm:col-span-2"
        >
          <Textarea
            id="notes"
            name="notes"
            placeholder="Opcional"
            className="min-h-20"
          />
        </Field>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
        <input
          type="checkbox"
          name="createExpense"
          checked={createExpense}
          onChange={(event) => setCreateExpense(event.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 accent-emerald-600"
        />
        <span>
          <span className="block text-xs font-medium text-slate-800">
            Registrar também como despesa paga
          </span>
          <span className="mt-0.5 block text-[11px] leading-relaxed text-slate-500">
            Recomendado. O pagamento entra no fluxo de caixa uma única vez,
            vinculado a esta dívida.
          </span>
        </span>
      </label>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Receipt className="h-4 w-4" />
        )}
        {pending ? "Registrando..." : "Registrar pagamento"}
      </Button>
    </form>
  );
}
