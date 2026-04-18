# superAdmin Ghost Role — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar o papel `superAdmin` com acesso idêntico ao `admin`, mas completamente invisível — não aparece na listagem de membros, não é contado nas estatísticas, e só pode ser criado via seed.

**Architecture:** Adiciona `superAdmin` ao enum `UserRole` do Prisma + migration. O backend exporta um helper `isAdminLike(role)` que substitui todos os checks `role === "admin"` inline e é adicionado a todos os `requireRole(["admin"])`. O frontend filtra `superAdmin` das contagens e da lista.

**Tech Stack:** Node.js, Fastify, Prisma (PostgreSQL), TypeScript, Next.js (React), Vitest (testes)

---

## Mapa de Arquivos

| Arquivo | Ação |
|---|---|
| `backend/prisma/schema.prisma` | Adiciona `superAdmin` ao enum `UserRole` |
| `backend/prisma/migrations/20260417120000_add_super_admin_role/migration.sql` | Cria migration |
| `backend/src/auth/store.ts` | Atualiza tipo `Role` |
| `backend/src/auth/guard.ts` | Exporta `isAdminLike`, atualiza `requireRole` calls |
| `backend/src/membros/routes.ts` | Filtra `superAdmin` da listagem, atualiza checks inline |
| `backend/src/relatorios/routes.ts` | Atualiza checks `role !== "admin"` |
| `backend/src/cursos/routes.ts` | Atualiza checks `role !== "admin"` |
| `backend/src/advertencias/routes.ts` | Atualiza checks `role !== "admin"` |
| `backend/src/dashboard/routes.ts` | Atualiza `requireRole` |
| `backend/src/feedbacks/routes.ts` | Atualiza `requireRole` |
| `backend/src/app.ts` | Atualiza `requireRole` |
| `backend/src/db/seed.ts` | Adiciona usuário `superAdmin` |
| `frontend/lib/auth.ts` | Adiciona `superAdmin` ao tipo `Role`, `roleLabels`, `getDefaultRoute` |
| `frontend/app/usuarios/page.tsx` | Atualiza `isAdmin`, filtra `superAdmin` das contagens e lista |
| `frontend/app/feedbacks/page.tsx` | Adiciona label para `superAdmin` |
| `backend/test/super-admin.integration.test.ts` | Cria (novo) — testa acesso e invisibilidade |

---

### Task 1: Prisma schema + migration

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/20260417120000_add_super_admin_role/migration.sql`

- [ ] **Step 1: Atualizar schema.prisma**

Em `backend/prisma/schema.prisma`, alterar o enum `UserRole`:

```prisma
enum UserRole {
  admin
  animador
  recreador
  superAdmin
}
```

- [ ] **Step 2: Criar diretório e arquivo de migration**

```bash
mkdir -p "backend/prisma/migrations/20260417120000_add_super_admin_role"
```

Criar o arquivo `backend/prisma/migrations/20260417120000_add_super_admin_role/migration.sql` com conteúdo:

```sql
ALTER TYPE "UserRole" ADD VALUE 'superAdmin';
```

- [ ] **Step 3: Aplicar a migration**

```bash
cd backend && npx prisma migrate deploy
```

Expected output: `1 migration applied.`

Se estiver em ambiente de desenvolvimento, usar:
```bash
cd backend && npx prisma migrate dev --name add_super_admin_role
```

- [ ] **Step 4: Regenerar o Prisma Client**

```bash
cd backend && npx prisma generate
```

Expected output: `✔ Generated Prisma Client`

- [ ] **Step 5: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/20260417120000_add_super_admin_role/
git commit -m "feat: add superAdmin value to UserRole enum"
```

---

### Task 2: Backend — Role type + helper `isAdminLike`

**Files:**
- Modify: `backend/src/auth/store.ts`
- Modify: `backend/src/auth/guard.ts`

- [ ] **Step 1: Atualizar tipo `Role` em `store.ts`**

Em `backend/src/auth/store.ts`, linha 5, alterar:

```typescript
// antes
export type Role = "admin" | "animador" | "recreador";

// depois
export type Role = "admin" | "animador" | "recreador" | "superAdmin";
```

- [ ] **Step 2: Adicionar helper `isAdminLike` em `guard.ts`**

Em `backend/src/auth/guard.ts`, adicionar após os imports (antes da função `getPath`):

```typescript
export function isAdminLike(role: Role): boolean {
  return role === "admin" || role === "superAdmin";
}
```

- [ ] **Step 3: Verificar que TypeScript compila**

```bash
cd backend && npx tsc --noEmit
```

Expected output: sem erros.

- [ ] **Step 4: Commit**

```bash
git add backend/src/auth/store.ts backend/src/auth/guard.ts
git commit -m "feat: add superAdmin to Role type and isAdminLike helper"
```

---

### Task 3: Atualizar todos os `requireRole(["admin"])` no backend

**Files:**
- Modify: `backend/src/dashboard/routes.ts`
- Modify: `backend/src/feedbacks/routes.ts`
- Modify: `backend/src/advertencias/routes.ts`
- Modify: `backend/src/membros/routes.ts`
- Modify: `backend/src/app.ts`

Todos os `requireRole(["admin"])` passam a ser `requireRole(["admin", "superAdmin"])`.

- [ ] **Step 1: Atualizar `dashboard/routes.ts` (3 ocorrências)**

Substituir todas as ocorrências de `requireRole(["admin"])` por `requireRole(["admin", "superAdmin"])` nas 3 rotas do arquivo (linhas 61, 95, 130).

- [ ] **Step 2: Atualizar `feedbacks/routes.ts` (4 ocorrências)**

Substituir todas as ocorrências de `requireRole(["admin"])` por `requireRole(["admin", "superAdmin"])` (linhas 35, 99, 282, 320).

- [ ] **Step 3: Atualizar `advertencias/routes.ts` (1 ocorrência)**

Substituir a ocorrência de `requireRole(["admin"])` por `requireRole(["admin", "superAdmin"])` (linha 231).

- [ ] **Step 4: Atualizar `membros/routes.ts` (2 ocorrências)**

Substituir as ocorrências de `requireRole(["admin"])` por `requireRole(["admin", "superAdmin"])` (linhas 274, 796 — POST /membros e DELETE /membros/:id).

- [ ] **Step 5: Atualizar `app.ts` (1 ocorrência)**

Substituir `requireRole(["admin"])` por `requireRole(["admin", "superAdmin"])` (linha 168 — admin ping route).

- [ ] **Step 6: Verificar compilação**

```bash
cd backend && npx tsc --noEmit
```

Expected output: sem erros.

- [ ] **Step 7: Commit**

```bash
git add backend/src/dashboard/routes.ts backend/src/feedbacks/routes.ts backend/src/advertencias/routes.ts backend/src/membros/routes.ts backend/src/app.ts
git commit -m "feat: allow superAdmin in all admin-only requireRole guards"
```

---

### Task 4: Atualizar checks inline `role === "admin"` em todas as rotas

**Files:**
- Modify: `backend/src/membros/routes.ts`
- Modify: `backend/src/relatorios/routes.ts`
- Modify: `backend/src/cursos/routes.ts`
- Modify: `backend/src/advertencias/routes.ts`

Cada arquivo precisa importar `isAdminLike` de `"../auth/guard.js"` e usar o helper nos checks inline.

- [ ] **Step 1: Atualizar `membros/routes.ts` — importar `isAdminLike`**

Adicionar `isAdminLike` ao import existente de `guard.js`:

```typescript
import { requireRole, isAdminLike } from "../auth/guard.js";
```

- [ ] **Step 2: Atualizar `membros/routes.ts` — 4 checks inline**

Linha 383 — verificação de acesso ao GET /membros/:id:
```typescript
// antes
if (request.user.role !== "admin" && request.user.id !== member.id) {
// depois
if (!isAdminLike(request.user.role) && request.user.id !== member.id) {
```

Linha 409 — carregamento de feedbacks no GET /membros/:id:
```typescript
// antes
request.user.role === "admin"
  ? await listFeedbacksForMember(member.id)
  : [];
// depois
isAdminLike(request.user.role)
  ? await listFeedbacksForMember(member.id)
  : [];
```

Linha 526 — check isAdmin no PATCH /membros/:id:
```typescript
// antes
const isAdmin = request.user.role === "admin";
// depois
const isAdmin = isAdminLike(request.user.role);
```

Linha 666 — verificação de acesso ao POST /membros/:id/foto:
```typescript
// antes
if (request.user.role !== "admin" && request.user.id !== member.id) {
// depois
if (!isAdminLike(request.user.role) && request.user.id !== member.id) {
```

Linha 769 — verificação de acesso ao DELETE /membros/:id/foto:
```typescript
// antes
if (request.user.role !== "admin" && request.user.id !== member.id) {
// depois
if (!isAdminLike(request.user.role) && request.user.id !== member.id) {
```

- [ ] **Step 3: Atualizar `relatorios/routes.ts` — importar `isAdminLike`**

Adicionar `isAdminLike` ao import de `guard.js`:

```typescript
import { requireRole, isAdminLike } from "../auth/guard.js";
```

- [ ] **Step 4: Atualizar `relatorios/routes.ts` — 6 checks inline**

Linha 294 (GET /relatorios — filtro por autor):
```typescript
// antes
if (request.user.role !== "admin") {
// depois
if (!isAdminLike(request.user.role)) {
```

Linhas 554, 630, 805, 849, 913 (DELETE, PATCH e outros — acesso a relatório de terceiros):
```typescript
// antes
if (request.user.role !== "admin" && request.user.id !== report.authorId) {
// depois
if (!isAdminLike(request.user.role) && request.user.id !== report.authorId) {
```

- [ ] **Step 5: Atualizar `cursos/routes.ts` — importar `isAdminLike`**

Adicionar `isAdminLike` ao import de `guard.js`:

```typescript
import { requireRole, isAdminLike } from "../auth/guard.js";
```

- [ ] **Step 6: Atualizar `cursos/routes.ts` — 6 checks inline**

Linha 313 (PATCH /cursos/:id — acesso a curso de terceiro):
```typescript
// antes
if (request.user.role !== "admin" && course.createdBy !== request.user.id) {
// depois
if (!isAdminLike(request.user.role) && course.createdBy !== request.user.id) {
```

Linha 416 (DELETE /cursos/:id):
```typescript
// antes
if (request.user.role !== "admin" && course.createdBy !== request.user.id) {
// depois
if (!isAdminLike(request.user.role) && course.createdBy !== request.user.id) {
```

Linhas 551–553 (GET /cursos/:id — isAdminOrInstructor):
```typescript
// antes
const isAdminOrInstructor =
  request.user.role === "admin" ||
  request.user.id === course.instructorId;
// depois
const isAdminOrInstructor =
  isAdminLike(request.user.role) ||
  request.user.id === course.instructorId;
```

Linha 672 (POST /cursos/:id/inscricoes — enroll outro membro):
```typescript
// antes
if (request.user.role !== "admin" && request.user.id !== member_id) {
// depois
if (!isAdminLike(request.user.role) && request.user.id !== member_id) {
```

Linhas 778–780 (PATCH /cursos/:id/inscricoes/:enrollId — atualizar status):
```typescript
// antes
if (
  request.user.role !== "admin" &&
  request.user.id !== course.instructorId
) {
// depois
if (
  !isAdminLike(request.user.role) &&
  request.user.id !== course.instructorId
) {
```

Linhas 848–851 (DELETE /cursos/:id/inscricoes/:enrollId):
```typescript
// antes
if (
  request.user.role !== "admin" &&
  request.user.id !== enrollment.memberId
) {
// depois
if (
  !isAdminLike(request.user.role) &&
  request.user.id !== enrollment.memberId
) {
```

Linhas 923–926 (POST /cursos/:id/finalizar):
```typescript
// antes
if (
  request.user.role !== "admin" &&
  request.user.id !== course.instructorId
) {
// depois
if (
  !isAdminLike(request.user.role) &&
  request.user.id !== course.instructorId
) {
```

- [ ] **Step 7: Atualizar `advertencias/routes.ts` — importar `isAdminLike`**

Adicionar `isAdminLike` ao import de `guard.js`:

```typescript
import { requireRole, isAdminLike } from "../auth/guard.js";
```

- [ ] **Step 8: Atualizar `advertencias/routes.ts` — 2 checks inline**

Linha 108 (GET /advertencias — isAdmin):
```typescript
// antes
const isAdmin = request.user.role === "admin";
// depois
const isAdmin = isAdminLike(request.user.role);
```

Linha 278 (DELETE /advertencias/:id — acesso a advertência de terceiro):
```typescript
// antes
if (request.user?.role !== "admin" && existing.createdBy !== request.user?.id) {
// depois
if (!isAdminLike(request.user?.role as Role) && existing.createdBy !== request.user?.id) {
```

- [ ] **Step 9: Verificar compilação**

```bash
cd backend && npx tsc --noEmit
```

Expected output: sem erros.

- [ ] **Step 10: Commit**

```bash
git add backend/src/membros/routes.ts backend/src/relatorios/routes.ts backend/src/cursos/routes.ts backend/src/advertencias/routes.ts
git commit -m "feat: replace inline admin role checks with isAdminLike helper"
```

---

### Task 5: Filtrar `superAdmin` da listagem de membros

**Files:**
- Modify: `backend/src/membros/routes.ts`

O endpoint `GET /api/v1/membros` retorna todos os usuários. `superAdmin` deve ser excluído antes de qualquer filtragem.

- [ ] **Step 1: Escrever o teste de invisibilidade (falhar primeiro)**

Criar `backend/test/super-admin.integration.test.ts`:

```typescript
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildServer } from "../src/app.js";
import { prisma } from "../src/db/prisma.js";
import { hashPassword } from "../src/auth/password.js";
import { disconnectDatabase, resetDatabase, testAdmin } from "./helpers/db.js";

describe("superAdmin (integration)", () => {
  const app = buildServer();

  beforeAll(async () => {
    await app.ready();
  });

  beforeEach(async () => {
    await resetDatabase();
    // Cria um usuário superAdmin para os testes
    await prisma.user.create({
      data: {
        id: "99999999-9999-0000-9999-999999999999",
        name: "Ghost",
        lastName: "Admin",
        email: "ghost@sol-e-lua.com",
        passwordHash: hashPassword("Senha123"),
        role: "superAdmin",
      },
    });
  });

  afterAll(async () => {
    await app.close();
    await disconnectDatabase();
  });

  it("superAdmin can login", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "ghost@sol-e-lua.com", password: "Senha123" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.user.role).toBe("superAdmin");
  });

  it("superAdmin can access admin-only dashboard route", async () => {
    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "ghost@sol-e-lua.com", password: "Senha123" },
    });
    const token = login.json().data.access_token as string;

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/dashboard/resumo",
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
  });

  it("superAdmin does not appear in member listing", async () => {
    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: testAdmin.email, password: testAdmin.password },
    });
    const token = login.json().data.access_token as string;

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/membros?limit=1000",
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const members = res.json().data as { role: string }[];
    const ghostUsers = members.filter((m) => m.role === "superAdmin");
    expect(ghostUsers).toHaveLength(0);
  });

  it("superAdmin cannot be created via POST /membros", async () => {
    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: testAdmin.email, password: testAdmin.password },
    });
    const token = login.json().data.access_token as string;

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/membros",
      headers: { Authorization: `Bearer ${token}` },
      payload: {
        name: "Hacker",
        last_name: "Evil",
        cpf: "000.000.001-91",
        email: "hacker@test.com",
        birth_date: "1990-01-01",
        region: "DF",
        phone: "(61) 99999-0000",
        role: "superAdmin",
        password: "Senha123",
      },
    });
    expect(res.statusCode).toBe(400);
  });
});
```

- [ ] **Step 2: Rodar o teste para confirmar que falha**

```bash
cd backend && npx vitest run test/super-admin.integration.test.ts
```

Expected: os testes de invisibilidade e criação via API devem falhar.

- [ ] **Step 3: Filtrar `superAdmin` no endpoint `GET /membros`**

Em `backend/src/membros/routes.ts`, na rota `GET /api/v1/membros`, após a linha `let members = await listUsers();` (linha 245), adicionar:

```typescript
members = members.filter((m) => m.role !== "superAdmin");
```

- [ ] **Step 4: Rodar os testes novamente**

```bash
cd backend && npx vitest run test/super-admin.integration.test.ts
```

Expected: todos os 4 testes passam (`PASS`).

- [ ] **Step 5: Rodar todos os testes para garantir que nada quebrou**

```bash
cd backend && npx vitest run
```

Expected: todos os testes passam.

- [ ] **Step 6: Commit**

```bash
git add backend/src/membros/routes.ts backend/test/super-admin.integration.test.ts
git commit -m "feat: filter superAdmin from member listing + add integration tests"
```

---

### Task 6: Adicionar `superAdmin` ao seed

**Files:**
- Modify: `backend/src/db/seed.ts`

- [ ] **Step 1: Adicionar usuário `superAdmin` ao `baseUsers`**

Em `backend/src/db/seed.ts`, adicionar um segundo entry no array `baseUsers`:

```typescript
export const baseUsers: Prisma.UserCreateManyInput[] = [
  {
    id: "11111111-1111-0000-1111-111111111111",
    name: "Suporte",
    lastName: "Sol e Lua",
    email: "suporte@gmail.com",
    cpf: "529.982.247-25",
    birthDate: new Date("2026-01-01"),
    region: "DF",
    phone: "(61) 00000-0000",
    passwordHash: hashPassword("Senha123"),
    role: "admin",
  },
  {
    id: "00000000-0000-0000-0000-000000000001",
    name: "SuperAdmin",
    lastName: "Sistema",
    email: "superadmin@sol-e-lua.com",
    birthDate: new Date("2026-01-01"),
    region: "DF",
    phone: "(61) 00000-0001",
    passwordHash: hashPassword("SuperAdmin123"),
    role: "superAdmin",
  },
];
```

- [ ] **Step 2: Rodar todos os testes para confirmar que o `resetDatabase` ainda funciona**

```bash
cd backend && npx vitest run
```

Expected: todos os testes passam (o `resetDatabase` usa `baseUsers`, então agora seedeia o superAdmin também — que é invisível para os testes existentes pois eles filtram por role).

- [ ] **Step 3: Commit**

```bash
git add backend/src/db/seed.ts
git commit -m "feat: add superAdmin ghost user to base seed"
```

---

### Task 7: Atualizar o frontend

**Files:**
- Modify: `frontend/lib/auth.ts`
- Modify: `frontend/app/usuarios/page.tsx`
- Modify: `frontend/app/feedbacks/page.tsx`

- [ ] **Step 1: Atualizar `frontend/lib/auth.ts`**

```typescript
export type Role = "admin" | "animador" | "recreador" | "superAdmin";

export interface StoredUser {
  id: string;
  name: string;
  role: Role;
  photo_url?: string | null;
}

export const roleLabels: Record<Role, string> = {
  admin: "Admin",
  animador: "Animador",
  recreador: "Recreador",
  superAdmin: "Super Admin",
};

export function getStoredUser(): StoredUser | null {
  if (typeof window === "undefined") {
    return null;
  }
  const stored = sessionStorage.getItem("user");
  if (!stored) {
    return null;
  }
  try {
    return JSON.parse(stored) as StoredUser;
  } catch {
    return null;
  }
}

export function getDefaultRoute(role: Role): string {
  if (role === "admin" || role === "superAdmin") return "/dashboard";
  if (role === "animador") return "/relatorios";
  return "/perfil";
}

export function isRoleAllowed(role: Role, allowed: Role[]): boolean {
  return allowed.includes(role);
}
```

- [ ] **Step 2: Atualizar `isAdmin` em `frontend/app/usuarios/page.tsx`**

Linha 183 — a constante `isAdmin` precisa incluir `superAdmin`:

```typescript
// antes
const isAdmin = currentUser?.role === "admin";
// depois
const isAdmin = currentUser?.role === "admin" || currentUser?.role === "superAdmin";
```

- [ ] **Step 3: Filtrar `superAdmin` das contagens em `page.tsx`**

A API já filtra `superAdmin` da listagem, então `users` nunca terá um `superAdmin`. Mas por segurança defensiva e para garantir que o card "Administradores" não conte um eventual superAdmin, confirmar que a contagem já funciona corretamente — como o backend filtra na resposta, não é necessária mudança adicional.

Verificar que `totalAdmins` (linha 269) conta apenas `role === "admin"` e não `superAdmin`:

```typescript
const totalAdmins = users.filter((user) => user.role === "admin").length;
```

Esta linha já está correta — `superAdmin` nunca chega ao `users` array pois é filtrado no backend.

- [ ] **Step 4: Remover `superAdmin` do select de criação em `page.tsx`**

Verificar que o `<select>` do formulário (linha 1394–1406) não inclui `superAdmin` como opção. O código atual tem apenas `animador`, `recreador`, `admin` — está correto, nenhuma mudança necessária.

- [ ] **Step 5: Atualizar `frontend/app/feedbacks/page.tsx`**

Linha 98 — adicionar label para `superAdmin` no helper de exibição de role:

```typescript
// antes
if (role === "admin") return "Admin";
// depois
if (role === "admin" || role === "superAdmin") return "Admin";
```

Ou, se o arquivo usar um objeto de mapeamento, adicionar `superAdmin: "Super Admin"`.

- [ ] **Step 6: Verificar TypeScript do frontend**

```bash
cd frontend && npx tsc --noEmit
```

Expected output: sem erros (os avisos de `FiShield`, `FiStar`, `FiUsers` importados mas não usados são pré-existentes e podem ser ignorados).

- [ ] **Step 7: Commit**

```bash
git add frontend/lib/auth.ts frontend/app/usuarios/page.tsx frontend/app/feedbacks/page.tsx
git commit -m "feat: add superAdmin to frontend Role type and filter from member UI"
```

---

## Self-Review

### Spec coverage

| Requisito | Task |
|---|---|
| `superAdmin` no enum do banco | Task 1 |
| `Role` type atualizado | Task 2 |
| Helper `isAdminLike` | Task 2 |
| `requireRole` aceita `superAdmin` em rotas admin | Task 3 |
| Checks inline atualizados | Task 4 |
| `superAdmin` filtrado de listagem de membros | Task 5 |
| `superAdmin` não criável via API | Task 5 (teste) + CreateMemberSchema não alterado |
| Seed com `superAdmin` | Task 6 |
| Frontend `Role` type | Task 7 |
| Frontend `isAdmin` check | Task 7 |
| Frontend select sem `superAdmin` | Task 7 (confirmado que já está correto) |

### Placeholder scan

Sem TBDs. Todos os passos têm código concreto.

### Type consistency

- `isAdminLike` definido na Task 2 e usado nas Tasks 3, 4 — consistente.
- `Role` atualizado na Task 2 (backend) e Task 7 (frontend) — consistente.
- O `advertencias/routes.ts` linha 278 usa `request.user?.role as Role` pois o tipo é opcional — correto.
