# 09 — Roadmap e decisões

## Decisões de produto

### D01 — Multiusuário desde o início

**Decisão:** o MVP já nasce com autenticação e isolamento por usuário.

**Motivo:** evita uma migração estrutural dolorosa depois. O custo inicial é baixo com Better Auth e o modelo já inclui `userId` em todas as tabelas.

**Consequência:** toda consulta e ação precisa filtrar por usuário; testes de isolamento são obrigatórios.

### D02 — Neon PostgreSQL como banco definitivo

**Decisão:** usar Neon desde o começo, sem SQLite.

**Motivo:** o app será publicado na Vercel; SQLite local não serve em serverless. Evita diferenças de dialeto e retrabalho.

**Consequência:** o desenvolvimento depende de conexão com o Neon; migrations e seed precisam de banco real. Para a validação inicial, um projeto **Claimable Neon** temporário foi usado sem conta.

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

### D16 — Claimable Neon no desenvolvimento

**Decisão:** validar o MVP contra um projeto **Claimable Neon** criado sem conta, reivindicando-o antes do vencimento.

**Motivo:** permite testar migrações, seed e E2E em PostgreSQL real sem criar uma conta imediatamente.

**Consequência:** o projeto `flat-queen-78874900` foi reivindicado em 10/11/2026. As novas conexões pooled e direta foram aplicadas ao `.env`, e as migrações passaram a rodar pela conexão direta. Esse banco é só de desenvolvimento; não é produção.

### D17 — Conexão direta para migrações

**Decisão:** usar `DIRECT_URL` (com `DATABASE_URL_UNPOOLED` como fallback de compatibilidade) no `prisma7.config.ts`; o runtime continua com a pooled.

**Motivo:** evitar limitações de PgBouncer em migrações e inspeção.

**Consequência:** a Vercel deve ter as duas variáveis (ou apenas a pooled, usando o fallback) e os comandos de migração passam a usar a conexão direta automaticamente.

### D18 — Passe de UI/UX incremental

**Decisão:** evoluir a interface em camadas, sem alterar schema, regras financeiras, autenticação ou isolamento.

**Motivo:** melhorar hierarquia visual, leitura dos números, responsividade e acessibilidade sem aumentar o risco da migração estrutural pendente.

**Consequência:** o dashboard ganhou destaque para o saldo e resumo de contas em grade; receitas e despesas mostram totais do período filtrado; contas usam ícones por tipo; a navegação recebeu `aria-current`, skip link e tratamento de safe area no mobile. Os cards de saldo têm cor de fundo sólida inline como fallback para navegadores/extensões que removem gradientes, evitando texto branco sobre fundo claro. A migração para UUID/Decimal/Transaction continua uma decisão separada.

### D19 — Deploy de validação na Vercel

**Decisão:** publicar um deploy de validação na Vercel conectado ao GitHub, ainda usando o banco Neon de desenvolvimento.

**Motivo:** validar autenticação, cookies, build serverless e comportamento visual em um ambiente público antes de separar o banco de produção.

**Consequência:** a URL pública é `https://financeiroapp-orcin.vercel.app`. As variáveis `DATABASE_URL`, `DIRECT_URL`, `BETTER_AUTH_SECRET` e `BETTER_AUTH_URL` estão configuradas na Vercel. Antes de inserir dados reais, é obrigatório criar um banco/branch Neon de produção, aplicar as migrations e trocar as variáveis.

### D20 — Importação de extrato e saldos separados

**Decisão:** importar CSV/OFX/PDF com prévia e gravar apenas receitas recebidas e despesas pagas; separar o patrimônio em saldo em conta e saldo investido pelo `AccountType`.

**Motivo:** reduzir digitação e deixar claro quanto está disponível em conta e quanto está em poupança/investimento, sem criar tabelas ou dependências novas.

**Consequência:** `SAVINGS` e `INVESTMENT` formam o saldo investido; os demais tipos formam o saldo em conta. A deduplicação usa um marcador em `notes`, então editar as observações pode reduzir a proteção. Transferências continuam sem modelo próprio: são detectadas e desmarcadas na prévia, mas, se importadas, viram receita/despesa.

### D21 — Agenda financeira e lembretes por e-mail

**Decisão:** criar as áreas `/calendario`, `/lista`, `/contas-a-pagar` e `/contas-a-receber` sem alterar o schema. Contas a pagar usam `Expense.status = PENDING` e `dueDate`; contas a receber usam `Income.status = EXPECTED` e `expectedDate`. O lembrete diário é um endpoint de cron protegido por `CRON_SECRET`, com envio SMTP via `nodemailer`.

**Motivo:** oferecer uma visão operacional de curto prazo sem duplicar lançamentos, criar tabelas de agenda ou misturar previsto com realizado. Reutilizar os status existentes mantém os cálculos financeiros intactos.

**Consequência:** a agenda é somente leitura sobre os lançamentos; pagar/receber continua usando as ações existentes. `vercel.json` agenda uma chamada diária às 12:00 UTC. Sem `EMAIL_SMTP_HOST`/`EMAIL_FROM`, o cron não envia e-mails; sem `CRON_SECRET`, a rota responde `401`. `nodemailer` e `unpdf` são as dependências novas.

### D22 — Importação de PDF

**Decisão:** aceitar PDF com texto selecionável no mesmo fluxo de prévia do CSV/OFX. O binário é enviado a uma Server Action autenticada, que extrai o texto com `unpdf` e devolve apenas o texto; o parser puro heurístico monta os lançamentos no navegador. Limites: 5 MB, 40 páginas e 500 lançamentos.

**Motivo:** muitos bancos oferecem o extrato apenas em PDF. Fazer a extração no servidor evita enviar PDF.js ao cliente e mantém o parser testável sem navegador. Não é necessário alterar o schema.

**Consequência:** PDFs digitalizados (somente imagem) não são suportados e recebem orientação para exportar CSV/OFX. O limite de corpo das Server Actions foi elevado para 6 MB. Layouts bancários muito diferentes podem exigir ajuste na heurística de data/descrição/valor. O arquivo não é armazenado nem gera transferências reais.

## Roadmap

### Fase 0 — Fundação (concluída no código)

- [x] Scaffold Next.js 16 + TypeScript + Tailwind 4.
- [x] Prisma 7 + schema de auth e domínio.
- [x] Better Auth com e-mail/senha.
- [x] Layout autenticado e navegação responsiva.
- [x] Dashboard, receitas, despesas, dívidas, contas e configurações.
- [x] Regras financeiras puras e testadas.
- [x] Exportação JSON.
- [x] Importação de extrato CSV/OFX/PDF com prévia.
- [x] Saldo em conta separado do saldo investido.
- [x] Testes unitários e smoke E2E.
- [x] Documentação em português.

### Fase 1 — Validação real (concluída parcialmente em 10/11/2026)

- [x] Conectar ao Neon claimable.
- [x] Rodar a migration `20261110161632_init`.
- [x] Rodar o seed demo.
- [x] Validar os principais critérios de aceite com E2E e verificação manual.
- [x] Corrigir bugs encontrados (`paymentMethod` vazio, seletor de exclusão, página de recurso não encontrado).
- [x] Criar commits pequenos no Git.
- [x] Reivindicar o projeto Neon e atualizar as credenciais.
- [ ] Completar o checklist manual restante.
- [ ] Configurar CI (lint, tipos, testes, build).

### Fase 2 — Publicação

- [x] Reivindicar o projeto Neon e atualizar as credenciais.
- [x] Criar repositório remoto no GitHub.
- [x] Configurar variáveis na Vercel.
- [x] Publicar um deploy de validação em https://financeiroapp-orcin.vercel.app.
- [x] Smoke test de cadastro, login, logout, dashboard e menu mobile.
- [ ] Criar banco/branch Neon separado de produção e aplicar `prisma migrate deploy`.
- [ ] Apontar as variáveis de Production para o banco de produção.
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
- [ ] Metas e patrimônio histórico.
- [ ] Posições, movimentações e rentabilidade de investimentos.

### Fase 5 — Automação

- [ ] Lançamentos recorrentes.
- [x] Alertas de vencimento por e-mail (código pronto; requer SMTP e `CRON_SECRET`).
- [ ] Integração com Open Finance (avaliar custo/privacidade).
- [ ] Aplicativo mobile.

## Próximos passos imediatos

1. Completar os itens manuais pendentes de [07 — Testes e qualidade](./07-testes-e-qualidade.md).
2. Configurar CI com uma branch Neon efêmera.
3. Configurar backup/PITR no Neon.
4. Só depois avaliar publicação, com autorização explícita.

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

- [x] App conecta ao Neon real.
- [x] Migrações aplicadas.
- [x] Cadastro/login/logout funcionando.
- [x] CRUD de receitas e despesas funcionando e persistindo.
- [x] Dívidas e pagamentos funcionando.
- [x] Regra de não duplicação validada.
- [x] Filtros e histórico básicos funcionando.
- [x] Isolamento entre usuários validado.
- [ ] Exportação JSON testada manualmente.
- [x] `lint`, `tsc`, `test` e `build` passando.
- [x] Documentação atualizada.
- [x] Git com histórico de commits pequenos.
- [ ] Publicação autorizada e testada (fase futura).

> Pendências imediatas: completar o checklist manual, testar a exportação JSON e configurar backup/PITR no Neon.
