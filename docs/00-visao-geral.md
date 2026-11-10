# 00 — Visão geral

## O que é

O **FinanceiroApp** é um sistema pessoal de controle financeiro multiusuário. Ele foi pensado para responder, com clareza, a quatro perguntas:

1. Quanto eu tenho hoje de dinheiro realizado?
2. Quanto eu já recebi e já paguei neste mês?
3. Quanto eu ainda tenho previsto para receber e pagar?
4. Quanto eu devo e quanto já quitei de cada dívida?

O projeto prioriza **clareza sobre sofisticação**. A interface separa visualmente dinheiro realizado de valores previstos, e as regras de cálculo impedem que o mesmo pagamento de dívida seja contado duas vezes.

## Princípios do produto

- **Realizado ≠ previsto.** Uma receita só entra no saldo quando recebida; uma despesa só entra no saldo quando paga.
- **Dívida não é despesa.** A dívida representa um saldo devedor. O pagamento é que movimenta o caixa.
- **Um pagamento, uma saída.** Se o pagamento de uma dívida gera uma despesa vinculada, o pagamento não é somado novamente como saída.
- **Dados isolados por usuário.** Toda consulta e toda ação filtram pelo `userId` da sessão.
- **Histórico preservado.** Contas com movimentações são arquivadas, não excluídas.
- **Sem dependências desnecessárias.** O MVP não usa Supabase, Docker ou serviços pagos além do banco e da hospedagem.

## Escopo do MVP

| Área | Incluído no MVP |
| --- | --- |
| Autenticação | Cadastro, login, logout, sessão persistida, isolamento por usuário |
| Dashboard | Saldo realizado, resultado do mês, previstos, dívidas, gráficos, vencimentos |
| Receitas | CRUD, status prevista/recebida, categoria, conta, data prevista e recebida |
| Despesas | CRUD, status pendente/paga, tipo, categoria, conta, parcelamento, forma de pagamento |
| Dívidas | CRUD, pagamentos parciais, saldo devedor, progresso, quitação, histórico |
| Contas | CRUD, saldo inicial, saldo calculado, arquivamento |
| Categorias | Categorias padrão por usuário, criação, edição e exclusão |
| Configurações | Nome do perfil, categorias e exportação JSON |
| Qualidade | Testes unitários, smoke test E2E, lint, build, documentação |

## Fora do escopo do MVP

- Planejamento orçamentário por categoria.
- Metas financeiras e patrimônio.
- Investimentos e rentabilidade.
- Cartão de crédito com fatura e ciclo detalhado.
- Importação de extrato ou OFX.
- Restauração automática do backup.
- Aplicativo mobile nativo.
- Notificações por e-mail, push ou WhatsApp.
- Multimoeda.
- Permissões granulares ou compartilhamento de conta.

## Estado atual (novembro de 2026)

O código do MVP está implementado no repositório local. A aplicação compila (`next build`), passa no lint e os testes unitários passam. O que ainda depende de ação externa:

- **Conexão real com o Neon:** o `.env` local ainda contém uma `DATABASE_URL` de exemplo. Sem ela, login, cadastro, migrações, seed e testes com persistência não funcionam.
- **Migrações aplicadas:** `prisma migrate dev` ainda não foi executado contra um banco real.
- **Seed demonstrativo:** `npm run db:seed` ainda não foi executado.
- **Validação manual dos critérios de aceite:** depende do banco conectado.
- **Publicação na Vercel:** ainda não autorizada e depende de banco e variáveis de produção.

## Perfis de uso

- **Usuário principal:** profissional autônomo ou assalariado que quer acompanhar renda variável, despesas fixas, parcelas e dívidas.
- **Usuários adicionais:** cada pessoa tem sua própria conta; não há compartilhamento de dados no MVP.
- **Uso típico:** cadastrar contas e saldo inicial, lançar receitas e despesas do mês, registrar dívidas e pagamentos, revisar o dashboard semanalmente.

## Glossário

| Termo | Significado |
| --- | --- |
| Realizado | Dinheiro que efetivamente entrou ou saiu (receita recebida ou despesa paga) |
| Previsto | Valor esperado, ainda sem confirmação de caixa |
| Saldo devedor | Valor inicial da dívida menos os pagamentos registrados |
| Despesa vinculada | Despesa criada automaticamente para representar o pagamento de uma dívida no caixa |
| Pagamento sem vínculo | Pagamento de dívida que não gerou despesa e, por isso, é contado diretamente como saída |
| Conta arquivada | Conta preservada no histórico, mas indisponível para novas movimentações |
| Centavos | Unidade inteira usada para armazenar dinheiro, evitando erro de ponto flutuante |

## Documentos relacionados

- [Requisitos](./01-requisitos.md)
- [Arquitetura](./02-arquitetura.md)
- [Modelo de dados](./03-modelo-de-dados.md)
- [Regras financeiras](./04-regras-financeiras.md)
- [Autenticação e segurança](./05-autenticacao-e-seguranca.md)
- [Ambiente e instalação](./06-ambiente-e-instalacao.md)
- [Testes e qualidade](./07-testes-e-qualidade.md)
- [Backup e recuperação](./08-backup-e-recuperacao.md)
- [Roadmap e decisões](./09-roadmap-e-decisoes.md)
