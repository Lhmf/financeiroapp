"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { requireUser } from "@/lib/session";
import { formValues } from "@/lib/forms";
import {
  profileSchema,
  validationError,
  type ActionState,
} from "@/lib/validation";

export async function updateProfile(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser();
  const parsed = profileSchema.safeParse(formValues(formData));

  if (!parsed.success) return validationError(parsed.error);

  await auth.api.updateUser({
    body: { name: parsed.data.name },
    headers: await headers(),
  });

  redirect("/configuracoes?salvo=1");
}
