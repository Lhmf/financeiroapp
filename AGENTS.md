# AGENTS.md — Instruções para agentes de IA

Este arquivo orienta agentes que trabalharem no FinanceiroApp. Leia antes de alterar código.

## Contexto

- App pessoal de finanças, multiusuário, em português.
- Next.js 16 App Router + React 19 + Tailwind 4.
- Prisma 7.10.1 + PostgreSQL no Neon.
- Better Auth 1.7.19 com e-mail/senha.
- Documentação de memória em `docs/`.
- O diretório pode ainda não ser um repositório Git; verifique antes de assumir commits.

## Comandos

```bash
npm run dev            # desenvolvimento
npm run build          # build de produção
npm run lint           # ESLint
npx tsc --noEmit       # tipos
npm test               # Vitest
npm run test:e2e       # Playwright
npm run db:generate    # Prisma Client
npm run db:migrate     # migrate dev
npm run db:deploy      # migrate deploy
npm run db:seed        # seed demo
```

## Invariantes que não podem quebrar

1. **Dinheiro em centavos inteiros.** Nunca use float para valor monetário.
2. **Datas de domínio em UTC.** Use `parseDateInput`, `todayUTC`, `toDateInput`.
3. **Toda consulta de domínio filtra `userId`.**
4. **Toda action começa com `requireUser()`.**
5. **Toda escrita valida ownership antes de update/delete.**
6. **Dívida paga não pode ser contada duas vezes.**
   - Pagamento com `expenseId` não entra no saldo como saída.
   - Pagamento sem `expenseId` entra.
7. **Excluir pagamento exclui a despesa vinculada.**
8. **Excluir despesa vinculada deixa o pagamento sem vínculo (`SetNull`).**
9. **Excluir dívida remove pagamentos, mas mantém despesas.**
10. **Conta com movimentações não pode ser excluída; deve ser arquivada.**
11. **Categoria em uso não pode ser excluída.**
12. **Nunca comite `.env`, segredos ou `src/generated/`.**

## Convenções de código

- TypeScript estrito, sem `any` gratuito.
- Server Components por padrão; `"use client"` apenas quando necessário.
- Escrita via Server Actions em `src/actions`.
- Leitura/agregação via `src/services`.
- Cálculos puros em `src/lib/finance.ts`, `money.ts`, `dates.ts`.
- Validação Zod em `src/lib/validation.ts`.
- UI primitiva em `src/components/ui`.
- Formulários client em `src/components/forms`.
- Nomes de arquivos em kebab-case.
- Textos de interface em português do Brasil.
- Evite dependências novas sem justificativa.

## Next.js 16

- `params` e `searchParams` de páginas são `Promise`; use `await`.
- `src/proxy.ts` substitui `middleware.ts`.
- O projeto usa `cacheComponents: false`; não reative cache de página sem revisar isolamento.
- Use tipos explícitos para layouts (`{ children: ReactNode }`), não `LayoutProps`.
- O build usa Turbopack.

## Prisma 7

- O client é gerado em `src/generated/prisma` e ignorado no Git.
- `prisma7.config.ts` define schema, migrations, seed e `DATABASE_URL`.
- O runtime usa `@prisma/adapter-pg`.
- Não atualize para Prisma 8 sem validar o Better Auth.
- Após mudar o schema, rode `npm run db:generate`.

## Better Auth

- Configuração em `src/lib/auth.ts`.
- Cliente browser em `src/lib/auth-client.ts`.
- Handler em `src/app/api/auth/[...all]/route.ts`.
- Sessão no servidor via `src/lib/session.ts`.
- Não troque a estratégia de sessão sem migrar as tabelas.

## Documentação

Ao alterar regra de negócio, atualize o doc correspondente:

- Modelo/schema → `docs/03-modelo-de-dados.md`
- Cálculos → `docs/04-regras-financeiras.md`
- Auth/segurança → `docs/05-autenticacao-e-seguranca.md`
- Setup → `docs/06-ambiente-e-instalacao.md`
- Testes → `docs/07-testes-e-qualidade.md`
- Backup → `docs/08-backup-e-recuperacao.md`
- Decisões → `docs/09-roadmap-e-decisoes.md`

Mantenha o README e o AGENTS.md coerentes.

## Testes

- Regras financeiras novas exigem teste unitário.
- Corrija a causa, não o teste, salvo se o teste estiver errado.
- Rode `npm test`, `npm run lint`, `npx tsc --noEmit` e `npm run build` antes de concluir.
- Testes E2E com banco exigem `DATABASE_URL` real e o seed demo.
- O teste completo é opt-in: `E2E_WITH_DB=1 npx playwright test tests/e2e/mvp.spec.ts tests/e2e/isolation.spec.ts`.
- Não use dados reais de produção em testes.

## Git

- Commits pequenos e descritivos, em português ou inglês consistente.
- Não faça commit de `.env`, `.next`, `node_modules`, `src/generated`, relatórios de teste ou artefatos.
- Não faça push nem deploy sem autorização explícita.
- Se o repositório não existir, não inicialize sem confirmar a intenção.

## Segurança

- Não logue segredos.
- Não exponha mensagens que revelem dados de outro usuário.
- Não confie em IDs de formulário sem checar ownership.
- Não adicione rota pública que retorne dados financeiros.
- Cuidado com cache e revalidação.
- Em caso de dúvida, negue acesso.

## Estado conhecido

- O `.env` local aponta para um banco **Neon de desenvolvimento reivindicado**; a `DATABASE_URL` pooled é usada pelo app e a `DIRECT_URL` (ou `DATABASE_URL_UNPOOLED`, por compatibilidade) pelas migrações.
- A migration `20261110161632_init` foi aplicada e o seed demo foi executado contra esse banco.
- O projeto Neon `flat-queen-78874900` foi reivindicado em 10/11/2026 e as conexões pooled/direta foram atualizadas. O banco continua sendo de desenvolvimento, não produção.
- O seed demo é `demo@financeiro.local` / `demo12345`, mas o login com esse domínio `.local` é rejeitado pela validação atual do Better Auth; use e-mail válido em testes.
- Existe um deploy de validação na Vercel em `https://financeiroapp-orcin.vercel.app` (`the-castilho/financeiroapp`), conectado ao GitHub e usando o banco Neon de desenvolvimento. Ainda não é produção com dados reais; crie um banco/branch Neon de produção antes.
- `npm audit` reportou vulnerabilidades moderadas não tratadas; avalie antes de produção.

## Definição de tarefa concluída

1. Código implementado e consistente com as camadas.
2. Documentação atualizada.
3. Testes relevantes passando.
4. Lint, tipos e build passando.
5. Nenhum segredo adicionado.
6. Nenhuma regra financeira quebrada.
7. Resumo claro do que mudou e do que ficou pendente.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
