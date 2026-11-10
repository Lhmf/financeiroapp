"use client";

import * as React from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { DEBT_TYPE_OPTIONS } from "@/lib/constants";
import type { ActionState } from "@/lib/validation";
import type { DebtType } from "@/generated/prisma/enums";

export type DebtFormValues = {
  id?: string;
  name?: string;
  creditor?: string;
  type?: DebtType;
  initialAmount?: string;
  dueDay?: string;
  notes?: string;
};

export function DebtForm({
  action,
  defaultValues = {},
  submitLabel = "Salvar dívida",
  cancelHref = "/dividas",
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  defaultValues?: DebtFormValues;
  submitLabel?: string;
  cancelHref?: string;
}) {
  const [state, formAction, pending] = React.useActionState(action, {});
  const errorFor = (field: string) => state.fieldErrors?.[field]?.[0];

  return (
    <form action={formAction} className="space-y-5">
      {defaultValues.id ? (
        <input type="hidden" name="id" value={defaultValues.id} />
      ) : null}

      {state.error ? <Alert tone="error">{state.error}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Nome da dívida"
          htmlFor="name"
          error={errorFor("name")}
          className="sm:col-span-2"
        >
          <Input
            id="name"
            name="name"
            placeholder="Ex.: Cartão Caixa"
            defaultValue={defaultValues.name}
            required
          />
        </Field>

        <Field
          label="Credor"
          htmlFor="creditor"
          error={errorFor("creditor")}
        >
          <Input
            id="creditor"
            name="creditor"
            placeholder="Banco ou pessoa"
            defaultValue={defaultValues.creditor}
          />
        </Field>

        <Field label="Tipo" htmlFor="type" error={errorFor("type")}>
          <Select
            id="type"
            name="type"
            defaultValue={defaultValues.type ?? "OTHER"}
          >
            {DEBT_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Valor inicial (R$)"
          htmlFor="initialAmount"
          error={errorFor("initialAmount")}
          hint="Saldo devedor no momento do cadastro."
        >
          <Input
            id="initialAmount"
            name="initialAmount"
            inputMode="decimal"
            placeholder="0,00"
            defaultValue={defaultValues.initialAmount}
            required
          />
        </Field>

        <Field
          label="Dia de vencimento"
          htmlFor="dueDay"
          error={errorFor("dueDay")}
          hint="Opcional. Ex.: 10."
        >
          <Input
            id="dueDay"
            name="dueDay"
            type="number"
            min={1}
            max={31}
            placeholder="10"
            defaultValue={defaultValues.dueDay}
          />
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
            placeholder="Juros, parcelas, condições..."
            defaultValue={defaultValues.notes}
          />
        </Field>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4">
        <LinkButton href={cancelHref} variant="outline">
          Cancelar
        </LinkButton>
        <Button type="submit" disabled={pending}>
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {pending ? "Salvando..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
