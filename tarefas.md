# Tarefas Pendentes — SistemaSL

## INTEGRACAO-001: Google Agenda nos Cursos

**Status:** Código implementado — aguarda configuração manual de credenciais

**O que falta (manual):**
Configurar as variáveis de ambiente no Google Cloud Console e no ambiente de produção:

1. Acessar [console.cloud.google.com](https://console.cloud.google.com) e criar/usar o projeto `sistemasl-agenda`.
2. Ativar a **Google Calendar API**.
3. Criar credenciais:
   - **Service Account** → baixar JSON da chave
   - **OAuth 2.0 Client ID** → URI de redirecionamento: `/api/v1/auth/google/callback`
4. Compartilhar o calendário da organização com o e-mail da Service Account (permissão "Fazer alterações nos eventos").
5. Preencher no ambiente de produção (`.env` ou painel do Dokploy):
   ```
   GOOGLE_SERVICE_ACCOUNT_JSON=<conteúdo do JSON>
   GOOGLE_CALENDAR_ID=<id do calendário da org>
   GOOGLE_CLIENT_ID=<oauth client id>
   GOOGLE_CLIENT_SECRET=<oauth client secret>
   GOOGLE_REDIRECT_URI=<uri de callback>
   ```
6. Testar fluxo completo:
   - Criar curso → evento aparece no Google Agenda da org
   - Conectar conta Google no perfil → inscrição em curso → evento no Agenda pessoal

**Arquivos já criados:**
- `backend/src/lib/googleCalendar.ts`
- `backend/src/google/routes.ts`
- `backend/prisma/migrations/20260318120000_google_calendar/`

---

## UI-001: Botão de Dark Mode

**Prioridade:** Média

Adicionar botão de alternância entre modo claro e escuro na interface.

**Escopo:**
- Adicionar botão de toggle (ícone de sol/lua) na barra de navegação ou no header
- Persistir a preferência do usuário em `localStorage`
- Respeitar `prefers-color-scheme` como valor inicial
- O sistema já tem variáveis CSS de dark mode em `globals.css` — basta conectar a classe `dark` no `<html>`

**Arquivos a editar:**
- `frontend/app/components/SidebarNav.tsx` — adicionar botão no menu lateral (desktop) e no header mobile
- `frontend/app/globals.css` — verificar se as variáveis dark já cobrem todos os elementos
- `frontend/app/layout.tsx` — adicionar provider de tema (ou `useEffect` + `localStorage`)

---

## Melhorias Recomendadas (sem prazo)

- Implementar storage externo para uploads (S3 ou compatível) — volume Docker atual não escala.
- Adicionar rate limiting por IP nas rotas públicas (registro, recuperação de senha).
- Observabilidade: métricas e alertas (ex: Prometheus + Grafana ou serviço gerenciado).
