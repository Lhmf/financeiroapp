# 07 — Testes e qualidade

## Estratégia

O projeto usa uma pirâmide simples:

```text
        E2E (Playwright)         poucos, fluxos críticos
      Integração (manual)        banco real, CRUD e persistência
    Unitários (Vitest)           cálculos puros e datas
  Estático (TypeScript/ESLint)   sempre
```

## Testes unitários

Arquivos:

- `tests/unit/money.test.ts`
- `tests/unit/dates.test.ts`
- `tests/unit/finance.test.ts`

Cobrem:

- parsing de BRL para centavos;
- rejeição de zero/negativo/texto;
- conversão de centavos para input;
- parsing e formatação de datas UTC;
- intervalos de mês;
- `lastMonths`;
- `daysUntil`;
- soma de centavos;
- saldo de conta;
- resultado do mês;
- saldo devedor e progresso;
- pagamentos sem vínculo;
- percentuais e variação.

Rodar:

```bash
npm test
```

Modo watch:

```bash
npm run test:watch
```

Configuração: `vitest.config.mts` com `resolve.tsconfigPaths: true`.

### Cobertura

O relatório de cobertura está configurado para os três módulos puros:

```bash
npx vitest run --coverage
```

A cobertura não é meta absoluta; o foco é proteger as regras financeiras.

## Testes E2E

Arquivo: `tests/e2e/auth.spec.ts`.

Cobre, sem banco:

- a página `/login` renderiza;
- o link “Criar conta” navega para `/cadastro`;
- a página de cadastro renderiza;
- `/dashboard` sem sessão redireciona para `/login`.

Rodar:

```bash
npx playwright install chromium
npm run test:e2e
```

O Playwright sobe `npm run dev` automaticamente, a menos que `PLAYWRIGHT_BASE_URL` esteja definido.

> O teste de redirecionamento pode passar mesmo sem banco, pois o proxy/layout não encontra cookie e redireciona antes de consultar dados.

## Testes manuais com banco real

Depois de configurar o Neon e rodar as migrações:

### Autenticação

- [ ] Criar conta com nome, e-mail e senha.
- [ ] Sair.
- [ ] Entrar com a mesma conta.
- [ ] Recarregar o dashboard e confirmar sessão.
- [ ] Acessar `/dashboard` em janela anônima e confirmar redirecionamento.
- [ ] Criar uma segunda conta e confirmar que não vê dados da primeira.

### Contas

- [ ] Criar conta com saldo inicial.
- [ ] Editar nome, tipo, cor e saldo.
- [ ] Arquivar e confirmar que some das opções de novos lançamentos.
- [ ] Desarquivar.
- [ ] Tentar excluir conta com movimentação e confirmar bloqueio.
- [ ] Excluir conta sem movimentação.

### Receitas

- [ ] Criar receita prevista.
- [ ] Confirmar que não altera o saldo.
- [ ] Marcar como recebida.
- [ ] Confirmar que o saldo e o resultado do mês mudam.
- [ ] Editar valor, data e categoria.
- [ ] Excluir.
- [ ] Filtrar por mês, status, categoria e busca.
- [ ] Alternar para “todo o histórico”.

### Despesas

- [ ] Criar despesa pendente.
- [ ] Confirmar que não altera o saldo.
- [ ] Marcar como paga.
- [ ] Confirmar que o saldo e o resultado do mês mudam.
- [ ] Criar despesa parcelada com número/total.
- [ ] Confirmar exibição da parcela.
- [ ] Editar e excluir.
- [ ] Filtrar por mês, status, categoria e busca.

### Dívidas

- [ ] Criar dívida.
- [ ] Registrar pagamento com despesa vinculada.
- [ ] Confirmar que o saldo devedor caiu.
- [ ] Confirmar que o pagamento não foi contado duas vezes no saldo da conta.
- [ ] Registrar pagamento sem despesa e confirmar que ele conta como saída.
- [ ] Tentar pagar mais que o saldo e confirmar bloqueio.
- [ ] Quitar a dívida e confirmar status “Quitada”.
- [ ] Excluir um pagamento e confirmar remoção da despesa vinculada.
- [ ] Excluir a dívida e confirmar que as despesas permanecem.
- [ ] Excluir uma despesa vinculada e confirmar que o pagamento continua e passa a contar como saída.

### Dashboard

- [ ] Saldo total reflete apenas receitas recebidas e despesas pagas.
- [ ] Resultado do mês está correto.
- [ ] “A receber” e “Pendente” mostram previstos.
- [ ] Gráfico de evolução tem seis meses.
- [ ] Gráfico de categorias soma despesas pagas do mês.
- [ ] Próximos vencimentos e atrasadas estão corretos.
- [ ] Navegação mensal funciona.

### Configurações e backup

- [ ] Alterar nome do perfil e confirmar no shell.
- [ ] Criar categoria.
- [ ] Editar categoria.
- [ ] Tentar excluir categoria em uso e confirmar bloqueio.
- [ ] Excluir categoria sem uso.
- [ ] Exportar JSON e conferir que não contém senha/token.
- [ ] Confirmar que o JSON contém os dados do usuário correto.

## Verificações estáticas

```bash
npm run lint
npx tsc --noEmit
npm run build
```

Último resultado conhecido (novembro de 2026):

- `npm run lint`: sem erros.
- `npx tsc --noEmit`: sem erros.
- `npm run build`: sucesso.
- `npm test`: 30 testes passando.
- `npm run test:e2e`: 2 testes passando (Chromium).

## O que ainda não está automatizado

- Testes de integração com banco.
- Testes de Server Actions.
- Testes de isolamento entre usuários.
- Testes de formulários client.
- Testes de acessibilidade.
- Testes de responsividade visual.
- Testes de regressão de gráficos.
- Testes de carga.

## Dívidas técnicas de teste

1. Criar um banco de teste efêmero (Neon branch ou container) para integração.
2. Testar as ações com `FormData` reais.
3. Criar um teste que prove que o usuário B não consegue editar/excluir dados do usuário A.
4. Adicionar um teste que verifica a regra de não duplicação de dívida em nível de banco.
5. Configurar CI (GitHub Actions) com lint, tipos, unitários e build.
6. Configurar Playwright com banco de teste e seed isolado.

## Convenções de teste

- Nome do teste em português, descrevendo comportamento.
- Um conceito por `it`, sem depender de ordem.
- Dados determinísticos; não usar “hoje” quando o teste puder receber uma referência.
- Preferir funções puras para regras financeiras.
- Não testar detalhes de implementação de componentes de UI.
- Não usar snapshot para valores monetários.

## Critérios para considerar o MVP validado

1. `npm run build` passa.
2. `npm test` passa.
3. Smoke E2E passa.
4. Todos os itens manuais acima marcados contra um banco Neon real.
5. Exportação JSON contém os dados e não contém segredos.
6. Nenhum usuário consegue acessar dados de outro.
7. O saldo não conta dívida paga duas vezes.
