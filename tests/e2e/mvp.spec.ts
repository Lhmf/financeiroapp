import { expect as baseExpect, test } from "@playwright/test";

const expect = baseExpect.configure({ timeout: 20_000 });
const hasDatabase = process.env.E2E_WITH_DB === "1";

test.skip(
  !hasDatabase,
  "Requer banco real com o seed demo. Rode com E2E_WITH_DB=1.",
);

/**
 * Validação de ponta a ponta contra um banco real.
 *
 * O teste usa o usuário demo do seed, cria dados com nomes únicos e remove
 * tudo o que criou. Ele não deve ser executado contra dados reais.
 */
test("MVP completo com banco real e seed demo", async ({ page }) => {
  test.setTimeout(180_000);
  page.setDefaultTimeout(20_000);
  page.on("dialog", (dialog) => dialog.accept());

  const suffix = Date.now().toString().slice(-6);
  const accountName = `Conta E2E ${suffix}`;
  const incomeName = `Receita E2E ${suffix}`;
  const expenseName = `Despesa E2E ${suffix}`;
  const installmentName = `Parcela E2E ${suffix}`;
  const debtName = `Dívida E2E ${suffix}`;
  const secondDebtName = `Dívida E2E 2 ${suffix}`;
  const today = new Date().toISOString().slice(0, 10);
  let debtUrl = "";

  await test.step("login com usuário demo", async () => {
    await page.goto("/login");
    await page.getByLabel("E-mail").fill("demo@financeiro.local");
    await page.locator("#password").fill("demo12345");
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(
      page.getByRole("heading", { name: /Olá,/i }),
    ).toBeVisible();
    await expect(page.getByText("Saldo atual")).toBeVisible();
    await expect(page.getByText("Receitas recebidas").first()).toBeVisible();
    await expect(page.getByText("Despesas pagas").first()).toBeVisible();
    await expect(page.getByText("Resultado do mês").first()).toBeVisible();
    await expect(page.getByText("Dívidas ativas").first()).toBeVisible();
    await expect(page.getByText("Evolução financeira")).toBeVisible();
  });

  await test.step("criar conta com saldo inicial", async () => {
    await page.goto("/contas/nova");
    await page.getByLabel("Nome da conta").fill(accountName);
    await page.locator("#initialBalance").fill("100,00");
    await page.getByRole("button", { name: "Salvar conta" }).click();

    await expect(page).toHaveURL(/\/contas$/);
    await expect(page.getByText(accountName)).toBeVisible();
  });

  await test.step("criar, editar, recarregar e excluir receita", async () => {
    await page.goto("/receitas/nova");
    await page.locator("#description").fill(incomeName);
    await page.locator("#amount").fill("50,00");
    await page.locator("#status").selectOption("RECEIVED");
    await page.locator("#expectedDate").fill(today);
    await page.locator("#receivedDate").fill(today);
    await page
      .locator("#financialAccountId")
      .selectOption({ label: accountName });
    await page.getByRole("button", { name: "Salvar receita" }).click();

    await expect(page).toHaveURL(/\/receitas(\?|$)/);
    const row = page.locator("li").filter({ hasText: incomeName });
    await expect(row).toBeVisible();
    await expect(row.getByText("Recebida", { exact: true })).toBeVisible();

    await page.reload();
    await expect(row).toBeVisible();

    await page.goto("/contas");
    const accountWithMovement = page
      .locator("div.rounded-2xl")
      .filter({ has: page.getByRole("heading", { name: accountName }) });
    await accountWithMovement
      .getByRole("button", { name: "Excluir", exact: true })
      .click();
    await expect(page).toHaveURL(/\/contas\?erro=conta-com-movimentacoes/);
    await expect(
      page.getByText(/possui movimentações e não pode ser excluída/i),
    ).toBeVisible();

    await page.goto("/receitas");
    await expect(row).toBeVisible();
    await row.getByRole("link", { name: "Editar" }).click();
    await expect(page).toHaveURL(/\/receitas\/.+\/editar/);
    await page.locator("#amount").fill("60,00");
    await page.getByRole("button", { name: "Salvar alterações" }).click();
    await expect(page).toHaveURL(/\/receitas(\?|$)/);
    await expect(
      page.locator("li").filter({ hasText: incomeName }).getByText("+R$ 60,00"),
    ).toBeVisible();

    await page
      .locator("li")
      .filter({ hasText: incomeName })
      .getByRole("button", { name: "Excluir" })
      .click();
    await expect(
      page.locator("li").filter({ hasText: incomeName }),
    ).toHaveCount(0);
  });

  await test.step("criar, editar e excluir despesa paga", async () => {
    await page.goto("/despesas/nova");
    await page.locator("#description").fill(expenseName);
    await page.locator("#amount").fill("20,00");
    await page.locator("#status").selectOption("PAID");
    await page.locator("#dueDate").fill(today);
    await page.locator("#paidDate").fill(today);
    await page
      .locator("#financialAccountId")
      .selectOption({ label: accountName });
    await page.getByRole("button", { name: "Salvar despesa" }).click();

    await expect(page).toHaveURL(/\/despesas(\?|$)/);
    const row = page.locator("li").filter({ hasText: expenseName });
    await expect(row).toBeVisible();
    await expect(row.getByText("Paga", { exact: true })).toBeVisible();

    await row.getByRole("link", { name: "Editar" }).click();
    await page.locator("#amount").fill("25,00");
    await page.getByRole("button", { name: "Salvar alterações" }).click();
    await expect(page).toHaveURL(/\/despesas(\?|$)/);
    await expect(
      page
        .locator("li")
        .filter({ hasText: expenseName })
        .getByText("−R$ 25,00"),
    ).toBeVisible();

    await page
      .locator("li")
      .filter({ hasText: expenseName })
      .getByRole("button", { name: "Excluir" })
      .click();
    await expect(
      page.locator("li").filter({ hasText: expenseName }),
    ).toHaveCount(0);
  });

  await test.step("criar despesa parcelada e conferir exibição", async () => {
    await page.goto("/despesas/nova");
    await page.locator("#description").fill(installmentName);
    await page.locator("#amount").fill("10,00");
    await page.locator("#dueDate").fill(today);
    await page.locator("#type").selectOption("INSTALLMENT");
    await page.locator("#installmentNumber").fill("1");
    await page.locator("#installmentTotal").fill("3");
    await page.getByRole("button", { name: "Salvar despesa" }).click();

    await expect(page).toHaveURL(/\/despesas(\?|$)/);
    const row = page.locator("li").filter({ hasText: installmentName });
    await expect(row.getByText("Parcela 1/3")).toBeVisible();
    await row.getByRole("button", { name: "Excluir" }).click();
    await expect(
      page.locator("li").filter({ hasText: installmentName }),
    ).toHaveCount(0);
  });

  await test.step("criar dívida e pagar com despesa vinculada", async () => {
    await page.goto("/dividas/nova");
    await page.locator("#name").fill(debtName);
    await page.locator("#creditor").fill("Credor E2E");
    await page.locator("#initialAmount").fill("100,00");
    await page.getByRole("button", { name: "Salvar dívida" }).click();

    await expect(page).toHaveURL(/\/dividas\/.+/);
    await expect(page.getByRole("heading", { name: debtName })).toBeVisible();
    debtUrl = page.url();

    await page.locator("#amount").fill("30,00");
    await page
      .locator("#financialAccountId")
      .selectOption({ label: accountName });
    await page.getByRole("button", { name: "Registrar pagamento" }).click();

    await expect(
      page.getByText("Saldo devedor", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("R$ 70,00", { exact: true })).toBeVisible();
    await expect(
      page.getByText("R$ 30,00", { exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByText("Despesa vinculada", { exact: true }),
    ).toBeVisible();

    await page.locator("#amount").fill("80,00");
    await page.getByRole("button", { name: "Registrar pagamento" }).click();
    await expect(
      page.getByText(/não pode ser maior que o saldo devedor/i),
    ).toBeVisible();

    await page.goto("/despesas?todos=1");
    const linkedRow = page.locator("li").filter({ hasText: debtName });
    await expect(
      linkedRow.getByText("Dívida", { exact: true }),
    ).toBeVisible();
    await linkedRow.getByRole("link", { name: "Ver dívida" }).click();
    await expect(page.getByRole("heading", { name: debtName })).toBeVisible();
  });

  await test.step("bloquear edição direta da despesa vinculada", async () => {
    await page.goto("/despesas?todos=1");
    const linkedRow = page.locator("li").filter({ hasText: debtName });
    await expect(
      linkedRow.getByRole("link", { name: "Editar" }),
    ).toHaveCount(0);
    await linkedRow.getByRole("link", { name: "Ver dívida" }).click();

    const linkedDebtUrl = page.url();
    await page.goto("/despesas?todos=1");
    const row = page.locator("li").filter({ hasText: debtName });
    await row.getByRole("link", { name: "Ver dívida" }).click();
    await expect(page).toHaveURL(linkedDebtUrl);
  });

  await test.step("excluir pagamento remove despesa vinculada", async () => {
    await page.goto(debtUrl);
    await expect(page.getByRole("heading", { name: debtName })).toBeVisible();

    await page
      .getByRole("button", { name: "Excluir", exact: true })
      .click();
    await expect(page.getByText("Nenhum pagamento registrado")).toBeVisible();
    await expect(page.getByText("R$ 100,00").first()).toBeVisible();

    await page.goto("/despesas?todos=1");
    await expect(
      page.locator("li").filter({ hasText: debtName }),
    ).toHaveCount(0);
  });

  await test.step("excluir dívida mantém a despesa vinculada", async () => {
    await page.goto("/dividas/nova");
    await page.locator("#name").fill(secondDebtName);
    await page.locator("#initialAmount").fill("50,00");
    await page.getByRole("button", { name: "Salvar dívida" }).click();
    await expect(
      page.getByRole("heading", { name: secondDebtName }),
    ).toBeVisible();

    await page.locator("#amount").fill("20,00");
    await page
      .locator("#financialAccountId")
      .selectOption({ label: accountName });
    await page.getByRole("button", { name: "Registrar pagamento" }).click();
    await expect(
      page.getByText("Despesa vinculada", { exact: true }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Excluir dívida" }).click();
    await expect(page).toHaveURL(/\/dividas$/);

    await page.goto("/despesas?todos=1");
    const leftover = page
      .locator("li")
      .filter({ hasText: `Pagamento — ${secondDebtName}` });
    await expect(leftover).toBeVisible();
    await expect(
      leftover.getByRole("link", { name: "Ver dívida" }),
    ).toHaveCount(0);
    await leftover.getByRole("button", { name: "Excluir" }).click();
    await expect(leftover).toHaveCount(0);
  });

  await test.step("arquivar, desarquivar e excluir conta de teste", async () => {
    await page.goto(debtUrl);
    await expect(page.getByRole("heading", { name: debtName })).toBeVisible();
    await page.getByRole("button", { name: "Excluir dívida" }).click();
    await expect(page).toHaveURL(/\/dividas$/);
    await expect(page.getByText(debtName)).toHaveCount(0);

    await page.goto("/contas");
    const accountCard = page
      .locator("div.rounded-2xl")
      .filter({ has: page.getByRole("heading", { name: accountName }) });
    await accountCard
      .getByRole("button", { name: "Arquivar", exact: true })
      .click();
    await expect(
      accountCard.getByText("Arquivada", { exact: true }),
    ).toBeVisible();
    await accountCard
      .getByRole("button", { name: "Desarquivar", exact: true })
      .click();
    await expect(
      accountCard.getByText("Arquivada", { exact: true }),
    ).toHaveCount(0);
    await accountCard
      .getByRole("button", { name: "Excluir", exact: true })
      .click();
    await expect(page.getByText(accountName)).toHaveCount(0);
  });

  await test.step("filtros e histórico", async () => {
    await page.goto("/receitas?todos=1");
    await page.getByLabel("Buscar").fill("Salário");
    await page.getByRole("button", { name: "Filtrar" }).click();
    await expect(page.getByText("Ver apenas este mês")).toBeVisible();
    await expect(
      page.locator("li").filter({ hasText: "Salário" }).first(),
    ).toBeVisible();

    await page.goto("/despesas?status=PENDING&todos=1");
    await expect(page.getByText("Ver apenas este mês")).toBeVisible();
  });

  await test.step("logout e proteção de rota", async () => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Sair" }).first().click();
    await expect(page).toHaveURL(/\/login/);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});


