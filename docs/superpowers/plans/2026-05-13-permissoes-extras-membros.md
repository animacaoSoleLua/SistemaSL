# Permissões Extras por Membro — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que o admin conceda e revogue permissões de acesso a funcionalidades específicas para membros individuais, independente do role.

**Architecture:** Nova tabela `UserPermission` no banco armazena permissões extras por usuário. O auth guard carrega as permissões a cada request. Um novo middleware `requireAccess` verifica role OU permissão extra. O frontend exibe um botão na página de membros que abre um modal com checkboxes para gerenciar as permissões.

**Tech Stack:** Prisma (PostgreSQL), Fastify, Vitest, Next.js (React), TypeScript

---

## Mapa de arquivos

| Ação | Arquivo |
|------|---------|
| Modificar | `backend/prisma/schema.prisma` |
| Criar | `backend/src/permissoes/store.ts` |
| Modificar | `backend/src/auth/guard.ts` |
| Criar | `backend/src/permissoes/routes.ts` |
| Modificar | `backend/src/app.ts` |
| Modificar | `backend/src/feedbacks/routes.ts` |
| Modificar | `backend/src/habilidades/routes.ts` |
| Modificar | `backend/src/dashboard/routes.ts` |
| Modificar | `backend/src/advertencias/routes.ts` |
| Modificar | `backend/src/auth/routes.ts` |
| Modificar | `backend/test/helpers/db.ts` |
| Criar | `backend/test/permissoes.integration.test.ts` |
| Modificar | `frontend/lib/auth.ts` |
| Modificar | `frontend/lib/api.ts` |
| Modificar | `frontend/app/components/SidebarNav.tsx` |
| Criar | `frontend/app/usuarios/PermissoesModal.tsx` |
| Modificar | `frontend/app/usuarios/page.tsx` |

---

## Task 1: Prisma schema — Permission enum + UserPermission model

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Adicionar enum Permission e model UserPermission ao schema**

Em `backend/prisma/schema.prisma`, adicionar após o enum `FeedbackType` (linha 30):

```prisma
enum Permission {
  dashboard
  gerencia
  relatorios
  advertencias
  feedbacks
  habilidades
}
```

Adicionar ao model `User` (após `skillEntries MemberSkill[]`, linha 65):

```prisma
  extraPermissions     UserPermission[] @relation("UserPermissions")
  permissionsGranted   UserPermission[] @relation("GrantedPermissions")
```

Adicionar o model `UserPermission` após o model `User` (antes do model `Report`):

```prisma
model UserPermission {
  id          String     @id @default(uuid()) @db.Uuid
  userId      String     @map("user_id") @db.Uuid
  permission  Permission
  grantedById String     @map("granted_by_id") @db.Uuid
  grantedAt   DateTime   @default(now()) @map("granted_at")

  user      User @relation("UserPermissions", fields: [userId], references: [id], onDelete: Cascade)
  grantedBy User @relation("GrantedPermissions", fields: [grantedById], references: [id])

  @@unique([userId, permission])
  @@map("user_permissions")
}
```

- [ ] **Step 2: Rodar a migration**

```bash
cd backend
npx prisma migrate dev --name add_user_permissions
```

Esperado: migration criada e aplicada com sucesso, Prisma client regenerado.

- [ ] **Step 3: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "feat: add Permission enum and UserPermission model"
```

---

## Task 2: Backend permissions store

**Files:**
- Create: `backend/src/permissoes/store.ts`

- [ ] **Step 1: Criar o store**

```typescript
// backend/src/permissoes/store.ts
import { randomUUID } from "node:crypto";
import { prisma } from "../db/prisma.js";

export type Permission =
  | "dashboard"
  | "gerencia"
  | "relatorios"
  | "advertencias"
  | "feedbacks"
  | "habilidades";

export const ALL_PERMISSIONS: Permission[] = [
  "dashboard",
  "gerencia",
  "relatorios",
  "advertencias",
  "feedbacks",
  "habilidades",
];

export async function getUserPermissions(userId: string): Promise<Permission[]> {
  const rows = await prisma.userPermission.findMany({
    where: { userId },
    select: { permission: true },
  });
  return rows.map((r) => r.permission as Permission);
}

export async function setUserPermissions(
  userId: string,
  grantedById: string,
  permissions: Permission[]
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.userPermission.deleteMany({ where: { userId } });
    if (permissions.length > 0) {
      await tx.userPermission.createMany({
        data: permissions.map((permission) => ({
          id: randomUUID(),
          userId,
          permission,
          grantedById,
        })),
      });
    }
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/permissoes/store.ts
git commit -m "feat: add permissions store with get/set functions"
```

---

## Task 3: Auth guard — carregar permissões e adicionar requireAccess

**Files:**
- Modify: `backend/src/auth/guard.ts`

- [ ] **Step 1: Atualizar AuthUser e authGuard**

Substituir o conteúdo de `backend/src/auth/guard.ts`:

```typescript
import "@fastify/cookie";
import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../db/prisma.js";
import type { Role } from "./store.js";
import { verifyAccessToken } from "./token.js";

export interface AuthUser {
  id: string;
  name: string;
  role: Role;
  permissions: string[];
}

function getPath(request: FastifyRequest): string {
  const rawUrl = request.raw.url ?? request.url;
  return rawUrl.split("?")[0];
}

export async function authGuard(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  if (request.method === "OPTIONS") {
    return;
  }
  const path = getPath(request);
  if (!path.startsWith("/api/v1")) {
    return;
  }
  if (path.startsWith("/api/v1/auth")) {
    return;
  }

  const cookieToken = request.cookies?.["auth_token"];
  const header = request.headers.authorization;
  const token =
    cookieToken ??
    (header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined);

  if (!token) {
    reply.status(401).send({ error: "unauthorized", message: "Token ausente" });
    return;
  }
  const payload = verifyAccessToken(token);
  if (!payload) {
    reply.status(401).send({ error: "unauthorized", message: "Token invalido" });
    return;
  }

  const permRows = await prisma.userPermission.findMany({
    where: { userId: payload.sub },
    select: { permission: true },
  });

  request.user = {
    id: payload.sub,
    name: payload.name,
    role: payload.role,
    permissions: permRows.map((r) => r.permission as string),
  };
}

export function requireRole(roles: Role[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      reply.status(401).send({ error: "unauthorized", message: "Token ausente" });
      return;
    }
    if (!roles.includes(request.user.role)) {
      reply.status(403).send({ error: "forbidden", message: "Acesso negado" });
      return;
    }
  };
}

export function requireAccess(roles: Role[], permissions: string[] = []) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      reply.status(401).send({ error: "unauthorized", message: "Token ausente" });
      return;
    }
    if (roles.includes(request.user.role)) return;
    if (
      permissions.length > 0 &&
      permissions.some((p) => request.user!.permissions.includes(p))
    ) {
      return;
    }
    reply.status(403).send({ error: "forbidden", message: "Acesso negado" });
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/auth/guard.ts
git commit -m "feat: load extra permissions in authGuard, add requireAccess"
```

---

## Task 4: Permissions routes + registro no app

**Files:**
- Create: `backend/src/permissoes/routes.ts`
- Modify: `backend/src/app.ts`

- [ ] **Step 1: Criar as rotas de permissões**

```typescript
// backend/src/permissoes/routes.ts
import type { FastifyInstance } from "fastify";
import { requireRole } from "../auth/guard.js";
import { getUserById } from "../auth/store.js";
import {
  ALL_PERMISSIONS,
  getUserPermissions,
  setUserPermissions,
  type Permission,
} from "./store.js";

export async function permissoesRoutes(app: FastifyInstance) {
  app.get(
    "/api/v1/membros/:id/permissoes",
    { preHandler: requireRole(["admin"]) },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const member = await getUserById(id);
      if (!member) {
        return reply.status(404).send({ error: "not_found", message: "Membro não encontrado" });
      }
      const permissions = await getUserPermissions(id);
      return reply.status(200).send({ data: { permissions } });
    }
  );

  app.put(
    "/api/v1/membros/:id/permissoes",
    { preHandler: requireRole(["admin"]) },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as { permissions?: unknown };

      const member = await getUserById(id);
      if (!member) {
        return reply.status(404).send({ error: "not_found", message: "Membro não encontrado" });
      }

      if (!Array.isArray(body.permissions)) {
        return reply.status(400).send({ error: "bad_request", message: "permissions deve ser um array" });
      }

      const valid = body.permissions.filter((p): p is Permission =>
        ALL_PERMISSIONS.includes(p as Permission)
      );

      await setUserPermissions(id, request.user!.id, valid);
      return reply.status(200).send({ data: { permissions: valid } });
    }
  );
}
```

- [ ] **Step 2: Registrar em app.ts**

Em `backend/src/app.ts`, importar e registrar a função. Buscar onde os outros routes são registrados (ex: `feedbacksRoutes`, `habilidadesRoutes`) e adicionar no mesmo padrão:

```typescript
import { permissoesRoutes } from "./permissoes/routes.js";
```

E junto com os outros `await app.register(...)` ou chamadas de route:

```typescript
await permissoesRoutes(app);
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/permissoes/routes.ts backend/src/app.ts
git commit -m "feat: add GET/PUT /membros/:id/permissoes routes"
```

---

## Task 5: Atualizar rotas afetadas para requireAccess

**Files:**
- Modify: `backend/src/feedbacks/routes.ts`
- Modify: `backend/src/habilidades/routes.ts`
- Modify: `backend/src/dashboard/routes.ts`
- Modify: `backend/src/advertencias/routes.ts`

- [ ] **Step 1: feedbacks/routes.ts — trocar requireRole por requireAccess**

Alterar o import em `backend/src/feedbacks/routes.ts` (linha 4):

```typescript
import { requireAccess } from "../auth/guard.js";
```

Substituir TODAS as ocorrências de `requireRole(["admin"])` no arquivo por `requireAccess(["admin"], ["feedbacks"])`. São 4 ocorrências (linhas 35, 99, 282, 320).

- [ ] **Step 2: habilidades/routes.ts — trocar requireRole por requireAccess**

Alterar o import em `backend/src/habilidades/routes.ts` (linha 3):

```typescript
import { requireAccess } from "../auth/guard.js";
```

Substituir TODAS as 7 ocorrências de `requireRole(["admin"])` por `requireAccess(["admin"], ["habilidades"])`.

- [ ] **Step 3: dashboard/routes.ts — trocar requireRole por requireAccess**

Alterar o import em `backend/src/dashboard/routes.ts` (linha 2):

```typescript
import { requireAccess } from "../auth/guard.js";
```

Substituir as 3 ocorrências de `requireRole(["admin"])` por `requireAccess(["admin"], ["dashboard", "gerencia"])`.

(Ambas as permissões "dashboard" e "gerencia" dão acesso às rotas de dashboard — as duas páginas do frontend usam a mesma API.)

- [ ] **Step 4: advertencias/routes.ts — trocar requireRole por requireAccess nas rotas de animador**

Alterar o import em `backend/src/advertencias/routes.ts` (linha 4):

```typescript
import { requireAccess, requireRole } from "../auth/guard.js";
```

Linha 157 (`POST /advertencias`): trocar `requireRole(["admin", "animador"])` por `requireAccess(["admin", "animador"], ["advertencias"])`.

Linha 260 (`PATCH /advertencias/:id`): trocar `requireRole(["admin", "animador"])` por `requireAccess(["admin", "animador"], ["advertencias"])`.

Linha 231 (`DELETE /advertencias/:id`): manter `requireRole(["admin"])` — exclusão continua sendo admin-only.

- [ ] **Step 5: Commit**

```bash
git add backend/src/feedbacks/routes.ts backend/src/habilidades/routes.ts backend/src/dashboard/routes.ts backend/src/advertencias/routes.ts
git commit -m "feat: use requireAccess on restricted routes to support extra permissions"
```

---

## Task 6: Login response — incluir permissões

**Files:**
- Modify: `backend/src/auth/routes.ts`

- [ ] **Step 1: Incluir permissões no payload de login**

Em `backend/src/auth/routes.ts`, localizar o bloco de resposta do login (por volta da linha 194). Antes do `reply.status(200).send(...)`, adicionar a busca de permissões:

```typescript
const permRows = await prisma.userPermission.findMany({
  where: { userId: user.id },
  select: { permission: true },
});
```

Atualizar o objeto retornado para incluir `permissions`:

```typescript
return reply.status(200).send({
  data: {
    access_token: accessToken,
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
      photo_url: user.photoUrl ? await getPresignedViewUrl(user.photoUrl) : null,
      permissions: permRows.map((r) => r.permission as string),
    },
  },
});
```

O import de `prisma` já deve existir em `auth/routes.ts`. Se não existir, adicionar:

```typescript
import { prisma } from "../db/prisma.js";
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/auth/routes.ts
git commit -m "feat: include extra permissions in login response"
```

---

## Task 7: Atualizar helper de test DB

**Files:**
- Modify: `backend/test/helpers/db.ts`

- [ ] **Step 1: Adicionar user_permissions ao TRUNCATE**

Em `backend/test/helpers/db.ts`, na linha 59, localizar a string do TRUNCATE e adicionar `"user_permissions"` na lista:

```typescript
await prisma.$executeRawUnsafe(
  'TRUNCATE TABLE "user_permissions", "skills", "report_feedbacks", "report_media", "reports", "course_enrollments", "courses", "warnings", "suspensions", "password_reset_tokens", "users" RESTART IDENTITY CASCADE'
);
```

- [ ] **Step 2: Commit**

```bash
git add backend/test/helpers/db.ts
git commit -m "test: add user_permissions to resetDatabase TRUNCATE"
```

---

## Task 8: Integration tests para permissões

**Files:**
- Create: `backend/test/permissoes.integration.test.ts`

- [ ] **Step 1: Escrever os testes**

```typescript
// backend/test/permissoes.integration.test.ts
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildServer } from "../src/app.js";
import { disconnectDatabase, resetDatabase, testAdmin } from "./helpers/db.js";

describe("Permissoes (integration)", () => {
  const app = buildServer();

  beforeAll(async () => {
    await app.ready();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await app.close();
    await disconnectDatabase();
  });

  async function loginAdmin() {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: testAdmin.email, password: testAdmin.password },
    });
    return res.json().data.access_token as string;
  }

  async function loginRecreador() {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "recreador@sol-e-lua.com", password: "recreador123" },
    });
    return res.json().data as { access_token: string; user: { id: string; permissions: string[] } };
  }

  it("admin can list empty permissions for a member", async () => {
    const adminToken = await loginAdmin();
    const recreadorData = await loginRecreador();

    const res = await app.inject({
      method: "GET",
      url: `/api/v1/membros/${recreadorData.user.id}/permissoes`,
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().data.permissions).toEqual([]);
  });

  it("admin can grant permissions to a member", async () => {
    const adminToken = await loginAdmin();
    const recreadorData = await loginRecreador();

    const res = await app.inject({
      method: "PUT",
      url: `/api/v1/membros/${recreadorData.user.id}/permissoes`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { permissions: ["feedbacks", "habilidades"] },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().data.permissions).toEqual(
      expect.arrayContaining(["feedbacks", "habilidades"])
    );
  });

  it("admin can revoke permissions by sending empty array", async () => {
    const adminToken = await loginAdmin();
    const recreadorData = await loginRecreador();

    await app.inject({
      method: "PUT",
      url: `/api/v1/membros/${recreadorData.user.id}/permissoes`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { permissions: ["feedbacks"] },
    });

    const revoke = await app.inject({
      method: "PUT",
      url: `/api/v1/membros/${recreadorData.user.id}/permissoes`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { permissions: [] },
    });

    expect(revoke.statusCode).toBe(200);
    expect(revoke.json().data.permissions).toEqual([]);
  });

  it("non-admin cannot access permissions routes", async () => {
    const recreadorData = await loginRecreador();

    const res = await app.inject({
      method: "GET",
      url: `/api/v1/membros/${recreadorData.user.id}/permissoes`,
      headers: { authorization: `Bearer ${recreadorData.access_token}` },
    });

    expect(res.statusCode).toBe(403);
  });

  it("member with feedbacks permission can access feedbacks endpoint", async () => {
    const adminToken = await loginAdmin();
    const recreadorData = await loginRecreador();

    await app.inject({
      method: "PUT",
      url: `/api/v1/membros/${recreadorData.user.id}/permissoes`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { permissions: ["feedbacks"] },
    });

    // Re-login para obter token com permissões carregadas
    const relogin = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "recreador@sol-e-lua.com", password: "recreador123" },
    });
    const newToken = relogin.json().data.access_token as string;

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/feedbacks",
      headers: { authorization: `Bearer ${newToken}` },
    });

    expect(res.statusCode).toBe(200);
  });

  it("member without feedbacks permission cannot access feedbacks endpoint", async () => {
    const recreadorData = await loginRecreador();

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/feedbacks",
      headers: { authorization: `Bearer ${recreadorData.access_token}` },
    });

    expect(res.statusCode).toBe(403);
  });

  it("login response includes permissions array", async () => {
    const adminToken = await loginAdmin();
    const recreadorData = await loginRecreador();

    await app.inject({
      method: "PUT",
      url: `/api/v1/membros/${recreadorData.user.id}/permissoes`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { permissions: ["habilidades"] },
    });

    const relogin = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "recreador@sol-e-lua.com", password: "recreador123" },
    });

    expect(relogin.json().data.user.permissions).toEqual(["habilidades"]);
  });

  it("invalid permissions are silently ignored", async () => {
    const adminToken = await loginAdmin();
    const recreadorData = await loginRecreador();

    const res = await app.inject({
      method: "PUT",
      url: `/api/v1/membros/${recreadorData.user.id}/permissoes`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { permissions: ["feedbacks", "permissao_inexistente"] },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().data.permissions).toEqual(["feedbacks"]);
  });
});
```

- [ ] **Step 2: Rodar os testes para verificar que passam**

```bash
cd backend
npx vitest run test/permissoes.integration.test.ts
```

Esperado: todos os 7 testes passando.

- [ ] **Step 3: Commit**

```bash
git add backend/test/permissoes.integration.test.ts
git commit -m "test: add integration tests for permissions routes"
```

---

## Task 9: Frontend — StoredUser + funções de API

**Files:**
- Modify: `frontend/lib/auth.ts`
- Modify: `frontend/lib/api.ts`

- [ ] **Step 1: Adicionar permissions ao StoredUser**

Em `frontend/lib/auth.ts`, atualizar a interface `StoredUser`:

```typescript
export interface StoredUser {
  id: string;
  name: string;
  role: Role;
  photo_url?: string | null;
  permissions?: string[];
}
```

- [ ] **Step 2: Adicionar funções de API para permissões**

Em `frontend/lib/api.ts`, adicionar ao final do arquivo (antes do último fechamento de bloco exportado):

```typescript
export async function getMemberPermissions(memberId: string): Promise<{ data: { permissions: string[] } }> {
  return request(`/membros/${memberId}/permissoes`);
}

export async function setMemberPermissions(
  memberId: string,
  permissions: string[]
): Promise<{ data: { permissions: string[] } }> {
  return request(`/membros/${memberId}/permissoes`, {
    method: "PUT",
    body: JSON.stringify({ permissions }),
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/auth.ts frontend/lib/api.ts
git commit -m "feat: add permissions to StoredUser and API functions"
```

---

## Task 10: Frontend — SidebarNav com suporte a extra permissions

**Files:**
- Modify: `frontend/app/components/SidebarNav.tsx`

- [ ] **Step 1: Adicionar campo permission aos navItems e atualizar o tipo User**

Em `frontend/app/components/SidebarNav.tsx`, atualizar a interface `User` (linha 84):

```typescript
interface User {
  id: string;
  name: string;
  role: Role;
  photo_url?: string | null;
  permissions?: string[];
}
```

Atualizar o array `navItems` (linhas 27-82) adicionando o campo `permission` opcional a cada item:

```typescript
const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    roles: ["admin"],
    permission: "dashboard",
    icon: <FiGrid aria-hidden="true" />,
  },
  {
    label: "Gerência",
    href: "/gerencia",
    roles: ["admin"],
    permission: "gerencia",
    icon: <FiBarChart2 aria-hidden="true" />,
  },
  {
    label: "Relatorios",
    href: "/relatorios",
    roles: ["admin", "animador"],
    permission: "relatorios",
    icon: <FiFileText aria-hidden="true" />,
  },
  {
    label: "Cursos",
    href: "/cursos",
    roles: ["admin", "animador", "recreador"],
    icon: <FiBookOpen aria-hidden="true" />,
  },
  {
    label: "Advertências",
    href: "/advertencias",
    roles: ["admin", "animador"],
    permission: "advertencias",
    icon: <FiAlertTriangle aria-hidden="true" />,
  },
  {
    label: "Feedbacks",
    href: "/feedbacks",
    roles: ["admin"],
    permission: "feedbacks",
    icon: <FiMessageSquare aria-hidden="true" />,
  },
  {
    label: "Habilidades",
    href: "/habilidades",
    roles: ["admin"],
    permission: "habilidades",
    icon: <FiStar aria-hidden="true" />,
  },
  {
    label: "Membros",
    href: "/usuarios",
    roles: ["admin", "animador", "recreador"],
    icon: <FiUsers aria-hidden="true" />,
  },
  {
    label: "Perfil",
    href: "/configuracoes",
    roles: ["admin", "animador", "recreador"],
    icon: <FiUser aria-hidden="true" />,
  },
];
```

- [ ] **Step 2: Atualizar os dois filtros de navItems no JSX**

Há dois `.filter(...)` no componente (desktop nav e mobile nav), ambos com:
```typescript
.filter((item) => (user ? item.roles.includes(user.role) : false))
```

Substituir ambos por:
```typescript
.filter((item) =>
  user
    ? item.roles.includes(user.role) ||
      (item.permission != null &&
        (user.permissions ?? []).includes(item.permission))
    : false
)
```

- [ ] **Step 3: Commit**

```bash
git add frontend/app/components/SidebarNav.tsx
git commit -m "feat: show nav items based on extra permissions in SidebarNav"
```

---

## Task 11: Frontend — PermissoesModal

**Files:**
- Create: `frontend/app/usuarios/PermissoesModal.tsx`

- [ ] **Step 1: Criar o componente**

```typescript
// frontend/app/usuarios/PermissoesModal.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { getMemberPermissions, setMemberPermissions } from "../../lib/api";
import type { Role } from "../../lib/auth";

interface Permission {
  value: string;
  label: string;
}

const ALL_PERMISSIONS: Permission[] = [
  { value: "dashboard", label: "Dashboard" },
  { value: "gerencia", label: "Gerência" },
  { value: "relatorios", label: "Relatórios" },
  { value: "advertencias", label: "Advertências" },
  { value: "feedbacks", label: "Feedbacks" },
  { value: "habilidades", label: "Habilidades" },
];

const DEFAULT_ROLE_PERMISSIONS: Record<Role, string[]> = {
  admin: ["dashboard", "gerencia", "relatorios", "advertencias", "feedbacks", "habilidades"],
  animador: ["relatorios", "advertencias"],
  recreador: [],
};

interface Props {
  member: { id: string; name: string; role: Role };
  onClose: () => void;
}

export default function PermissoesModal({ member, onClose }: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const defaultPerms = DEFAULT_ROLE_PERMISSIONS[member.role];

  useEffect(() => {
    getMemberPermissions(member.id)
      .then((res) => setSelected(res.data.permissions))
      .catch(() => setError("Não foi possível carregar as permissões."))
      .finally(() => setLoading(false));
  }, [member.id]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const toggle = (value: string) => {
    setSelected((prev) =>
      prev.includes(value) ? prev.filter((p) => p !== value) : [...prev, value]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await setMemberPermissions(member.id, selected);
      onClose();
    } catch {
      setError("Não foi possível salvar as permissões.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="permissoes-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-card" ref={dialogRef}>
        <header className="modal-header">
          <h2 id="permissoes-modal-title" className="modal-title">
            Permissões — {member.name}
          </h2>
          <button
            type="button"
            className="modal-close"
            aria-label="Fechar"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <div className="modal-body">
          {loading ? (
            <p>Carregando...</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
              {ALL_PERMISSIONS.map(({ value, label }) => {
                const isDefault = defaultPerms.includes(value);
                const isChecked = isDefault || selected.includes(value);
                return (
                  <li key={value} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <input
                      type="checkbox"
                      id={`perm-${value}`}
                      checked={isChecked}
                      disabled={isDefault}
                      onChange={() => toggle(value)}
                    />
                    <label htmlFor={`perm-${value}`} style={{ opacity: isDefault ? 0.5 : 1 }}>
                      {label}
                      {isDefault && (
                        <span style={{ fontSize: 12, marginLeft: 6, opacity: 0.7 }}>
                          (padrão do role)
                        </span>
                      )}
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
          {error && (
            <p role="alert" style={{ color: "var(--color-danger, red)", marginTop: 12 }}>
              {error}
            </p>
          )}
        </div>

        <footer className="modal-footer">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="button"
            onClick={handleSave}
            disabled={saving || loading}
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </footer>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/app/usuarios/PermissoesModal.tsx
git commit -m "feat: add PermissoesModal component"
```

---

## Task 12: Frontend — botão de permissões na página de membros

**Files:**
- Modify: `frontend/app/usuarios/page.tsx`

- [ ] **Step 1: Importar PermissoesModal e FiShield**

No topo de `frontend/app/usuarios/page.tsx`, adicionar a importação do modal:

```typescript
import PermissoesModal from "./PermissoesModal";
```

No import das icons do react-icons/fi, adicionar `FiShield`:

```typescript
import { ..., FiShield } from "react-icons/fi";
```

- [ ] **Step 2: Adicionar estado para o modal de permissões**

Dentro do componente (junto com os outros `useState`):

```typescript
const [permissoesModalMember, setPermissoesModalMember] = useState<{
  id: string;
  name: string;
  role: Role;
} | null>(null);
```

- [ ] **Step 3: Adicionar o botão ao lado de "Listagem de CPF" no header**

Localizar o botão "Listagem de CPF" (por volta da linha 732) que fica dentro de `{isAdmin && (<div className="page-header-actions">...`:

```tsx
{isAdmin && (
  <div className="page-header-actions">
    <button
      className="button user-action-primary"
      type="button"
      onClick={openCreateModal}
    >
      ...
    </button>
    <button
      className="button secondary"
      type="button"
      onClick={openCpfModal}
    >
      Listagem de CPF
    </button>
  </div>
)}
```

Isso já está lá. O botão de permissões NÃO vai no header — vai na **linha de cada membro** (member-row-actions), ao lado dos botões de editar e excluir, conforme combinado. Adicionar dentro do bloco `{isAdmin && (<>`, depois do botão de editar e antes do de excluir:

```tsx
{isAdmin && (
  <>
    <button
      className="icon-button"
      type="button"
      aria-label="Gerenciar permissões do membro"
      onClick={(event) => {
        event.stopPropagation();
        setPermissoesModalMember({
          id: user.id,
          name: getDisplayName(user),
          role: user.role,
        });
      }}
    >
      <FiShield aria-hidden="true" />
    </button>
    <button
      className="icon-button"
      type="button"
      aria-label="Editar membro"
      onClick={(event) => {
        event.stopPropagation();
        openEditModal(user);
      }}
    >
      <FiEdit2 aria-hidden="true" />
    </button>
    {currentUser?.id !== user.id && (
      <button
        className="icon-button danger"
        type="button"
        aria-label="Excluir membro"
        onClick={(event) => {
          event.stopPropagation();
          handleDelete(user);
        }}
      >
        <FiTrash2 aria-hidden="true" />
      </button>
    )}
  </>
)}
```

- [ ] **Step 4: Renderizar o PermissoesModal**

Ao final do componente, junto com os outros modais renderizados condicionalmente, adicionar:

```tsx
{permissoesModalMember && (
  <PermissoesModal
    member={permissoesModalMember}
    onClose={() => setPermissoesModalMember(null)}
  />
)}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/app/usuarios/page.tsx
git commit -m "feat: add permissions button and modal to usuarios page"
```

---

## Self-review

- **Spec coverage:** Todas as seções do spec têm tasks correspondentes: modelo de dados (Task 1), store (Task 2), guard + requireAccess (Task 3), rotas (Task 4), rotas afetadas (Task 5), login response (Task 6), SidebarNav (Task 10), PermissoesModal (Task 11), botão (Task 12). Helpers de test (Task 7) e integration tests (Task 8) cobrem os cenários de grant, revoke, acesso negado e acesso liberado.
- **Tipo consistency:** `Permission` é `string` no frontend (evita duplicação de enum), `Permission` enum no Prisma/backend. O campo `permissions: string[]` é consistente em `AuthUser`, `StoredUser` e respostas de API.
- **Nota:** O teste de "member with feedbacks permission can access feedbacks endpoint" usa re-login porque o token JWT em si não muda — as permissões são carregadas do banco no `authGuard` a cada request. O re-login é necessário apenas para verificar que o campo `permissions` no *payload de login* está correto; o acesso à API funciona sem re-login porque o guard consulta o banco diretamente.
