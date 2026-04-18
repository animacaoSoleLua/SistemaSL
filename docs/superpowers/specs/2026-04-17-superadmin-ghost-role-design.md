# Design: Role superAdmin (Ghost Admin)

**Data:** 2026-04-17

## Objetivo

Criar um papel `superAdmin` com acesso idêntico ao `admin`, mas completamente invisível para o sistema: não aparece na listagem de membros, não é contado nas estatísticas, e não pode ser criado pela UI — apenas via seed.

## Schema / Banco de Dados

- Adiciona `superAdmin` ao enum `UserRole` no Prisma (`schema.prisma`)
- Nova migration SQL:
  ```sql
  ALTER TYPE "UserRole" ADD VALUE 'superAdmin';
  ```
- Nenhum campo novo no modelo `User`

## Backend

### `src/auth/store.ts`
- `Role` type passa a ser `"admin" | "animador" | "recreador" | "superAdmin"`
- `listUsers()` permanece retornando todos os usuários (sem filtro aqui — o filtro fica nas rotas)

### `src/auth/guard.ts`
- Adiciona função auxiliar `isAdminLike(role: Role): boolean` que retorna `true` para `"admin"` e `"superAdmin"`
- `requireRole(["admin"])` em todas as rotas é substituído por `requireRole(["admin", "superAdmin"])` — ou alternativamente, as rotas passam a chamar `requireRole(["admin", "superAdmin"])`

### `src/membros/routes.ts`
- `GET /api/v1/membros`: filtra `superAdmin` antes de retornar a lista
- Checks `request.user.role !== "admin"` passam a checar `!isAdminLike(request.user.role)`
- Formulário de criação (`CreateMemberSchema`): o enum de roles permitidos permanece `["admin", "animador", "recreador"]` — `superAdmin` nunca é criável via API de membros

### `src/dashboard/routes.ts`
- Todas as rotas com `requireRole(["admin"])` passam a usar `requireRole(["admin", "superAdmin"])`

### Seed (`src/db/seed.ts` ou script separado)
- Cria o usuário `superAdmin` diretamente via Prisma com `role: "superAdmin"`
- Pode ser um script `.mjs` separado para criação pontual

## Frontend

### `lib/auth.ts`
- `Role` type inclui `"superAdmin"`
- `roleLabels` adiciona `superAdmin: "Super Admin"`
- `getDefaultRoute`: `superAdmin` redireciona para `/dashboard`
- `isAdmin` helper (se criado): retorna `true` para ambos `"admin"` e `"superAdmin"`

### `app/usuarios/page.tsx`
- `loadMembers`: a API já filtra `superAdmin`, então nenhuma mudança necessária aqui
- `isAdmin`: `currentUser?.role === "admin"` passa a checar `currentUser?.role === "admin" || currentUser?.role === "superAdmin"`
- Formulário de criação: `<select>` de função não inclui `superAdmin` como opção

## Invariantes

- `superAdmin` nunca aparece em nenhuma listagem de membros (filtrado no backend)
- `superAdmin` não pode ser criado via `POST /api/v1/membros`
- `superAdmin` tem acesso a todas as rotas protegidas por `requireRole(["admin"])`
- `superAdmin` só pode ser criado via seed/script direto no banco

## Arquivos Alterados

| Arquivo | Mudança |
|---|---|
| `backend/prisma/schema.prisma` | Adiciona `superAdmin` ao enum `UserRole` |
| `backend/prisma/migrations/...` | Nova migration SQL |
| `backend/src/auth/store.ts` | Atualiza tipo `Role` |
| `backend/src/auth/guard.ts` | `requireRole` aceita `superAdmin` nas rotas admin |
| `backend/src/membros/routes.ts` | Filtra `superAdmin` da listagem, atualiza checks `isAdmin` |
| `backend/src/dashboard/routes.ts` | Atualiza `requireRole` |
| `backend/src/db/seed.ts` | Cria usuário `superAdmin` de exemplo |
| `frontend/lib/auth.ts` | Adiciona `superAdmin` ao tipo e labels |
| `frontend/app/usuarios/page.tsx` | Atualiza check `isAdmin`, remove `superAdmin` do select |
