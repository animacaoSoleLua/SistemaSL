# Habilidades Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar a funcionalidade de Habilidades — página no menu lateral para cadastrar habilidades, associá-las a membros com nota 1–10, e exibi-las nos detalhes do membro.

**Architecture:** Novo módulo `habilidades` no backend (Fastify + Prisma) com dois modelos: `Skill` (habilidades disponíveis) e `MemberSkill` (associação membro↔habilidade com rating). No frontend, nova página `/habilidades` com accordion e modais, mais uma nova aba no modal de detalhes de membros.

**Tech Stack:** TypeScript, Fastify, Prisma, PostgreSQL, Next.js (App Router), React, CSS plain

---

## Mapa de arquivos

| Arquivo | Ação |
|---------|------|
| `backend/prisma/schema.prisma` | Modificar — adicionar modelos `Skill` e `MemberSkill` |
| `backend/test/helpers/db.ts` | Modificar — adicionar `skills` ao TRUNCATE |
| `backend/src/habilidades/store.ts` | Criar — queries Prisma |
| `backend/src/habilidades/routes.ts` | Criar — rotas Fastify |
| `backend/src/app.ts` | Modificar — registrar `habilidadesRoutes` |
| `backend/src/membros/routes.ts` | Modificar — incluir `skills` no GET `/membros/:id` |
| `backend/test/habilidades.integration.test.ts` | Criar — testes de integração |
| `frontend/lib/api.ts` | Modificar — adicionar funções de API de habilidades |
| `frontend/app/habilidades/page.tsx` | Criar — página de habilidades |
| `frontend/app/habilidades/page.css` | Criar — estilos |
| `frontend/app/components/SidebarNav.tsx` | Modificar — adicionar item "Habilidades" |
| `frontend/app/usuarios/page.tsx` | Modificar — aba "habilidades" no modal de detalhes |

---

## Task 1: Schema Prisma + Migration

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Modify: `backend/test/helpers/db.ts`

- [ ] **Step 1: Adicionar modelos ao schema.prisma**

No final de `backend/prisma/schema.prisma`, antes do fechamento do arquivo, adicionar:

```prisma
model Skill {
  id          String        @id @default(uuid()) @db.Uuid
  name        String        @unique @db.VarChar(100)
  description String?       @db.Text
  createdAt   DateTime      @default(now()) @map("created_at")
  members     MemberSkill[]

  @@map("skills")
}

model MemberSkill {
  id        String   @id @default(uuid()) @db.Uuid
  memberId  String   @map("member_id") @db.Uuid
  skillId   String   @map("skill_id") @db.Uuid
  rating    Int
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  member    User     @relation(fields: [memberId], references: [id], onDelete: Cascade)
  skill     Skill    @relation(fields: [skillId], references: [id], onDelete: Cascade)

  @@unique([memberId, skillId])
  @@index([memberId], map: "idx_member_skills_member")
  @@index([skillId], map: "idx_member_skills_skill")
  @@map("member_skills")
}
```

Também no model `User`, adicionar a relação (após `clientFeedbacks`):

```prisma
  skillEntries         MemberSkill[]
```

- [ ] **Step 2: Rodar a migration**

```bash
cd backend
npx prisma migrate dev --name add_habilidades
```

Expected: migration criada em `backend/prisma/migrations/TIMESTAMP_add_habilidades/migration.sql` e Prisma Client regenerado.

- [ ] **Step 3: Atualizar TRUNCATE no helper de testes**

Em `backend/test/helpers/db.ts`, linha 60, substituir:

```typescript
    'TRUNCATE TABLE "report_feedbacks", "report_media", "reports", "course_enrollments", "courses", "warnings", "suspensions", "password_reset_tokens", "users" RESTART IDENTITY CASCADE'
```

por:

```typescript
    'TRUNCATE TABLE "skills", "report_feedbacks", "report_media", "reports", "course_enrollments", "courses", "warnings", "suspensions", "password_reset_tokens", "users" RESTART IDENTITY CASCADE'
```

(`member_skills` é cascadeado pelo `users` — não precisa estar na lista)

- [ ] **Step 4: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/ backend/test/helpers/db.ts
git commit -m "feat: add Skill and MemberSkill models to schema"
```

---

## Task 2: Backend store

**Files:**
- Create: `backend/src/habilidades/store.ts`

- [ ] **Step 1: Criar o arquivo `backend/src/habilidades/store.ts`**

```typescript
import { prisma } from "../db/prisma.js";

export interface SkillRecord {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
}

export interface MemberSkillRecord {
  id: string;
  memberId: string;
  skillId: string;
  rating: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SkillWithMembers extends SkillRecord {
  members: {
    memberId: string;
    memberName: string;
    memberLastName: string | null;
    photoUrl: string | null;
    rating: number;
  }[];
}

export async function listSkills(): Promise<SkillWithMembers[]> {
  const skills = await prisma.skill.findMany({
    orderBy: { name: "asc" },
    include: {
      members: {
        orderBy: { rating: "desc" },
        include: {
          member: {
            select: { id: true, name: true, lastName: true, photoUrl: true },
          },
        },
      },
    },
  });

  return skills.map((skill) => ({
    id: skill.id,
    name: skill.name,
    description: skill.description,
    createdAt: skill.createdAt,
    members: skill.members.map((ms) => ({
      memberId: ms.member.id,
      memberName: ms.member.name,
      memberLastName: ms.member.lastName ?? null,
      photoUrl: ms.member.photoUrl ?? null,
      rating: ms.rating,
    })),
  }));
}

export async function getSkillById(id: string): Promise<SkillRecord | undefined> {
  const skill = await prisma.skill.findUnique({ where: { id } });
  if (!skill) return undefined;
  return { id: skill.id, name: skill.name, description: skill.description, createdAt: skill.createdAt };
}

export async function createSkill(input: {
  name: string;
  description?: string;
}): Promise<SkillRecord> {
  const skill = await prisma.skill.create({
    data: { name: input.name.trim(), description: input.description?.trim() ?? null },
  });
  return { id: skill.id, name: skill.name, description: skill.description, createdAt: skill.createdAt };
}

export async function updateSkill(
  id: string,
  input: { name?: string; description?: string | null }
): Promise<SkillRecord | undefined> {
  const existing = await prisma.skill.findUnique({ where: { id } });
  if (!existing) return undefined;
  const updated = await prisma.skill.update({
    where: { id },
    data: {
      name: input.name !== undefined ? input.name.trim() : existing.name,
      description: input.description !== undefined ? (input.description?.trim() ?? null) : existing.description,
    },
  });
  return { id: updated.id, name: updated.name, description: updated.description, createdAt: updated.createdAt };
}

export async function deleteSkill(id: string): Promise<boolean> {
  const existing = await prisma.skill.findUnique({ where: { id } });
  if (!existing) return false;
  await prisma.skill.delete({ where: { id } });
  return true;
}

export async function addMemberSkill(input: {
  memberId: string;
  skillId: string;
  rating: number;
}): Promise<MemberSkillRecord> {
  const ms = await prisma.memberSkill.create({
    data: { memberId: input.memberId, skillId: input.skillId, rating: input.rating },
  });
  return { id: ms.id, memberId: ms.memberId, skillId: ms.skillId, rating: ms.rating, createdAt: ms.createdAt, updatedAt: ms.updatedAt };
}

export async function updateMemberSkill(
  skillId: string,
  memberId: string,
  rating: number
): Promise<MemberSkillRecord | undefined> {
  const existing = await prisma.memberSkill.findUnique({
    where: { memberId_skillId: { memberId, skillId } },
  });
  if (!existing) return undefined;
  const updated = await prisma.memberSkill.update({
    where: { memberId_skillId: { memberId, skillId } },
    data: { rating },
  });
  return { id: updated.id, memberId: updated.memberId, skillId: updated.skillId, rating: updated.rating, createdAt: updated.createdAt, updatedAt: updated.updatedAt };
}

export async function removeMemberSkill(
  skillId: string,
  memberId: string
): Promise<boolean> {
  const existing = await prisma.memberSkill.findUnique({
    where: { memberId_skillId: { memberId, skillId } },
  });
  if (!existing) return false;
  await prisma.memberSkill.delete({ where: { memberId_skillId: { memberId, skillId } } });
  return true;
}

export async function listSkillsForMember(
  memberId: string
): Promise<{ skillId: string; name: string; description: string | null; rating: number }[]> {
  const entries = await prisma.memberSkill.findMany({
    where: { memberId },
    orderBy: { rating: "desc" },
    include: { skill: { select: { name: true, description: true } } },
  });
  return entries.map((ms) => ({
    skillId: ms.skillId,
    name: ms.skill.name,
    description: ms.skill.description,
    rating: ms.rating,
  }));
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/habilidades/store.ts
git commit -m "feat: add habilidades store"
```

---

## Task 3: Backend integration tests (failing)

**Files:**
- Create: `backend/test/habilidades.integration.test.ts`

- [ ] **Step 1: Criar arquivo de teste**

```typescript
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildServer } from "../src/app.js";
import { getUserByEmail } from "../src/auth/store.js";
import {
  disconnectDatabase,
  resetDatabase,
  testAdmin,
  testMember1,
  testMember2,
} from "./helpers/db.js";

describe("Habilidades (integration)", () => {
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

  async function loginAs(email: string, password: string): Promise<string> {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email, password },
    });
    return res.json().data.access_token;
  }

  it("admin pode criar uma habilidade", async () => {
    const token = await loginAs(testAdmin.email, testAdmin.password);
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/habilidades",
      headers: { authorization: `Bearer ${token}` },
      payload: { name: "Pintura", description: "Pintura artística" },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.data.name).toBe("Pintura");
    expect(body.data.description).toBe("Pintura artística");
    expect(body.data.id).toBeTruthy();
  });

  it("não permite criar habilidade com nome duplicado", async () => {
    const token = await loginAs(testAdmin.email, testAdmin.password);
    await app.inject({
      method: "POST",
      url: "/api/v1/habilidades",
      headers: { authorization: `Bearer ${token}` },
      payload: { name: "Balão" },
    });
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/habilidades",
      headers: { authorization: `Bearer ${token}` },
      payload: { name: "Balão" },
    });
    expect(res.statusCode).toBe(409);
  });

  it("lista habilidades com membros ordenados por rating", async () => {
    const token = await loginAs(testAdmin.email, testAdmin.password);
    const member1 = await getUserByEmail(testMember1.email);
    const member2 = await getUserByEmail(testMember2.email);

    const skillRes = await app.inject({
      method: "POST",
      url: "/api/v1/habilidades",
      headers: { authorization: `Bearer ${token}` },
      payload: { name: "Malabarismo" },
    });
    const skillId = skillRes.json().data.id;

    await app.inject({
      method: "POST",
      url: `/api/v1/habilidades/${skillId}/membros`,
      headers: { authorization: `Bearer ${token}` },
      payload: { member_id: member1!.id, rating: 7 },
    });
    await app.inject({
      method: "POST",
      url: `/api/v1/habilidades/${skillId}/membros`,
      headers: { authorization: `Bearer ${token}` },
      payload: { member_id: member2!.id, rating: 9 },
    });

    const listRes = await app.inject({
      method: "GET",
      url: "/api/v1/habilidades",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(listRes.statusCode).toBe(200);
    const skills = listRes.json();
    const found = skills.find((s: { id: string }) => s.id === skillId);
    expect(found.members[0].rating).toBe(9);
    expect(found.members[1].rating).toBe(7);
  });

  it("admin pode editar uma habilidade", async () => {
    const token = await loginAs(testAdmin.email, testAdmin.password);
    const createRes = await app.inject({
      method: "POST",
      url: "/api/v1/habilidades",
      headers: { authorization: `Bearer ${token}` },
      payload: { name: "Dança" },
    });
    const skillId = createRes.json().data.id;

    const editRes = await app.inject({
      method: "PUT",
      url: `/api/v1/habilidades/${skillId}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { name: "Dança Contemporânea" },
    });
    expect(editRes.statusCode).toBe(200);
    expect(editRes.json().data.name).toBe("Dança Contemporânea");
  });

  it("admin pode deletar uma habilidade e vínculos são cascadeados", async () => {
    const token = await loginAs(testAdmin.email, testAdmin.password);
    const member1 = await getUserByEmail(testMember1.email);

    const createRes = await app.inject({
      method: "POST",
      url: "/api/v1/habilidades",
      headers: { authorization: `Bearer ${token}` },
      payload: { name: "Acrobacia" },
    });
    const skillId = createRes.json().data.id;

    await app.inject({
      method: "POST",
      url: `/api/v1/habilidades/${skillId}/membros`,
      headers: { authorization: `Bearer ${token}` },
      payload: { member_id: member1!.id, rating: 8 },
    });

    const deleteRes = await app.inject({
      method: "DELETE",
      url: `/api/v1/habilidades/${skillId}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(deleteRes.statusCode).toBe(204);

    const listRes = await app.inject({
      method: "GET",
      url: "/api/v1/habilidades",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(listRes.json().find((s: { id: string }) => s.id === skillId)).toBeUndefined();
  });

  it("não permite adicionar a mesma habilidade duas vezes ao mesmo membro", async () => {
    const token = await loginAs(testAdmin.email, testAdmin.password);
    const member1 = await getUserByEmail(testMember1.email);

    const createRes = await app.inject({
      method: "POST",
      url: "/api/v1/habilidades",
      headers: { authorization: `Bearer ${token}` },
      payload: { name: "Teatro" },
    });
    const skillId = createRes.json().data.id;

    await app.inject({
      method: "POST",
      url: `/api/v1/habilidades/${skillId}/membros`,
      headers: { authorization: `Bearer ${token}` },
      payload: { member_id: member1!.id, rating: 6 },
    });

    const res2 = await app.inject({
      method: "POST",
      url: `/api/v1/habilidades/${skillId}/membros`,
      headers: { authorization: `Bearer ${token}` },
      payload: { member_id: member1!.id, rating: 8 },
    });
    expect(res2.statusCode).toBe(409);
  });

  it("admin pode atualizar a nota de um membro em uma habilidade", async () => {
    const token = await loginAs(testAdmin.email, testAdmin.password);
    const member1 = await getUserByEmail(testMember1.email);

    const createRes = await app.inject({
      method: "POST",
      url: "/api/v1/habilidades",
      headers: { authorization: `Bearer ${token}` },
      payload: { name: "Canto" },
    });
    const skillId = createRes.json().data.id;

    await app.inject({
      method: "POST",
      url: `/api/v1/habilidades/${skillId}/membros`,
      headers: { authorization: `Bearer ${token}` },
      payload: { member_id: member1!.id, rating: 5 },
    });

    const updateRes = await app.inject({
      method: "PUT",
      url: `/api/v1/habilidades/${skillId}/membros/${member1!.id}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { rating: 9 },
    });
    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.json().data.rating).toBe(9);
  });

  it("admin pode remover habilidade de um membro", async () => {
    const token = await loginAs(testAdmin.email, testAdmin.password);
    const member1 = await getUserByEmail(testMember1.email);

    const createRes = await app.inject({
      method: "POST",
      url: "/api/v1/habilidades",
      headers: { authorization: `Bearer ${token}` },
      payload: { name: "Fotografia" },
    });
    const skillId = createRes.json().data.id;

    await app.inject({
      method: "POST",
      url: `/api/v1/habilidades/${skillId}/membros`,
      headers: { authorization: `Bearer ${token}` },
      payload: { member_id: member1!.id, rating: 7 },
    });

    const removeRes = await app.inject({
      method: "DELETE",
      url: `/api/v1/habilidades/${skillId}/membros/${member1!.id}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(removeRes.statusCode).toBe(204);
  });

  it("não-admin não pode criar habilidade", async () => {
    const token = await loginAs(testMember1.email, testMember1.password);
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/habilidades",
      headers: { authorization: `Bearer ${token}` },
      payload: { name: "Circo" },
    });
    expect(res.statusCode).toBe(403);
  });

  it("skills aparecem nos detalhes do membro", async () => {
    const token = await loginAs(testAdmin.email, testAdmin.password);
    const member1 = await getUserByEmail(testMember1.email);

    const createRes = await app.inject({
      method: "POST",
      url: "/api/v1/habilidades",
      headers: { authorization: `Bearer ${token}` },
      payload: { name: "Natação" },
    });
    const skillId = createRes.json().data.id;

    await app.inject({
      method: "POST",
      url: `/api/v1/habilidades/${skillId}/membros`,
      headers: { authorization: `Bearer ${token}` },
      payload: { member_id: member1!.id, rating: 8 },
    });

    const memberRes = await app.inject({
      method: "GET",
      url: `/api/v1/membros/${member1!.id}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(memberRes.statusCode).toBe(200);
    const skills = memberRes.json().data.skills;
    expect(Array.isArray(skills)).toBe(true);
    expect(skills[0].name).toBe("Natação");
    expect(skills[0].rating).toBe(8);
  });
});
```

- [ ] **Step 2: Rodar os testes para confirmar que falham**

```bash
cd backend
npx vitest run test/habilidades.integration.test.ts
```

Expected: todos os testes falham com erros como "404 Not Found" ou "Cannot POST /api/v1/habilidades".

- [ ] **Step 3: Commit**

```bash
git add backend/test/habilidades.integration.test.ts
git commit -m "test: add failing habilidades integration tests"
```

---

## Task 4: Backend routes

**Files:**
- Create: `backend/src/habilidades/routes.ts`

- [ ] **Step 1: Criar `backend/src/habilidades/routes.ts`**

```typescript
import { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireRole } from "../auth/guard.js";
import { getUserById } from "../auth/store.js";
import {
  addMemberSkill,
  createSkill,
  deleteSkill,
  getSkillById,
  listSkills,
  removeMemberSkill,
  updateMemberSkill,
  updateSkill,
} from "./store.js";
import { getPresignedViewUrl } from "../lib/r2.js";

const CreateSkillSchema = z.object({
  name: z.string().min(1, "Nome obrigatorio").max(100, "Nome muito longo"),
  description: z.string().max(2000, "Descricao muito longa").optional(),
});

const UpdateSkillSchema = z.object({
  name: z.string().min(1, "Nome obrigatorio").max(100, "Nome muito longo").optional(),
  description: z.string().max(2000, "Descricao muito longa").nullable().optional(),
});

const AddMemberSkillSchema = z.object({
  member_id: z.string().uuid("Membro invalido"),
  rating: z.number().int().min(1, "Nota minima e 1").max(10, "Nota maxima e 10"),
});

const UpdateMemberSkillSchema = z.object({
  rating: z.number().int().min(1, "Nota minima e 1").max(10, "Nota maxima e 10"),
});

export async function habilidadesRoutes(app: FastifyInstance) {
  app.get(
    "/api/v1/habilidades",
    { preHandler: requireRole(["admin"]) },
    async (_request, reply) => {
      const skills = await listSkills();
      const result = await Promise.all(
        skills.map(async (skill) => ({
          id: skill.id,
          name: skill.name,
          description: skill.description,
          members: await Promise.all(
            skill.members.map(async (m) => ({
              member_id: m.memberId,
              name: m.memberName,
              last_name: m.memberLastName,
              photo_url: m.photoUrl ? await getPresignedViewUrl(m.photoUrl) : null,
              rating: m.rating,
            }))
          ),
        }))
      );
      return reply.status(200).send(result);
    }
  );

  app.post(
    "/api/v1/habilidades",
    { preHandler: requireRole(["admin"]) },
    async (request, reply) => {
      const parsed = CreateSkillSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "invalid_request",
          message: parsed.error.errors[0].message,
        });
      }
      try {
        const skill = await createSkill({
          name: parsed.data.name,
          description: parsed.data.description,
        });
        return reply.status(201).send({ data: skill });
      } catch (err: unknown) {
        const prismaErr = err as { code?: string };
        if (prismaErr.code === "P2002") {
          return reply.status(409).send({
            error: "conflict",
            message: "Já existe uma habilidade com esse nome",
          });
        }
        throw err;
      }
    }
  );

  app.put(
    "/api/v1/habilidades/:id",
    { preHandler: requireRole(["admin"]) },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsed = UpdateSkillSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "invalid_request",
          message: parsed.error.errors[0].message,
        });
      }
      try {
        const skill = await updateSkill(id, parsed.data);
        if (!skill) {
          return reply.status(404).send({ error: "not_found", message: "Habilidade nao encontrada" });
        }
        return reply.status(200).send({ data: skill });
      } catch (err: unknown) {
        const prismaErr = err as { code?: string };
        if (prismaErr.code === "P2002") {
          return reply.status(409).send({
            error: "conflict",
            message: "Já existe uma habilidade com esse nome",
          });
        }
        throw err;
      }
    }
  );

  app.delete(
    "/api/v1/habilidades/:id",
    { preHandler: requireRole(["admin"]) },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const deleted = await deleteSkill(id);
      if (!deleted) {
        return reply.status(404).send({ error: "not_found", message: "Habilidade nao encontrada" });
      }
      return reply.status(204).send();
    }
  );

  app.post(
    "/api/v1/habilidades/:id/membros",
    { preHandler: requireRole(["admin"]) },
    async (request, reply) => {
      const { id: skillId } = request.params as { id: string };
      const parsed = AddMemberSkillSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "invalid_request",
          message: parsed.error.errors[0].message,
        });
      }

      const skill = await getSkillById(skillId);
      if (!skill) {
        return reply.status(404).send({ error: "not_found", message: "Habilidade nao encontrada" });
      }

      const member = await getUserById(parsed.data.member_id);
      if (!member) {
        return reply.status(404).send({ error: "not_found", message: "Membro nao encontrado" });
      }

      try {
        const ms = await addMemberSkill({
          memberId: parsed.data.member_id,
          skillId,
          rating: parsed.data.rating,
        });
        return reply.status(201).send({ data: ms });
      } catch (err: unknown) {
        const prismaErr = err as { code?: string };
        if (prismaErr.code === "P2002") {
          return reply.status(409).send({
            error: "conflict",
            message: "Esse membro já possui essa habilidade",
          });
        }
        throw err;
      }
    }
  );

  app.put(
    "/api/v1/habilidades/:id/membros/:memberId",
    { preHandler: requireRole(["admin"]) },
    async (request, reply) => {
      const { id: skillId, memberId } = request.params as { id: string; memberId: string };
      const parsed = UpdateMemberSkillSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "invalid_request",
          message: parsed.error.errors[0].message,
        });
      }
      const ms = await updateMemberSkill(skillId, memberId, parsed.data.rating);
      if (!ms) {
        return reply.status(404).send({ error: "not_found", message: "Vínculo não encontrado" });
      }
      return reply.status(200).send({ data: ms });
    }
  );

  app.delete(
    "/api/v1/habilidades/:id/membros/:memberId",
    { preHandler: requireRole(["admin"]) },
    async (request, reply) => {
      const { id: skillId, memberId } = request.params as { id: string; memberId: string };
      const removed = await removeMemberSkill(skillId, memberId);
      if (!removed) {
        return reply.status(404).send({ error: "not_found", message: "Vínculo não encontrado" });
      }
      return reply.status(204).send();
    }
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/habilidades/routes.ts
git commit -m "feat: add habilidades routes"
```

---

## Task 5: Registrar rotas no app.ts + rodar testes

**Files:**
- Modify: `backend/src/app.ts`

- [ ] **Step 1: Adicionar import em `backend/src/app.ts`**

Após a linha `import { feedbacksRoutes } from "./feedbacks/routes.js";`, adicionar:

```typescript
import { habilidadesRoutes } from "./habilidades/routes.js";
```

- [ ] **Step 2: Registrar o módulo**

Após a linha `app.register(feedbacksRoutes);`, adicionar:

```typescript
  app.register(habilidadesRoutes);
```

- [ ] **Step 3: Rodar os testes de habilidades**

```bash
cd backend
npx vitest run test/habilidades.integration.test.ts
```

Expected: todos os testes passam.

- [ ] **Step 4: Rodar a suíte completa para checar regressões**

```bash
cd backend
npx vitest run
```

Expected: todos os testes passam.

- [ ] **Step 5: Commit**

```bash
git add backend/src/app.ts
git commit -m "feat: register habilidadesRoutes in app"
```

---

## Task 6: Adicionar skills na rota GET /membros/:id

**Files:**
- Modify: `backend/src/membros/routes.ts`

- [ ] **Step 1: Adicionar import de `listSkillsForMember`**

No topo de `backend/src/membros/routes.ts`, após os imports existentes, adicionar:

```typescript
import { listSkillsForMember } from "../habilidades/store.js";
```

- [ ] **Step 2: Adicionar campo `skills` na resposta do GET `/membros/:id`**

Dentro do handler do `GET /api/v1/membros/:id`, na linha que monta o objeto de resposta (o `reply.status(200).send({ data: { ... } })`), adicionar o campo `skills` após `suspension`:

```typescript
        skills: (await listSkillsForMember(member.id)).map((s) => ({
          skill_id: s.skillId,
          name: s.name,
          description: s.description,
          rating: s.rating,
        })),
```

- [ ] **Step 3: Rodar os testes de habilidades para confirmar que o teste "skills aparecem nos detalhes do membro" passa**

```bash
cd backend
npx vitest run test/habilidades.integration.test.ts
```

Expected: todos passam incluindo o teste de skills nos detalhes.

- [ ] **Step 4: Rodar toda a suíte**

```bash
cd backend
npx vitest run
```

Expected: todos passam.

- [ ] **Step 5: Commit**

```bash
git add backend/src/membros/routes.ts
git commit -m "feat: include member skills in GET /membros/:id"
```

---

## Task 7: Frontend — funções de API

**Files:**
- Modify: `frontend/lib/api.ts`

- [ ] **Step 1: Adicionar funções de habilidades ao final de `frontend/lib/api.ts`**

```typescript
// --- Habilidades ---

export async function getSkills() {
  return request("/habilidades", { method: "GET" });
}

export async function createSkill(input: { name: string; description?: string }) {
  return request("/habilidades", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateSkill(
  id: string,
  input: { name?: string; description?: string | null }
) {
  return request(`/habilidades/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function deleteSkill(id: string) {
  return request(`/habilidades/${id}`, { method: "DELETE" });
}

export async function addMemberSkill(
  skillId: string,
  input: { member_id: string; rating: number }
) {
  return request(`/habilidades/${skillId}/membros`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateMemberSkill(
  skillId: string,
  memberId: string,
  input: { rating: number }
) {
  return request(`/habilidades/${skillId}/membros/${memberId}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function removeMemberSkill(skillId: string, memberId: string) {
  return request(`/habilidades/${skillId}/membros/${memberId}`, {
    method: "DELETE",
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/lib/api.ts
git commit -m "feat: add habilidades API functions to frontend"
```

---

## Task 8: Frontend — página /habilidades

**Files:**
- Create: `frontend/app/habilidades/page.tsx`
- Create: `frontend/app/habilidades/page.css`

- [ ] **Step 1: Criar `frontend/app/habilidades/page.css`**

```css
/* Habilidades page */

.habilidades-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 24px;
}

.habilidades-header h1 {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
}

.habilidades-header-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.habilidades-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.habilidade-item {
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 12px;
  overflow: hidden;
  background: var(--color-surface, #fff);
}

.habilidade-summary {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  cursor: pointer;
  user-select: none;
  width: 100%;
  background: none;
  border: none;
  text-align: left;
}

.habilidade-summary:hover {
  background: var(--color-surface-hover, #f9fafb);
}

.habilidade-chevron {
  transition: transform 0.2s;
  flex-shrink: 0;
  color: var(--color-muted, #6b7280);
}

.habilidade-chevron.open {
  transform: rotate(90deg);
}

.habilidade-name {
  font-weight: 600;
  font-size: 0.95rem;
  flex: 1;
}

.habilidade-count {
  font-size: 0.82rem;
  color: var(--color-muted, #6b7280);
  white-space: nowrap;
}

.habilidade-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.habilidade-body {
  border-top: 1px solid var(--color-border, #e5e7eb);
  padding: 12px 16px;
}

.habilidade-empty-members {
  color: var(--color-muted, #6b7280);
  font-size: 0.875rem;
  padding: 8px 0;
}

.habilidade-members-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.habilidade-members-table th {
  text-align: left;
  padding: 6px 8px;
  color: var(--color-muted, #6b7280);
  font-weight: 500;
  border-bottom: 1px solid var(--color-border, #e5e7eb);
}

.habilidade-members-table td {
  padding: 8px;
  vertical-align: middle;
}

.habilidade-members-table tr:not(:last-child) td {
  border-bottom: 1px solid var(--color-border-light, #f3f4f6);
}

.member-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.member-avatar-sm {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--color-primary, #6366f1);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  flex-shrink: 0;
  overflow: hidden;
}

.rating-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--color-primary-light, #e0e7ff);
  color: var(--color-primary, #4338ca);
  font-weight: 700;
  font-size: 0.875rem;
}

.member-row-actions {
  display: flex;
  gap: 4px;
}

.habilidades-empty {
  text-align: center;
  padding: 48px 16px;
  color: var(--color-muted, #6b7280);
}

.modal-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 16px;
}

.modal-field label {
  font-size: 0.875rem;
  font-weight: 500;
}

.modal-field input,
.modal-field select,
.modal-field textarea {
  padding: 8px 12px;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 8px;
  font-size: 0.875rem;
  background: var(--color-surface, #fff);
  color: var(--color-text, #111827);
  width: 100%;
  box-sizing: border-box;
}

.modal-field textarea {
  resize: vertical;
  min-height: 72px;
}

.modal-error {
  color: var(--color-danger, #dc2626);
  font-size: 0.875rem;
  margin-bottom: 12px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}
```

- [ ] **Step 2: Criar `frontend/app/habilidades/page.tsx`**

Nota: `Modal` é uma named export e gerencia seu próprio focus trap internamente — não usar `useFocusTrap` externamente, usar `<Modal isOpen={...} ...>` em vez de renderização condicional.

```typescript
"use client";

import "./page.css";
import Image from "next/image";
import { useEffect, useId, useReducer, useState } from "react";
import { useRouter } from "next/navigation";
import { FiChevronRight, FiEdit2, FiPlus, FiStar, FiTrash2, FiUserPlus } from "react-icons/fi";
import {
  addMemberSkill,
  createSkill,
  deleteSkill,
  getErrorMessage,
  getMembers,
  getSkills,
  removeMemberSkill,
  resolveApiAssetUrl,
  updateMemberSkill,
  updateSkill,
} from "../../lib/api";
import { getDefaultRoute, getStoredUser, isRoleAllowed, type Role } from "../../lib/auth";
import { Modal } from "../../components/Modal";

const allowedRoles: Role[] = ["admin"];

interface SkillMember {
  member_id: string;
  name: string;
  last_name?: string | null;
  photo_url?: string | null;
  rating: number;
}

interface Skill {
  id: string;
  name: string;
  description?: string | null;
  members: SkillMember[];
}

interface MemberOption {
  id: string;
  name: string;
  last_name?: string | null;
}

type SkillFormState = { name: string; description: string };
type SkillFormAction = { type: "SET"; field: keyof SkillFormState; value: string } | { type: "RESET" } | { type: "LOAD"; payload: SkillFormState };

function skillFormReducer(state: SkillFormState, action: SkillFormAction): SkillFormState {
  switch (action.type) {
    case "SET": return { ...state, [action.field]: action.value };
    case "RESET": return { name: "", description: "" };
    case "LOAD": return action.payload;
  }
}

type MemberSkillFormState = { skillId: string; memberId: string; rating: string };
type MemberSkillFormAction = { type: "SET"; field: keyof MemberSkillFormState; value: string } | { type: "RESET" } | { type: "LOAD"; payload: MemberSkillFormState };

function memberSkillFormReducer(state: MemberSkillFormState, action: MemberSkillFormAction): MemberSkillFormState {
  switch (action.type) {
    case "SET": return { ...state, [action.field]: action.value };
    case "RESET": return { skillId: "", memberId: "", rating: "5" };
    case "LOAD": return action.payload;
  }
}

export default function HabilidadesPage() {
  const router = useRouter();
  const skillModalTitleId = useId();
  const memberSkillModalTitleId = useId();
  const deleteModalTitleId = useId();

  const [skills, setSkills] = useState<Skill[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSkillId, setExpandedSkillId] = useState<string | null>(null);

  // Skill modal (create/edit)
  const [skillModalOpen, setSkillModalOpen] = useState(false);
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [skillForm, dispatchSkillForm] = useReducer(skillFormReducer, { name: "", description: "" });
  const [skillSaving, setSkillSaving] = useState(false);
  const [skillError, setSkillError] = useState<string | null>(null);

  // MemberSkill modal (add/edit)
  const [memberSkillModalOpen, setMemberSkillModalOpen] = useState(false);
  const [editingMemberSkill, setEditingMemberSkill] = useState<{ skillId: string; memberId: string } | null>(null);
  const [memberSkillForm, dispatchMemberSkillForm] = useReducer(memberSkillFormReducer, { skillId: "", memberId: "", rating: "5" });
  const [memberSkillSaving, setMemberSkillSaving] = useState(false);
  const [memberSkillError, setMemberSkillError] = useState<string | null>(null);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<{ type: "skill"; id: string; name: string } | { type: "memberSkill"; skillId: string; memberId: string; memberName: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    const user = getStoredUser();
    if (!user || !isRoleAllowed(user.role, allowedRoles)) {
      router.replace(getDefaultRoute(user?.role));
    }
  }, [router]);

  const loadSkills = async () => {
    try {
      const res = await getSkills();
      setSkills(res ?? []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async () => {
    try {
      const res = await getMembers({ limit: 500 });
      setMembers(res?.data ?? []);
    } catch {
      // silencioso — lista de membros é auxiliar
    }
  };

  useEffect(() => {
    loadSkills();
    loadMembers();
  }, []);

  const openCreateSkill = () => {
    setEditingSkillId(null);
    dispatchSkillForm({ type: "RESET" });
    setSkillError(null);
    setSkillModalOpen(true);
  };

  const openEditSkill = (skill: Skill) => {
    setEditingSkillId(skill.id);
    dispatchSkillForm({ type: "LOAD", payload: { name: skill.name, description: skill.description ?? "" } });
    setSkillError(null);
    setSkillModalOpen(true);
  };

  const handleSkillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!skillForm.name.trim()) {
      setSkillError("Nome é obrigatório");
      return;
    }
    setSkillSaving(true);
    setSkillError(null);
    try {
      if (editingSkillId) {
        await updateSkill(editingSkillId, {
          name: skillForm.name.trim(),
          description: skillForm.description.trim() || null,
        });
      } else {
        await createSkill({
          name: skillForm.name.trim(),
          description: skillForm.description.trim() || undefined,
        });
      }
      setSkillModalOpen(false);
      setLoading(true);
      await loadSkills();
    } catch (err) {
      setSkillError(getErrorMessage(err));
    } finally {
      setSkillSaving(false);
    }
  };

  const openAddMemberSkill = () => {
    setEditingMemberSkill(null);
    dispatchMemberSkillForm({ type: "RESET" });
    setMemberSkillError(null);
    setMemberSkillModalOpen(true);
  };

  const openEditMemberSkill = (skillId: string, memberId: string, currentRating: number) => {
    setEditingMemberSkill({ skillId, memberId });
    dispatchMemberSkillForm({ type: "LOAD", payload: { skillId, memberId, rating: String(currentRating) } });
    setMemberSkillError(null);
    setMemberSkillModalOpen(true);
  };

  const handleMemberSkillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rating = Number(memberSkillForm.rating);
    if (!memberSkillForm.skillId) { setMemberSkillError("Selecione uma habilidade"); return; }
    if (!memberSkillForm.memberId) { setMemberSkillError("Selecione um membro"); return; }
    if (!rating || rating < 1 || rating > 10) { setMemberSkillError("Nota deve ser entre 1 e 10"); return; }

    setMemberSkillSaving(true);
    setMemberSkillError(null);
    try {
      if (editingMemberSkill) {
        await updateMemberSkill(editingMemberSkill.skillId, editingMemberSkill.memberId, { rating });
      } else {
        await addMemberSkill(memberSkillForm.skillId, { member_id: memberSkillForm.memberId, rating });
      }
      setMemberSkillModalOpen(false);
      setLoading(true);
      await loadSkills();
    } catch (err) {
      setMemberSkillError(getErrorMessage(err));
    } finally {
      setMemberSkillSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      if (deleteTarget.type === "skill") {
        await deleteSkill(deleteTarget.id);
      } else {
        await removeMemberSkill(deleteTarget.skillId, deleteTarget.memberId);
      }
      setDeleteTarget(null);
      setLoading(true);
      await loadSkills();
    } catch (err) {
      setDeleteError(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const getMemberFullName = (m: SkillMember) =>
    [m.name, m.last_name].filter(Boolean).join(" ");

  if (loading) {
    return (
      <main className="page-content">
        <div className="habilidades-header">
          <h1>Habilidades</h1>
        </div>
        <p>Carregando...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="page-content">
        <div className="habilidades-header">
          <h1>Habilidades</h1>
        </div>
        <p className="modal-error">{error}</p>
      </main>
    );
  }

  return (
    <main className="page-content">
      <div className="habilidades-header">
        <h1>Habilidades</h1>
        <div className="habilidades-header-actions">
          <button type="button" className="btn btn-secondary" onClick={openAddMemberSkill}>
            <FiUserPlus aria-hidden="true" /> Adicionar a Membro
          </button>
          <button type="button" className="btn btn-primary" onClick={openCreateSkill}>
            <FiPlus aria-hidden="true" /> Nova Habilidade
          </button>
        </div>
      </div>

      {skills.length === 0 ? (
        <div className="habilidades-empty">
          <FiStar size={32} aria-hidden="true" />
          <p>Nenhuma habilidade cadastrada ainda.</p>
        </div>
      ) : (
        <div className="habilidades-list">
          {skills.map((skill) => {
            const isOpen = expandedSkillId === skill.id;
            return (
              <div key={skill.id} className="habilidade-item">
                <div className="habilidade-summary" style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px" }}>
                  <button
                    type="button"
                    onClick={() => setExpandedSkillId(isOpen ? null : skill.id)}
                    style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}
                    aria-expanded={isOpen}
                  >
                    <FiChevronRight
                      className={`habilidade-chevron${isOpen ? " open" : ""}`}
                      aria-hidden="true"
                    />
                    <span className="habilidade-name">{skill.name}</span>
                    <span className="habilidade-count">{skill.members.length} {skill.members.length === 1 ? "membro" : "membros"}</span>
                  </button>
                  <div className="habilidade-actions">
                    <button
                      type="button"
                      className="btn btn-icon"
                      aria-label={`Editar ${skill.name}`}
                      onClick={() => openEditSkill(skill)}
                    >
                      <FiEdit2 size={15} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="btn btn-icon btn-danger"
                      aria-label={`Deletar ${skill.name}`}
                      onClick={() => { setDeleteError(null); setDeleteTarget({ type: "skill", id: skill.id, name: skill.name }); }}
                    >
                      <FiTrash2 size={15} aria-hidden="true" />
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="habilidade-body">
                    {skill.members.length === 0 ? (
                      <p className="habilidade-empty-members">Nenhum membro associado a esta habilidade.</p>
                    ) : (
                      <table className="habilidade-members-table">
                        <thead>
                          <tr>
                            <th>Membro</th>
                            <th>Nota</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {skill.members.map((m) => (
                            <tr key={m.member_id}>
                              <td>
                                <div className="member-cell">
                                  <div className="member-avatar-sm">
                                    {m.photo_url ? (
                                      <Image
                                        src={resolveApiAssetUrl(m.photo_url)}
                                        alt={getMemberFullName(m)}
                                        width={28}
                                        height={28}
                                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                        unoptimized
                                      />
                                    ) : (
                                      m.name.charAt(0).toUpperCase()
                                    )}
                                  </div>
                                  {getMemberFullName(m)}
                                </div>
                              </td>
                              <td>
                                <span className="rating-badge">{m.rating}</span>
                              </td>
                              <td>
                                <div className="member-row-actions">
                                  <button
                                    type="button"
                                    className="btn btn-icon"
                                    aria-label={`Editar nota de ${getMemberFullName(m)}`}
                                    onClick={() => openEditMemberSkill(skill.id, m.member_id, m.rating)}
                                  >
                                    <FiEdit2 size={13} aria-hidden="true" />
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-icon btn-danger"
                                    aria-label={`Remover ${getMemberFullName(m)} de ${skill.name}`}
                                    onClick={() => { setDeleteError(null); setDeleteTarget({ type: "memberSkill", skillId: skill.id, memberId: m.member_id, memberName: getMemberFullName(m) }); }}
                                  >
                                    <FiTrash2 size={13} aria-hidden="true" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Criar/Editar Habilidade */}
      <Modal
        isOpen={skillModalOpen}
        title={editingSkillId ? "Editar Habilidade" : "Nova Habilidade"}
        titleId={skillModalTitleId}
        onClose={() => setSkillModalOpen(false)}
      >
          <form onSubmit={handleSkillSubmit}>
            <div className="modal-field">
              <label htmlFor="skill-name">Nome *</label>
              <input
                id="skill-name"
                type="text"
                value={skillForm.name}
                onChange={(e) => dispatchSkillForm({ type: "SET", field: "name", value: e.target.value })}
                maxLength={100}
                autoFocus
              />
            </div>
            <div className="modal-field">
              <label htmlFor="skill-description">Descrição (opcional)</label>
              <textarea
                id="skill-description"
                value={skillForm.description}
                onChange={(e) => dispatchSkillForm({ type: "SET", field: "description", value: e.target.value })}
              />
            </div>
            {skillError && <p className="modal-error">{skillError}</p>}
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setSkillModalOpen(false)} disabled={skillSaving}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={skillSaving}>
                {skillSaving ? "Salvando..." : editingSkillId ? "Salvar" : "Criar"}
              </button>
            </div>
          </form>
      </Modal>

      {/* Modal: Adicionar/Editar Habilidade a Membro */}
      <Modal
        isOpen={memberSkillModalOpen}
        title={editingMemberSkill ? "Editar Nota" : "Adicionar Habilidade a Membro"}
        titleId={memberSkillModalTitleId}
        onClose={() => setMemberSkillModalOpen(false)}
      >
          <form onSubmit={handleMemberSkillSubmit}>
            <div className="modal-field">
              <label htmlFor="ms-skill">Habilidade *</label>
              <select
                id="ms-skill"
                value={memberSkillForm.skillId}
                onChange={(e) => dispatchMemberSkillForm({ type: "SET", field: "skillId", value: e.target.value })}
                disabled={!!editingMemberSkill}
              >
                <option value="">Selecione...</option>
                {skills.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="modal-field">
              <label htmlFor="ms-member">Membro *</label>
              <select
                id="ms-member"
                value={memberSkillForm.memberId}
                onChange={(e) => dispatchMemberSkillForm({ type: "SET", field: "memberId", value: e.target.value })}
                disabled={!!editingMemberSkill}
              >
                <option value="">Selecione...</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {[m.name, m.last_name].filter(Boolean).join(" ")}
                  </option>
                ))}
              </select>
            </div>
            <div className="modal-field">
              <label htmlFor="ms-rating">Nota (1–10) *</label>
              <select
                id="ms-rating"
                value={memberSkillForm.rating}
                onChange={(e) => dispatchMemberSkillForm({ type: "SET", field: "rating", value: e.target.value })}
              >
                {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            {memberSkillError && <p className="modal-error">{memberSkillError}</p>}
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setMemberSkillModalOpen(false)} disabled={memberSkillSaving}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={memberSkillSaving}>
                {memberSkillSaving ? "Salvando..." : editingMemberSkill ? "Salvar" : "Adicionar"}
              </button>
            </div>
          </form>
      </Modal>

      {/* Modal: Confirmar exclusão */}
      <Modal
        isOpen={!!deleteTarget}
        title="Confirmar exclusão"
        titleId={deleteModalTitleId}
        onClose={() => setDeleteTarget(null)}
      >
          <p>
            {deleteTarget.type === "skill"
              ? `Tem certeza que deseja excluir a habilidade "${deleteTarget.name}"? Todos os vínculos com membros serão removidos.`
              : `Tem certeza que deseja remover "${deleteTarget.memberName}" desta habilidade?`}
          </p>
          {deleteError && <p className="modal-error">{deleteError}</p>}
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancelar
            </button>
            <button type="button" className="btn btn-danger" onClick={handleDeleteConfirm} disabled={deleting}>
              {deleting ? "Removendo..." : "Confirmar"}
            </button>
          </div>
      </Modal>
    </main>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/app/habilidades/page.tsx frontend/app/habilidades/page.css
git commit -m "feat: add habilidades page with accordion UI"
```

---

## Task 9: SidebarNav — adicionar item "Habilidades"

**Files:**
- Modify: `frontend/app/components/SidebarNav.tsx`

- [ ] **Step 1: Adicionar import de FiStar**

Em `frontend/app/components/SidebarNav.tsx`, na linha que importa os ícones, adicionar `FiStar`:

```typescript
import {
  FiAlertTriangle,
  FiBarChart2,
  FiBookOpen,
  FiFileText,
  FiGrid,
  FiMenu,
  FiMessageSquare,
  FiMoon,
  FiSun,
  FiStar,
  FiUser,
  FiUsers,
  FiX,
} from "react-icons/fi";
```

- [ ] **Step 2: Adicionar item na lista `navItems`**

Após o item "Feedbacks" (antes de "Membros"), adicionar:

```typescript
  {
    label: "Habilidades",
    href: "/habilidades",
    roles: ["admin"],
    icon: <FiStar aria-hidden="true" />
  },
```

- [ ] **Step 3: Commit**

```bash
git add frontend/app/components/SidebarNav.tsx
git commit -m "feat: add Habilidades to sidebar navigation"
```

---

## Task 10: Aba "Habilidades" nos detalhes do membro

**Files:**
- Modify: `frontend/app/usuarios/page.tsx`

- [ ] **Step 1: Adicionar `"habilidades"` ao tipo `detailsTab`**

Na linha 178 de `frontend/app/usuarios/page.tsx`, substituir:

```typescript
  const [detailsTab, setDetailsTab] = useState<"dados" | "cursos" | "advertencias" | "clientes" | "feedbacks">("dados");
```

por:

```typescript
  const [detailsTab, setDetailsTab] = useState<"dados" | "cursos" | "advertencias" | "clientes" | "feedbacks" | "habilidades">("dados");
```

- [ ] **Step 2: Adicionar campo `skills` na interface `MemberDetails`**

Na interface `MemberDetails` (em torno da linha 123), adicionar após `warnings?`:

```typescript
  skills?: { skill_id: string; name: string; description?: string | null; rating: number }[];
```

- [ ] **Step 3: Adicionar botão da aba na lista de tabs**

Encontrar o array que mapeia as tabs (em torno da linha 990):

```typescript
{(["dados", "feedbacks", "clientes", "cursos", "advertencias"] as const).map((tab) => {
```

Substituir por:

```typescript
{(["dados", "feedbacks", "clientes", "cursos", "advertencias", "habilidades"] as const).map((tab) => {
```

- [ ] **Step 4: Adicionar o label da aba "habilidades"**

Na linha 991 de `frontend/app/usuarios/page.tsx`, dentro do `.map((tab) => {`, existe:

```typescript
const labels = { dados: "Dados", feedbacks: "Feedbacks", clientes: "Clientes", cursos: "Cursos", advertencias: "Advertências" };
```

Substituir por:

```typescript
const labels = { dados: "Dados", feedbacks: "Feedbacks", clientes: "Clientes", cursos: "Cursos", advertencias: "Advertências", habilidades: "Habilidades" };
```

- [ ] **Step 5: Adicionar o conteúdo da aba "habilidades"**

Após o bloco `{isAdmin && detailsTab === "advertencias" && ( ... )}`, adicionar:

```typescript
              {isAdmin && detailsTab === "habilidades" && (
                <div className="details-tab-content">
                  {!selectedMemberDetails?.skills || selectedMemberDetails.skills.length === 0 ? (
                    <p className="details-empty">Nenhuma habilidade registrada para este membro.</p>
                  ) : (
                    <ul className="details-list">
                      {selectedMemberDetails.skills.map((s) => (
                        <li key={s.skill_id} className="details-list-item">
                          <span className="details-list-label">{s.name}</span>
                          <span className="details-list-value">Nota: {s.rating}/10</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
```

- [ ] **Step 6: Verificar se a aba só aparece para admins**

A condição `isAdmin &&` na renderização do conteúdo (step 5) já garante isso. O botão da aba deve também ser condicional. Verificar como as outras abas admin-only são renderizadas (clientes, feedbacks) e seguir o mesmo padrão para esconder o botão de "habilidades" de não-admins.

- [ ] **Step 7: Commit**

```bash
git add frontend/app/usuarios/page.tsx
git commit -m "feat: add habilidades tab to member details modal"
```

---

## Task 11: Verificação final

- [ ] **Step 1: Rodar toda a suíte de testes backend**

```bash
cd backend
npx vitest run
```

Expected: todos os testes passam.

- [ ] **Step 2: Build do frontend sem erros de tipo**

```bash
cd frontend
npx tsc --noEmit
```

Expected: sem erros.

- [ ] **Step 3: Verificação manual**

Iniciar os servidores e testar:

1. Menu lateral exibe "Habilidades" para admin
2. Criar uma habilidade → aparece na lista
3. Editar nome/descrição → atualiza
4. Adicionar membro com nota → aparece expandindo a habilidade, ordenado por nota
5. Editar nota → atualiza
6. Remover membro → desaparece da habilidade
7. Deletar habilidade → some da lista
8. Abrir detalhes de membro em /usuarios → aba Habilidades mostra as habilidades do membro
9. Membro/recreador não vê a página (redireciona)
