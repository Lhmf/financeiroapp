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
import type { ActionState } from "@/lib/validation";
import type { IncomeStatus } from "@/generated/prisma/enums";

type Option = { id: string; name: string };

export type IncomeFormValues = {
  id?: string;
  description?: string;
  amount?: string;
  categoryId?: string;
  source?: string;
  expectedDate?: string;
  receivedDate?: string;
  financialAccountId?: string;
  status?: IncomeStatus;
  notes?: string;
};

export function IncomeForm({
  action,
  categories,
  accounts,
  defaultValues = {},
  submitLabel = "Salvar receita",
  cancelHref = "/receitas",
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  categories: Option[];
  accounts: Option[];
  defaultValues?: IncomeFormValues;
  submitLabel?: string;
  cancelHref?: string;
}) {
  const [state, formAction, pending] = React.useActionState(action, {});
  const [status, setStatus] = React.useState<IncomeStatus>(
    defaultValues.status ?? "EXPECTED",
  );

  const errorFor = (field: string) => state.fieldErrors?.[field]?.[0];

  return (
    <form action={formAction} className="space-y-5">
      {defaultValues.id ? (
        <input type="hidden" name="id" value={defaultValues.id} />
      ) : null}

      {state.error ? <Alert tone="error">{state.error}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Descrição"
          htmlFor="description"
          error={errorFor("description")}
          className="sm:col-span-2"
        >
          <Input
            id="description"
            name="description"
            placeholder="Ex.: Salário de novembro"
            defaultValue={defaultValues.description}
            required
          />
        </Field>

        <Field label="Valor (R$)" htmlFor="amount" error={errorFor("amount")}>
          <Input
            id="amount"
            name="amount"
            inputMode="decimal"
            placeholder="0,00"
            defaultValue={defaultValues.amount}
            required
          />
        </Field>

        <Field label="Status" htmlFor="status" error={errorFor("status")}>
          <Select
            id="status"
            name="status"
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as IncomeStatus)
            }
          >
            <option value="EXPECTED">Prevista</option>
            <option value="RECEIVED">Recebida</option>
          </Select>
        </Field>

        <Field
          label="Data prevista"
          htmlFor="expectedDate"
          error={errorFor("expectedDate")}
        >
          <Input
            id="expectedDate"
            name="expectedDate"
            type="date"
            defaultValue={defaultValues.expectedDate}
            required
          />
        </Field>

        <Field
          label="Data de recebimento"
          htmlFor="receivedDate"
          error={errorFor("receivedDate")}
          hint={
            status === "RECEIVED"
              ? "Obrigatória para receitas recebidas."
              : "Preencha quando o valor cair na conta."
          }
        >
          <Input
            id="receivedDate"
            name="receivedDate"
            type="date"
            defaultValue={defaultValues.receivedDate}
            required={status === "RECEIVED"}
          />
        </Field>

        <Field
          label="Categoria"
          htmlFor="categoryId"
          error={errorFor("categoryId")}
        >
          <Select
            id="categoryId"
            name="categoryId"
            defaultValue={defaultValues.categoryId ?? ""}
          >
            <option value="">Sem categoria</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Origem"
          htmlFor="source"
          error={errorFor("source")}
          hint="Ex.: empresa, cliente, laudo."
        >
          <Input
            id="source"
            name="source"
            placeholder="Opcional"
            defaultValue={defaultValues.source}
          />
        </Field>

        <Field
          label="Conta de destino"
          htmlFor="financialAccountId"
          error={errorFor("financialAccountId")}
          hint={
            status === "RECEIVED"
              ? "Obrigatória para receitas recebidas."
              : "Usada quando a receita for recebida."
          }
        >
          <Select
            id="financialAccountId"
            name="financialAccountId"
            defaultValue={defaultValues.financialAccountId ?? ""}
            required={status === "RECEIVED"}
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
          label="Observações"
          htmlFor="notes"
          error={errorFor("notes")}
          className="sm:col-span-2"
        >
          <Textarea
            id="notes"
            name="notes"
            placeholder="Detalhes opcionais"
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
