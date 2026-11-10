# 09 — Roadmap e decisões

## Decisões de produto

### D01 — Multiusuário desde o início

**Decisão:** o MVP já nasce com autenticação e isolamento por usuário.

**Motivo:** evita uma migração estrutural dolorosa depois. O custo inicial é baixo com Better Auth e o modelo já inclui `userId` em todas as tabelas.

**Consequência:** toda consulta e ação precisa filtrar por usuário; testes de isolamento são obrigatórios.

### D02 — Neon PostgreSQL como banco definitivo

**Decisão:** usar Neon desde o começo, sem SQLite.

**Motivo:** o app será publicado na Vercel; SQLite local não serve em serverless. Evita diferenças de dialeto e retrabalho.

**Consequência:** o desenvolvimento depende de conexão com o Neon; migrations e seed precisam de banco real.

### D03 — Better Auth self-managed

**Decisão:** Better Auth com e-mail/senha e sessões no banco, usando Prisma.

**Motivo:** sem serviço pago, controle total dos dados, integração oficial com Prisma e Next.js.

**Consequência:** recuperação de senha, verificação de e-mail e 2FA precisam ser implementadas depois.

### D04 — Prisma 7.10.1 fixado

**Decisão:** não usar Prisma 8 enquanto o Better Auth 1.7.19 não suportar.

**Motivo:** compatibilidade validada.

**Consequência:** atualizações de Prisma exigem teste conjunto com Better Auth.

### D05 — Dinheiro em centavos inteiros

**Decisão:** todos os valores monetários são `Int` em centavos.

**Motivo:** elimina erro de ponto flutuante.

**Consequência:** toda entrada/saída passa por `parseBRLToCents`/`formatCents`.

### D06 — Datas de domínio em UTC

**Decisão:** `@db.Date` com meia-noite UTC; formatação com `timeZone: "UTC"`.

**Motivo:** evitar que o fuso do servidor ou do navegador mude o dia.

**Consequência:** nunca usar `new Date("YYYY-MM-DD")` sem cuidado; usar `parseDateInput`.

### D07 — Dívida paga não duplica despesa

**Decisão:** o pagamento de dívida pode gerar uma despesa paga vinculada. Se gerar, o pagamento não conta como saída; se não gerar, conta.

**Motivo:** o usuário pode querer registrar a saída automaticamente ou já tê-la lançado manualmente.

**Consequência:** o cálculo do saldo precisa excluir pagamentos com `expenseId`; a exclusão da despesa vinculada deixa o pagamento sem vínculo.

### D08 — Exclusão de pagamento remove a despesa vinculada

**Decisão:** ao excluir um pagamento, a despesa criada por ele também é excluída.

**Motivo:** manter consistência. Se o pagamento não existe, a saída que ele representava também não.

**Consequência:** a ação usa transação e confirmação explícita.

### D09 — Exclusão de dívida mantém despesas

**Decisão:** excluir a dívida remove os pagamentos, mas mantém as despesas vinculadas.

**Motivo:** a despesa representa dinheiro que realmente saiu. Apagá-la distorceria o caixa.

**Consequência:** o histórico de pagamentos some, mas o fluxo de caixa permanece correto.

### D10 — Contas com movimentação são arquivadas

**Decisão:** bloquear exclusão e oferecer arquivamento.

**Motivo:** preservar o histórico e a integridade dos lançamentos.

**Consequência:** contas arquivadas ainda aparecem no saldo total; a interface avisa.

### D11 — Categorias padrão uma vez por usuário

**Decisão:** usar a flag `User.categoriesSeeded`.

**Motivo:** evitar duplicação a cada login e permitir que o usuário exclua categorias sem que elas voltem.

**Consequência:** a criação ocorre no layout autenticado; se falhar, o usuário pode ficar sem categorias até nova tentativa.

### D12 — Sem cache de página

**Decisão:** `cacheComponents: false`.

**Motivo:** segurança e isolamento de dados financeiros.

**Consequência:** menor ganho de performance; aceitável para uso pessoal.

### D13 — Exportação JSON em vez de importador

**Decisão:** o MVP exporta, mas não importa.

**Motivo:** um importador seguro exige validação de relações, conflitos e ownership; o risco não compensa no MVP.

**Consequência:** recuperação é manual ou via Neon.

### D14 — Seed apenas demonstrativo

**Decisão:** não importar os valores reais informados na conversa inicial.

**Motivo:** evitar dados fictícios misturados com dados reais e respeitar a privacidade.

**Consequência:** o usuário cadastra os próprios dados ou usa o seed demo.

### D15 — Sem Docker

**Decisão:** não usar Docker no MVP.

**Motivo:** reduzir complexidade local; Neon é o banco.

**Consequência:** testes de integração precisam de um banco de teste (Neon branch ou PostgreSQL local).

## Roadmap

### Fase 0 — Fundação (concluída no código)

- [x] Scaffold Next.js 16 + TypeScript + Tailwind 4.
- [x] Prisma 7 + schema de auth e domínio.
- [x] Better Auth com e-mail/senha.
- [x] Layout autenticado e navegação responsiva.
- [x] Dashboard, receitas, despesas, dívidas, contas e configurações.
- [x] Regras financeiras puras e testadas.
- [x] Exportação JSON.
- [x] Testes unitários e smoke E2E.
- [x] Documentação em português.

### Fase 1 — Validação real (próxima)

- [ ] Conectar o Neon.
- [ ] Rodar `prisma migrate dev --name init`.
- [ ] Rodar o seed.
- [ ] Validar os 11 critérios de aceite manualmente.
- [ ] Corrigir bugs encontrados.
- [ ] Criar o primeiro commit no Git.
- [ ] Configurar CI (lint, tipos, testes, build).

### Fase 2 — Publicação

- [ ] Criar repositório remoto.
- [ ] Configurar variáveis na Vercel.
- [ ] `prisma migrate deploy` em produção.
- [ ] Smoke test em produção.
- [ ] Backup/PITR do Neon.
- [ ] Monitoramento básico.

### Fase 3 — Segurança e conforto

- [ ] Recuperação de senha.
- [ ] Verificação de e-mail.
- [ ] Rate limiting no login.
- [ ] Exclusão de conta.
- [ ] Tela de sessões ativas.
- [ ] Auditoria de alterações.

### Fase 4 — Relatórios e planejamento

- [ ] Orçamento mensal por categoria.
- [ ] Comparação previsto × realizado.
- [ ] Relatório anual.
- [ ] Exportação CSV/Excel.
- [ ] Importação JSON com dry-run.
- [ ] Metas e patrimônio.
- [ ] Investimentos.

### Fase 5 — Automação

- [ ] Lançamentos recorrentes.
- [ ] Alertas de vencimento.
- [ ] Integração com Open Finance (avaliar custo/privacidade).
- [ ] Aplicativo mobile.

## Próximos passos imediatos

1. Obter a connection string real do Neon.
2. Atualizar `.env`.
3. Rodar `prisma migrate dev --name init`.
4. Rodar `npm run db:seed`.
5. Subir o app e validar o checklist de [07 — Testes e qualidade](./07-testes-e-qualidade.md).
6. Inicializar o Git e fazer commits pequenos.
7. Só depois avaliar publicação.

## Questões abertas

- O usuário quer manter o seed demo no ambiente de desenvolvimento ou remover?
- O saldo total deve incluir contas arquivadas por padrão? Hoje inclui e avisa.
- O filtro mensal de despesas deve usar `dueDate` ou `paidDate`? Hoje usa `dueDate`; o dashboard usa `paidDate`.
- Parcelas devem ser registros individuais no futuro? Hoje são um único registro com número/total.
- Como tratar transferências entre contas sem dupla contagem?
- Qual plano do Neon será usado em produção?
- Haverá verificação de e-mail antes de permitir login?
- O app será apenas pessoal ou aceitará terceiros?

## Definition of Done do MVP

- [ ] App conecta ao Neon real.
- [ ] Migrações aplicadas.
- [ ] Cadastro/login/logout funcionando.
- [ ] CRUD de receitas e despesas funcionando e persistindo.
- [ ] Dívidas e pagamentos funcionando.
- [ ] Regra de não duplicação validada.
- [ ] Filtros e histórico funcionando.
- [ ] Isolamento entre usuários validado.
- [ ] Exportação JSON funcionando.
- [ ] `lint`, `tsc`, `test` e `build` passando.
- [ ] Documentação atualizada.
- [ ] Git com histórico limpo.
- [ ] Publicação autorizada e testada (fase futura).
