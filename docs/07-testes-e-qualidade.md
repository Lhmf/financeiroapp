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
- `tests/unit/validation.test.ts`

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
- percentuais e variação;
- rejeição de forma de pagamento vazia em despesas e pagamentos de dívida.

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

O relatório de cobertura está configurado para os módulos puros e validação:

```bash
npx vitest run --coverage
```

A cobertura não é meta absoluta; o foco é proteger as regras financeiras.

## Testes E2E

Arquivos:

- `tests/e2e/auth.spec.ts` — smoke sem banco.
- `tests/e2e/mvp.spec.ts` — fluxo completo com banco real, opt-in.

O smoke cobre:

- a página `/login` renderiza;
- o link “Criar conta” navega para `/cadastro`;
- a página de cadastro renderiza;
- `/dashboard` sem sessão redireciona para `/login`.

O teste com banco cobre:

- login com o usuário demo;
- criação de conta com saldo inicial;
- bloqueio de exclusão de conta com movimentação;
- criação, edição, recarga e exclusão de receita recebida;
- criação, edição e exclusão de despesa paga;
- criação de despesa parcelada e exibição de “Parcela 1/3”;
- criação de dívida, pagamento com despesa vinculada e saldo devedor;
- bloqueio de pagamento maior que o saldo;
- bloqueio de edição direta da despesa vinculada;
- exclusão de pagamento com remoção da despesa vinculada;
- exclusão de dívida mantendo a despesa vinculada;
- arquivamento, desarquivamento e exclusão de conta sem movimentação;
- filtros e alternância de histórico;
- logout e proteção de rota.

Rodar o smoke:

```bash
npx playwright install chromium
npm run test:e2e
```

Rodar o fluxo completo (PowerShell):

```powershell
$env:E2E_WITH_DB="1"
npx playwright test tests/e2e/mvp.spec.ts --workers=1 --reporter=line
```

Em Linux/macOS:

```bash
E2E_WITH_DB=1 npx playwright test tests/e2e/mvp.spec.ts --workers=1 --reporter=line
```

O Playwright sobe `npm run dev` automaticamente, a menos que `PLAYWRIGHT_BASE_URL` esteja definido.

> O teste com banco usa o usuário demo do seed, cria dados com nomes únicos e remove tudo o que criou. Ele não deve ser executado contra dados reais. O smoke de redirecionamento pode passar sem banco, pois o proxy/layout não encontra cookie e redireciona antes de consultar dados.

## Validação executada

Em **10/11/2026**, contra o Neon claimable de desenvolvimento:

- `npm test`: **34 testes em 4 arquivos**, todos passando.
- `npm run lint`: sem erros.
- `npx tsc --noEmit`: sem erros.
- `npm run build`: sucesso com Next.js 16.4.6.
- `npm run test:e2e`: 2 testes de autenticação passando.
- Teste completo com banco: passando em **53,6s**.
- Isolamento: um segundo usuário foi criado temporariamente, viu dashboard vazio e não conseguiu acessar os IDs do usuário demo; a conta temporária foi removida.
- Valores do seed conferidos: saldo total **R$ 17.417,00**, receitas recebidas **R$ 6.590,00**, despesas pagas **R$ 3.973,00**, resultado **R$ 2.617,00** no mês.
- O pagamento vinculado de **R$ 500,00** aparece como despesa paga e não é descontado de novo no saldo da conta.

## Testes manuais com banco real

Os itens marcados já foram validados; os demais continuam pendentes. Depois de configurar o Neon e rodar as migrações:

### Autenticação

- [x] Criar conta com nome, e-mail e senha.
- [x] Sair.
- [x] Entrar com uma conta existente.
- [x] Acessar `/dashboard` sem sessão e confirmar redirecionamento.
- [x] Criar uma segunda conta e confirmar que não vê dados da primeira.
- [ ] Recarregar o dashboard e confirmar que a sessão continua após uma navegação completa.

### Contas

- [x] Criar conta com saldo inicial.
- [ ] Editar nome, tipo, cor e saldo.
- [x] Arquivar e desarquivar.
- [ ] Confirmar que conta arquivada some das opções de novos lançamentos.
- [x] Tentar excluir conta com movimentação e confirmar bloqueio.
- [x] Excluir conta sem movimentação.

### Receitas

- [ ] Criar receita prevista.
- [ ] Confirmar que receita prevista não altera o saldo.
- [ ] Marcar receita prevista como recebida.
- [ ] Confirmar que o saldo e o resultado do mês mudam.
- [x] Criar receita recebida.
- [ ] Editar valor, data e categoria de uma receita.
- [x] Excluir receita.
- [ ] Filtrar por mês, categoria e status.
- [x] Alternar para “todo o histórico” e buscar por descrição.

### Despesas

- [ ] Criar despesa pendente.
- [ ] Confirmar que despesa pendente não altera o saldo.
- [ ] Marcar despesa pendente como paga.
- [ ] Confirmar que o saldo e o resultado do mês mudam.
- [x] Criar despesa paga.
- [x] Criar despesa parcelada com número/total.
- [x] Confirmar exibição da parcela.
- [x] Editar valor e excluir despesa paga.
- [ ] Filtrar por mês, categoria, status e busca.

### Dívidas

- [x] Criar dívida.
- [x] Registrar pagamento com despesa vinculada.
- [x] Confirmar que o saldo devedor caiu.
- [x] Confirmar que o pagamento não foi contado duas vezes no saldo da conta.
- [ ] Registrar pagamento sem despesa e confirmar que ele conta como saída.
- [x] Tentar pagar mais que o saldo e confirmar bloqueio.
- [ ] Quitar a dívida e confirmar status “Quitada”.
- [x] Excluir um pagamento e confirmar remoção da despesa vinculada.
- [x] Excluir a dívida e confirmar que as despesas permanecem.
- [ ] Excluir uma despesa vinculada e confirmar que o pagamento continua e passa a contar como saída.

### Dashboard

- [x] Saldo total reflete apenas receitas recebidas e despesas pagas.
- [x] Resultado do mês está correto.
- [x] “A receber” e “Pendente” mostram previstos.
- [x] Gráfico de evolução tem seis meses.
- [ ] Gráfico de categorias soma apenas despesas pagas do mês.
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
- `npm test`: 34 testes passando em 4 arquivos.
- `npm run test:e2e`: 2 testes de autenticação passando (Chromium).
- Teste E2E com banco: 1 teste completo passando (opt-in com `E2E_WITH_DB=1`).

## O que ainda não está automatizado

- O teste E2E com banco é opt-in e não roda no CI.
- Testes de Server Actions com `FormData` reais.
- Teste permanente de isolamento entre usuários.
- Testes de formulários client.
- Testes de acessibilidade.
- Testes de responsividade visual.
- Testes de regressão de gráficos.
- Testes de carga.

## Dívidas técnicas de teste

1. Criar uma branch Neon efêmera para o CI e rodar migrações + seed nela.
2. Testar as ações com `FormData` reais.
3. Transformar a validação manual de isolamento em um teste permanente com limpeza automática.
4. Rodar o teste de não duplicação de dívida no CI, não apenas localmente.
5. Configurar CI (GitHub Actions) com lint, tipos, unitários, build e Playwright.
6. Usar um seed exclusivo de teste para não depender do usuário demo.

## Convenções de teste

- Nome do teste em português, descrevendo comportamento.
- Um conceito por `it`, sem depender de ordem.
- Dados determinísticos; não usar “hoje” quando o teste puder receber uma referência.
- Preferir funções puras para regras financeiras.
- Não testar detalhes de implementação de componentes de UI.
- Não usar snapshot para valores monetários.

## Critérios para considerar o MVP validado

1. [x] `npm run build` passa.
2. [x] `npm test` passa.
3. [x] Smoke E2E passa.
4. [ ] Todos os itens manuais acima marcados contra um banco Neon real.
5. [ ] Exportação JSON contém os dados e não contém segredos.
6. [x] Nenhum usuário consegue acessar dados de outro.
7. [x] O saldo não conta dívida paga duas vezes.

**Status em 10/11/2026:** critérios 1, 2, 3, 6 e 7 atendidos. Os critérios 4 e 5 ainda dependem dos itens manuais pendentes.
