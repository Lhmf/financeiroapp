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
import {
  EXPENSE_TYPE_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
} from "@/lib/constants";
import type { ActionState } from "@/lib/validation";
import type {
  ExpenseStatus,
  ExpenseType,
  PaymentMethod,
} from "@/generated/prisma/enums";

type Option = { id: string; name: string };

export type ExpenseFormValues = {
  id?: string;
  description?: string;
  amount?: string;
  categoryId?: string;
  dueDate?: string;
  paidDate?: string;
  type?: ExpenseType;
  paymentMethod?: PaymentMethod;
  financialAccountId?: string;
  status?: ExpenseStatus;
  installmentNumber?: string;
  installmentTotal?: string;
  notes?: string;
};

export function ExpenseForm({
  action,
  categories,
  accounts,
  defaultValues = {},
  submitLabel = "Salvar despesa",
  cancelHref = "/despesas",
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  categories: Option[];
  accounts: Option[];
  defaultValues?: ExpenseFormValues;
  submitLabel?: string;
  cancelHref?: string;
}) {
  const [state, formAction, pending] = React.useActionState(action, {});
  const [status, setStatus] = React.useState<ExpenseStatus>(
    defaultValues.status ?? "PENDING",
  );
  const [type, setType] = React.useState<ExpenseType>(
    defaultValues.type ?? "VARIABLE",
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
            placeholder="Ex.: Aluguel de novembro"
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
              setStatus(event.target.value as ExpenseStatus)
            }
          >
            <option value="PENDING">Pendente</option>
            <option value="PAID">Paga</option>
          </Select>
        </Field>

        <Field
          label="Data de vencimento"
          htmlFor="dueDate"
          error={errorFor("dueDate")}
        >
          <Input
            id="dueDate"
            name="dueDate"
            type="date"
            defaultValue={defaultValues.dueDate}
            required
          />
        </Field>

        <Field
          label="Data de pagamento"
          htmlFor="paidDate"
          error={errorFor("paidDate")}
          hint={
            status === "PAID"
              ? "Obrigatória para despesas pagas."
              : "Preencha quando pagar."
          }
        >
          <Input
            id="paidDate"
            name="paidDate"
            type="date"
            defaultValue={defaultValues.paidDate}
            required={status === "PAID"}
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

        <Field label="Tipo" htmlFor="type" error={errorFor("type")}>
          <Select
            id="type"
            name="type"
            value={type}
            onChange={(event) => setType(event.target.value as ExpenseType)}
          >
            {EXPENSE_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Forma de pagamento"
          htmlFor="paymentMethod"
          error={errorFor("paymentMethod")}
        >
          <Select
            id="paymentMethod"
            name="paymentMethod"
            defaultValue={defaultValues.paymentMethod ?? ""}
          >
            <option value="">Não informado</option>
            {PAYMENT_METHOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Conta utilizada"
          htmlFor="financialAccountId"
          error={errorFor("financialAccountId")}
          hint={
            status === "PAID"
              ? "Obrigatória para despesas pagas."
              : "Usada quando a despesa for paga."
          }
        >
          <Select
            id="financialAccountId"
            name="financialAccountId"
            defaultValue={defaultValues.financialAccountId ?? ""}
            required={status === "PAID"}
          >
            <option value="">Selecione uma conta</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </Select>
        </Field>

        {type === "INSTALLMENT" ? (
          <>
            <Field
              label="Parcela nº"
              htmlFor="installmentNumber"
              error={errorFor("installmentNumber")}
            >
              <Input
                id="installmentNumber"
                name="installmentNumber"
                type="number"
                min={1}
                placeholder="1"
                defaultValue={defaultValues.installmentNumber}
              />
            </Field>
            <Field
              label="Total de parcelas"
              htmlFor="installmentTotal"
              error={errorFor("installmentTotal")}
            >
              <Input
                id="installmentTotal"
                name="installmentTotal"
                type="number"
                min={2}
                placeholder="12"
                defaultValue={defaultValues.installmentTotal}
              />
            </Field>
          </>
        ) : null}

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
