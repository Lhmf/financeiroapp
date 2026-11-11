"use client";

import * as React from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { ACCOUNT_TYPE_OPTIONS } from "@/lib/constants";
import type { ActionState } from "@/lib/validation";
import type { AccountType } from "@/generated/prisma/enums";

export type AccountFormValues = {
  id?: string;
  name?: string;
  type?: AccountType;
  initialBalance?: string;
  color?: string;
  archived?: boolean;
};

export function AccountForm({
  action,
  defaultValues = {},
  submitLabel = "Salvar conta",
  cancelHref = "/contas",
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  defaultValues?: AccountFormValues;
  submitLabel?: string;
  cancelHref?: string;
}) {
  const [state, formAction, pending] = React.useActionState(action, {});
  const errorFor = (field: string) => state.fieldErrors?.[field]?.[0];
  const isEdit = Boolean(defaultValues.id);

  return (
    <form action={formAction} className="space-y-5">
      {defaultValues.id ? (
        <input type="hidden" name="id" value={defaultValues.id} />
      ) : null}

      {state.error ? <Alert tone="error">{state.error}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Nome da conta"
          htmlFor="name"
          error={errorFor("name")}
          className="sm:col-span-2"
        >
          <Input
            id="name"
            name="name"
            placeholder="Ex.: Conta principal"
            defaultValue={defaultValues.name}
            required
          />
        </Field>

        <Field
          label="Tipo"
          htmlFor="type"
          error={errorFor("type")}
          hint="Poupança e investimento entram no saldo investido; os demais tipos entram no saldo em conta."
        >
          <Select
            id="type"
            name="type"
            defaultValue={defaultValues.type ?? "CHECKING"}
          >
            {ACCOUNT_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Saldo inicial (R$)"
          htmlFor="initialBalance"
          error={errorFor("initialBalance")}
          hint="Saldo no momento em que você começa a usar o app."
        >
          <Input
            id="initialBalance"
            name="initialBalance"
            inputMode="decimal"
            placeholder="0,00"
            defaultValue={defaultValues.initialBalance ?? "0,00"}
            required
          />
        </Field>

        <Field label="Cor" htmlFor="color" error={errorFor("color")}>
          <div className="flex items-center gap-3">
            <input
              id="color"
              name="color"
              type="color"
              defaultValue={defaultValues.color ?? "#059669"}
              className="h-10 w-14 cursor-pointer rounded-xl border border-slate-200 bg-white p-1 shadow-sm"
            />
            <span className="text-xs text-slate-600">
              Usada nos gráficos e cartões.
            </span>
          </div>
        </Field>

        {isEdit ? (
          <label className="flex items-center gap-2 self-end rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5">
            <input
              type="checkbox"
              name="archived"
              defaultChecked={defaultValues.archived}
              className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
            />
            <span className="text-xs font-medium text-slate-700">
              Conta arquivada
            </span>
          </label>
        ) : null}
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
