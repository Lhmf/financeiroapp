import "dotenv/config";
import { expect as baseExpect, test } from "@playwright/test";
import { Client } from "pg";

const expect = baseExpect.configure({ timeout: 20_000 });
const hasDatabase = process.env.E2E_WITH_DB === "1";
const testPrefix = "e2e-isolation-";

test.skip(
  !hasDatabase,
  "Requer banco real com o seed demo. Rode com E2E_WITH_DB=1.",
);

async function signUp(page: import("@playwright/test").Page, name: string, email: string) {
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
    connectionString:
      process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL,
  });
  await client.connect();

  try {
    const result = await client.query(
      'DELETE FROM "user" WHERE email LIKE $1',
      [`${testPrefix}%`],
    );
    console.log(`Usuários de isolamento removidos: ${result.rowCount ?? 0}`);
  } finally {
    await client.end();
  }
});

test("usuário B não vê nem edita dados do usuário A", async ({ browser }) => {
  test.setTimeout(150_000);
  const suffix = Date.now();
  const emailA = `${testPrefix}${suffix}-a@example.com`;
  const emailB = `${testPrefix}${suffix}-b@example.com`;
  const incomeDescription = `Receita isolada ${suffix}`;
  const today = new Date().toISOString().slice(0, 10);

  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  try {
    await signUp(pageA, "Isolamento A", emailA);
    await expect(pageA.getByRole("heading", { name: /Olá,/i })).toBeVisible();
    await expect(pageA.getByText("Saldo atual")).toBeVisible();

    await pageA.goto("/contas/nova");
    await pageA.getByLabel("Nome da conta").fill("Conta isolada A");
    await pageA.locator("#initialBalance").fill("0,00");
    await pageA.getByRole("button", { name: "Salvar conta" }).click();
    await expect(pageA).toHaveURL(/\/contas$/);

    await pageA.goto("/receitas/nova");
    await pageA.locator("#description").fill(incomeDescription);
    await pageA.locator("#amount").fill("123,45");
    await pageA.locator("#status").selectOption("RECEIVED");
    await pageA.locator("#expectedDate").fill(today);
    await pageA.locator("#receivedDate").fill(today);
    await pageA
      .locator("#financialAccountId")
      .selectOption({ label: "Conta isolada A" });
    await pageA.getByRole("button", { name: "Salvar receita" }).click();
    await expect(pageA).toHaveURL(/\/receitas(\?|$)/);

    const incomeRow = pageA
      .locator("li")
      .filter({ hasText: incomeDescription });
    await expect(incomeRow).toBeVisible();
    await incomeRow.getByRole("link", { name: "Editar" }).click();
    await expect(pageA).toHaveURL(/\/receitas\/.+\/editar/);
    const incomeEditUrl = pageA.url();

    await signUp(pageB, "Isolamento B", emailB);
    await expect(pageB.getByRole("heading", { name: /Olá,/i })).toBeVisible();
    await expect(pageB.getByText("Saldo atual")).toBeVisible();
    await expect(pageB.getByText(incomeDescription)).toHaveCount(0);

    await pageB.goto(incomeEditUrl);
    await expect(
      pageB.getByRole("heading", { name: "Recurso não encontrado" }),
    ).toBeVisible();
    await expect(pageB.locator("main form")).toHaveCount(0);
    await expect(pageB.locator("main")).not.toContainText(incomeDescription);

    await pageA.goto("/receitas");
    await expect(
      pageA.locator("li").filter({ hasText: incomeDescription }),
    ).toBeVisible();
  } finally {
    await contextA.close();
    await contextB.close();
  }
});
