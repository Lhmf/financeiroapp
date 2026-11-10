# 01 — Requisitos

## Requisitos funcionais

### Autenticação e usuários

- **RF-AUTH-01:** cadastro com nome, e-mail e senha.
- **RF-AUTH-02:** login com e-mail e senha.
- **RF-AUTH-03:** logout com encerramento da sessão.
- **RF-AUTH-04:** sessão persistida por até 30 dias, renovada após 24 horas de uso.
- **RF-AUTH-05:** rotas internas protegidas; usuário sem sessão é redirecionado para `/login`.
- **RF-AUTH-06:** usuário autenticado que acessa `/login` ou `/cadastro` é redirecionado para `/dashboard`.
- **RF-AUTH-07:** todos os dados financeiros são isolados por `userId`.

### Receitas

- **RF-REC-01:** criar receita com descrição, valor, data prevista e status.
- **RF-REC-02:** marcar receita como recebida, informando data e conta.
- **RF-REC-03:** editar qualquer campo da receita.
- **RF-REC-04:** excluir receita.
- **RF-REC-05:** filtrar por mês, status, categoria e texto.
- **RF-REC-06:** alternar entre visão mensal e histórico completo.
- **RF-REC-07:** receita recebida entra no saldo; prevista não entra.

### Despesas

- **RF-DES-01:** criar despesa com descrição, valor, vencimento, tipo e status.
- **RF-DES-02:** marcar despesa como paga, informando data e conta.
- **RF-DES-03:** registrar despesa parcelada com número e total de parcelas.
- **RF-DES-04:** editar qualquer campo da despesa.
- **RF-DES-05:** excluir despesa.
- **RF-DES-06:** filtrar por mês, status, categoria e texto.
- **RF-DES-07:** alternar entre visão mensal e histórico completo.
- **RF-DES-08:** despesa paga entra no saldo; pendente não entra.
- **RF-DES-09:** despesa vinculada a pagamento de dívida é identificada na interface.

### Dívidas

- **RF-DIV-01:** criar dívida com nome, credor, tipo, valor inicial e dia de vencimento.
- **RF-DIV-02:** registrar pagamento parcial com valor, data, conta e observações.
- **RF-DIV-03:** calcular saldo devedor e progresso automaticamente.
- **RF-DIV-04:** impedir pagamento maior que o saldo devedor.
- **RF-DIV-05:** marcar dívida como quitada quando os pagamentos cobrirem o valor inicial.
- **RF-DIV-06:** editar dívida e recalcular status.
- **RF-DIV-07:** excluir dívida e seu histórico de pagamentos.
- **RF-DIV-08:** ao excluir um pagamento, excluir também a despesa vinculada.
- **RF-DIV-09:** opção de criar despesa paga vinculada ao pagamento.
- **RF-DIV-10:** opção de não criar despesa, quando o usuário já lançou a saída manualmente.

### Contas

- **RF-CTA-01:** criar conta com nome, tipo, saldo inicial e cor.
- **RF-CTA-02:** calcular saldo atual por conta.
- **RF-CTA-03:** editar conta.
- **RF-CTA-04:** arquivar e desarquivar conta.
- **RF-CTA-05:** impedir exclusão de conta com movimentações.
- **RF-CTA-06:** excluir conta sem movimentações.

### Categorias

- **RF-CAT-01:** criar categorias padrão no primeiro acesso do usuário.
- **RF-CAT-02:** criar categoria de receita ou despesa.
- **RF-CAT-03:** editar nome e cor; o tipo não muda.
- **RF-CAT-04:** excluir categoria sem lançamentos vinculados.
- **RF-CAT-05:** categorias são isoladas por usuário.

### Dashboard

- **RF-DASH-01:** exibir saldo total realizado.
- **RF-DASH-02:** exibir receitas recebidas e despesas pagas do mês.
- **RF-DASH-03:** exibir resultado realizado do mês.
- **RF-DASH-04:** exibir total pendente e total previsto a receber.
- **RF-DASH-05:** exibir dívidas ativas, saldo devedor e progresso.
- **RF-DASH-06:** exibir evolução dos últimos seis meses.
- **RF-DASH-07:** exibir despesas pagas por categoria.
- **RF-DASH-08:** exibir próximos vencimentos, atrasadas e receitas previstas.
- **RF-DASH-09:** permitir navegar entre meses.

### Configurações e backup

- **RF-CFG-01:** editar o nome do perfil.
- **RF-CFG-02:** exportar os dados do usuário em JSON.
- **RF-CFG-03:** exportação não inclui senha, tokens ou sessões.

## Requisitos não funcionais

- **RNF-01:** interface responsiva para celular e desktop.
- **RNF-02:** valores monetários em centavos inteiros.
- **RNF-03:** datas de domínio em UTC, armazenadas como `date`.
- **RNF-04:** toda ação de escrita exige sessão e valida propriedade do registro.
- **RNF-05:** validação de entrada no servidor com Zod.
- **RNF-06:** sem segredos no Git.
- **RNF-07:** documentação em português.
- **RNF-08:** banco PostgreSQL no Neon.
- **RNF-09:** deploy futuro na Vercel.
- **RNF-10:** testes unitários para cálculos críticos e smoke test das páginas públicas.

## Critérios de aceite do MVP

| # | Critério | Status no código | Como validar |
| --- | --- | --- | --- |
| 1 | O app abre | Implementado | `npm run dev` e acessar `/login` |
| 2 | O dashboard apresenta indicadores | Implementado | Login com seed e acessar `/dashboard` |
| 3 | CRUD de receitas funciona | Implementado | Criar, editar, listar e excluir receita |
| 4 | CRUD de despesas funciona | Implementado | Criar, editar, listar e excluir despesa |
| 5 | Edição e exclusão funcionam | Implementado | Repetir nos dois módulos e em dívidas/contas |
| 6 | Dados persistem após refresh | Depende do banco | Recarregar a página e confirmar |
| 7 | Dívidas e parcelas podem ser cadastradas | Implementado | Criar dívida, pagamento e despesa parcelada |
| 8 | Saldo considera somente realizado | Implementado | Comparar previsto × recebido/pago |
| 9 | Filtros e histórico funcionam | Implementado | Testar mês, status, categoria, busca e `todos=1` |
| 10 | Dados protegidos | Implementado | Acessar rota interna sem sessão e testar outro usuário |
| 11 | Backup e recuperação previstos | Parcial | Exportar JSON e documentar restore no Neon |

> **Importante:** a coluna “status no código” não substitui a validação manual. Os critérios 2, 3, 4, 5, 6, 7, 8, 9 e 10 só podem ser considerados concluídos após rodar o app contra um banco Neon real.

## Requisitos de dados

- Toda tabela de domínio tem `userId` e relação com `User`.
- As consultas usam sempre `where: { userId, ... }` ou `findFirst({ where: { id, userId } })`.
- Exclusões em cascata são usadas apenas quando o dado filho não faz sentido sem o pai.
- A despesa vinculada a um pagamento é opcional e única.
- Excluir uma dívida remove pagamentos, mas não remove despesas já lançadas no caixa.

## Requisitos de interface

- Mostrar “Prevista” ou “Pendente” de forma distinta de “Recebida” ou “Paga”.
- Exibir valores com sinal (`+` para receita, `−` para despesa).
- Exibir estados vazios com ação clara.
- Exibir confirmação antes de exclusões destrutivas.
- Exibir mensagens de erro em português.
- Não usar tabelas densas; usar listas e cartões legíveis no celular.

## Fora de escopo

- Recuperação automática de senha.
- Verificação de e-mail.
- Autenticação social.
- 2FA.
- Compartilhamento de dados entre usuários.
- Importação de backup.
- Conciliação bancária.
- Open Finance.
- Relatórios exportáveis em PDF/Excel.
- Auditoria imutável de alterações.
