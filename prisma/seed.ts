/**
 * Seed de demonstração.
 *
 * Cria um usuário demo com dados de exemplo para validar a interface.
 * Nunca use estas credenciais em produção.
 *
 * Uso:
 *   npm run db:seed
 *
 * Variáveis opcionais:
 *   SEED_EMAIL, SEED_PASSWORD, SEED_NAME
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { prisma } from "../src/lib/prisma";
import { ensureDefaultCategories } from "../src/services/categories";
import { todayUTC } from "../src/lib/dates";

const EMAIL = process.env.SEED_EMAIL ?? "demo@financeiro.local";
const PASSWORD = process.env.SEED_PASSWORD ?? "demo12345";
const NAME = process.env.SEED_NAME ?? "Usuário Demo";

function dateInMonth(offset: number, day: number): Date {
  const now = todayUTC();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, day));
}

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: EMAIL } });

  if (existing) {
    console.log(`O usuário demo ${EMAIL} já existe. Nada foi alterado.`);
    return;
  }

  const passwordHash = await hashPassword(PASSWORD);

  const user = await prisma.user.create({
    data: {
      id: randomUUID(),
      name: NAME,
      email: EMAIL,
      emailVerified: true,
      categoriesSeeded: false,
    },
  });

  await prisma.account.create({
    data: {
      id: randomUUID(),
      userId: user.id,
      accountId: user.id,
      providerId: "credential",
      password: passwordHash,
    },
  });

  await ensureDefaultCategories(user.id);

  const categories = await prisma.category.findMany({
    where: { userId: user.id },
  });
  const categoryId = (name: string) => {
    const category = categories.find((item) => item.name === name);
    if (!category) throw new Error(`Categoria não encontrada: ${name}`);
    return category.id;
  };

  const checking = await prisma.financialAccount.create({
    data: {
      userId: user.id,
      name: "Conta principal",
      type: "CHECKING",
      initialBalanceCents: 350_000,
      color: "#059669",
    },
  });

  await prisma.financialAccount.create({
    data: {
      userId: user.id,
      name: "Carteira",
      type: "CASH",
      initialBalanceCents: 50_000,
      color: "#0ea5e9",
    },
  });

  await prisma.financialAccount.create({
    data: {
      userId: user.id,
      name: "Reserva",
      type: "SAVINGS",
      initialBalanceCents: 1_000_000,
      color: "#8b5cf6",
    },
  });

  await prisma.income.createMany({
    data: [
      {
        userId: user.id,
        description: "Salário",
        amountCents: 659_000,
        categoryId: categoryId("Salário"),
        source: "Empresa",
        expectedDate: dateInMonth(0, 5),
        receivedDate: dateInMonth(0, 5),
        financialAccountId: checking.id,
        status: "RECEIVED",
        notes: "Renda mensal projetada usada como base do MVP.",
      },
      {
        userId: user.id,
        description: "Laudo técnico",
        amountCents: 150_000,
        categoryId: categoryId("Laudos técnicos"),
        source: "Cliente EngServ",
        expectedDate: dateInMonth(1, 10),
        financialAccountId: checking.id,
        status: "EXPECTED",
      },
      {
        userId: user.id,
        description: "Comissão",
        amountCents: 80_000,
        categoryId: categoryId("Comissões"),
        source: "Parceiro",
        expectedDate: dateInMonth(-1, 20),
        receivedDate: dateInMonth(-1, 20),
        financialAccountId: checking.id,
        status: "RECEIVED",
      },
    ],
  });

  const rent = await prisma.expense.create({
    data: {
      userId: user.id,
      description: "Aluguel",
      amountCents: 180_000,
      categoryId: categoryId("Moradia"),
      dueDate: dateInMonth(0, 5),
      paidDate: dateInMonth(0, 5),
      type: "FIXED",
      paymentMethod: "PIX",
      financialAccountId: checking.id,
      status: "PAID",
    },
  });

  await prisma.expense.create({
    data: {
      userId: user.id,
      description: "Mercado",
      amountCents: 95_000,
      categoryId: categoryId("Alimentação"),
      dueDate: dateInMonth(0, 12),
      paidDate: dateInMonth(0, 12),
      type: "VARIABLE",
      paymentMethod: "DEBIT",
      financialAccountId: checking.id,
      status: "PAID",
    },
  });

  await prisma.expense.create({
    data: {
      userId: user.id,
      description: "Conta de energia",
      amountCents: 22_000,
      categoryId: categoryId("Moradia"),
      dueDate: dateInMonth(0, 20),
      type: "VARIABLE",
      paymentMethod: "BOLETO",
      financialAccountId: checking.id,
      status: "PENDING",
    },
  });

  await prisma.expense.create({
    data: {
      userId: user.id,
      description: "Parcela do carro",
      amountCents: 72_300,
      categoryId: categoryId("Transporte"),
      dueDate: dateInMonth(0, 15),
      paidDate: dateInMonth(0, 15),
      type: "INSTALLMENT",
      paymentMethod: "TRANSFER",
      financialAccountId: checking.id,
      status: "PAID",
      installmentNumber: 3,
      installmentTotal: 12,
      notes: "Parcela que deixa de existir ao final do financiamento.",
    },
  });

  await prisma.expense.create({
    data: {
      userId: user.id,
      description: "IPVA",
      amountCents: 50_000,
      categoryId: categoryId("Impostos"),
      dueDate: dateInMonth(1, 10),
      type: "OCCASIONAL",
      paymentMethod: "BOLETO",
      status: "PENDING",
    },
  });

  const cardDebt = await prisma.debt.create({
    data: {
      userId: user.id,
      name: "Cartão Caixa",
      creditor: "Caixa",
      type: "CREDIT_CARD",
      initialAmountCents: 200_000,
      dueDay: 10,
      notes: "Dívida demonstrativa do cartão.",
    },
  });

  await prisma.debt.create({
    data: {
      userId: user.id,
      name: "Documento do carro",
      creditor: "Detran",
      type: "TAX",
      initialAmountCents: 70_000,
      dueDay: 15,
    },
  });

  await prisma.debt.create({
    data: {
      userId: user.id,
      name: "DAS/DASN",
      creditor: "Receita Federal",
      type: "TAX",
      initialAmountCents: 60_000,
      dueDay: 20,
    },
  });

  await prisma.debt.create({
    data: {
      userId: user.id,
      name: "IPVA",
      creditor: "Detran",
      type: "TAX",
      initialAmountCents: 50_000,
      dueDay: 10,
    },
  });

  const paymentExpense = await prisma.expense.create({
    data: {
      userId: user.id,
      description: "Pagamento — Cartão Caixa",
      amountCents: 50_000,
      categoryId: categoryId("Dívidas"),
      dueDate: dateInMonth(0, 10),
      paidDate: dateInMonth(0, 10),
      type: "FIXED",
      paymentMethod: "PIX",
      financialAccountId: checking.id,
      status: "PAID",
      notes: "Despesa vinculada ao pagamento da dívida.",
    },
  });

  await prisma.debtPayment.create({
    data: {
      userId: user.id,
      debtId: cardDebt.id,
      amountCents: 50_000,
      paidAt: dateInMonth(0, 10),
      financialAccountId: checking.id,
      expenseId: paymentExpense.id,
      notes: "Pagamento parcial demonstrativo.",
    },
  });

  console.log("Seed concluído.");
  console.log(`Usuário: ${EMAIL}`);
  console.log(`Senha:   ${PASSWORD}`);
  console.log("Conta principal, receitas, despesas e dívidas de exemplo criadas.");
  console.log("A despesa de pagamento do cartão está vinculada ao pagamento da dívida.");
  console.log(`Conta inicial de referência: ${rent.description}.`);
}

main()
  .catch((error) => {
    console.error("Falha ao executar o seed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
