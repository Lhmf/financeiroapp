# 06 — Ambiente e instalação

## Pré-requisitos

- Node.js 20 ou superior (testado com Node 24.15.0).
- npm 10 ou superior (testado com 11.12.1).
- Conta no [Neon](https://neon.tech) com um projeto PostgreSQL.
- Git (para versionamento).
- VS Code ou editor equivalente (opcional).

## 1. Clonar/abrir o projeto

```bash
cd "C:\Users\luizh\OneDrive\Área de Trabalho\financeiroapp"
```

## 2. Instalar dependências

```bash
npm install
```

O `postinstall` executa `prisma generate` e cria o client em `src/generated/prisma`. Esse diretório é ignorado no Git.

## 3. Criar o banco no Neon

### Opção A — projeto próprio

1. Acesse o painel do Neon.
2. Crie um projeto (região mais próxima, por exemplo `us-east-1` ou `sa-east-1` se disponível).
3. Copie a **connection string pooled** (Pooled connection). Ela costuma ter `-pooler` no host.
4. Copie também a **direct connection** para migrações.
5. Guarde a senha; ela não é exibida novamente.

### Opção B — Claimable Neon (agente/desenvolvimento)

Para um banco temporário sem conta, use o CLI oficial:

```bash
npx --yes neon@latest claim create --project-name financeiroapp --region-id aws-sa-east-1
```

Ele grava `DATABASE_URL` e `DATABASE_URL_UNPOOLED` no `.env` e mostra o projeto, a região e a data de expiração. O projeto dura **72 horas** até ser reivindicado, com limites de armazenamento e transferência. Gere o link de claim com:

```bash
npx --yes neon@latest claim accept --open=false
```

O código de claim expira em **15 minutos**; o projeto expira em **72 horas**. Depois do claim, as credenciais podem mudar.

### Pooled × direct

| Uso | Connection string |
| --- | --- |
| Aplicação Next.js em execução | Pooled (`...-pooler.neon.tech`) |
| `prisma migrate` | Direct (recomendado) |
| `psql`, inspeção manual | Direct |

O Prisma 7 usa o driver `pg` via `@prisma/adapter-pg`. O adapter aceita a URL pooled.

> O `prisma7.config.ts` usa `DATABASE_URL_UNPOOLED` quando ela existe. Assim, migrações, `db push`, `db studio` e `migrate reset` usam a conexão direta automaticamente; a aplicação continua com a pooled.

## 4. Configurar o `.env`

Copie o exemplo:

```powershell
Copy-Item .env.example .env
```

Edite `.env`:

```env
DATABASE_URL="postgresql://usuario:senha@ep-xxxx-pooler.us-east-2.aws.neon.tech/neondb?sslmode=verify-full"
DATABASE_URL_UNPOOLED="postgresql://usuario:senha@ep-xxxx.us-east-2.aws.neon.tech/neondb?sslmode=verify-full"
BETTER_AUTH_SECRET="cole-um-segredo-aleatorio"
BETTER_AUTH_URL="http://localhost:3000"
```

Gere o segredo:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Atenção

- O `.env` atual do projeto aponta para um banco claimable de desenvolvimento. **Reivindique o projeto antes de 2026-11-13T16:15:55Z** e atualize as URLs se elas mudarem.
- Não comite `.env`.
- Não reutilize o segredo de desenvolvimento em produção.
- Prefira `sslmode=verify-full`. Se o provedor só oferecer `sslmode=require`, o app funciona, mas o driver `pg` pode avisar sobre mudança futura.
- O banco precisa aceitar SSL.

## 5. Aplicar migrações

Com o banco vazio:

```bash
npx prisma migrate dev
```

Isso cria as tabelas e o histórico em `prisma/migrations`. O comando usa `DATABASE_URL_UNPOOLED` automaticamente quando configurada.

### Alternativa rápida (apenas protótipo)

```bash
npm run db:push
```

`db:push` não cria histórico de migrações. Para um projeto que será publicado, prefira `migrate dev`.

### Produção

```bash
npm run db:deploy
```

Executa apenas migrações já versionadas. Nunca use `migrate dev` em produção.

## 6. Popular dados de demonstração

```bash
npm run db:seed
```

O seed cria:

- usuário `demo@financeiro.local` com senha `demo12345`;
- categorias padrão;
- contas “Conta principal”, “Carteira” e “Reserva”;
- receitas de salário, laudo e comissão;
- despesas de aluguel, mercado, energia, parcela do carro e IPVA;
- dívidas: Cartão Caixa, Documento do carro, DAS/DASN e IPVA;
- um pagamento de R$ 500,00 no Cartão Caixa, vinculado a uma despesa paga.

Personalize com:

```env
SEED_EMAIL="seu@email.com"
SEED_PASSWORD="outra-senha"
SEED_NAME="Seu Nome"
```

> O seed é **demonstrativo**. Ele não importa automaticamente os dados financeiros reais informados na conversa inicial do projeto.

## 7. Rodar o app

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000). A raiz redireciona para login ou dashboard conforme a sessão.

## 8. Scripts disponíveis

| Script | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm start` | Sobe o build de produção |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Checagem de tipos |
| `npm test` | Testes unitários (Vitest) |
| `npm run test:watch` | Vitest em modo watch |
| `npm run test:e2e` | Playwright |
| `npm run db:generate` | Gera o Prisma Client |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:deploy` | `prisma migrate deploy` |
| `npm run db:push` | Sincroniza schema sem migration |
| `npm run db:studio` | Prisma Studio |
| `npm run db:seed` | Seed demonstrativo |

## 9. Estrutura de configuração do Prisma 7

`prisma7.config.ts`:

```ts
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
```

- O schema **não** tem `url` no bloco `datasource`; a URL vem do config.
- O adapter `pg` é configurado em `src/lib/prisma.ts`.
- O client gerado fica em `src/generated/prisma`.
- O diretório é ignorado no Git e regenerado por `postinstall`.

## 10. Verificar a conexão

```bash
npx prisma migrate status
```

Se conectar, mostra o status das migrações. Se falhar, confira:

- URL copiada por completo;
- senha correta;
- `sslmode=verify-full` (ou `require` se o provedor exigir);
- IP allow list do Neon (se habilitada);
- projeto Neon ativo (o free tier pode suspender por inatividade);
- se o projeto for claimable, se ele ainda não expirou e se o claim foi concluído.

## 11. Testar o app

1. Acesse `/cadastro` e crie uma conta.
2. O dashboard deve abrir com categorias padrão criadas.
3. Cadastre uma conta com saldo inicial.
4. Cadastre uma receita prevista e marque como recebida.
5. Cadastre uma despesa pendente e marque como paga.
6. Cadastre uma dívida e registre um pagamento com “criar despesa vinculada”.
7. Confira que o pagamento não aparece duas vezes no saldo.
8. Recarregue a página e confirme a persistência.
9. Exporte o JSON em Configurações.
10. Saia e entre novamente.

## 12. Deploy futuro na Vercel

> A publicação ainda não foi autorizada. Quando for, siga o checklist.

1. Suba o repositório no GitHub (sem `.env`).
2. Importe o projeto na Vercel.
3. Configure as variáveis de ambiente:
   - `DATABASE_URL` (pooled, produção);
   - `DATABASE_URL_UNPOOLED` (direct, para migrações; opcional se o provedor não fornecer);
   - `BETTER_AUTH_SECRET` (novo);
   - `BETTER_AUTH_URL` (URL HTTPS da Vercel).
4. Rode `npm run db:deploy` apontando para o banco de produção (localmente ou em um job).
5. Faça o deploy.
6. Teste cadastro, login, logout e um CRUD completo.
7. Confirme que o cookie funciona em HTTPS.
8. Configure backup/PITR no Neon.

### Ordem segura

```text
1. Migrations no banco de produção
2. Variáveis na Vercel
3. Deploy
4. Smoke test em produção
```

Nunca rode `db:seed` em produção sem intenção; ele cria um usuário demo.

## 13. Problemas comuns

### “Can't reach database server”

- URL incorreta ou banco suspenso.
- Falta `sslmode=verify-full` (ou `sslmode=require`, se o provedor exigir).
- IP allow list bloqueando.
- Use a URL direct para testar.

### “Prisma Client not generated”

```bash
npm run db:generate
```

### “Module not found: @/generated/prisma”

O client não foi gerado. Rode `npm run db:generate`. O `postinstall` só roda no `npm install`.

### Login retorna erro genérico

- Confirme se as migrações foram aplicadas.
- Confirme `BETTER_AUTH_SECRET` e `BETTER_AUTH_URL`.
- Verifique o console do servidor.

### Sessão não persiste

- Cookies bloqueados no navegador.
- `BETTER_AUTH_URL` diferente da URL acessada.
- Acesso por `127.0.0.1` enquanto a URL é `localhost`.

### Build falha por `LayoutProps`

Use tipos explícitos (`{ children: ReactNode }`). O projeto não depende dos tipos globais gerados pelo Next.

### Turbopack procura lockfile fora do projeto

O `next.config.ts` define `turbopack.root: process.cwd()`. Mantenha essa configuração.

### Aviso de versão do Prisma/Better Auth

Não atualize o Prisma para 8 sem verificar o suporte do Better Auth. A combinação validada é Prisma 7.10.1 + Better Auth 1.7.19.

## 14. Limpeza de dados de teste

Com cuidado, em desenvolvimento:

```bash
npx prisma migrate reset
```

Isso apaga o banco e reaplica migrações + seed. **Nunca use em produção.** O comando usa `DATABASE_URL_UNPOOLED` quando configurada. Agentes de IA precisam de consentimento explícito antes de executar essa ação destrutiva.

## 15. Referências

- [Neon — conexão](https://neon.tech/docs/connect/connect-from-any-app)
- [Prisma 7 — configuração](https://www.prisma.io/docs/orm/reference/prisma-config-reference)
- [Better Auth — instalação](https://www.better-auth.com/docs/installation)
- [Next.js 16 — App Router](https://nextjs.org/docs/app)
