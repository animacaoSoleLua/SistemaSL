# Design: Aba de Agenda com Google Calendar

**Data:** 2026-04-03  
**Status:** Aprovado

---

## Visão Geral

Nova aba **Agenda** acessível a todos os usuários (admin, animador, recreador). Exibe um calendário visual integrado ao Google Calendar pessoal do usuário, com suporte a criar, editar e deletar eventos diretamente pelo sistema.

---

## Arquitetura

O backend atua como proxy entre o frontend e a Google Calendar API, usando os tokens OAuth2 já armazenados no modelo `User` (campos `googleAccessToken`, `googleRefreshToken`, `googleTokenExpiry`). A função `getUserCalendar(tokens)` existente em `lib/googleCalendar.ts` é reutilizada — ela já faz refresh automático do token quando necessário.

```
Frontend /agenda            Backend /api/v1/agenda          Google Calendar API
──────────────────          ──────────────────────          ───────────────────
page.tsx
  FullCalendar    ──GET──▶  GET  /events?timeMin&timeMax ──▶ calendar.events.list
  (month/week/day)◀─events─
  Modal (criar)   ──POST──▶ POST /events                 ──▶ calendar.events.insert
  Modal (editar)  ──PATCH─▶ PATCH /events/:id            ──▶ calendar.events.update
  Modal (deletar) ─DELETE─▶ DELETE /events/:id           ──▶ calendar.events.delete
```

---

## Frontend

### Estrutura de arquivos

```
frontend/app/agenda/
  page.tsx    — página principal
  page.css    — estilos
```

Segue o padrão das demais páginas do sistema (componentes em um único `page.tsx`).

### Componente de calendário

- Biblioteca: `@fullcalendar/react` + plugins `daygrid`, `timegrid`, `interaction`
- Views disponíveis: mês (`dayGridMonth`), semana (`timeGridWeek`), dia (`timeGridDay`)
- Botões de troca de view na toolbar customizada do FullCalendar
- Ao navegar entre períodos, busca eventos com `timeMin`/`timeMax` correspondentes ao intervalo visível

### Comportamento

- **Usuário sem Google conectado:** calendário abre normalmente e vazio. Ao tentar salvar um evento, exibe mensagem: *"Conecte sua conta Google no Perfil para gerenciar eventos."*
- **Usuário com Google conectado:** eventos carregados automaticamente ao abrir a página e ao navegar entre períodos

### Modal de evento

Abre em dois contextos:
- **Criar:** clique em uma data/horário vazio (callback `select` do FullCalendar)
- **Editar:** clique em um evento existente (callback `eventClick`)

Campos:
- Título (obrigatório)
- Data/hora de início
- Data/hora de fim
- Descrição
- Participantes (e-mails separados por vírgula)

Ações disponíveis no modal: **Salvar**, **Deletar** (apenas em edição), **Cancelar**.

### Navegação

Item "Agenda" adicionado em `SidebarNav.tsx` para todos os roles, com ícone `FiCalendar` (react-icons, já instalado). Rota: `/agenda`.

---

## Backend

### Arquivo novo

`backend/src/agenda/routes.ts` — registrado em `app.ts`.

### Rotas

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/v1/agenda/events` | Lista eventos (`?timeMin=&timeMax=`). Retorna `[]` se usuário sem tokens. |
| POST | `/api/v1/agenda/events` | Cria evento. Retorna 422 se usuário sem tokens. |
| PATCH | `/api/v1/agenda/events/:id` | Atualiza evento. Retorna 422 se usuário sem tokens. |
| DELETE | `/api/v1/agenda/events/:id` | Deleta evento. Retorna 422 se usuário sem tokens. |

Todas as rotas passam pelo `authGuard` existente (token de sessão obrigatório).

### Funções novas em `lib/googleCalendar.ts`

- `listUserEvents(tokens, timeMin, timeMax)` → `calendar.events.list`
- `updateUserEvent(tokens, eventId, data)` → `calendar.events.update`

As funções `createUserEvent` e `deleteUserEvent` já existem e são reaproveitadas.

### Formato do evento (POST/PATCH body)

```ts
{
  title: string
  start: string       // ISO 8601
  end: string         // ISO 8601
  description?: string
  attendees?: string[] // lista de e-mails
}
```

---

## Frontend API (`frontend/lib/api.ts`)

Quatro funções novas:

```ts
getAgendaEvents(timeMin: string, timeMax: string)
createAgendaEvent(data: AgendaEventInput)
updateAgendaEvent(id: string, data: AgendaEventInput)
deleteAgendaEvent(id: string)
```

---

## Dependências a instalar

```bash
# frontend
npm install @fullcalendar/react @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction
```

`googleapis` já está instalado no backend.

---

## Fora do escopo

- Criação de eventos recorrentes
- Sincronização de múltiplos calendários (usa apenas `primary`)
- Notificações / lembretes
