# 08 — Backup e recuperação

## Objetivo

Garantir que os dados financeiros possam ser recuperados em caso de:

- exclusão acidental;
- erro de migração;
- falha do provedor;
- comprometimento de conta;
- mudança de projeto/região.

O MVP tem **exportação manual** e depende dos **backups do Neon** para recuperação point-in-time. A restauração automática pela interface ainda não existe.

## Camadas de proteção

| Camada | O que protege | Como |
| --- | --- | --- |
| Exportação JSON | Dados legíveis do usuário | Configurações → Exportar JSON |
| Backups do Neon | Banco completo | Painel do Neon / PITR |
| Histórico de migrações | Estrutura do schema | `prisma/migrations` no Git |
| Git | Código e documentação | Commits pequenos |
| Segredos fora do Git | Credenciais | `.env` local + Vercel |

## Exportação JSON

### Como usar

1. Entre no app.
2. Vá em **Configurações**.
3. Clique em **Exportar JSON**.
4. Guarde o arquivo em local seguro.

### Conteúdo

```json
{
  "app": "FinanceiroApp",
  "version": 1,
  "exportedAt": "2026-11-10T12:00:00.000Z",
  "user": { "id": "...", "name": "...", "email": "...", "createdAt": "..." },
  "accounts": [],
  "categories": [],
  "incomes": [],
  "expenses": [],
  "debts": [],
  "debtPayments": []
}
```

### O que não é exportado

- Senha ou hash de senha.
- Sessões e tokens.
- Contas de autenticação (`Account`).
- Verificações.
- Segredos de ambiente.
- Dados de outros usuários.

### Limitações

- A exportação é um retrato do momento; não é incremental.
- Não há importação automática.
- O JSON não é criptografado. Trate-o como documento sensível.
- Datas aparecem em ISO; valores em centavos.
- O arquivo pode conter dados pessoais (nome, e-mail, credor, descrições).

## Backup do Neon

O Neon oferece recursos de recuperação conforme o plano:

- **History / instant restore:** permite voltar o branch a um ponto no tempo.
- **Backups automáticos:** retenção varia por plano.
- **Branches:** permitem criar uma cópia isolada para testes ou restauração.

> Verifique no painel do Neon a janela de retenção do seu plano. Não presuma um período específico; documente o que está contratado.

> **Atenção:** o projeto Neon de desenvolvimento foi reivindicado, mas continua não sendo um backup de produção e não tem retenção contratada. Configure backup/PITR antes de usar dados reais.

### Boas práticas

1. Ative a retenção máxima que o plano permitir.
2. Antes de migrações destrutivas, crie um branch de backup.
3. Não execute `migrate reset` em produção.
4. Teste a restauração periodicamente.
5. Mantenha o export JSON mensal como cópia independente do provedor.
6. Nunca baixe o banco inteiro para um computador sem criptografia.

## Recuperação — cenários

### Cenário 1: exclusão acidental de um lançamento

1. Se o dado ainda estiver no export JSON mais recente, localize-o.
2. Recadastre manualmente pela interface (não há importador).
3. Se a exclusão foi recente e o Neon tem PITR, avalie restaurar um branch para o momento anterior e copiar o registro.

**Risco:** restaurar o banco inteiro pode desfazer alterações posteriores. Prefira recuperar o registro isoladamente.

### Cenário 2: migração com erro

1. Não faça novos lançamentos.
2. Crie um branch do Neon a partir do ponto anterior à migração.
3. Valide o schema e os dados no branch.
4. Aponte a aplicação para o branch restaurado ou copie os dados.
5. Corrija a migração no código.
6. Documente o incidente.

### Cenário 3: perda do banco/projeto

1. Crie um novo projeto Neon.
2. Atualize `DATABASE_URL` e `DIRECT_URL`.
3. Rode `npm run db:deploy` para recriar o schema.
4. Recadastre os dados a partir do export JSON mais recente (manual) ou de um dump do banco.
5. Teste login e dashboard.
6. Atualize as variáveis na Vercel.

### Cenário 4: conta comprometida

1. Troque `BETTER_AUTH_SECRET` (invalida sessões).
2. Revogue sessões no banco, se necessário.
3. Troque a senha do usuário (fluxo manual; não há recuperação no MVP).
4. Revogue a senha do banco no Neon.
5. Gere novas credenciais.
6. Audite lançamentos suspeitos.
7. Restaure de um backup se houver alteração maliciosa.

### Cenário 5: migração de provedor

1. Exporte JSON.
2. Faça um dump SQL do PostgreSQL (`pg_dump`).
3. Crie o novo banco.
4. Rode `prisma migrate deploy`.
5. Importe o dump ou recadastre via JSON.
6. Valide contagens e somas.
7. Troque a `DATABASE_URL`.

## Plano de recuperação (RPO/RTO)

Valores sugeridos para uso pessoal:

| Métrica | Meta sugerida |
| --- | --- |
| RPO (perda máxima aceitável) | 24 horas |
| RTO (tempo para voltar) | 4 horas |
| Frequência de export JSON | Mensal ou antes de mudanças grandes |
| Teste de restauração | A cada 3 meses |

Ajuste conforme a criticidade. O app não tem SLA.

## Checklist de backup

- [ ] Export JSON baixado neste mês.
- [ ] Arquivo guardado em local seguro e com acesso restrito.
- [ ] Neon com retenção configurada.
- [ ] Branch de backup criado antes de migração destrutiva.
- [ ] Última restauração de teste documentada.
- [ ] Segredos de produção rotacionados se houver suspeita.
- [ ] Variáveis da Vercel conferidas.
- [ ] Migrações versionadas no Git.

## O que ainda falta

- Importador JSON.
- Exportação CSV/Excel.
- Backup automático para storage externo.
- Criptografia do arquivo exportado.
- Rotina agendada de exportação.
- Teste automatizado de restauração.
- Tela de auditoria de alterações.

## Decisão sobre restauração automática

Não implementar no MVP. Motivos:

- Um importador precisa validar IDs, relações, duplicidade e ownership.
- Restaurar dados por cima de um usuário existente pode criar duplicatas.
- O risco de um importador malfeito é maior que o benefício para um app pessoal.
- O export JSON já permite recuperação manual e migração.

A implementação futura deve ser um fluxo separado, com dry-run, relatório de conflitos e confirmação explícita.
