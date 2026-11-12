import "dotenv/config";
import { expect as baseExpect, test } from "@playwright/test";
import { Client } from "pg";

const expect = baseExpect.configure({ timeout: 20_000 });
const hasDatabase = process.env.E2E_WITH_DB === "1";
const testPrefix = "e2e-agenda-";

test.skip(
  !hasDatabase,
  "Requer banco real. Rode com E2E_WITH_DB=1.",
);

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
    console.log(`Usuários da agenda removidos: ${result.rowCount ?? 0}`);
  } finally {
    await client.end();
  }
});

test("agenda combina contas a pagar e a receber e respeita os filtros", async ({
  page,
}) => {
  test.setTimeout(180_000);
  page.setDefaultTimeout(20_000);

  const suffix = Date.now();
  const email = `${testPrefix}${suffix}@example.com`;
  const accountName = `Conta agenda ${suffix}`;
  const expenseName = `Despesa agenda ${suffix}`;
  const incomeName = `Receita agenda ${suffix}`;
  const today = new Date().toISOString().slice(0, 10);
  const day = Number(today.slice(8, 10));

  await signUp(page, "Agenda E2E", email);

  await page.goto("/contas/nova");
  await page.getByLabel("Nome da conta").fill(accountName);
  await page.locator("#initialBalance").fill("0,00");
  await page.getByRole("button", { name: "Salvar conta" }).click();
  await expect(page).toHaveURL(/\/contas$/);

  await page.goto("/despesas/nova");
  await page.locator("#description").fill(expenseName);
  await page.locator("#amount").fill("10,00");
  await page.locator("#dueDate").fill(today);
  await page
    .locator("#financialAccountId")
    .selectOption({ label: accountName });
  await page.getByRole("button", { name: "Salvar despesa" }).click();
  await expect(page).toHaveURL(/\/despesas(\?|$)/);

  await page.goto("/receitas/nova");
  await page.locator("#description").fill(incomeName);
  await page.locator("#amount").fill("20,00");
  await page.locator("#expectedDate").fill(today);
  await page
    .locator("#financialAccountId")
    .selectOption({ label: accountName });
  await page.getByRole("button", { name: "Salvar receita" }).click();
  await expect(page).toHaveURL(/\/receitas(\?|$)/);

  await test.step("o menu abre o calendário e o dia leva para a lista", async () => {
    await page.goto("/dashboard");
    await page.getByRole("link", { name: "Calendário" }).first().click();
    await expect(page).toHaveURL(/\/calendario/);
    await expect(
      page.getByRole("heading", { name: "Calendário financeiro" }),
    ).toBeVisible();
    await expect(page.getByText("Contas a pagar").first()).toBeVisible();
    await expect(page.getByText("Contas a receber").first()).toBeVisible();

    await page.locator(`a[href$="dia=${day}"]`).first().click();
    await expect(page).toHaveURL(new RegExp(`/lista\\?.*dia=${day}`));
    await expect(
      page.getByRole("heading", { name: "Lista financeira" }),
    ).toBeVisible();
    await expect(page.getByText(expenseName)).toBeVisible();
    await expect(page.getByText(incomeName)).toBeVisible();
  });

  await test.step("a lista filtra por tipo", async () => {
    await page.goto("/lista");

    await page.getByRole("link", { name: "A pagar", exact: true }).click();
    await expect(page).toHaveURL(/tipo=pagar/);
    await expect(page.getByText(expenseName)).toBeVisible();
    await expect(page.getByText(incomeName)).toHaveCount(0);

    await page.getByRole("link", { name: "A receber", exact: true }).click();
    await expect(page).toHaveURL(/tipo=receber/);
    await expect(page.getByText(incomeName)).toBeVisible();
    await expect(page.getByText(expenseName)).toHaveCount(0);
  });

  await test.step("as áreas dedicadas separam os dois tipos", async () => {
    await page.goto("/contas-a-pagar");
    await expect(
      page.getByRole("heading", { name: "Contas a pagar" }),
    ).toBeVisible();
    await expect(page.getByText(expenseName)).toBeVisible();
    await expect(page.getByText(incomeName)).toHaveCount(0);

    await page.goto("/contas-a-receber");
    await expect(
      page.getByRole("heading", { name: "Contas a receber" }),
    ).toBeVisible();
    await expect(page.getByText(incomeName)).toBeVisible();
    await expect(page.getByText(expenseName)).toHaveCount(0);
  });

  await test.step("pagar e receber voltam para a área de origem", async () => {
    await page.goto("/contas-a-pagar");
    const expenseRow = page.locator("li").filter({ hasText: expenseName });
    await expenseRow.getByRole("button", { name: "Pagar" }).click();
    await expect(page).toHaveURL(/\/contas-a-pagar/);
    await expect(page.getByText(expenseName)).toHaveCount(0);

    await page.goto("/contas-a-receber");
    const incomeRow = page.locator("li").filter({ hasText: incomeName });
    await incomeRow.getByRole("button", { name: "Receber" }).click();
    await expect(page).toHaveURL(/\/contas-a-receber/);
    await expect(page.getByText(incomeName)).toHaveCount(0);
  });
});
