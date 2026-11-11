# 04 — Regras financeiras

Este documento é a fonte de verdade para os cálculos do app. Se uma alteração de código contrariar estas regras, a alteração precisa ser discutida e documentada.

## 1. Dois mundos: previsto e realizado

O app separa dois universos:

| Universo | Receita | Despesa | Entra no saldo? |
| --- | --- | --- | --- |
| Previsto | `status = EXPECTED` | `status = PENDING` | Não |
| Realizado | `status = RECEIVED` | `status = PAID` | Sim |

O saldo e o resultado do mês usam **somente realizado**. Valores previstos aparecem como indicadores separados (“A receber”, “Pendente”), para planejamento.

### Receita realizada

Uma receita conta como realizada quando:

- `status = "RECEIVED"`, e
- `receivedDate` está preenchida, e
- `financialAccountId` está preenchido (validado na ação).

### Despesa realizada

Uma despesa conta como realizada quando:

- `status = "PAID"`, e
- `paidDate` está preenchida, e
- `financialAccountId` está preenchido (validado na ação).

## 2. Saldo de uma conta

```text
saldo_conta =
    saldo_inicial
  + receitas_recebidas_na_conta
  − despesas_pagas_na_conta
  − pagamentos_de_dívida_sem_despesa_vinculada_na_conta
```

### Por que o último termo existe?

Quando um pagamento de dívida gera uma despesa vinculada, essa despesa já entra em `despesas_pagas_na_conta`. Somar o pagamento também contaria a mesma saída duas vezes.

Quando o pagamento **não** gera despesa (porque o usuário já lançou a despesa manualmente ou optou por não criar), o pagamento é a única representação da saída. Então ele entra diretamente.

### Exemplo

Conta principal:

- Saldo inicial: R$ 1.000,00
- Receita recebida: R$ 500,00
- Despesa paga: R$ 200,00
- Pagamento de dívida de R$ 100,00 **com** despesa vinculada
- Pagamento de dívida de R$ 50,00 **sem** despesa

```text
saldo = 100.000 + 50.000 − 20.000 − 5.000 = 125.000 centavos = R$ 1.250,00
```

O pagamento de R$ 100,00 não é subtraído diretamente porque a despesa vinculada de R$ 100,00 já foi subtraída. O pagamento de R$ 50,00 é subtraído diretamente.

## 2.1 Saldo em conta e saldo investido

O saldo calculado acima é o saldo de cada conta. Para exibir o patrimônio, as contas são agrupadas pelo `type`:

```text
saldo em conta   = contas CHECKING, CASH, CREDIT_CARD e OTHER
saldo investido  = contas SAVINGS e INVESTMENT
patrimônio total = saldo em conta + saldo investido
```

- O agrupamento é derivado de `AccountType`; não há campo extra nem migration.
- Contas arquivadas continuam nos totais, como antes.
- Um saldo negativo em qualquer grupo continua sendo somado e pode reduzir o patrimônio.
- Os cards do dashboard e os totais da página de contas usam a mesma função pura (`summarizeAccountBalances`).

## 3. Resultado do mês

```text
resultado_mês =
    receitas_recebidas_no_mês
  − despesas_pagas_no_mês
  − pagamentos_de_dívida_sem_despesa_no_mês
```

- Receitas são filtradas por `receivedDate`.
- Despesas são filtradas por `paidDate`.
- Pagamentos são filtrados por `paidAt`.
- O intervalo é `[início do mês, início do mês seguinte)` em UTC.

Uma receita prevista para o mês, mas ainda não recebida, **não** entra no resultado. Uma despesa pendente, mesmo vencida, **não** entra no resultado; ela aparece em “Pendente” e “Atrasadas”.

## 4. Dívidas

### Saldo devedor

```text
saldo_devedor = max(0, valor_inicial − soma_dos_pagamentos)
```

O saldo nunca fica negativo. O status é:

```text
status = soma_dos_pagamentos >= valor_inicial ? PAID : ACTIVE
```

### Progresso

```text
progresso = min(100, round(pago / valor_inicial × 100))
```

Se o valor inicial for zero (não permitido na criação, mas possível em dados antigos), o progresso é 0.

### Pagamento

- O valor deve ser positivo.
- O valor não pode ser maior que o saldo devedor.
- A data é obrigatória.
- A conta é opcional; se `createExpense` estiver marcado, a conta é obrigatória.
- Se `createExpense` estiver marcado, uma despesa paga é criada na mesma transação.
- A despesa vinculada recebe:
  - descrição `Pagamento — {nome da dívida}`;
  - categoria `Dívidas` (criada sob demanda);
  - `dueDate = paidAt`, `paidDate = paidAt`;
  - tipo `INSTALLMENT` se a dívida for parcelamento; caso contrário `FIXED`;
  - forma de pagamento informada ou `OTHER`;
  - conta informada;
  - status `PAID`.
- O pagamento guarda `expenseId` da despesa criada.
- O status da dívida é atualizado na mesma transação.

### Exclusão de pagamento

Ao excluir um pagamento:

1. Se existe despesa vinculada, ela é excluída.
2. O pagamento é excluído.
3. O status da dívida é recalculado com os pagamentos restantes.

Isso mantém a consistência: o pagamento deixa de existir e a saída que ele representava também.

### Exclusão de despesa vinculada

Se o usuário excluir a despesa vinculada diretamente:

- O pagamento continua existindo.
- `expenseId` vira `null` (`onDelete: SetNull`).
- O pagamento passa a contar como saída diretamente no saldo e no resultado.

Isso evita que o pagamento “desapareça” do caixa. O dinheiro saiu; a dívida foi reduzida; o registro de pagamento permanece.

### Edição de despesa vinculada

A edição direta da despesa vinculada é **bloqueada**. Alterar valor, data ou conta por ali dessincronizaria o pagamento e o saldo devedor. Para mudar esses dados, o usuário deve editar o pagamento na página da dívida. A lista de despesas mostra “Ver dívida” no lugar de “Editar” para esses registros.

### Exclusão de dívida

Ao excluir uma dívida:

- Todos os pagamentos são removidos em cascata.
- As despesas vinculadas **não** são removidas.
- As despesas permanecem no fluxo de caixa, pois representam saídas reais.

A interface avisa sobre isso na zona de risco.

## 5. Contas

### Saldo inicial

O saldo inicial é o saldo real da conta no momento em que o usuário começa a usar o app. Ele pode ser zero. Valores negativos não são aceitos no formulário (mas o saldo calculado pode ficar negativo se as saídas superarem as entradas).

### Arquivamento

- Conta arquivada não aparece nas opções de novos lançamentos.
- O histórico e o saldo continuam existindo.
- Os saldos em conta e investido incluem contas arquivadas.
- A interface indica quando o total inclui arquivadas.

### Exclusão

Uma conta só pode ser excluída se não tiver:

- receitas vinculadas;
- despesas vinculadas;
- pagamentos de dívida vinculados.

Caso contrário, a ação redireciona com erro e orienta arquivar.

### Importação de extrato

O botão **Extrato** no cabeçalho abre a importação. O arquivo é lido no navegador e o usuário revisa a prévia antes de qualquer escrita.

- Formatos: CSV e OFX.
- Limites: 5 MB e 500 lançamentos por importação.
- O CSV aceita `;`, `,` ou tabulação, campos entre aspas, UTF-8 e Windows-1252.
- Créditos viram `Income` com `status = RECEIVED`; débitos viram `Expense` com `status = PAID`.
- A conta escolhida precisa estar ativa e pertencer ao usuário.
- As datas reais do extrato são preservadas. Se o arquivo não tiver data, usa-se o primeiro dia do mês de referência.
- Categorias são sugeridas por palavras-chave e podem ser alteradas ou deixadas em branco.
- Valores sem sinal e sem coluna de tipo são tratados como crédito por padrão; a prévia avisa e permite marcar que positivos são despesas.
- Aplicações/resgates, faturas/cartão, saques/depósitos e transferências entre contas próprias são sinalizados e **desmarcados por padrão**.
- Reimportações usam um marcador em `notes` para ignorar linhas já importadas.

**Limitação:** o app ainda não tem transferência real entre contas. Se o usuário marcar uma transferência na prévia, ela será gravada como receita ou despesa e afetará o resultado. Também não concilie o extrato da conta e a fatura do cartão ao mesmo tempo: as compras do cartão e o pagamento da fatura podem duplicar a saída. Renomear o arquivo ou editar o `notes` de um lançamento pode impedir o reconhecimento na reimportação. O importador é uma conveniência de digitação, não uma conciliação bancária.

## 6. Categorias

- Categorias têm tipo fixo (`INCOME` ou `EXPENSE`).
- Uma categoria de receita não pode ser usada em despesa, e vice-versa; as ações validam.
- Categorias padrão são criadas uma única vez por usuário.
- A exclusão é bloqueada se houver lançamentos vinculados.
- Excluir uma categoria diretamente no banco deixaria os lançamentos com `categoryId = null`; a interface os mostra como “Sem categoria”.

## 7. Filtros e histórico

### Receitas

- Filtro mensal por `expectedDate`.
- “Todo o histórico” remove o filtro de mês.
- Filtros adicionais: status, categoria e busca por descrição.
- O link “Ver todo o histórico” preserva os filtros ativos.

### Despesas

- Filtro mensal por `dueDate`.
- “Todo o histórico” remove o filtro de mês.
- Filtros adicionais: status, categoria e busca por descrição.
- Despesas atrasadas são calculadas por `dueDate < hoje` e status `PENDING`.

### Dashboard

- Receitas e despesas do mês usam datas realizadas.
- “Saldo em conta” e “Saldo investido” seguem o agrupamento por `AccountType`; “Patrimônio total” é a soma.
- “A receber” e “Pendente” são totais globais de registros nesse status, não apenas do mês selecionado.
- A evolução mostra os últimos seis meses até o mês selecionado.
- A navegação mensal usa `?mes=YYYY-MM`.

## 8. Arredondamentos

- Valores são convertidos para centavos com `Math.round`.
- Percentuais de progresso usam `Math.round`.
- Nenhum cálculo financeiro usa `float` para armazenar dinheiro.
- A formatação usa `Intl.NumberFormat("pt-BR", { currency: "BRL" })`.

## 9. Casos de borda

| Caso | Comportamento |
| --- | --- |
| Pagamento maior que o saldo | Bloqueado com mensagem e valor do saldo |
| Dívida já quitada | Novos pagamentos são bloqueados |
| Editar valor inicial para menos que o já pago | Dívida vira `PAID` e saldo fica 0 |
| Excluir despesa vinculada | Pagamento continua e passa a contar como saída |
| Excluir pagamento | Despesa vinculada também é excluída |
| Excluir dívida | Pagamentos somem; despesas ficam |
| Conta com movimentações | Exclusão bloqueada; arquivar |
| Categoria em uso | Exclusão bloqueada |
| Receita recebida sem conta | Bloqueada na validação |
| Despesa paga sem conta | Bloqueada na validação |
| Mês sem lançamentos | Indicadores zerados; estado vazio nas listas |
| Total de categoria zero | Percentual 0, sem divisão por zero |
| Arquivo de extrato acima de 5 MB | Rejeitado no navegador com mensagem |
| Extrato com mais de 500 linhas | Primeiras 500 são lidas; a prévia avisa |
| CSV sem coluna de data | Usa o primeiro dia do mês de referência |
| Linha de transferência/aplicação | Marcada e desmarcada por padrão |
| Mesmo extrato reimportado | Marcador em `notes` ignora linhas já gravadas |
| Arquivo reimportado com outro nome | O marcador muda e pode duplicar |
| `notes` de um lançamento importado editado | A proteção contra duplicidade pode deixar de reconhecer a linha |

## 10. O que ainda não é calculado

- Juros, multa e correção de dívidas.
- Parcelamento com juros compostos.
- Fatura de cartão com ciclo de fechamento.
- Transferência entre contas (haveria dupla contagem se lançada como receita + despesa).
- Saldo projetado futuro.
- Orçamento por categoria.
- Rentabilidade de investimentos.

Esses itens exigiriam novas tabelas e regras; não devem ser improvisados em cima dos modelos atuais sem documentação.
