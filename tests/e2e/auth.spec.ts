import { expect, test } from "@playwright/test";

/**
 * Smoke test sem banco de dados.
 *
 * Valida que a aplicação sobe e que as páginas públicas de autenticação
 * renderizam. Os fluxos com persistência exigem DATABASE_URL real e são
 * cobertos manualmente na validação do MVP.
 */
test("login abre e navega para o cadastro", async ({ page }) => {
  await page.goto("/login");

  await expect(
    page.getByRole("heading", { name: "Entrar na sua conta" }),
  ).toBeVisible();
  await expect(page.getByLabel("E-mail")).toBeVisible();
  await expect(page.getByLabel("Senha")).toBeVisible();

  await page.getByRole("link", { name: "Criar conta" }).click();

  await expect(page).toHaveURL(/\/cadastro$/);
  await expect(page.getByRole("heading", { name: /criar conta/i })).toBeVisible();
});

test("rota protegida redireciona para login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});
