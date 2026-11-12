import "dotenv/config";
import path from "node:path";
import { expect as baseExpect, test } from "@playwright/test";
import { Client } from "pg";

const expect = baseExpect.configure({ timeout: 20_000 });
const hasDatabase = process.env.E2E_WITH_DB === "1";
const testPrefix = "e2e-pdf-";
const pdfFixture = path.resolve("tests/fixtures/extrato.pdf");

test.skip(!hasDatabase, "Requer banco real. Rode com E2E_WITH_DB=1.");

async function signUp(
  page: import("@playwright/test").Page,
  name: string,
  email: string,
) {
  await page.goto("/cadastro");
  await page.getByLabel("Nome").fill(name);
  await page.getByLabel("E-mail").fill(email);
  await page.locator("#password").fill("senha12345");
  await page.locator("#confirmPassword").fill("senha12345");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test.afterAll(async () => {
  if (!hasDatabase) return;

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  await client.connect();

  try {
    const result = await client.query('DELETE FROM "user" WHERE email LIKE $1', [
      `${testPrefix}%`,
    ]);
    console.log(`Usuários do PDF removidos: ${result.rowCount ?? 0}`);
  } finally {
    await client.end();
  }
});

test("importa um PDF de extrato com texto selecionável", async ({ page }) => {
  test.setTimeout(180_000);
  page.setDefaultTimeout(20_000);

  const suffix = Date.now();
  const email = `${testPrefix}${suffix}@example.com`;
  const accountName = `Conta PDF ${suffix}`;

  await signUp(page, "PDF E2E", email);

  await page.goto("/contas/nova");
  await page.getByLabel("Nome da conta").fill(accountName);
  await page.locator("#initialBalance").fill("0,00");
  await page.getByRole("button", { name: "Salvar conta" }).click();
  await expect(page).toHaveURL(/\/contas$/);

  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Importar extrato" }).click();
  await expect(
    page.getByRole("heading", { name: "Importar extrato" }),
  ).toBeVisible();

  await page
    .locator('input[type="file"]')
    .setInputFiles(pdfFixture);

  await expect(page.getByText("Prévia do extrato")).toBeVisible();
  await expect(page.getByText("PDF", { exact: true })).toBeVisible();
  await expect(page.getByText("PIX RECEBIDO JOAO")).toBeVisible();
  await expect(page.getByText("COMPRA MERCADO")).toBeVisible();
  await expect(page.getByText("APLICACAO RDB")).toBeVisible();

  await page
    .getByRole("button", { name: "Importar 2 lançamentos" })
    .click();
  await expect(page.getByText("Extrato importado")).toBeVisible();

  await page.getByRole("button", { name: "Fechar", exact: true }).click();

  await page.goto("/despesas?mes=2026-11");
  await expect(page.getByText("COMPRA MERCADO")).toBeVisible();
  await expect(page.getByText("APLICACAO RDB")).toHaveCount(0);

  await page.goto("/receitas?mes=2026-11");
  await expect(page.getByText("PIX RECEBIDO JOAO")).toBeVisible();
});
