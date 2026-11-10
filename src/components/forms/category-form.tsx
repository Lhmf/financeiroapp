"use client";

import * as React from "react";
import { Loader2, Plus, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import type { ActionState } from "@/lib/validation";
import type { CategoryType } from "@/generated/prisma/enums";

export function CategoryForm({
  action,
  defaultValues = {},
  compact = false,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  defaultValues?: {
    id?: string;
    name?: string;
    type?: CategoryType;
    color?: string;
  };
  compact?: boolean;
}) {
  const [state, formAction, pending] = React.useActionState(action, {});
  const errorFor = (field: string) => state.fieldErrors?.[field]?.[0];
  const isEdit = Boolean(defaultValues.id);

  if (compact) {
    return (
      <form action={formAction} className="space-y-3">
        {state.error ? <Alert tone="error">{state.error}</Alert> : null}
        <div className="flex flex-wrap items-end gap-2">
          <Field
            label="Nova categoria"
            htmlFor="name"
            error={errorFor("name")}
            className="min-w-[160px] flex-1"
          >
            <Input
              id="name"
              name="name"
              placeholder="Ex.: Assinaturas"
              required
            />
          </Field>
          <Field label="Tipo" htmlFor="type" error={errorFor("type")}>
            <Select id="type" name="type" defaultValue="EXPENSE">
              <option value="EXPENSE">Despesa</option>
              <option value="INCOME">Receita</option>
            </Select>
          </Field>
          <Field label="Cor" htmlFor="color" error={errorFor("color")}>
            <input
              id="color"
              name="color"
              type="color"
              defaultValue="#64748b"
              className="h-10 w-12 cursor-pointer rounded-xl border border-slate-200 bg-white p-1 shadow-sm"
            />
          </Field>
          <Button type="submit" disabled={pending}>
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Adicionar
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {defaultValues.id ? (
        <input type="hidden" name="id" value={defaultValues.id} />
      ) : null}

      {state.error ? <Alert tone="error">{state.error}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Nome"
          htmlFor={`name-${defaultValues.id ?? "new"}`}
          error={errorFor("name")}
        >
          <Input
            id={`name-${defaultValues.id ?? "new"}`}
            name="name"
            defaultValue={defaultValues.name}
            placeholder="Ex.: Assinaturas"
            required
          />
        </Field>

        <Field label="Tipo" htmlFor={`type-${defaultValues.id ?? "new"}`}>
          {isEdit ? (
            <>
              <Select
                id={`type-${defaultValues.id}`}
                defaultValue={defaultValues.type}
                disabled
              >
                <option value="EXPENSE">Despesa</option>
                <option value="INCOME">Receita</option>
              </Select>
              <input
                type="hidden"
                name="type"
                value={defaultValues.type ?? "EXPENSE"}
              />
            </>
          ) : (
            <Select
              id="type"
              name="type"
              defaultValue={defaultValues.type ?? "EXPENSE"}
            >
              <option value="EXPENSE">Despesa</option>
              <option value="INCOME">Receita</option>
            </Select>
          )}
        </Field>

        <Field label="Cor" htmlFor={`color-${defaultValues.id ?? "new"}`}>
          <input
            id={`color-${defaultValues.id ?? "new"}`}
            name="color"
            type="color"
            defaultValue={defaultValues.color ?? "#64748b"}
            className="h-10 w-16 cursor-pointer rounded-xl border border-slate-200 bg-white p-1 shadow-sm"
          />
        </Field>
      </div>

      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          {pending ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
