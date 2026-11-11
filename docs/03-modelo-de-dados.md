# 03 — Modelo de dados

## Convenções

- **Dinheiro:** `Int` em centavos. `R$ 1.234,56` é armazenado como `123456`.
- **Datas de domínio:** `DateTime @db.Date`, normalizadas para meia-noite UTC.
- **IDs:** `cuid()` no domínio; `String` sem default nos modelos de autenticação, pois o Better Auth gera os IDs.
- **Multiusuário:** toda tabela de domínio tem `userId` e relação com `User`.
- **Nomes físicos:** snake_case (`financial_accounts`, `debt_payments`).
- **Exclusão:** cascata apenas quando o filho não existe sem o pai; `SetNull` quando o histórico deve sobreviver.

## Diagrama de entidades

```text
User 1 ─── N Session
User 1 ─── N Account          (credenciais Better Auth)
User 1 ─── N Verification

User 1 ─── N FinancialAccount
User 1 ─── N Category
User 1 ─── N Income
User 1 ─── N Expense
User 1 ─── N Debt
User 1 ─── N DebtPayment

Category 1 ─── N Income
Category 1 ─── N Expense

FinancialAccount 1 ─── N Income
FinancialAccount 1 ─── N Expense
FinancialAccount 1 ─── N DebtPayment

Debt 1 ─── N DebtPayment
DebtPayment 0..1 ─── 0..1 Expense   (expenseId único)
```

## Modelos de autenticação

### `User`

| Campo | Tipo | Observação |
| --- | --- | --- |
| `id` | String PK | Gerado pelo Better Auth |
| `name` | String | Nome exibido |
| `email` | String único | Login |
| `emailVerified` | Boolean | Não há fluxo de verificação no MVP |
| `image` | String? | Reservado |
| `categoriesSeeded` | Boolean | Controla a criação única das categorias padrão |
| `createdAt` / `updatedAt` | DateTime | Auditoria básica |

### `Session`

Sessão persistida no banco. Campos principais: `token` único, `expiresAt`, `ipAddress`, `userAgent`, `userId`. Excluída em cascata com o usuário.

### `Account`

Conta de autenticação. Para e-mail/senha, `providerId = "credential"` e `password` contém o hash. Também suporta campos de OAuth, embora o MVP só use credenciais.

### `Verification`

Reservada para fluxos de verificação/recuperação. Não usada no MVP.

## Modelos de domínio

### `FinancialAccount`

| Campo | Tipo | Observação |
| --- | --- | --- |
| `name` | String | Único por usuário (`@@unique([userId, name])`) |
| `type` | `AccountType` | `CHECKING`, `SAVINGS`, `CASH`, `INVESTMENT`, `CREDIT_CARD`, `OTHER` |
| `initialBalanceCents` | Int | Saldo no início do uso |
| `color` | String | Cor visual |
| `archived` | Boolean | Conta fora de novas movimentações |

Relações: receitas, despesas e pagamentos de dívida. A exclusão da conta não apaga esses registros; o vínculo fica nulo (`SetNull`). Por isso, a ação de exclusão bloqueia contas com movimentações.

Não existe um campo que marque uma conta como investimento além de `type`. Nos totais, `SAVINGS` e `INVESTMENT` formam o **saldo investido**; `CHECKING`, `CASH`, `CREDIT_CARD` e `OTHER` formam o **saldo em conta**. Contas arquivadas continuam nos dois grupos.

### `Category`

| Campo | Tipo | Observação |
| --- | --- | --- |
| `name` | String | Único por usuário e tipo |
| `type` | `CategoryType` | `INCOME` ou `EXPENSE` |
| `color` | String | Cor visual |

Categorias padrão são criadas uma única vez por usuário. A flag `categoriesSeeded` evita recriá-las a cada login. A exclusão de uma categoria em uso é bloqueada pela ação; no banco, a relação usa `SetNull`.

### `Income`

| Campo | Tipo | Observação |
| --- | --- | --- |
| `description` | String | Descrição |
| `amountCents` | Int | Valor |
| `categoryId` | String? | Categoria de receita |
| `source` | String? | Fonte/pagador |
| `expectedDate` | Date | Data prevista |
| `receivedDate` | Date? | Data efetiva |
| `financialAccountId` | String? | Conta que recebeu |
| `status` | `IncomeStatus` | `EXPECTED` ou `RECEIVED` |
| `notes` | String? | Observações |

Uma receita `RECEIVED` deve ter `receivedDate` e conta para aparecer no saldo. A validação da ação garante a data; a conta é opcional para permitir lançamentos históricos sem conta.

### `Expense`

| Campo | Tipo | Observação |
| --- | --- | --- |
| `description` | String | Descrição |
| `amountCents` | Int | Valor |
| `categoryId` | String? | Categoria de despesa |
| `dueDate` | Date | Vencimento |
| `paidDate` | Date? | Pagamento |
| `type` | `ExpenseType` | `FIXED`, `VARIABLE`, `OCCASIONAL`, `INSTALLMENT` |
| `paymentMethod` | `PaymentMethod?` | PIX, dinheiro, débito, crédito, boleto, transferência, outro |
| `financialAccountId` | String? | Conta que pagou |
| `status` | `ExpenseStatus` | `PENDING` ou `PAID` |
| `installmentNumber` | Int? | Número da parcela |
| `installmentTotal` | Int? | Total de parcelas |
| `notes` | String? | Observações |

Relação inversa: `debtPayment` (0..1). Uma despesa pode estar vinculada a no máximo um pagamento de dívida.

### Importação de extrato

A importação não cria tabela própria. Cada linha revisada vira um `Income` com `status = RECEIVED` ou um `Expense` com `status = PAID`, usando as datas reais do extrato e a conta escolhida. Quando o arquivo não tem data, a data de referência é o primeiro dia do mês selecionado.

Para evitar duplicidade em reimportações, o início de `notes` recebe um marcador:

```text
[extrato:<sha1-16>] Importado do extrato "<arquivo>" (item <n>).
```

O hash considera arquivo, conta, índice da linha, data, tipo, valor e descrição normalizada. A ação procura esses marcadores apenas na conta e no intervalo de datas importado. Editar ou apagar o `notes` remove essa proteção. Não há migration ou campo novo para o importador.

### `Debt`

| Campo | Tipo | Observação |
| --- | --- | --- |
| `name` | String | Nome da dívida |
| `creditor` | String? | Credor |
| `type` | `DebtType` | Cartão, empréstimo, financiamento, parcelamento, imposto, outro |
| `initialAmountCents` | Int | Valor inicial |
| `dueDay` | Int? | Dia de vencimento (1–31) |
| `status` | `DebtStatus` | `ACTIVE` ou `PAID` |
| `notes` | String? | Observações |

O saldo devedor **não** é armazenado; é calculado a partir dos pagamentos. Isso evita inconsistência entre saldo e histórico.

### `DebtPayment`

| Campo | Tipo | Observação |
| --- | --- | --- |
| `debtId` | String | Dívida paga |
| `amountCents` | Int | Valor pago |
| `paidAt` | Date | Data do pagamento |
| `financialAccountId` | String? | Conta de saída |
| `expenseId` | String? único | Despesa vinculada, se existir |
| `notes` | String? | Observações |

Regras:
- `expenseId` é único: uma despesa só pode representar um pagamento.
- Se `expenseId` existe, a despesa é a fonte da saída no caixa.
- Se `expenseId` é nulo, o pagamento é a fonte da saída.
- Excluir o pagamento exclui a despesa vinculada (feito na ação, em transação).
- Excluir a despesa vinculada deixa o pagamento com `expenseId = null` (`SetNull`), e ele volta a contar como saída.

## Enums

| Enum | Valores |
| --- | --- |
| `CategoryType` | `INCOME`, `EXPENSE` |
| `AccountType` | `CHECKING`, `SAVINGS`, `CASH`, `INVESTMENT`, `CREDIT_CARD`, `OTHER` |
| `IncomeStatus` | `EXPECTED`, `RECEIVED` |
| `ExpenseStatus` | `PENDING`, `PAID` |
| `ExpenseType` | `FIXED`, `VARIABLE`, `OCCASIONAL`, `INSTALLMENT` |
| `PaymentMethod` | `PIX`, `CASH`, `DEBIT`, `CREDIT`, `BOLETO`, `TRANSFER`, `OTHER` |
| `DebtType` | `CREDIT_CARD`, `LOAN`, `FINANCING`, `INSTALLMENT`, `TAX`, `OTHER` |
| `DebtStatus` | `ACTIVE`, `PAID` |

## Índices

| Tabela | Índice | Uso |
| --- | --- | --- |
| `Session` | `userId` | Buscar sessões do usuário |
| `Account` | `userId` | Credenciais |
| `Verification` | `identifier` | Fluxos de verificação |
| `FinancialAccount` | `userId`; único `(userId, name)` | Listagens e nomes únicos |
| `Category` | `(userId, type)`; único `(userId, name, type)` | Filtros e nomes únicos |
| `Income` | `(userId, status, expectedDate)`; `(userId, receivedDate)` | Dashboard e filtros |
| `Expense` | `(userId, status, dueDate)`; `(userId, paidDate)` | Dashboard e filtros |
| `Debt` | `(userId, status)` | Dívidas ativas |
| `DebtPayment` | `(userId, paidAt)`; `debtId` | Histórico e agregações |

## Regras de integridade

- `User` é a raiz de isolamento. Excluir um usuário remove todos os dados dele em cascata.
- `FinancialAccount` com movimentações não pode ser excluída pela aplicação.
- `Category` com lançamentos não pode ser excluída pela aplicação.
- `DebtPayment.expenseId` é `@unique`; o banco impede duas despesas para o mesmo pagamento.
- `Expense` vinculada usa `onDelete: SetNull` no lado do pagamento: se a despesa for removida, o pagamento sobrevive e passa a contar diretamente.
- `Debt` usa cascata em `DebtPayment`: excluir a dívida remove o histórico de pagamentos.
- O status `PAID` da dívida é recalculado nas ações de pagamento, edição e exclusão.

## O que não existe no modelo

- Saldo consolidado materializado.
- Tabela de parcelas individuais; a despesa parcelada é um único registro com número/total.
- Lançamentos recorrentes automáticos.
- Transferências entre contas.
- Anexos/comprovantes.
- Histórico de alterações (audit log).
- Soft delete geral.

Essas ausências são conscientes para manter o MVP simples. Ver [09 — Roadmap e decisões](./09-roadmap-e-decisoes.md).
