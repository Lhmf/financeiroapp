# 05 — Autenticação e segurança

## Modelo de autenticação

- **Biblioteca:** Better Auth 1.7.19.
- **Método:** e-mail e senha.
- **Sessão:** persistida no banco (`Session`), com cookie gerenciado pelo Better Auth.
- **Duração:** 30 dias; renovação a cada 24 horas de uso.
- **Hash de senha:** feito pelo Better Auth; nunca armazenamos senha em texto puro.
- **Cadastro:** cria `User` + `Account` com `providerId = "credential"`.

## Fluxo de login

```text
1. Usuário envia e-mail e senha.
2. Cliente chama authClient.signIn.email.
3. POST /api/auth/... chega ao handler do Better Auth.
4. Better Auth busca o Account de credencial e verifica o hash.
5. Em caso de sucesso, cria Session e define cookie httpOnly.
6. Cliente navega para /dashboard.
7. Layout (app) chama requireUser() e confirma a sessão no servidor.
```

## Fluxo de cadastro

```text
1. Usuário informa nome, e-mail, senha e confirmação.
2. Cliente valida tamanho mínimo (8) e igualdade das senhas.
3. Better Auth cria User, Account e sessão.
4. Usuário é levado ao dashboard.
5. No primeiro acesso ao layout (app), ensureDefaultCategories cria as categorias padrão.
6. A flag User.categoriesSeeded evita recriação.
```

## Proteção de rotas

Existem três camadas:

1. **`src/proxy.ts`** — checagem otimista de cookie para redirecionar visitantes ao login. Não é a única defesa.
2. **Layout `(app)`** — chama `requireUser()`. Se não houver sessão válida, redireciona.
3. **Cada Server Action / serviço** — chama `requireUser()` e filtra por `userId`.

A camada 3 é a mais importante: mesmo que alguém chame uma action diretamente, ela exige sessão e valida a propriedade do registro.

## Isolamento por usuário

Padrões obrigatórios:

```ts
// Leitura de item único
prisma.expense.findFirst({ where: { id, userId: user.id } });

// Listagem
prisma.income.findMany({ where: { userId: user.id, ... } });

// Atualização após confirmar ownership
const existing = await prisma.debt.findFirst({ where: { id, userId: user.id } });
if (!existing) return { error: "Dívida não encontrada." };
await prisma.debt.update({ where: { id: existing.id }, data: { ... } });
```

Nunca use `findUnique({ where: { id } })` para decidir se pode alterar um registro. O `id` sozinho não prova propriedade.

## Validação no servidor

- Zod valida formato, tamanho, enums, datas e valores.
- Valores monetários são convertidos para centavos e rejeitados se inválidos.
- Categorias são validadas contra o tipo (`INCOME`/`EXPENSE`) e o usuário.
- Contas são validadas contra o usuário.
- Pagamentos de dívida são validados contra o saldo devedor.
- A validação do cliente é apenas conveniência; a do servidor é a autoridade.

## Senhas

- Mínimo de 8 caracteres no cadastro.
- Hash gerenciado pelo Better Auth (scrypt).
- O app não tem acesso à senha original após o cadastro.
- Não há recuperação de senha no MVP. Se o usuário esquecer, será necessário um fluxo futuro.
- Não há verificação de e-mail. Um e-mail digitado errado pode criar uma conta inacessível.

## Sessões

- Sessões ficam no banco e podem ser revogadas apagando o registro.
- O cookie é httpOnly e SameSite conforme o padrão do Better Auth.
- Em produção, `BETTER_AUTH_URL` deve ser HTTPS.
- O logout remove a sessão e o cookie.

## Segredos

Variáveis sensíveis:

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL` (não é segredo, mas precisa estar correta)

Regras:

- `.env` nunca vai para o Git.
- `.env.example` contém apenas placeholders.
- Não reutilize o segredo de desenvolvimento em produção.
- Gere o segredo com:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

- No Neon, use a connection string **pooled** na aplicação.
- Para migrações, se necessário, use a connection string **direct**.

## Superfície de ataque do MVP

| Vetor | Mitigação atual | Risco residual |
| --- | --- | --- |
| Acesso a dados de outro usuário | `userId` em todas as consultas/ações | Médio se uma nova consulta esquecer o filtro |
| Força bruta de senha | Sem rate limit específico | Médio; depende do Better Auth/Neon/Vercel |
| Vazamento de `.env` | `.gitignore` e documentação | Baixo se as regras forem seguidas |
| XSS | React escapa conteúdo; sem HTML cru | Baixo |
| CSRF | Server Actions e cookies do Better Auth | Baixo, mas validar em produção |
| Sessão roubada | Cookie httpOnly; expiração | Médio; sem 2FA |
| Enumeração de e-mail | Mensagens genéricas no login | Baixo |
| Exclusão acidental | Confirmação no cliente | Médio; sem soft delete |
| Backup perdido | Exportação manual | Alto; não há backup automático no app |

## Boas práticas para novas features

1. Toda action começa com `requireUser()`.
2. Toda consulta de domínio filtra `userId`.
3. Toda escrita valida ownership antes do `update`/`delete`.
4. Toda entrada passa por Zod.
5. Dinheiro entra como string e vira centavos.
6. Datas entram como `YYYY-MM-DD` e viram UTC.
7. Não confie em `id` vindo do formulário sem checar o dono.
8. Não exponha mensagens que revelem a existência de registros de outro usuário.
9. Não logue senhas, tokens ou connection strings.
10. Não adicione cache de página autenticada sem revisar o isolamento.

## Checklist para produção

- [ ] `DATABASE_URL` de produção configurada no painel da Vercel.
- [ ] `BETTER_AUTH_SECRET` novo e forte.
- [ ] `BETTER_AUTH_URL` com a URL pública HTTPS.
- [ ] Migrações aplicadas com `prisma migrate deploy`.
- [ ] `npm run build` passando no ambiente de produção.
- [ ] Login, cadastro e logout testados em produção.
- [ ] Cookies funcionando em HTTPS.
- [ ] Usuário de teste removido ou senha trocada.
- [ ] Backup/PITR do Neon habilitado conforme o plano.
- [ ] Exportação JSON testada.
- [ ] Rate limiting/Proteção de bots avaliada.
- [ ] Verificação de e-mail e recuperação de senha planejadas.
- [ ] Monitoramento de erros configurado.

## Limitações conscientes

- Sem verificação de e-mail.
- Sem recuperação de senha.
- Sem 2FA.
- Sem login social.
- Sem política de senha além do mínimo.
- Sem bloqueio por tentativas.
- Sem auditoria de sessões/dispositivos.
- Sem exclusão de conta pela interface.

Essas limitações são aceitáveis para um MVP pessoal, mas precisam ser resolvidas antes de uso por terceiros em escala.
