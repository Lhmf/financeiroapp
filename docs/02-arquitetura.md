# 02 — Arquitetura

## Visão em uma frase

Aplicação **Next.js 16 (App Router)** com renderização no servidor, **Server Actions** para escrita, **Prisma 7** com driver adapter PostgreSQL e **Better Auth** para sessões persistidas no banco.

## Stack

| Camada | Tecnologia | Versão fixada |
| --- | --- | --- |
| Framework | Next.js | 16.4.6 |
| UI | React | 19.3.0 |
| Estilo | Tailwind CSS | 4.3.3 |
| Ícones | lucide-react | 1.71.0 |
| Gráficos | Recharts | 3.10.1 |
| ORM | Prisma Client / CLI | 7.10.1 |
| Driver | `@prisma/adapter-pg` + `pg` | 7.10.1 / 8.23.1 |
| Autenticação | Better Auth + adapter Prisma | 1.7.19 |
| Validação | Zod | 4.6.7 |
| Testes unitários | Vitest | 5.1.0 |
| Testes E2E | Playwright | 1.65.0 |
| Linguagem | TypeScript | 5.x |
| Runtime local | Node.js | 24.15.0 (testado) |

> O Prisma foi fixado em 7.10.1 porque o Better Auth 1.7.19 ainda não suporta o Prisma 8. Não atualize um sem validar o outro.

## Estrutura de diretórios

```text
financeiroapp/
├── docs/                       # memória do projeto, em português
├── prisma/
│   ├── schema.prisma           # auth + domínio financeiro
│   └── seed.ts                 # dados demonstrativos
├── src/
│   ├── actions/                # Server Actions (escrita)
│   ├── app/
│   │   ├── (app)/              # rotas autenticadas
│   │   ├── (auth)/             # login e cadastro
│   │   ├── api/
│   │   │   ├── auth/[...all]/  # handler do Better Auth
│   │   │   └── export/         # exportação JSON
│   │   ├── globals.css
│   │   └── layout.tsx
│   ├── components/
│   │   ├── dashboard/          # cards, gráficos e listas
│   │   ├── filters/            # navegação mensal
│   │   ├── forms/              # formulários client
│   │   ├── layout/             # shell, sidebar, bottom nav
│   │   └── ui/                 # primitivos visuais
│   ├── generated/prisma/       # client gerado (ignorado no Git)
│   ├── lib/                    # regras puras, auth, validação, utils
│   ├── services/               # leitura e agregação no banco
│   └── proxy.ts                # proteção de rotas no edge
├── tests/
│   ├── unit/                   # Vitest
│   └── e2e/                    # Playwright
├── .env.example
├── next.config.ts
├── prisma7.config.ts
├── playwright.config.ts
└── vitest.config.mts
```

## Camadas

```text
Página (Server Component)
  ├── requireUser()             → sessão
  ├── service de leitura        → Prisma
  └── componente de UI
        └── formulário (Client)
              └── Server Action
                    ├── requireUser()
                    ├── Zod
                    ├── verificação de ownership
                    ├── transação Prisma
                    └── revalidate + redirect
```

### `src/app`

- **Server Components por padrão.** As páginas buscam dados no servidor e enviam apenas o necessário para os componentes client.
- **Layouts de grupo:** `(app)` exige sessão e monta o shell; `(auth)` redireciona usuário já autenticado.
- **`params` e `searchParams` são Promises** no Next 16. Sempre use `await params` / `await searchParams`.
- **`src/proxy.ts`** substitui o antigo `middleware.ts`. Ele faz uma checagem otimista de cookie para redirecionar visitantes; a proteção definitiva está no layout e em cada ação.
- **Cache desativado.** `cacheComponents: false` no `next.config.ts` evita qualquer possibilidade de resposta autenticada ser compartilhada entre usuários. Todas as rotas internas são dinâmicas.

### `src/services`

Somente leitura e agregação. Não redirecionam nem alteram dados. Exemplos:

- `dashboard.ts`: agregações do mês, evolução, categorias, dívidas e vencimentos.
- `accounts.ts`: saldo por conta com a regra de não duplicar dívida.
- `incomes.ts`, `expenses.ts`, `debts.ts`: listagens, detalhes e opções de formulário.
- `export.ts`: monta o JSON do usuário.

### `src/actions`

Server Actions com `"use server"`. Responsabilidades:

1. `requireUser()`.
2. Ler `FormData`.
3. Validar com Zod.
4. Validar valores monetários e datas.
5. Confirmar que o registro pertence ao usuário.
6. Executar a escrita, usando transação quando há mais de uma tabela.
7. `revalidateFinance()`.
8. Redirecionar ou devolver `ActionState`.

### `src/lib`

- `finance.ts`: cálculos puros. Não importa Prisma nem React.
- `statement.ts`: parsing puro de CSV/OFX/PDF em texto, datas, valores, encoding, categorias sugeridas e detecção de transferências.
- `statement-pdf.ts`: extração de texto de PDF com `unpdf`, executada apenas no servidor.
- `money.ts`: parsing e formatação de centavos.
- `dates.ts`: UTC, meses, intervalos e rótulos em português.
- `validation.ts`: schemas Zod e tipo `ActionState`.
- `auth.ts`: configuração do Better Auth.
- `auth-client.ts`: cliente do Better Auth para o browser.
- `session.ts`: `getSession` e `requireUser`.
- `constants.ts`: rótulos, cores e categorias padrão.
- `forms.ts`: helpers de `FormData`.
- `revalidate.ts`: invalidação centralizada de rotas.
- `prisma.ts`: singleton do Prisma com adapter `pg`.
- `utils.ts`: `cn` e utilidades.

## Fluxo de autenticação

```text
[Browser] → POST /api/auth/... → Better Auth
                                   ├── valida credenciais
                                   ├── cria/atualiza Session
                                   └── define cookie httpOnly
[Server Component] → auth.api.getSession({ headers })
                                   ├── lê cookie
                                   ├── busca Session + User
                                   └── devolve sessão ou null
```

- Senhas são armazenadas com hash no modelo `Account` (`providerId = "credential"`).
- Sessões ficam no banco (`Session`), não em JWT.
- O cookie é gerenciado pelo plugin `nextCookies()`.
- O segredo de assinatura vem de `BETTER_AUTH_SECRET`.
- A URL base vem de `BETTER_AUTH_URL`.

## Fluxo de escrita

Exemplo: marcar uma despesa como paga.

```text
Formulário (client)
  → action={markExpensePaid}
  → requireUser()
  → valida id e ownership
  → update status=PAID, paidDate=hoje
  → revalidateFinance()
  → redirect /despesas
```

Exemplo: pagamento de dívida.

```text
addDebtPayment
  → valida valor, data e conta
  → calcula saldo devedor
  → impede pagamento acima do saldo
  → transação:
       [opcional] cria Expense paga
       cria DebtPayment (com expenseId)
       atualiza Debt.status
  → revalida
  → redireciona para o detalhe
```

## Decisões de arquitetura

### Por que Next.js App Router?

- Server Components reduzem JavaScript no cliente.
- Server Actions simplificam formulários sem criar uma API REST intermediária.
- O mesmo projeto serve UI e backend, facilitando o deploy na Vercel.

### Por que Better Auth?

- Autenticação self-managed, sem serviço pago.
- Sessões no banco, revogáveis.
- Integração oficial com Prisma.
- E-mail/senha suficiente para o MVP.

### Por que Prisma 7 com adapter?

O Prisma 7 exige driver adapter para PostgreSQL no runtime. O `@prisma/adapter-pg` usa o driver `pg` e permite conexão pooled do Neon. O client é gerado em `src/generated/prisma` e o diretório é ignorado no Git; o `postinstall` regenera.

### Por que valores em centavos?

Ponto flutuante não representa todos os valores decimais com exatidão. Armazenar `Int` em centavos elimina erros de arredondamento em somas e comparações.

### Por que datas em UTC?

Datas de domínio (vencimento, recebimento, pagamento) não têm hora. Elas são normalizadas para meia-noite UTC e armazenadas como `date`. A formatação usa `timeZone: "UTC"` para evitar que o fuso do servidor altere o dia exibido.

### Por que cache desativado?

O app lida com dinheiro e dados privados. Qualquer cache de página ou de rota poderia servir dados de um usuário para outro em cenários de erro. A simplicidade e o isolamento valem mais do que ganho de performance no MVP.

## Configuração do Next.js

`next.config.ts`:

- `cacheComponents: false` — sem cache de componentes/páginas.
- `turbopack.root: process.cwd()` — evita que o Turbopack procure o lockfile fora do projeto.
- Regra do Tailwind 4 via `@tailwindcss/turbopack`.

## Tratamento de erros

- Erros de validação voltam como `ActionState` com `error` e `fieldErrors`.
- Erros de propriedade retornam mensagem genérica (“não encontrado”) sem vazar dados.
- `src/app/(app)/error.tsx` captura falhas de renderização.
- `loading.tsx` mostra estado de carregamento.
- Exclusões usam `confirmMessage` no botão client.

## Limitações conhecidas

- Sem paginação; listagens usam limite alto e filtros.
- Sem testes de integração com banco no CI.
- Sem importação de backup JSON.
- A importação de extrato não cria transferências reais; movimentos internos são apenas sinalizados na prévia.
- Sem recuperação de senha.
- Sem verificação de e-mail.
- Sem rate limiting específico para login.
- Sem observabilidade/alerta de erros em produção.
- O seed é demonstrativo e não importa os dados reais do usuário.

## Deploy futuro

```text
Vercel (Next.js)
   ├── variáveis de ambiente de produção
   ├── BETTER_AUTH_URL = URL pública
   └── DATABASE_URL = pooled connection do Neon
Neon PostgreSQL
   ├── migrations aplicadas com prisma migrate deploy
   └── backups/PITR do plano contratado
```

Checklist de produção em [05 — Autenticação e segurança](./05-autenticacao-e-seguranca.md).
