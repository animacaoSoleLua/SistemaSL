# Aba de Feedbacks Individuais no Detalhe de Membro

**Data:** 2026-04-17  
**Status:** Aprovado

## Contexto

No modal de detalhes de membro (visível apenas para admin), existem abas: Dados, Feedbacks, Cursos, Advertências.

A aba "Feedbacks" atual exibe contagem de feedbacks de clientes (`ClientFeedback` — positivos/negativos). O backend já retorna `feedbacks` (modelo `ReportFeedback`) junto com os detalhes do membro via `GET /api/v1/membros/:id`, mas esses feedbacks individuais de relatórios não são exibidos em nenhuma aba.

O objetivo é:
1. Renomear a aba "Feedbacks" existente para **"Clientes"**
2. Adicionar nova aba **"Feedbacks"** que exibe os feedbacks individuais vindos de relatórios, com texto, data do evento e nome do animador que deu o feedback

## Mudanças no Backend

### `backend/src/relatorios/store.ts`

- Adicionar campo `authorName: string` em `MemberFeedbackRecord`
- Em `listFeedbacksForMember`, incluir o autor do relatório no `include`:
  ```ts
  include: { report: { include: { author: { select: { name: true, lastName: true } } } } }
  ```
- Mapear `authorName` a partir de `entry.report.author`

### `backend/src/membros/routes.ts`

- Adicionar `author_name: entry.authorName` no mapeamento do campo `feedbacks` na resposta de `GET /api/v1/membros/:id`

## Mudanças no Frontend

### `frontend/app/usuarios/page.tsx`

**Tipos:**
- Adicionar `author_name: string` em `MemberFeedback`

**Estado:**
- Tipo de `detailsTab` muda de `"dados" | "cursos" | "advertencias" | "feedbacks"` para `"dados" | "cursos" | "advertencias" | "clientes" | "feedbacks"`
- Referências a `detailsTab === "feedbacks"` (aba de clientes) atualizadas para `"clientes"`

**Tabs:**
- Aba `"feedbacks"` renomeada para `"clientes"` com label "Clientes"
- Nova aba `"feedbacks"` com label "Feedbacks" e contador com `selectedMemberDetails.feedbacks.length`

**Renderização da nova aba:**
- Condição: `isAdmin && detailsTab === "feedbacks"`
- Lista `selectedMemberDetails.feedbacks` usando os mesmos estilos de `member-section-list` / `member-section-item`
- Cada item exibe: texto do feedback, data do evento formatada em BR, nome do animador (`author_name`)
- Estado vazio: "Nenhum feedback individual registrado."
- Estado de carregamento: reutiliza `detailsLoading` (feedbacks chegam junto com o `getMember`)

## O que não muda

- Nenhuma nova chamada de API no frontend — os dados chegam no `getMember` existente
- Nenhuma migração de banco — `ReportFeedback` já existe
- O modelo `ClientFeedback` e sua contagem permanecem intactos na aba "Clientes"
