/** Converte FormData em objeto simples para o Zod. */
export function formValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") values[key] = value;
  }
  return values;
}

export function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

/**
 * Aceita apenas caminhos internos como destino pós-ação.
 * Evita open redirect ao mesmo tempo em que permite voltar para a agenda.
 */
export function safeRedirectPath(value: string, fallback: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}
