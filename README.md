# FinanceiroApp

Sistema pessoal de controle financeiro multiusuário, com dashboard, receitas, despesas, dívidas e contas. O app separa **dinheiro realizado** de **valores previstos** e impede que o pagamento de uma dívida seja contado duas vezes no caixa.

> **Status:** MVP implementado e validado contra um banco Neon de desenvolvimento. Migração e seed aplicados. O projeto Neon foi reivindicado e o `.env` local já usa as conexões pooled e direta atualizadas. Veja [Estado atual](#estado-atual).

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
- Conta no Neon para o banco definitivo
- Git

> Para desenvolvimento, o projeto usa um banco Neon reivindicado. Ele não é produção; backups e retenção devem ser configurados antes de receber dados reais.

## Começando

```bash
# 1. Instalar dependências
npm install

# 2. Criar o .env
copy .env.example .env   # Windows
# cp .env.example .env   # Linux/macOS

# 3. Preencher DATABASE_URL, DIRECT_URL, BETTER_AUTH_SECRET e BETTER_AUTH_URL

# 4. Aplicar as migrations existentes
npx prisma migrate dev

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
# Aplicação (pooled)
DATABASE_URL="postgresql://usuario:senha@host-pooler.neon.tech/neondb?sslmode=verify-full"

# Migrações e inspeção (direct). O prisma7.config.ts usa esta URL quando existe.
DIRECT_URL="postgresql://usuario:senha@host.neon.tech/neondb?sslmode=verify-full"

BETTER_AUTH_SECRET="segredo-aleatorio-de-32-bytes"
BETTER_AUTH_URL="http://localhost:3000"
```

`sslmode=verify-full` valida o certificado do servidor e evita o aviso de mudança futura do driver `pg`. Se o provedor só fornecer `sslmode=require`, a aplicação funciona, mas o aviso pode aparecer.

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
| `npm run test:e2e` | Playwright (smoke sem banco) |
| `E2E_WITH_DB=1 npm run test:e2e` | Playwright + fluxo completo e isolamento com banco/seed |
| `npm run db:generate` | Gerar Prisma Client |
| `npm run db:migrate` | Criar/aplicar migration em dev |
| `npm run db:deploy` | Aplicar migrations em produção |
| `npm run db:push` | Sincronizar schema sem migration |
| `npm run db:studio` | Prisma Studio |
| `npm run db:seed` | Seed demonstrativo |

No PowerShell, defina a variável antes:

```powershell
$env:E2E_WITH_DB="1"
npm run test:e2e
```

O teste com banco cria dados temporários com nomes únicos, valida CRUD, persistência, filtros, dívidas e arquivamento de conta, e remove o que criou. Ele usa o usuário demo do seed e **não deve ser rodado contra dados reais**. O isolamento entre usuários é validado por `tests/e2e/isolation.spec.ts`, que cria dois usuários temporários e os remove no `afterAll`.

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

Implementado e verificado contra um banco Neon real (reivindicado, região `aws-sa-east-1`):

- `npm run build` passando.
- `npm run lint` sem erros.
- `npx tsc --noEmit` sem erros.
- `npm test` com **35 testes** passando.
- `npm run test:e2e` com 4 testes passando com banco (`E2E_WITH_DB=1`): autenticação, fluxo MVP e isolamento.
- Migration `20261110161632_init` aplicada.
- Seed demo aplicado; login `demo@financeiro.local` / `demo12345` validado.
- Dashboard real conferido com o seed demo: saldo atual de **R$ 11.181,00**, despesas pagas de **R$ 3.619,00** e resultado de **−R$ 3.619,00** em novembro de 2026.
- Pagamento de dívida com despesa vinculada não é contado duas vezes; a despesa e o pagamento têm o mesmo valor e a conta não sofre dupla saída.
- Isolamento comprovado por teste permanente com dois usuários: dashboard vazio e acesso direto a IDs de outro usuário resultam em “Recurso não encontrado”.
- Exportação JSON, categorias e configurações revisadas no código; a validação manual restante está em [docs/07-testes-e-qualidade.md](./docs/07-testes-e-qualidade.md).

Banco de desenvolvimento atual:

- Projeto Neon `flat-queen-78874900`, reivindicado.
- Branch `br-withered-cloud-b6336hbc`, região `aws-sa-east-1`.
- `DATABASE_URL` (pooled) e `DIRECT_URL` (direta) configuradas no `.env` local.
- As credenciais e o link/código de claim não são armazenados no repositório.

Pendente:

- Completar os itens manuais ainda abertos em `docs/07-testes-e-qualidade.md` (alguns fluxos de edição, status e backup).
- Configurar backup/PITR no Neon antes de usar dados reais.
- Publicar na Vercel somente com autorização explícita.
- Configurar CI com lint, tipos, unitários e build.

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
