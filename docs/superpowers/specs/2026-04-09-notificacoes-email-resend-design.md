# Design: Notificações por Email via Resend

**Data:** 2026-04-09  
**Status:** Aprovado

## Visão Geral

Adicionar notificações por email usando Resend para dois eventos do sistema:
1. Criação de curso — notifica todos os membros
2. Inscrição em curso — notifica o membro inscrito com confirmação
3. Registro de advertência — notifica o membro advertido
4. Suspensão automática — notifica o membro suspenso (gerada ao acumular 3 advertências)

O Resend já é usado no projeto para reset de senha via `fetch` (sem SDK), com as variáveis de ambiente `RESEND_API_KEY` e `RESEND_FROM`. A mesma abordagem será seguida.

## Arquitetura

### Arquivo novo

```
backend/src/lib/email.ts
```

Exporta:
- `sendEmail(to, subject, html, text)` — função base de envio via Resend API
- `sendCourseCreatedEmail(course, members)` — novo curso para todos os membros
- `sendEnrollmentConfirmationEmail(course, member)` — confirmação de inscrição
- `sendWarningEmail(member, warning, warningCount)` — notificação de advertência
- `sendSuspensionEmail(member, suspension)` — notificação de suspensão

### Arquivos modificados

- `backend/src/advertencias/store.ts` — exportar `countWarningsInWindow` (atualmente privada)
- `backend/src/cursos/routes.ts` — disparar emails após criação de curso e inscrição
- `backend/src/advertencias/routes.ts` — disparar emails após criação de advertência e suspensão

## Pontos de Disparo

### `POST /api/v1/cursos`
Após `createCourse()`:
- Busca todos os usuários com `listUsers()`
- Chama `sendCourseCreatedEmail(course, members)` em fire-and-forget

### `POST /api/v1/cursos/:id/enrollments`
Após `addEnrollment()`:
- Busca o membro com `getUserById(memberId)`
- Chama `sendEnrollmentConfirmationEmail(course, member)` em fire-and-forget

### `POST /api/v1/advertencias`
Após `createWarning()`:
- Busca o membro com `getUserById(memberId)`
- Consulta `countWarningsInWindow()` para o período de 1 mês
- Chama `sendWarningEmail(member, warning, warningCount)` em fire-and-forget
- Se `suspensionApplied === true`, busca a suspensão com `getActiveSuspension(memberId)` e chama `sendSuspensionEmail(member, suspension)` em fire-and-forget

## Conteúdo dos Emails

### Email 1 — Novo Curso (todos os membros)
- **Assunto:** `"Novo curso disponível: {título}"`
- **Corpo:** título, data, local, instrutor, descrição, vagas disponíveis

### Email 2 — Confirmação de Inscrição (membro inscrito)
- **Assunto:** `"Inscrição confirmada: {título}"`
- **Corpo:** nome do membro, título do curso, data, local, instrutor

### Email 3 — Advertência (membro advertido)
- **Assunto:** `"Você recebeu uma advertência"`
- **Corpo:** motivo, data da advertência, contagem no período (ex: "Esta é sua 2ª advertência no último mês. Ao atingir 3, você será suspenso.")

### Email 4 — Suspensão (membro suspenso)
- **Assunto:** `"Você foi suspenso"`
- **Corpo:** motivo (3 advertências no período), data de início e fim da suspensão

## Tratamento de Erros

Todos os envios são fire-and-forget: falhas de email são logadas via `console.error` mas não retornam erro ao cliente. O fluxo principal (resposta da API) não é afetado por falhas no envio.

## Variáveis de Ambiente

Nenhuma variável nova necessária. Usa as existentes:
- `RESEND_API_KEY`
- `RESEND_FROM`
