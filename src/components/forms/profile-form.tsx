"use client";

import * as React from "react";
import { Loader2, Save } from "lucide-react";
import { updateProfile } from "@/actions/profile";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import type { ActionState } from "@/lib/validation";

export function ProfileForm({ name }: { name: string }) {
  const [state, formAction, pending] = React.useActionState(
    updateProfile,
    {} as ActionState,
  );

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      <Field
        label="Nome"
        htmlFor="name"
        error={state.fieldErrors?.name?.[0]}
      >
        <Input id="name" name="name" defaultValue={name} required />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          {pending ? "Salvando..." : "Salvar nome"}
        </Button>
      </div>
    </form>
  );
}
