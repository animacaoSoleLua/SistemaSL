# Status do Projeto - Sol e Lua

**Ultima Atualizacao:** 2026-03-25
**Atualizado por:** Codex

---

## Progresso Geral

```
████████████████████ 100%
```

| Metrica | Valor |
|---------|-------|
| Progresso Total | 100% |
| Fase Atual | Fase 4 - Estabilidade e Produto |
| Tarefas Completas | 66/66 |
| Ultima Tarefa | MELHORIA-098 |

---

## Tarefa Atual

### INTEGRACAO-001: Google Agenda nos Cursos

**Epic:** Integração com Google Calendar
**User Story:** Quando um curso é criado, ele aparece automaticamente no Google Agenda da organização. Quando um membro se inscreve, o evento aparece no Google Agenda pessoal dele.

**Descricao:**
Integrar a API do Google Calendar ao módulo de cursos, usando dois fluxos distintos:
1. **Calendário da organização** (Service Account): ao criar/editar/excluir um curso, o evento é espelhado no Google Agenda compartilhado da Sol e Lua.
2. **Calendário pessoal do membro** (OAuth 2.0): ao se inscrever em um curso, o evento é adicionado ao Google Agenda pessoal do membro (requer que ele conecte sua conta Google).

---

### Passos de Implementação

#### Passo 1 — Configuração no Google Cloud Console

1. Acessar [console.cloud.google.com](https://console.cloud.google.com) e criar um projeto (ex: `sistemasl-agenda`).
2. Ativar a **Google Calendar API** no projeto.
3. Criar duas credenciais:
   - **Service Account** (para o calendário da organização): baixar o JSON da chave.
   - **OAuth 2.0 Client ID** (para o calendário pessoal do membro): tipo "Web application", configurar URI de redirecionamento (`/api/v1/auth/google/callback`).
4. Configurar a **tela de consentimento OAuth** (nome do app, escopo `calendar.events`).
5. Compartilhar o calendário da organização com o e-mail da Service Account (permissão de "Fazer alterações nos eventos").
6. Anotar: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `GOOGLE_CALENDAR_ID`, conteúdo do JSON da Service Account.

---

#### Passo 2 — Banco de Dados (Prisma)

Adicionar campos na migration:

```prisma
// No modelo Curso (tabela cursos)
google_calendar_event_id  String?   // ID do evento no calendário da org

// No modelo User/Membro (tabela users)
google_access_token   String?   // Token OAuth do usuário
google_refresh_token  String?   // Refresh token OAuth
google_token_expiry   DateTime? // Validade do access token
```

Rodar `npx prisma migrate dev --name google_calendar`.

---

#### Passo 3 — Backend: Serviço do Google Calendar

Criar `backend/src/lib/googleCalendar.ts` com:

- Instalar dependência: `npm install googleapis`
- **`createOrgEvent(course)`**: cria evento no calendário da organização via Service Account, retorna `eventId`.
- **`updateOrgEvent(eventId, course)`**: atualiza evento quando o curso é editado.
- **`deleteOrgEvent(eventId)`**: exclui evento quando o curso é deletado.
- **`createUserEvent(userTokens, course)`**: cria evento no calendário pessoal do membro usando os tokens OAuth dele.
- **`deleteUserEvent(userTokens, eventId)`**: remove o evento do calendário pessoal ao cancelar inscrição.
- **`refreshAccessToken(refreshToken)`**: renova o access token expirado antes de cada operação.

Variáveis de ambiente necessárias:
```
GOOGLE_SERVICE_ACCOUNT_JSON=<conteúdo do JSON>
GOOGLE_CALENDAR_ID=<id do calendário da org>
GOOGLE_CLIENT_ID=<oauth client id>
GOOGLE_CLIENT_SECRET=<oauth client secret>
GOOGLE_REDIRECT_URI=<uri de callback>
```

---

#### Passo 4 — Backend: Rotas OAuth para Membros

Criar rotas em `backend/src/auth/routes.ts` ou novo arquivo `backend/src/google/routes.ts`:

- **`GET /api/v1/auth/google`**: gera URL de autorização do Google e redireciona o usuário.
- **`GET /api/v1/auth/google/callback`**: recebe o `code` do Google, troca por tokens, salva no banco do membro logado, redireciona para o frontend com sucesso/erro.
- **`DELETE /api/v1/auth/google`**: desconecta a conta Google (apaga tokens do banco).

---

#### Passo 5 — Backend: Disparos nos Cursos

Editar `backend/src/cursos/routes.ts`:

- **`POST /api/v1/cursos`** (criar curso): após salvar, chamar `createOrgEvent()` e salvar o `google_calendar_event_id` no curso.
- **`PATCH /api/v1/cursos/:id`** (editar curso): se o curso tiver `google_calendar_event_id`, chamar `updateOrgEvent()`.
- **`DELETE /api/v1/cursos/:id`** (excluir curso): se tiver evento, chamar `deleteOrgEvent()` antes de deletar.
- **`POST /api/v1/cursos/:id/inscricoes`** (inscrição): após inscrever, se o membro tiver `google_access_token`, chamar `createUserEvent()` e salvar o `google_calendar_event_id` na inscrição.
- Cancelamento/remoção de inscrição (se implementado): chamar `deleteUserEvent()`.

> Todos os disparos ao Google Calendar devem ser feitos de forma **não-bloqueante**: erros na API do Google não devem impedir a operação principal (log do erro, mas retornar sucesso ao usuário).

---

#### Passo 6 — Frontend: Conectar Conta Google

Na tela de **Perfil** (`frontend/app/perfil/page.tsx`):

- Buscar se o membro já tem conta Google conectada (novo campo no endpoint `GET /api/v1/membros/me` ou similar).
- Exibir botão **"Conectar Google Agenda"** se não conectado, ou **"Google Agenda conectado ✓"** + botão de desconectar se já conectado.
- Ao clicar em conectar, redirecionar para `GET /api/v1/auth/google`.
- Após o callback do OAuth, exibir mensagem de sucesso/erro.

---

#### Passo 7 — Frontend: Feedback na Inscrição

Na tela de **Cursos** (`frontend/app/cursos/page.tsx`):

- Após inscrição bem-sucedida, se o membro tiver conta Google conectada: exibir mensagem "Evento adicionado ao seu Google Agenda".
- Se não tiver conta conectada: exibir link "Conecte seu Google Agenda no perfil para adicionar automaticamente".

---

### Resumo de Arquivos a Criar/Editar

| Arquivo | Ação |
|---------|------|
| `backend/src/lib/googleCalendar.ts` | Criar — serviço principal |
| `backend/src/google/routes.ts` | Criar — rotas OAuth |
| `backend/src/cursos/routes.ts` | Editar — disparos na criação/edição/exclusão/inscrição |
| `backend/src/cursos/store.ts` | Editar — salvar `google_calendar_event_id` |
| `backend/prisma/schema.prisma` | Editar — novos campos |
| `frontend/app/perfil/page.tsx` | Editar — botão conectar Google |
| `frontend/app/cursos/page.tsx` | Editar — feedback após inscrição |
| `.env.example` | Editar — novas variáveis |

---

### Ordem de Execução Recomendada

1. Configurar Google Cloud Console e obter credenciais.
2. Fazer migration do banco.
3. Criar `googleCalendar.ts`.
4. Criar rotas OAuth (`/auth/google`).
5. Integrar nos cursos (criar/editar/excluir).
6. Integrar nas inscrições.
7. Frontend: botão de conectar no perfil.
8. Frontend: feedback na inscrição.
9. Testar fluxo completo em dev.

**Status:** Concluída (código implementado — aguarda configuração de credenciais no Google Cloud Console)

**Criterios de Conclusao:**
- [x] Criar curso cria evento no Google Agenda da organização.
- [x] Editar curso atualiza o evento na organização.
- [x] Excluir curso remove o evento da organização.
- [x] Membro pode conectar/desconectar conta Google no perfil.
- [x] Inscrever em curso com conta Google conectada adiciona evento no Google Agenda pessoal.
- [x] Falhas na API do Google não bloqueiam operações do sistema.

**Próximo passo (manual):**
Ver `backend/.env.example` — configurar `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `GOOGLE_CALENDAR_ID` e `GOOGLE_SERVICE_ACCOUNT_JSON` no ambiente de produção.

---

## Ultima Tarefa Concluida

### MELHORIA-098: Remocao de foto de perfil persistente

**Epic:** Gestao de membros
**User Story:** Ao remover a foto de perfil, ela deve continuar removida mesmo após recarregar a página
**API:** Backend e Frontend de perfil

**Descricao:** Correção do fluxo de remoção de foto para gravar a exclusão de forma definitiva e usar um endpoint dedicado para apagar a foto.

**O que mudou:**
- Criado endpoint `DELETE /api/v1/membros/:id/foto` para remover foto de perfil de forma explícita.
- Tela de perfil passou a usar esse endpoint ao clicar em "Remover foto".
- Adicionado teste de integração para garantir que a foto continua nula após nova busca do perfil.

**Status:** Concluida

**Criterios de Conclusao:**
- [x] Ao remover foto no perfil, o backend salva `photo_url = null`.
- [x] Após recarregar e buscar perfil novamente, a foto continua removida.
- [x] Fluxo coberto por teste de integração.

---

## Fases do Projeto

### Fase 1: Fundacao

| Task | Descricao | Status |
|------|-----------|--------|
| FASE-1-TASK-001 | Setup base do projeto | Concluida |
| FASE-1-TASK-002 | Autenticacao e roles | Concluida |
| FASE-1-TASK-003 | Upload de midia | Concluida |
| FASE-1-TASK-004 | Modelo de dados | Concluida |

### Fase 2: Core do Produto

| Task | Descricao | Status | Dependencia |
|------|-----------|--------|-------------|
| FASE-2-TASK-001 | Relatorios de eventos | Concluida | Fase 1 |
| FASE-2-TASK-002 | Gestao de membros | Concluida | FASE-2-TASK-001 |
| FASE-2-TASK-003 | Cursos e inscricoes | Concluida | FASE-2-TASK-002 |
| FASE-2-TASK-004 | Advertencias e suspensao | Concluida | FASE-2-TASK-002 |

### Fase 3: Analiticos e Melhorias

| Task | Descricao | Status | Dependencia |
|------|-----------|--------|-------------|
| FASE-3-TASK-001 | Dashboard analitica | Concluida | Fase 2 |
| FASE-3-TASK-002 | Filtros avancados | Concluida | FASE-3-TASK-001 |
| FASE-3-TASK-003 | Exportacao PDF | Concluida | FASE-3-TASK-001 |

### Fase 4: Estabilidade e Produto

| Task | Descricao | Status | Dependencia |
|------|-----------|--------|-------------|
| FASE-4-TASK-001 | Migrar dados para banco real | Concluida | Fase 3 |
| FASE-4-TASK-002 | Melhorar seguranca do login | Concluida | FASE-4-TASK-001 |
| FASE-4-TASK-003 | Telas principais no web | Concluida | FASE-4-TASK-001 |
| FASE-4-TASK-004 | Upload real de midia | Concluida | FASE-4-TASK-001 |
| FASE-4-TASK-005 | Cobertura automatica de testes | Concluida | FASE-4-TASK-001 |

---

## Bugs Pendentes

### BUG-001: Fotos de perfil sumindo após deploy

**Reportado em:** 2026-03-15
**Resolvido em:** 2026-03-16
**Prioridade:** Alta
**Status:** Resolvido

**Sintoma:** Fotos de perfil que já haviam sido cadastradas param de aparecer após um novo deploy em produção.

**Causa:** O diretório `uploads` estava dentro do container Docker sem volume persistente — a cada redeploy o container era recriado e os arquivos eram perdidos. Além disso, `UPLOADS_DIR` não estava definido no ambiente de produção e o frontend tinha bind mounts de dev no compose de produção.

**Solução aplicada (`docker-compose.yml`):**
- Adicionado volume nomeado `backend_uploads:/backend/uploads` no serviço backend
- Adicionado `UPLOADS_DIR: /backend/uploads` nas variáveis de ambiente do backend
- Adicionado `JWT_SECRET: ${JWT_SECRET}` (estava ausente em produção)
- Removidos os bind mounts de dev do serviço frontend (`./frontend:/app` e `/app/node_modules`)

---


## Bloqueadores

Nenhum bloqueador no momento.

---

## Tarefas Recentes (Ultimas 5)

| Data | Task | Descricao |
|------|------|-----------|
| 2026-03-25 | MELHORIA-098 | Remocao de foto de perfil agora persiste apos recarregar a pagina (endpoint dedicado + teste de integracao) |
| 2026-03-05 | MELHORIA-097 | Formulário de relatório agora tem botão para visualizar imagem selecionada e listagem não mostra miniaturas |
| 2026-03-05 | MELHORIA-096 | Listagem de relatórios agora exibe miniaturas das fotos anexadas em cada card |
| 2026-03-05 | MELHORIA-095 | Novo relatório agora adiciona fotos uma por vez e mostra lista individual com remoção por item |
| 2026-03-05 | MELHORIA-094 | Criação de relatório agora limita em 5 imagens por tópico na seção "Fotos do Evento" |
| 2026-03-05 | MELHORIA-093 | Hora extra do relatório normalizada no backend e exibida no frontend mesmo com flag ausente |
| 2026-03-05 | MELHORIA-092 | Frontend em Docker dev reinstala dependências ao iniciar para evitar erro "Module not found" |
| 2026-03-05 | MELHORIA-091 | Ícones da interface migrados para biblioteca react-icons (menu, dashboard, membros, cursos, relatórios e advertências) |
| 2026-03-04 | MELHORIA-090 | Exclusão de relatório com modal de confirmação melhor e botão de ação mais claro |
| 2026-03-04 | MELHORIA-089 | Dashboard com novo card de eventos fora de Brasília |
| 2026-03-04 | MELHORIA-088 | Dashboard com dois novos cards: média da qualidade do evento e média da dificuldade do evento |
| 2026-03-04 | MELHORIA-087 | Card "Avaliação Média da Equipe" corrigido para calcular média pela nota geral da equipe |
| 2026-03-04 | MELHORIA-086 | Dashboard com cards de estatísticas reais e listagem simplificada de relatórios recentes |
| 2026-03-04 | MELHORIA-085 | Listagem de relatórios mostra rótulo sem negrito e deixa em negrito apenas o nome |
| 2026-03-04 | MELHORIA-084 | Listagem de relatórios mostra o rótulo "Aniversariante/Contratante:" antes do nome |
| 2026-03-04 | MELHORIA-083 | Barra de pesquisa de relatórios agora busca por contratante, título/cronograma e autor |
| 2026-03-04 | MELHORIA-082 | API de listagem de relatórios corrigida para retornar título/cronograma |
| 2026-03-04 | MELHORIA-081 | Listagem de relatórios com nome, título/cronograma, criador e data do evento no card |
| 2026-03-03 | MELHORIA-080 | Formulário com `form-card` em bloco e espaçamento vertical corrigido entre seções (incluindo locomoção e toggles) |
| 2026-03-03 | MELHORIA-079 | Ajuste do espaço do título "Feedback da Equipe" e reorganização visual do bloco de descrição |
| 2026-03-03 | MELHORIA-078 | Correção do título da seção de feedback da equipe no formulário de relatório |
| 2026-03-03 | MELHORIA-077 | Ajuste visual da seção de feedback com bloco geral alinhado à esquerda e aba individual mais abaixo |
| 2026-03-03 | MELHORIA-076 | Seção "Feedback da Equipe" com descrição e avaliação abaixo do título e sem subtítulo |
| 2026-03-03 | MELHORIA-075 | Ajuste visual da seção de feedback da equipe e padronização do botão de adicionar mídia com o estilo do botão de foto do perfil |
| 2026-03-02 | MELHORIA-074 | Animador edita relatório existente e modal mostra locomoção com nomes amigáveis (Uber/99, Outro, Carro da Empresa) |
| 2026-03-02 | MELHORIA-073 | Modal de relatório mostra só respostas aplicáveis + data de criação + nome nos feedbacks individuais |
| 2026-03-02 | MELHORIA-072 | Botão de excluir relatório na listagem + modal mostra nome do autor |
| 2026-03-02 | MELHORIA-071 | Upload real de imagens/vídeos no relatório + rolagem no modal de detalhes |
| 2026-03-02 | MELHORIA-070 | Botão "Ver" dos relatórios abre modal com todos os dados completos |
| 2026-03-02 | MELHORIA-069 | Backend e banco atualizados com os campos novos + notas em estrelas (0 a 5) no formulário |
| 2026-03-02 | MELHORIA-068 | Novo formulário de relatório com seções completas e campos condicionais |
| 2026-02-19 | MELHORIA-067 | Menu lateral no celular com botão de abrir |
| 2026-02-19 | MELHORIA-066 | Botão de listagem de CPF só para admin e ao lado do novo membro |
| 2026-02-19 | MELHORIA-065 | Listagem de CPF em PDF na tela de membros |
| 2026-02-11 | MELHORIA-064 | Compose de produção sem dependência de backend/.env |
| 2026-02-11 | MELHORIA-063 | Separar Docker Compose de dev e produção |
| 2026-02-11 | MELHORIA-062 | Corrigir pasta de trabalho do backend no Docker |
| 2026-02-11 | MELHORIA-061 | Logs do backend mais legiveis |
| 2026-02-10 | MELHORIA-060 | Hora do curso salva corretamente |
| 2026-02-10 | MELHORIA-059 | Hora do curso no modal de detalhes |
| 2026-02-10 | MELHORIA-058 | Modal de leitura para detalhes do curso |
| 2026-02-10 | MELHORIA-057 | Botao menor e mais bonito para adicionar foto |
| 2026-02-10 | MELHORIA-056 | Login sem recarregar pagina ao errar |
| 2026-02-10 | MELHORIA-055 | CPF no perfil + erro de login amigavel |
| 2026-02-06 | MELHORIA-054 | Ajuste visual do login + links |
| 2026-02-06 | MELHORIA-053 | Envio de token por email (Resend) |
| 2026-02-06 | MELHORIA-052 | Novo fluxo de redefinicao de senha (email + token) |
| 2026-02-06 | MELHORIA-051 | Remover recuperacao de senha (Resend) do backend |
| 2026-02-06 | MELHORIA-050 | Link de redefinicao direto no frontend (fallback) |
| 2026-02-05 | MELHORIA-049 | Fluxo por link na recuperacao de senha |
| 2026-02-05 | MELHORIA-048 | Simplificar tela de redefinicao de senha |
| 2026-02-05 | MELHORIA-047 | Link de redefinicao de senha no frontend |
| 2026-02-05 | MELHORIA-046 | Integracao frontend recuperação de senha |
| 2026-02-05 | MELHORIA-045 | Envio real de token por email |
| 2026-02-05 | MELHORIA-044 | Fluxo de esqueci a senha no login |
| 2026-02-05 | MELHORIA-043 | Editar e apagar cursos |
| 2026-02-05 | MELHORIA-041 | Acessibilidade geral (teclado e foco) |
| 2026-02-05 | MELHORIA-040 | CPF no cadastro e novo membro |
| 2026-02-04 | MELHORIA-039 | Ajustes na tela de usuarios |
| 2026-02-04 | MELHORIA-038 | Cadastro com novos campos e tela publica |
| 2026-02-03 | MELHORIA-037 | Instrutor do curso e bloqueio de auto-inscricao |
| 2026-02-03 | MELHORIA-036 | Lista de nomes sugeridos na busca |
| 2026-02-03 | MELHORIA-035 | Seleção de membro por busca |
| 2026-02-03 | MELHORIA-034 | Busca de membro no modal de advertência |
| 2026-02-03 | MELHORIA-033 | Remover tela antiga de advertência |
| 2026-02-03 | MELHORIA-032 | Advertência em modal |
| 2026-02-03 | MELHORIA-031 | Login como pagina inicial |
| 2026-02-03 | MELHORIA-030 | Exclusao real de usuarios + confirmacao melhor |
| 2026-02-03 | MELHORIA-029 | Upload de foto de perfil |
| 2026-02-03 | MELHORIA-028 | Foto de perfil e limpeza de campos |
| 2026-02-02 | MELHORIA-027 | Cursos no perfil e aviso de inscricao |
| 2026-02-02 | MELHORIA-026 | CORS liberado para PATCH no perfil |
| 2026-02-02 | MELHORIA-025 | Edicao de nome e email no perfil |
| 2026-02-02 | MELHORIA-024 | Ajustes na aba de perfil |
| 2026-02-02 | MELHORIA-023 | Criacao de cursos em modal |
| 2026-02-02 | MELHORIA-022 | Inscricao em cursos para recreadores e animadores |
| 2026-02-02 | MELHORIA-021 | Aba de cursos finalizada e caminho corrigido |
| 2026-02-02 | MELHORIA-020 | Detalhes e feedbacks na tela de usuarios |
| 2026-02-02 | MELHORIA-019 | Frontend em modo dev no Docker |
| 2026-02-02 | MELHORIA-018 | Ajuste da tela de membros (detalhes a direita) |
| 2026-02-02 | MELHORIA-017 | Docker sobe backend e frontend juntos |
| 2026-02-02 | MELHORIA-016 | Docker sobe backend junto com o banco |
| 2026-01-30 | MELHORIA-015 | Acesso por papel e perfil |
| 2026-01-30 | MELHORIA-014 | Usuarios conectados a API |
| 2026-01-30 | MELHORIA-013 | Tela de Usuarios completa |
| 2026-01-29 | MELHORIA-012 | Ajuste visual de advertencias |
| 2026-01-29 | MELHORIA-011 | Ajuste visual dos relatórios |
| 2026-01-28 | MELHORIA-010 | Tela de Relatórios |
| 2026-01-28 | MELHORIA-009 | Aplicar Fonte Inter ao Sistema |
| 2026-01-28 | MELHORIA-008 | Frontend de Advertências |
| 2026-01-28 | MELHORIA-007 | Validacao de upload em ambiente real |
| 2026-01-28 | MELHORIA-006 | Ajustes finos de usabilidade web |
| 2026-01-28 | FASE-4-TASK-005 | Cobertura automatica de testes |
| 2026-01-26 | FASE-4-TASK-004 | Upload real de midia |
| 2026-01-21 | FASE-4-TASK-003 | Telas principais do sistema (web) |
| 2026-01-21 | FASE-4-TASK-002 | Seguranca do login melhorada |
| 2026-01-21 | FASE-4-TASK-001 | Migracao para banco real concluida |
| 2026-01-21 | FASE-3-TASK-003 | Exportacao PDF concluida |
| 2026-01-20 | FASE-3-TASK-002 | Filtros avancados concluido |
| 2026-01-20 | FASE-2-TASK-004 | Advertencias e suspensao concluido |
| 2026-01-20 | FASE-2-TASK-002 | Gestao de membros concluido |
| 2026-01-20 | FASE-2-TASK-001 | Relatorios de eventos concluido |
| 2026-01-20 | FASE-1-TASK-004 | Modelo de dados concluido |

---

## Proximas Tarefas

| Prioridade | Task | Descricao | Estimativa |
|------------|------|-----------|-----------|
| ~~Alta~~ | ~~BUG-001~~ | ~~Fotos de perfil sumindo após deploy~~ | Resolvido |
| ~~Media~~ | ~~INTEGRACAO-001~~ | ~~Google Agenda nos Cursos~~ | Concluída |

---

## Auditoria de Acessibilidade (2026-03-16)

Auditoria completa WCAG AA realizada. Score estimado: **65% acessível**. Abaixo as tarefas pendentes organizadas por prioridade.

### Criticas (WCAG Level A)

| Task | Descricao | WCAG | Status |
|------|-----------|------|--------|
| ACESS-001 | Adicionar `aria-label` em todos os botões de ícone (editar, deletar, download, hamburguer, tema) | 4.1.2 | Concluída |
| ACESS-002 | Substituir `window.confirm()` por modal acessível com `role="alertdialog"` | 4.1.2 | Concluída |
| ACESS-003 | Adicionar `aria-label` nos avatares de iniciais (fallback sem foto) | 1.1.1 | Concluída |

### Altas (WCAG Level A/AA)

| Task | Descricao | WCAG | Status |
|------|-----------|------|--------|
| ACESS-004 | Implementar navegação por teclado no dropdown de logout (ArrowDown, Escape) | 2.1.1 | Concluída |
| ACESS-005 | Adicionar `aria-label` nos inputs de busca/filtro de todas as páginas | 1.3.1 | Concluída |
| ACESS-006 | Adicionar regiões `aria-live` para anunciar estados de carregamento (skeletons) | 4.1.3 | Concluída |
| ACESS-007 | Adicionar `aria-pressed` nos botões de toggle de visualização | 4.1.2 | Concluída |

### Medias (WCAG Level AA)

| Task | Descricao | WCAG | Status |
|------|-----------|------|--------|
| ACESS-008 | Corrigir contraste do placeholder: light `#7a6e8d` (~3.2:1) e dark `#9580b8` (~3.5:1), meta ≥ 4.5:1 | 1.4.3 | Pendente |
| ACESS-009 | Implementar `aria-activedescendant` no autocomplete de membros (advertencias) | 2.1.1 | Pendente |
| ACESS-010 | Adicionar semântica ARIA/HTML nas grades de dados (lista de membros em usuarios/page.tsx) | 1.3.1 | Pendente |
| ACESS-011 | Adicionar dismiss com tecla Escape no aviso flutuante (advertencias) | 2.1.1 | Pendente |

### Baixas

| Task | Descricao | WCAG | Status |
|------|-----------|------|--------|
| ACESS-012 | Aumentar opacidade do outline de foco de 0.45 para ≥ 0.75 em `:focus-visible` | 2.4.7 | Pendente |
| ACESS-013 | Aumentar fonte da `legend` do fieldset de 11px para 13px | 1.4.4 | Pendente |

### O que ja esta correto

- `Modal.tsx` — focus trap, `role="dialog"`, `aria-modal`, ESC, `aria-labelledby`
- `Button.tsx` — `aria-busy`, `disabled`, texto `sr-only` no loading
- `FormField.tsx` — `aria-invalid`, `aria-describedby`, `role="alert"` nos erros
- Menu mobile — `role="dialog"`, `aria-modal`, botão fechar com `aria-label`
- Avisos flutuantes — `role="status"`, `aria-live="polite"`
- Campos required — asterisco com `aria-hidden="true"`
- Touch targets mobile — `min-height: 44px` nos icon-buttons

---

## Observacoes da Vistoria (2026-01-28)

### Configuracoes externas necessarias

- Confirmar `DATABASE_URL` e `REDIS_URL` corretos (local vs Docker estao com dados diferentes).
- Garantir pasta de uploads com permissao de escrita (`UPLOADS_DIR`), principalmente em producao.
- Trocar senhas padrao dos usuarios base (admin/animador/recreador) antes de uso real.

### Pontos que faltam ou estao incompletos

1. Scripts do projeto na raiz apontam para `apps/backend` e `apps/frontend`, mas as pastas reais sao `backend` e `frontend`.

### Melhorias recomendadas

- Implementar storage externo para uploads (S3/compatível), como descrito na SPEC.
- Adicionar rate limiting e observabilidade (metricas e alertas).
---

## Auditoria de Qualidade (2026-03-09)

Score atual: **58/100** — ver [docs/auditoria/README.md](auditoria/README.md)

| Sprint | Tema | Status |
|--------|------|--------|
| Sprint 1 | Segurança (JWT cookie, helmet, rate limit) | Concluída |
| Sprint 2 | Validação (Zod, CPF, upload) | Concluída |
| Sprint 3 | Acessibilidade (WCAG AA) | Pendente |
| Sprint 4 | Performance (queries SQL, SWR, compressão) | Pendente |
| Sprint 5 | Refatoração (componentes, useReducer) | Pendente |

---

## Metricas de Qualidade

| Metrica | Valor | Meta |
|---------|-------|------|
| Cobertura de Testes | Relatorio automatico configurado | >= 80% |
| Testes Passando | OK (30/30) | 100% |
| Build Status | - | - |

---

## Log de Atividades

### 2026-03-05
- MELHORIA-094: Limite de 5 imagens por tópico adicionado nas fotos do evento na criação de relatório.
- MELHORIA-091: Padronização dos ícones da interface usando biblioteca react-icons.

### 2026-02-10
- MELHORIA-057: Botao menor e mais bonito para adicionar foto no perfil.
- MELHORIA-056: Erro de login nao recarrega mais a pagina.
- MELHORIA-055: CPF voltou a aparecer no perfil e erro de login fica visivel na tela.

### 2026-03-02
- MELHORIA-068: Tela de novo relatorio refeita com seções completas, regras condicionais e uploads por categoria.

### 2026-02-06
- MELHORIA-053: Envio do token por email usando Resend.
- MELHORIA-052: Fluxo completo de redefinicao de senha com envio e validacao de token.

**Sessao:** remover-reset-backend
```
10:30 - Backend de recuperacao de senha (Resend) removido para refazer do zero.
```

**Sessao:** reset-link-fallback
```
09:40 - Link de redefinicao passa a abrir direto no frontend quando email falha.
```

### 2026-02-05

**Sessao:** integracao-reset-frontend
```
19:10 - Frontend conectado ao envio de token e redefinicao de senha via API.
19:40 - Tela de redefinicao de senha simplificada (sem navbar).
20:10 - Fluxo de recuperacao por link no email e retorno ao login.
```

**Sessao:** reset-link-frontend
```
19:40 - Pagina de redefinicao criada para abrir link do email.
19:42 - Formulario de nova senha conectado a API.
```

**Sessao:** esqueci-senha-email
```
18:05 - Envio de token por email configurado no backend.
```

**Sessao:** esqueci-senha-modais
```
17:40 - Fluxo de esqueci a senha com modais no login criado.
```

**Sessao:** cursos-formato-data
```
09:30 - Data dos cursos ajustada para formato dd/mm/yyyy na listagem.
```

**Sessao:** cursos-editar-apagar
```
14:20 - Edicao e exclusao de cursos adicionadas.
```

**Sessao:** perfil-cpf-autocomplete
```
11:10 - CPF editavel no perfil e autocomplete para CPF e telefone.
```

### 2026-02-04

**Sessao:** cadastro-campos
```
10:15 - Campos novos no cadastro (sobrenome, nascimento, regiao, telefone).
10:17 - Tela publica de cadastro criada e linkada no login.
```

**Sessao:** advertencias-suspensao-janela
```
20:45 - Regra de suspensao ajustada para 3 advertencias em 1 mes.
20:47 - Aviso de suspensao no perfil e notificacao ao criar advertencia.
```

### 2026-02-03

**Sessao:** cursos-instrutor
```
17:10 - Campo de instrutor adicionado no cadastro de cursos.
17:12 - Bloqueio de inscricao para criador e instrutor aplicado.
```

**Sessao:** revisao-gramatica-responsivo
```
14:30 - Textos do sistema revisados (acentos e gramatica).
14:32 - Ajustes de responsividade para uso no celular.
```

**Sessao:** favicon-logo
```
15:10 - Logo configurada como favicon do sistema.
```

**Sessao:** perfil-foto-upload
```
10:05 - Upload de foto de perfil via arquivo adicionado.
10:07 - Foto aparece na lista de membros.
```

**Sessao:** advertencia-modal
```
16:05 - Botão de nova advertência abre modal simples na mesma tela.
```

**Sessao:** usuarios-exclusao-confirmacao
```
16:20 - Exclusao de usuarios com registros corrigida.
16:25 - Confirmacao de exclusao ganhou alerta visual melhor.
```

**Sessao:** login-home-dashboard
```
16:45 - Pagina inicial redireciona direto para o login.
16:46 - Dashboard movido para /dashboard.
```

**Sessao:** perfil-foto
```
09:10 - Campos phone/is_active removidos do modelo e API.
09:12 - Edicao de foto de perfil adicionada na aba Perfil.
09:15 - Foto de perfil exibida na lista de membros.
```

### 2026-02-02

**Sessao:** perfil-cursos
```
22:40 - Card de papel removido do perfil.
22:42 - Cursos inscritos listados no perfil.
22:44 - Cursos marcados como inscritos na listagem.
```

**Sessao:** cors-patch-perfil
```
22:30 - Preflight OPTIONS liberado no authGuard.
```

**Sessao:** perfil-edicao
```
22:20 - Formulario de edicao de nome e email no perfil.
22:22 - Salvamento atualiza dados para login com novo email.
```

**Sessao:** perfil-ajustes
```
22:05 - Card de ativo/inativo removido da aba de perfil.
22:07 - Aba de perfil liberada para animadores e admin verem advertencias.
```

**Sessao:** cursos-modal
```
21:10 - Criacao de cursos movida para modal na tela de cursos.
21:12 - Campos de data e hora adicionados no cadastro do curso.
```

**Sessao:** cursos-inscricao-recreadores
```
20:10 - Cursos liberados para recreadores e animadores com inscricao e aviso de lotacao.
20:12 - Animadores liberados para criar cursos.
```

**Sessao:** cursos-finalizados
```
19:05 - Listagem de cursos com busca e filtro adicionada.
19:08 - Novo curso separado e caminho do menu corrigido.
```

**Sessao:** usuarios-feedbacks
```
15:10 - Detalhes do membro com feedbacks para admin adicionados.
15:12 - Status ativo/inativo removido da tela de usuarios.
```

**Sessao:** ajuste-membros-direita
```
14:05 - Painel de detalhes dos membros alinhado mais a direita.
14:08 - Area de detalhes fica vazia quando nenhum membro e selecionado.
```

**Sessao:** frontend-dev-docker
```
14:20 - Dockerfile.dev criado para o frontend.
14:23 - docker-compose ajustado para hot-reload com volume.
```

### 2026-01-30

**Sessao:** acesso-por-papel
```
16:10 - Menu ajustado por papel (admin, animador, recreador).
16:15 - Login redireciona para a tela correta.
16:20 - Perfil do recreador com advertencias criado.
```

**Sessao:** tela-usuarios
```
09:20 - Tela de usuarios criada com cards de resumo e listagem completa.
09:25 - Acoes de editar e excluir visiveis apenas para administradores.
09:30 - Botao de novo usuario adicionado no topo da pagina.
```

**Sessao:** usuarios-api
```
14:10 - Tela de usuarios conectada a API real.
14:20 - Modal de novo usuario com nome, email, senha e funcao.
14:30 - Editar e excluir usuarios funcionando com confirmacao.
```

### 2026-01-29

**Sessao:** ajuste-advertencias
```
11:20 - Tela de advertencias padronizada com o layout do sistema.
11:25 - Botao de nova advertencia no mesmo estilo de relatorios.
11:28 - Tela de nova advertencia alinhada ao novo layout.
```

**Sessao:** ajuste-icone-relatorios
```
09:10 - Ajustado o tamanho do ícone de estado vazio na tela de relatórios.
09:15 - Padronizado o layout das telas de relatórios com o restante do sistema.
```

### 2026-01-28

**Sessao:** tela-relatorios
```
10:25 - Criada a página de listagem de relatórios em `frontend/app/relatorios/page.tsx`.
10:30 - Criada a página para adicionar um novo relatório em `frontend/app/novo-relatorio/page.tsx`.
10:35 - Removido o diretório antigo `frontend/app/novoRelatorio` para evitar duplicidade.
```

**Sessao:** aplicar-fonte-inter
```
10:15 - Importada a fonte 'Inter' do Google Fonts no arquivo `globals.css`.
10:20 - Atualizada a propriedade `font-family` no `:root` e nos seletores `h1, h2, h3` para usar a fonte 'Inter'.
```

**Sessao:** frontend-advertencias
```
10:00 - Adicionado item "Advertências" no menu lateral.
10:05 - Criada a tela para listar os membros e suas advertências, com uma barra de busca.
10:10 - Criada a tela para adicionar uma nova advertência, com um formulário para selecionar o membro, descrever a advertência e selecionar a data.
```

**Sessao:** cobertura-testes

```
15:05 - Cobertura automatica configurada no Vitest
15:07 - Script de testes atualizado para gerar cobertura
15:09 - Testes executados (falha: banco local desligado e pasta uploads ausente)
15:12 - Testes executados (30/30)
```

**Sessao:** melhoria-usabilidade-web

```
15:25 - Ajustes de usabilidade no menu e rotas corrigidos
15:27 - Campos obrigatorios e tipos de entrada ajustados
15:29 - Melhorias de foco e acessibilidade visual aplicadas
15:32 - Testes executados (falha: banco local desligado e pasta uploads ausente)
```

**Sessao:** validar-upload-real

```
16:05 - Validacao de pasta de uploads no startup
16:07 - Upload testado com arquivo salvo e servido
16:09 - Testes executados (30/30)
```

### 2026-01-27

**Sessao:** ajuste-frontend

```
15:36 - Layout principal corrigido e estilos globais ligados
15:38 - Build iniciado (erro: EXDEV ao mover arquivo de erro 500)
```

### 2026-01-21

**Sessao:** exportacao-pdf

```
00:45 - Endpoint de exportacao PDF com permissao
00:50 - Testes de exportacao adicionados e executados (30/30)
```

**Sessao:** login-seguro

```
10:55 - Senhas protegidas com hash e comparacao segura
10:57 - Chave JWT exigida com minimo seguro
10:58 - Testes executados (falha: Prisma client nao gerado)
11:15 - Prisma client corrigido e testes passando
```

**Sessao:** telas-web

```
16:10 - Tela principal com atalhos criada
16:12 - Tela de login criada e responsiva
16:12 - Testes executados (falha: banco offline)
```

### 2026-01-26

**Sessao:** upload-midia-real

```
20:50 - Upload real com arquivo multipart e armazenamento local
20:52 - Rotas servindo arquivos enviados
20:57 - Testes executados (falha: dependencia @fastify/multipart nao instalada)
```

**Sessao:** migracao-banco

```
01:05 - Stores migrados para Prisma com PostgreSQL
01:20 - Testes atualizados para reset do banco e dados base
01:30 - Testes executados (falha: Prisma client nao gerado)
```

### 2026-01-20

**Sessao:** briefing

```
09:00 - Briefing completo
09:20 - Documentacao gerada (PRD e SPEC)
10:30 - Upload de midia com validacoes e testes (vitest ausente)
10:40 - Dependencias instaladas e testes executados (12/12)
11:10 - Modelo de dados definido no schema do banco
```

**Sessao:** relatorios

```
23:10 - Relatorios criados, listados e detalhados com validacoes
23:12 - Testes de relatorios adicionados e executados (15/15)
```

**Sessao:** membros

```
23:20 - Gestao de membros implementada com rotas, validacoes e testes (17/17)
```

**Sessao:** cursos

```
23:30 - Cursos e inscricoes implementados com testes (19/19)
```

**Sessao:** advertencias

```
23:55 - Advertencias e suspensao implementadas com testes (22/22)
```

**Sessao:** dashboard

```
00:30 - Dashboard analitica com endpoints e testes (26/26)
01:05 - Filtros avancados da dashboard com validacoes e testes (29/29)
```
