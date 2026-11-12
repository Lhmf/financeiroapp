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
- `tests/unit/statement.test.ts`

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
- rejeição de forma de pagamento vazia em despesas e pagamentos de dívida;
- separação entre saldo em conta e saldo investido;
- parsing de CSV, OFX e PDF em texto, datas, valores, encoding Windows-1252, categorias sugeridas e detecção de transferências;
- extração real de texto de PDF com `unpdf` e fixture `tests/fixtures/extrato.pdf`;
- validação da prévia de importação e proteção por marcador.

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
- `tests/e2e/isolation.spec.ts` — isolamento entre dois usuários, opt-in e com limpeza automática.
- `tests/e2e/import-pdf.spec.ts` — upload de PDF real, prévia e importação, opt-in e com limpeza automática.
- `tests/e2e/agenda.spec.ts` — agenda, filtros e ações de pagar/receber, opt-in e com limpeza automática.

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

O teste de isolamento cobre:

- cadastro de dois usuários independentes;
- criação de conta e receita recebida pelo usuário A;
- ausência da receita no dashboard e na lista do usuário B;
- acesso direto de B à URL de edição de A resultando em “Recurso não encontrado”;
- remoção dos dois usuários temporários no `afterAll`, via conexão direta `pg`.

O teste de importação de PDF cobre:

- cadastro de usuário e conta;
- upload de `tests/fixtures/extrato.pdf` no diálogo **Extrato**;
- extração do texto no servidor, badge `PDF` e prévia com os três lançamentos;
- transferência/aplicação desmarcada por padrão e importação de dois lançamentos;
- conferência das despesas e receitas no mês do extrato;
- remoção do usuário temporário no `afterAll`.

Rodar o smoke:

```bash
npx playwright install chromium
npm run test:e2e
```

Rodar o fluxo completo (PowerShell):

```powershell
$env:E2E_WITH_DB="1"
npx playwright test --workers=1 --reporter=line
```

Para rodar apenas o MVP ou apenas o isolamento, informe o arquivo:

```powershell
npx playwright test tests/e2e/mvp.spec.ts --workers=1 --reporter=line
npx playwright test tests/e2e/isolation.spec.ts --workers=1 --reporter=line
npx playwright test tests/e2e/import-pdf.spec.ts --workers=1 --reporter=line
```

Em Linux/macOS:

```bash
E2E_WITH_DB=1 npx playwright test tests/e2e/mvp.spec.ts --workers=1 --reporter=line
```

O Playwright sobe `npm run dev` automaticamente, a menos que `PLAYWRIGHT_BASE_URL` esteja definido. Se o servidor local estiver em outra porta, defina `BETTER_AUTH_URL` para a mesma origem (por exemplo, `http://localhost:3002`) antes de iniciar o servidor; caso contrário o Better Auth recusa o cadastro com `Invalid origin`.

> O teste com banco usa o usuário demo do seed, cria dados com nomes únicos e remove tudo o que criou. Ele não deve ser executado contra dados reais. O smoke de redirecionamento pode passar sem banco, pois o proxy/layout não encontra cookie e redireciona antes de consultar dados.

## Validação executada

Em **10/11/2026**, contra o Neon de desenvolvimento reivindicado:

- `npm test`: **60 testes em 5 arquivos**, todos passando.
- `npm run lint`: sem erros.
- `npx tsc --noEmit`: sem erros.
- `npm run build`: sucesso com Next.js 16.4.6.
- `npm run test:e2e`: 2 testes de autenticação passando.
- Teste completo com banco: passando em **53,6s**.
- Suíte E2E com banco após o passe de UI/UX: **4 testes passando em 1,5 min**.
- Validação visual manual em **1440×1000** e **390×844** no dashboard, receitas, despesas e contas.
- Isolamento: **1 teste permanente** passando em **25,3s**, com dois usuários temporários removidos no `afterAll`.
- Valores conferidos no banco de desenvolvimento em novembro/2026: saldo em conta **R$ 1.181,00**, saldo investido **R$ 10.000,00**, patrimônio total **R$ 11.181,00**, receitas recebidas **R$ 0,00**, despesas pagas **R$ 3.619,00** e resultado **−R$ 3.619,00** no mês.
- O pagamento vinculado de **R$ 500,00** aparece como despesa paga e não é descontado de novo no saldo da conta.
- Importação de extrato validada por Playwright em 10/11/2026: cadastro, conta corrente, CSV com três linhas, transferência desmarcada, importação de dois lançamentos, saldo em conta de **R$ 5.849,55** e zero erros de console. O teste descartável foi removido; o parser ficou coberto por testes permanentes.

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

### Importação de extrato

- [x] Importar CSV com débitos e créditos.
- [x] Importar PDF com texto selecionável e conferir extração, prévia e valores.
- [x] Conferir prévia e contagem de selecionados.
- [x] Confirmar que aplicação/transferência vem desmarcada.
- [x] Confirmar que o saldo em conta muda após importar.
- [ ] Reimportar o mesmo arquivo e confirmar que não duplica.
- [ ] Importar um OFX real de banco.
- [ ] Importar um PDF real de banco com layout diferente do fixture.
- [ ] Editar categoria por linha antes de importar.
- [ ] Conferir CSV sem data usando o mês de referência.
- [ ] Criar conta `SAVINGS`/`INVESTMENT` e conferir saldo investido separado.

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
- `npm test`: 60 testes passando em 5 arquivos.
- `npm run test:e2e`: 2 testes de autenticação passando (Chromium).
- Teste E2E com banco: bloqueado pelo login do seed `demo@financeiro.local`, rejeitado pela validação de e-mail do Better Auth. O smoke sem banco continua passando.

## O que ainda não está automatizado

- O teste E2E com banco é opt-in e não roda no CI.
- Testes de Server Actions com `FormData` reais.
- Testes de formulários client.
- Testes de acessibilidade.
- Testes de responsividade visual.
- Testes de regressão de gráficos.
- Testes de carga.

## Dívidas técnicas de teste

1. Criar uma branch Neon efêmera para o CI e rodar migrações + seed nela.
2. Testar as ações com `FormData` reais.
3. Rodar o teste de não duplicação de dívida no CI, não apenas localmente.
4. Configurar CI (GitHub Actions) com lint, tipos, unitários, build e Playwright.
5. Usar um seed exclusivo de teste para não depender do usuário demo.

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
