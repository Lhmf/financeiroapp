# FinanceiroApp

Sistema pessoal de controle financeiro multiusuário, com dashboard, receitas, despesas, dívidas e contas. O app separa **dinheiro realizado** de **valores previstos** e impede que o pagamento de uma dívida seja contado duas vezes no caixa.

> **Status:** código do MVP implementado e compilando. A conexão real com o Neon, as migrações, o seed e a validação manual ainda estão pendentes. Veja [Estado atual](#estado-atual).

## Funcionalidades

- Cadastro, login, logout e sessões persistidas no banco.
- Dados isolados por usuário.
- Dashboard com saldo realizado, resultado do mês, previstos, dívidas, evolução de seis meses, despesas por categoria e vencimentos.
- CRUD de receitas com status **prevista/recebida**.
- CRUD de despesas com status **pendente/paga**, tipo, forma de pagamento e parcelamento.
- CRUD de dívidas com pagamentos parciais, saldo devedor, progresso e quitação.
- CRUD de contas com saldo inicial, saldo calculado e arquivamento.
- Categorias padrão por usuário e gestão de categorias.
- Exportação dos dados em JSON.
- Interface responsiva com navegação mobile.

## Regra financeira principal

```text
Saldo da conta =
    saldo inicial
  + receitas recebidas
  − despesas pagas
  − pagamentos de dívida SEM despesa vinculada
```

Quando um pagamento de dívida cria uma despesa vinculada, a despesa é a fonte da saída. O pagamento não é subtraído novamente. Se a despesa vinculada for excluída, o pagamento passa a contar diretamente.

Detalhes completos em [docs/04-regras-financeiras.md](./docs/04-regras-financeiras.md).

## Stack

- Next.js 16.4.6 (App Router, Server Components, Server Actions)
- React 19.3
- Tailwind CSS 4.3.3
- Prisma 7.10.1 + `@prisma/adapter-pg`
- Better Auth 1.7.19
- PostgreSQL no Neon
- Zod 4
- Recharts 3
- Vitest 5 + Playwright 1.65
- TypeScript 5

## Requisitos

- Node.js 20+ (testado com 24.15.0)
- Conta no Neon
- Git

## Começando

```bash
# 1. Instalar dependências
npm install

# 2. Criar o .env
copy .env.example .env   # Windows
# cp .env.example .env   # Linux/macOS

# 3. Preencher DATABASE_URL, BETTER_AUTH_SECRET e BETTER_AUTH_URL

# 4. Criar as tabelas
npx prisma migrate dev --name init

# 5. Popular dados de demonstração (opcional)
npm run db:seed

# 6. Rodar
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

### Credenciais do seed

- **E-mail:** `demo@financeiro.local`
- **Senha:** `demo12345`

> O seed é apenas demonstrativo. Não use essas credenciais em produção.

## Variáveis de ambiente

```env
DATABASE_URL="postgresql://usuario:senha@host-pooler.neon.tech/neondb?sslmode=require"
BETTER_AUTH_SECRET="segredo-aleatorio-de-32-bytes"
BETTER_AUTH_URL="http://localhost:3000"
```

Gere o segredo com:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Nunca comite o `.env`.

## Scripts

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Desenvolvimento |
| `npm run build` | Build de produção |
| `npm start` | Executar o build |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Checagem de tipos |
| `npm test` | Testes unitários |
| `npm run test:watch` | Testes em watch |
| `npm run test:e2e` | Playwright |
| `npm run db:generate` | Gerar Prisma Client |
| `npm run db:migrate` | Criar/aplicar migration em dev |
| `npm run db:deploy` | Aplicar migrations em produção |
| `npm run db:push` | Sincronizar schema sem migration |
| `npm run db:studio` | Prisma Studio |
| `npm run db:seed` | Seed demonstrativo |

## Estrutura

```text
docs/                    documentação em português
prisma/
  schema.prisma          auth + domínio financeiro
  seed.ts                dados de exemplo
src/
  actions/               Server Actions
  app/
    (app)/               rotas autenticadas
    (auth)/              login e cadastro
    api/                 auth e exportação
  components/            UI, formulários, dashboard, layout
  generated/prisma/      client gerado (ignorado no Git)
  lib/                   regras puras, auth, validação, utilitários
  services/              leitura e agregação
  proxy.ts               proteção de rotas
tests/
  unit/                  Vitest
  e2e/                   Playwright
```

## Documentação

- [00 — Visão geral](./docs/00-visao-geral.md)
- [01 — Requisitos](./docs/01-requisitos.md)
- [02 — Arquitetura](./docs/02-arquitetura.md)
- [03 — Modelo de dados](./docs/03-modelo-de-dados.md)
- [04 — Regras financeiras](./docs/04-regras-financeiras.md)
- [05 — Autenticação e segurança](./docs/05-autenticacao-e-seguranca.md)
- [06 — Ambiente e instalação](./docs/06-ambiente-e-instalacao.md)
- [07 — Testes e qualidade](./docs/07-testes-e-qualidade.md)
- [08 — Backup e recuperação](./docs/08-backup-e-recuperacao.md)
- [09 — Roadmap e decisões](./docs/09-roadmap-e-decisoes.md)

Instruções para agentes de IA: [AGENTS.md](./AGENTS.md).

## Estado atual

Implementado e verificado:

- `npm run build` passando.
- `npm run lint` sem erros.
- `npx tsc --noEmit` sem erros.
- `npm test` com 30 testes passando.
- `npm run test:e2e` com 2 testes passando.
- Páginas e ações do MVP criadas.

Pendente:

- Substituir a `DATABASE_URL` de exemplo pela connection string real do Neon.
- Rodar `prisma migrate dev --name init`.
- Rodar `npm run db:seed`.
- Validar manualmente os 11 critérios de aceite.
- Inicializar o Git e criar o primeiro commit.
- Publicar na Vercel (somente com autorização explícita).

## Segurança

- Toda action exige sessão (`requireUser`).
- Toda consulta de domínio filtra por `userId`.
- Senhas são armazenadas com hash pelo Better Auth.
- `.env` está no `.gitignore`.
- O app não usa cache de página para evitar vazamento entre sessões.
- A exportação JSON não inclui senha, tokens ou sessões.

Leia [docs/05-autenticacao-e-seguranca.md](./docs/05-autenticacao-e-seguranca.md) antes de publicar.

## Limitações conhecidas

- Sem recuperação de senha.
- Sem verificação de e-mail.
- Sem importação de backup.
- Sem paginação.
- Sem testes de integração com banco no CI.
- Sem notificações de vencimento.
- Sem transferências entre contas.
- Sem orçamento ou metas.

## Licença

Projeto pessoal. Não há licença definida para distribuição.
