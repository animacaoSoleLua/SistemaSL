# Editar Cursos Importados — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que admin e animador (criador) editem metadados e participantes de cursos importados (arquivados), via botão "Editar" na aba "Finalizados" que abre o modal de importação pré-preenchido.

**Architecture:** Novo endpoint `PATCH /api/v1/cursos/:id/participantes` sincroniza a lista de participantes de um curso arquivado (add/remove/update em transaction). No frontend, o modal de importação ganha modo edição controlado por `importEditingId`: quando não-nulo, pré-preenche campos e chama dois PATCHs sequenciais ao salvar.

**Tech Stack:** TypeScript, Fastify, Prisma, React (Next.js), Vitest (testes de integração)

---

## Mapa de Arquivos

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `backend/src/cursos/store.ts` | Modificar | Adicionar `syncParticipants` |
| `backend/src/cursos/routes.ts` | Modificar | Adicionar rota `PATCH /:id/participantes` |
| `backend/test/cursos.integration.test.ts` | Modificar | Testes do novo endpoint |
| `frontend/lib/api.ts` | Modificar | Adicionar `syncCourseParticipants` |
| `frontend/app/cursos/page.tsx` | Modificar | Botão editar + modo edição no modal |

---

## Task 1: Função `syncParticipants` no store

**Files:**
- Modify: `backend/src/cursos/store.ts`

- [ ] **Step 1: Adicionar a função no final de `store.ts`, antes dos exports de enrollment**

Abrir `backend/src/cursos/store.ts` e adicionar após a função `updateEnrollmentStatus`:

```typescript
export async function syncParticipants(
  courseId: string,
  members: Array<{ memberId: string; status: "attended" | "missed" }>
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const current = await tx.courseEnrollment.findMany({
      where: { courseId },
    });
    const currentMap = new Map(current.map((e) => [e.memberId, e]));
    const newMap = new Map(members.map((m) => [m.memberId, m]));

    const toDelete = current.filter((e) => !newMap.has(e.memberId));
    if (toDelete.length > 0) {
      await tx.courseEnrollment.deleteMany({
        where: { id: { in: toDelete.map((e) => e.id) } },
      });
    }

    const toAdd = members.filter((m) => !currentMap.has(m.memberId));
    if (toAdd.length > 0) {
      await tx.courseEnrollment.createMany({
        data: toAdd.map((m) => ({
          courseId,
          memberId: m.memberId,
          status: m.status,
        })),
      });
    }

    for (const m of members) {
      const existing = currentMap.get(m.memberId);
      if (existing && existing.status !== m.status) {
        await tx.courseEnrollment.update({
          where: { id: existing.id },
          data: { status: m.status },
        });
      }
    }
  });
}
```

- [ ] **Step 2: Verificar que o TypeScript compila sem erros**

```bash
cd "/home/arthu/UnB - Linux/SL/SistemaSL/backend" && npx tsc --noEmit
```

Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
cd "/home/arthu/UnB - Linux/SL/SistemaSL"
git add backend/src/cursos/store.ts
git commit -m "feat(cursos): add syncParticipants to store"
```

---

## Task 2: Rota `PATCH /api/v1/cursos/:id/participantes`

**Files:**
- Modify: `backend/src/cursos/routes.ts`

- [ ] **Step 1: Adicionar import de `syncParticipants` na linha dos imports do store**

Em `backend/src/cursos/routes.ts`, encontrar o bloco de imports do store e adicionar `syncParticipants`:

```typescript
import {
  addEnrollment,
  archiveCourse,
  createCourse,
  deleteCourse,
  EnrollmentStatus,
  finalizeEnrollments,
  getCourseById,
  getCourseWithMembers,
  getEnrollmentById,
  getEnrollmentByMember,
  importCourse,
  listArchivedCourses,
  listCourses,
  removeEnrollment,
  syncParticipants,
  updateCourse,
  updateEnrollmentStatus,
} from "./store.js";
```

- [ ] **Step 2: Adicionar o schema de validação do body**

Após o `ImportCourseSchema` existente, adicionar:

```typescript
const SyncParticipantsSchema = z.object({
  members: z
    .array(
      z.object({
        member_id: z.string().min(1),
        status: z.enum(["attended", "missed"]),
      })
    )
    .default([]),
});
```

- [ ] **Step 3: Adicionar a rota dentro de `cursosRoutes`, após a rota de importar**

Adicionar após o `app.post("/api/v1/cursos/importar", ...)`:

```typescript
app.patch(
  "/api/v1/cursos/:id/participantes",
  { preHandler: requireRole(["admin", "animador"]) },
  async (request, reply) => {
    const params = request.params as { id?: string };
    if (!params.id) {
      return reply.status(400).send({
        error: "invalid_request",
        message: "Curso invalido",
      });
    }

    if (!request.user) {
      return reply.status(401).send({
        error: "unauthorized",
        message: "Token ausente",
      });
    }

    const course = await getCourseById(params.id);
    if (!course) {
      return reply.status(404).send({
        error: "not_found",
        message: "Curso nao encontrado",
      });
    }

    if (!course.archivedAt) {
      return reply.status(409).send({
        error: "invalid_request",
        message: "Apenas cursos arquivados podem ter participantes sincronizados",
      });
    }

    if (request.user.role !== "admin" && course.createdBy !== request.user.id) {
      return reply.status(403).send({
        error: "forbidden",
        message: "Acesso negado",
      });
    }

    const parsedBody = SyncParticipantsSchema.safeParse(request.body);
    if (!parsedBody.success) {
      return reply.status(400).send({
        error: "invalid_request",
        message: parsedBody.error.issues[0].message,
      });
    }

    const { members } = parsedBody.data;

    const memberIds = members.map((m) => m.member_id);
    const uniqueIds = new Set(memberIds);
    if (uniqueIds.size !== memberIds.length) {
      return reply.status(400).send({
        error: "invalid_request",
        message: "Membros duplicados na lista",
      });
    }

    for (const memberId of memberIds) {
      if (!(await getUserById(memberId))) {
        return reply.status(404).send({
          error: "not_found",
          message: "Membro nao encontrado",
        });
      }
    }

    await syncParticipants(
      course.id,
      members.map((m) => ({ memberId: m.member_id, status: m.status }))
    );

    return reply.status(200).send({
      data: { updated: members.length },
    });
  }
);
```

- [ ] **Step 4: Verificar TypeScript**

```bash
cd "/home/arthu/UnB - Linux/SL/SistemaSL/backend" && npx tsc --noEmit
```

Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
cd "/home/arthu/UnB - Linux/SL/SistemaSL"
git add backend/src/cursos/routes.ts
git commit -m "feat(cursos): add PATCH /cursos/:id/participantes endpoint"
```

---

## Task 3: Testes de integração para o novo endpoint

**Files:**
- Modify: `backend/test/cursos.integration.test.ts`

- [ ] **Step 1: Escrever os testes — adicionar ao final do `describe`, antes do fechamento**

Abrir `backend/test/cursos.integration.test.ts` e adicionar antes do último `});` do `describe`:

```typescript
it("allows admin to sync participants of an archived course", async () => {
  const loginAdmin = await app.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    payload: { email: "arthurssousa2004@gmail.com", password: "admin123" },
  });
  const adminToken = loginAdmin.json().data.access_token;
  const adminUser = await getUserByEmail("arthurssousa2004@gmail.com");
  const animador = await getUserByEmail("animador@sol-e-lua.com");
  const recreador = await getUserByEmail("recreador@sol-e-lua.com");

  // Importar curso com 1 participante
  const importResponse = await app.inject({
    method: "POST",
    url: "/api/v1/cursos/importar",
    headers: { authorization: `Bearer ${adminToken}` },
    payload: {
      title: "Curso Sync Test",
      course_date: "2024-01-15T09:00",
      instructor_id: adminUser!.id,
      members: [{ member_id: animador!.id, status: "attended" }],
    },
  });
  expect(importResponse.statusCode).toBe(201);
  const courseId = importResponse.json().data.id;

  // Sync: remover animador, adicionar recreador, sem alterar status
  const syncResponse = await app.inject({
    method: "PATCH",
    url: `/api/v1/cursos/${courseId}/participantes`,
    headers: { authorization: `Bearer ${adminToken}` },
    payload: {
      members: [{ member_id: recreador!.id, status: "missed" }],
    },
  });
  expect(syncResponse.statusCode).toBe(200);
  expect(syncResponse.json().data.updated).toBe(1);

  // Verificar que a lista foi atualizada
  const courseResponse = await app.inject({
    method: "GET",
    url: `/api/v1/cursos/${courseId}`,
    headers: { authorization: `Bearer ${adminToken}` },
  });
  const enrollments = courseResponse.json().data.enrollments as Array<{
    member_id: string;
    status: string;
  }>;
  expect(enrollments).toHaveLength(1);
  expect(enrollments[0].member_id).toBe(recreador!.id);
  expect(enrollments[0].status).toBe("missed");
});

it("allows animador to sync participants of their own imported course", async () => {
  const loginAdmin = await app.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    payload: { email: "arthurssousa2004@gmail.com", password: "admin123" },
  });
  const adminUser = await getUserByEmail("arthurssousa2004@gmail.com");

  const loginAnimador = await app.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    payload: { email: "animador@sol-e-lua.com", password: "animador123" },
  });
  const animadorToken = loginAnimador.json().data.access_token;
  const animador = await getUserByEmail("animador@sol-e-lua.com");
  const recreador = await getUserByEmail("recreador@sol-e-lua.com");

  // Animador importa curso
  const importResponse = await app.inject({
    method: "POST",
    url: "/api/v1/cursos/importar",
    headers: { authorization: `Bearer ${animadorToken}` },
    payload: {
      title: "Curso do Animador",
      course_date: "2024-02-10T14:00",
      instructor_id: adminUser!.id,
      members: [],
    },
  });
  expect(importResponse.statusCode).toBe(201);
  const courseId = importResponse.json().data.id;

  // Animador adiciona participante ao próprio curso
  const syncResponse = await app.inject({
    method: "PATCH",
    url: `/api/v1/cursos/${courseId}/participantes`,
    headers: { authorization: `Bearer ${animadorToken}` },
    payload: {
      members: [
        { member_id: animador!.id, status: "attended" },
        { member_id: recreador!.id, status: "missed" },
      ],
    },
  });
  expect(syncResponse.statusCode).toBe(200);
  expect(syncResponse.json().data.updated).toBe(2);
});

it("blocks animador from syncing participants of another user's imported course", async () => {
  const loginAdmin = await app.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    payload: { email: "arthurssousa2004@gmail.com", password: "admin123" },
  });
  const adminToken = loginAdmin.json().data.access_token;
  const adminUser = await getUserByEmail("arthurssousa2004@gmail.com");

  const loginAnimador = await app.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    payload: { email: "animador@sol-e-lua.com", password: "animador123" },
  });
  const animadorToken = loginAnimador.json().data.access_token;

  // Admin importa curso
  const importResponse = await app.inject({
    method: "POST",
    url: "/api/v1/cursos/importar",
    headers: { authorization: `Bearer ${adminToken}` },
    payload: {
      title: "Curso do Admin",
      course_date: "2024-03-05T10:00",
      instructor_id: adminUser!.id,
      members: [],
    },
  });
  const courseId = importResponse.json().data.id;

  // Animador tenta sync no curso do admin
  const syncResponse = await app.inject({
    method: "PATCH",
    url: `/api/v1/cursos/${courseId}/participantes`,
    headers: { authorization: `Bearer ${animadorToken}` },
    payload: { members: [] },
  });
  expect(syncResponse.statusCode).toBe(403);
});

it("rejects sync on non-archived course", async () => {
  const loginAdmin = await app.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    payload: { email: "arthurssousa2004@gmail.com", password: "admin123" },
  });
  const adminToken = loginAdmin.json().data.access_token;
  const adminUser = await getUserByEmail("arthurssousa2004@gmail.com");

  // Criar curso ativo (não arquivado)
  const createResponse = await app.inject({
    method: "POST",
    url: "/api/v1/cursos",
    headers: { authorization: `Bearer ${adminToken}` },
    payload: {
      title: "Curso Ativo",
      course_date: "2027-01-01T10:00",
      instructor_id: adminUser!.id,
      capacity: 10,
    },
  });
  const courseId = createResponse.json().data.id;

  const syncResponse = await app.inject({
    method: "PATCH",
    url: `/api/v1/cursos/${courseId}/participantes`,
    headers: { authorization: `Bearer ${adminToken}` },
    payload: { members: [] },
  });
  expect(syncResponse.statusCode).toBe(409);
  expect(syncResponse.json().error).toBe("invalid_request");
});

it("rejects sync with duplicate member_ids", async () => {
  const loginAdmin = await app.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    payload: { email: "arthurssousa2004@gmail.com", password: "admin123" },
  });
  const adminToken = loginAdmin.json().data.access_token;
  const adminUser = await getUserByEmail("arthurssousa2004@gmail.com");

  const importResponse = await app.inject({
    method: "POST",
    url: "/api/v1/cursos/importar",
    headers: { authorization: `Bearer ${adminToken}` },
    payload: {
      title: "Curso Dup Test",
      course_date: "2024-04-01T08:00",
      instructor_id: adminUser!.id,
      members: [],
    },
  });
  const courseId = importResponse.json().data.id;

  const syncResponse = await app.inject({
    method: "PATCH",
    url: `/api/v1/cursos/${courseId}/participantes`,
    headers: { authorization: `Bearer ${adminToken}` },
    payload: {
      members: [
        { member_id: adminUser!.id, status: "attended" },
        { member_id: adminUser!.id, status: "missed" },
      ],
    },
  });
  expect(syncResponse.statusCode).toBe(400);
  expect(syncResponse.json().error).toBe("invalid_request");
});
```

- [ ] **Step 2: Rodar os testes para verificar que passam**

```bash
cd "/home/arthu/UnB - Linux/SL/SistemaSL/backend" && npx vitest run test/cursos.integration.test.ts
```

Expected: todos os testes passam incluindo os 5 novos.

- [ ] **Step 3: Commit**

```bash
cd "/home/arthu/UnB - Linux/SL/SistemaSL"
git add backend/test/cursos.integration.test.ts
git commit -m "test(cursos): integration tests for PATCH /participantes"
```

---

## Task 4: Função `syncCourseParticipants` no frontend api.ts

**Files:**
- Modify: `frontend/lib/api.ts`

- [ ] **Step 1: Adicionar a função após `importCourse`**

Em `frontend/lib/api.ts`, adicionar após a função `importCourse`:

```typescript
export async function syncCourseParticipants(
  courseId: string,
  members: Array<{ member_id: string; status: "attended" | "missed" }>
) {
  return request(`/cursos/${courseId}/participantes`, {
    method: "PATCH",
    body: JSON.stringify({ members }),
  });
}
```

- [ ] **Step 2: Verificar TypeScript no frontend**

```bash
cd "/home/arthu/UnB - Linux/SL/SistemaSL/frontend" && npx tsc --noEmit
```

Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
cd "/home/arthu/UnB - Linux/SL/SistemaSL"
git add frontend/lib/api.ts
git commit -m "feat(api): add syncCourseParticipants"
```

---

## Task 5: Botão editar e modo edição no modal de importação

**Files:**
- Modify: `frontend/app/cursos/page.tsx`

### Step 1: Adicionar import de `syncCourseParticipants`

- [ ] Na linha dos imports de `../../lib/api`, adicionar `syncCourseParticipants`:

```typescript
import {
  cancelEnrollment,
  createCourse,
  deleteCourse,
  enrollInCourse,
  finalizeCourse,
  getCourse,
  getCourses,
  getEnrolledMembers,
  getErrorMessage,
  getMember,
  getMembers,
  importCourse,
  syncCourseParticipants,
  updateCourse,
} from "../../lib/api";
```

### Step 2: Adicionar estados de modo edição

- [ ] Após a linha `const importTrapRef = useFocusTrap(importModalOpen);`, adicionar:

```typescript
const [importEditingId, setImportEditingId] = useState<string | null>(null);
const [importEditingLoading, setImportEditingLoading] = useState(false);
```

### Step 3: Adicionar a função `openEditImportModal`

- [ ] Após a função `resetImportModal`, adicionar:

```typescript
const openEditImportModal = async (courseId: string) => {
  setImportEditingId(courseId);
  setImportEditingLoading(true);
  setImportModalOpen(true);
  setImportFormError(null);
  try {
    const response = await getCourse(courseId);
    const data = response.data as CourseDetails;
    const rawDate = data.course_date ?? "";
    const sep = rawDate.includes("T") ? "T" : " ";
    const [datePart = "", timeFull = ""] = rawDate.split(sep);
    setImportTitle(data.title ?? "");
    setImportDescription(data.description ?? "");
    setImportDate(isoToDisplay(datePart));
    setImportTime(timeFull.slice(0, 5) || "08:00");
    setImportLocation(data.location ?? "");
    setImportInstructorId(data.instructor?.id ?? "");
    setImportParticipants(
      (data.enrollments ?? []).map((e) => ({
        id: e.member_id,
        name: e.member_name,
        status: e.status as "attended" | "missed",
      }))
    );
  } catch (err: unknown) {
    setNotice({
      type: "error",
      message: getErrorMessage(err, "Não foi possível carregar o curso para edição."),
    });
    setImportModalOpen(false);
    setImportEditingId(null);
  } finally {
    setImportEditingLoading(false);
  }
};
```

### Step 4: Atualizar `resetImportModal`

- [ ] Adicionar reset dos novos estados na função existente `resetImportModal`:

```typescript
function resetImportModal() {
  setImportTitle("");
  setImportDescription("");
  setImportDate("");
  setImportTime("");
  setImportLocation("");
  setImportInstructorId(members[0]?.id ?? "");
  setImportSearch("");
  setImportParticipants([]);
  setImportFormError(null);
  setImportEditingId(null);
  setImportEditingLoading(false);
}
```

### Step 5: Atualizar `handleImportSubmit` para modo edição

- [ ] Substituir o conteúdo de `handleImportSubmit` para tratar os dois modos:

```typescript
async function handleImportSubmit(e: React.FormEvent) {
  e.preventDefault();
  setImportFormError(null);

  if (!importTitle.trim()) {
    setImportFormError("Título é obrigatório");
    return;
  }
  if (!importDate || !importTime) {
    setImportFormError("Data e hora são obrigatórias");
    return;
  }
  if (!importInstructorId) {
    setImportFormError("Instrutor é obrigatório");
    return;
  }

  setImportSaving(true);
  try {
    if (importEditingId) {
      await updateCourse(importEditingId, {
        title: importTitle.trim(),
        description: importDescription.trim() || undefined,
        course_date: `${displayToIso(importDate)}T${importTime}`,
        location: importLocation.trim() || undefined,
        instructor_id: importInstructorId,
      });
      await syncCourseParticipants(
        importEditingId,
        importParticipants.map((p) => ({ member_id: p.id, status: p.status }))
      );
      setImportModalOpen(false);
      resetImportModal();
      setNotice({ type: "success", message: "Curso atualizado com sucesso!" });
    } else {
      await importCourse({
        title: importTitle.trim(),
        description: importDescription.trim() || undefined,
        course_date: `${displayToIso(importDate)}T${importTime}`,
        location: importLocation.trim() || undefined,
        instructor_id: importInstructorId,
        members: importParticipants.map((p) => ({
          member_id: p.id,
          status: p.status,
        })),
      });
      setImportModalOpen(false);
      resetImportModal();
      setNotice({ type: "success", message: "Curso importado com sucesso!" });
    }
    getCourses({ status: statusFilter }).then((data) => setCourses(data.data));
  } catch (err) {
    setImportFormError(getErrorMessage(err));
  } finally {
    setImportSaving(false);
  }
}
```

### Step 6: Adicionar botão "Editar" na lista de cursos arquivados

- [ ] Dentro do bloco `{statusFilter === "archived" && currentRole === "admin" && (`, substituir por:

```tsx
{statusFilter === "archived" &&
  currentUser &&
  (currentRole === "admin" || course.created_by === currentUser.id) && (
  <>
    <button
      type="button"
      className="button secondary"
      onClick={(event) => {
        event.stopPropagation();
        openEditImportModal(course.id);
      }}
      aria-label={`Editar curso ${course.title}`}
    >
      <FiEdit2 size={14} />
      Editar
    </button>
    <button
      type="button"
      className="button danger"
      onClick={(event) => {
        event.stopPropagation();
        handleDeleteCourse(course.id, course.title);
      }}
      disabled={deletingId === course.id}
      aria-label={`Deletar curso ${course.title}`}
    >
      <FiTrash2 style={{ marginRight: "4px" }} />
      {deletingId === course.id ? "Apagando..." : "Apagar"}
    </button>
  </>
)}
```

### Step 7: Atualizar o título e botão de submit do modal de importação

- [ ] No modal de importação (`{importModalOpen && (`), substituir o título do header:

```tsx
<h2 className="section-title" id={importModalTitleId}>
  {importEditingId ? "Editar Curso Importado" : "Importar Curso Histórico"}
</h2>
```

- [ ] No modal de importação, o `<div className="modal-body">` atualmente contém diretamente a tag `<form id="import-course-form" ...>`. Envolver o `<form>` com o condicional de loading:

```tsx
<div className="modal-body">
  {importEditingLoading ? (
    <p className="helper">Carregando dados do curso...</p>
  ) : (
    <form id="import-course-form" onSubmit={handleImportSubmit}>
      {/* manter todo o conteúdo existente da form sem alteração */}
    </form>
  )}
</div>
```

A tag de abertura `<form id="import-course-form" onSubmit={handleImportSubmit}>` e sua tag de fechamento `</form>` já existem — basta envolvê-las com o ternário acima, sem alterar o conteúdo interno.

- [ ] No botão de submit do modal, atualizar o texto:

```tsx
<button
  type="submit"
  form="import-course-form"
  className="button"
  disabled={importSaving || importEditingLoading}
>
  {importSaving
    ? importEditingId ? "Salvando..." : "Importando..."
    : importEditingId ? "Salvar alterações" : "Importar Curso"}
</button>
```

- [ ] **Step 8: Verificar TypeScript**

```bash
cd "/home/arthu/UnB - Linux/SL/SistemaSL/frontend" && npx tsc --noEmit
```

Expected: sem erros.

- [ ] **Step 9: Commit**

```bash
cd "/home/arthu/UnB - Linux/SL/SistemaSL"
git add frontend/app/cursos/page.tsx
git commit -m "feat(cursos): edit mode for imported courses in import modal"
```

---

## Verificação Final

- [ ] **Rodar todos os testes do backend**

```bash
cd "/home/arthu/UnB - Linux/SL/SistemaSL/backend" && npx vitest run
```

Expected: todos os testes passam.

- [ ] **Testar o fluxo manual**
  1. Logar como admin ou animador
  2. Acessar "Cursos" → filtro "Finalizados"
  3. Verificar que cursos importados mostram botão "Editar"
  4. Clicar em "Editar" — modal abre com dados pré-preenchidos e participantes listados
  5. Trocar o status de um participante de "Compareceu" para "Faltou"
  6. Adicionar um participante esquecido via busca
  7. Remover um participante com o X
  8. Alterar o título e salvar
  9. Verificar que os dados foram atualizados na lista

- [ ] **Commit final se necessário**

```bash
cd "/home/arthu/UnB - Linux/SL/SistemaSL"
git status
```
