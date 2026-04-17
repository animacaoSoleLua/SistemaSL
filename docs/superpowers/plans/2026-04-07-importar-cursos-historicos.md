# Importar Cursos Históricos — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que admins/animadores importem cursos que já aconteceram no passado, atribuindo participantes e presença diretamente, arquivando o curso em uma única operação.

**Architecture:** Um novo endpoint `POST /api/v1/cursos/importar` cria o curso, inscrições (com status final `attended`/`missed`) e arquiva tudo em uma transação Prisma. No frontend, um botão "Importar Curso" na página de cursos abre um modal dedicado com formulário de dados do curso + barra de pesquisa de membros + seleção de presença.

**Tech Stack:** Fastify + Prisma (backend), Next.js + React (frontend), Zod (validação), Vitest (testes de integração).

---

## Mapa de Arquivos

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `backend/src/cursos/store.ts` | Modificar | Adicionar função `importCourse` |
| `backend/src/cursos/routes.ts` | Modificar | Adicionar rota `POST /api/v1/cursos/importar` |
| `backend/test/cursos.integration.test.ts` | Modificar | Adicionar testes de integração do endpoint |
| `frontend/lib/api.ts` | Modificar | Adicionar função `importCourse` |
| `frontend/app/cursos/page.tsx` | Modificar | Adicionar estado + modal de importação |

---

## Task 1: Função `importCourse` no store (backend)

**Files:**
- Modify: `backend/src/cursos/store.ts`

### Contexto

O store atual tem `createCourse`, `addEnrollment`, `finalizeEnrollments` e `archiveCourse` como operações separadas. Para importação histórica, precisamos de uma transação atômica que faça tudo de uma vez: cria o curso, cria as inscrições já com status final, e arquiva.

A função recebe `members` com `memberId` e `status` (`"attended"` | `"missed"`) — nunca `"enrolled"`, pois o curso já aconteceu.

- [ ] **Step 1: Escrever o teste de unidade da função `importCourse`**

Não há testes unitários de store neste projeto — os testes são de integração via HTTP. Pule para o Task 2 onde os testes de integração cobrirão esta função.

- [ ] **Step 2: Adicionar a interface `ImportCourseInput` e a função `importCourse` em `backend/src/cursos/store.ts`**

Adicionar logo após a função `createCourse` (linha ~127):

```typescript
export interface ImportCourseInput {
  instructorId: string;
  title: string;
  description?: string;
  courseDate: Date;
  location?: string;
  members: Array<{ memberId: string; status: "attended" | "missed" }>;
}

export async function importCourse(
  createdBy: string,
  input: ImportCourseInput
): Promise<CourseRecord> {
  const now = new Date();

  const course = await prisma.$transaction(async (tx) => {
    const created = await tx.course.create({
      data: {
        createdBy,
        instructorId: input.instructorId,
        title: input.title,
        description: input.description,
        courseDate: input.courseDate,
        location: input.location,
        capacity: null,
        archivedAt: now,
      },
      include: { enrollments: true, instructor: true },
    });

    if (input.members.length > 0) {
      await tx.courseEnrollment.createMany({
        data: input.members.map((m) => ({
          courseId: created.id,
          memberId: m.memberId,
          status: m.status,
        })),
      });
    }

    return tx.course.findUniqueOrThrow({
      where: { id: created.id },
      include: { enrollments: true, instructor: true },
    });
  });

  return toCourseRecord(course);
}
```

- [ ] **Step 3: Verificar que o TypeScript compila sem erros**

```bash
cd backend && npx tsc --noEmit
```

Esperado: nenhum erro.

---

## Task 2: Rota `POST /api/v1/cursos/importar` (backend)

**Files:**
- Modify: `backend/src/cursos/routes.ts`

### Contexto

A rota deve ser restrita a `admin` e `animador` (igual à criação normal). O body recebe os dados do curso + lista de membros com status. Validações:

- `title`, `course_date`, `instructor_id` são obrigatórios
- `members` pode ser vazio (curso sem participantes registrados)
- Cada membro de `members` deve ter `member_id` (string) e `status` (`"attended"` | `"missed"`)
- `instructor_id` deve existir no banco
- Cada `member_id` em `members` deve existir no banco
- Não pode haver `member_id` duplicado na lista
- A rota **não** verifica se o `course_date` é no passado — a chefe pode importar cursos que ainda não aconteceram por engano e isso não deve ser bloqueado pelo sistema

A rota deve ficar **antes** da rota `GET /api/v1/cursos/:id` para que o Fastify não interprete "importar" como um ID.

- [ ] **Step 1: Escrever o teste de integração que falhará**

Em `backend/test/cursos.integration.test.ts`, adicionar ao final do bloco `describe("Cursos (integration)")`:

```typescript
it("allows admin to import a historical course with attendees", async () => {
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
      title: "Curso Histórico",
      description: "Importado manualmente",
      course_date: "2024-06-15T10:00",
      location: "Sala A",
      instructor_id: adminUser!.id,
      members: [
        { member_id: adminUser!.id, status: "attended" },
      ],
    },
  });

  expect(importResponse.statusCode).toBe(201);
  const body = importResponse.json();
  expect(body.data.id).toBeDefined();
  expect(body.data.imported_count).toBe(1);

  // Curso deve aparecer nos arquivados
  const listArchived = await app.inject({
    method: "GET",
    url: "/api/v1/cursos?status=archived",
    headers: { authorization: `Bearer ${adminToken}` },
  });
  expect(listArchived.statusCode).toBe(200);
  const archivedList = listArchived.json().data;
  expect(archivedList.some((c: { id: string }) => c.id === body.data.id)).toBe(true);
});

it("rejects import with duplicate member_id", async () => {
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
      title: "Curso Duplicado",
      course_date: "2024-05-01T08:00",
      instructor_id: adminUser!.id,
      members: [
        { member_id: adminUser!.id, status: "attended" },
        { member_id: adminUser!.id, status: "missed" },
      ],
    },
  });

  expect(importResponse.statusCode).toBe(400);
  expect(importResponse.json().error).toBe("invalid_request");
});

it("rejects import without authentication", async () => {
  const importResponse = await app.inject({
    method: "POST",
    url: "/api/v1/cursos/importar",
    payload: {
      title: "Sem auth",
      course_date: "2024-01-01T10:00",
      instructor_id: "00000000-0000-0000-0000-000000000000",
      members: [],
    },
  });
  expect(importResponse.statusCode).toBe(401);
});

it("rejects import by recreador", async () => {
  // Precisa de um usuário recreador no seed de teste
  // Se não houver, criar via API de cadastro antes do teste
  const loginAdmin = await app.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    payload: { email: "arthurssousa2004@gmail.com", password: "admin123" },
  });
  const adminToken = loginAdmin.json().data.access_token;
  const adminUser = await getUserByEmail("arthurssousa2004@gmail.com");

  // Cria um recreador
  const createRecreador = await app.inject({
    method: "POST",
    url: "/api/v1/auth/register",
    headers: { authorization: `Bearer ${adminToken}` },
    payload: {
      name: "Recreador Teste",
      email: "recreador@teste.com",
      password: "Senha123",
      role: "recreador",
      cpf: "000.000.000-00",
      region: "DF",
      phone: "(61) 00000-0001",
      birthDate: "2000-01-01",
    },
  });
  expect(createRecreador.statusCode).toBe(201);

  const loginRecredor = await app.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    payload: { email: "recreador@teste.com", password: "Senha123" },
  });
  const recreadorToken = loginRecredor.json().data.access_token;

  const importResponse = await app.inject({
    method: "POST",
    url: "/api/v1/cursos/importar",
    headers: { authorization: `Bearer ${recreadorToken}` },
    payload: {
      title: "Tentativa",
      course_date: "2024-01-01T10:00",
      instructor_id: adminUser!.id,
      members: [],
    },
  });
  expect(importResponse.statusCode).toBe(403);
});
```

- [ ] **Step 2: Rodar os testes para confirmar que falham**

```bash
cd backend && npx vitest run test/cursos.integration.test.ts
```

Esperado: os novos testes falham com `404` (rota não existe ainda).

- [ ] **Step 3: Adicionar o schema Zod e a rota em `backend/src/cursos/routes.ts`**

Adicionar o schema logo após `UpdateCourseSchema` (linha ~51):

```typescript
const ImportCourseSchema = z.object({
  title: z.string().min(1, "Titulo obrigatorio"),
  description: z.string().optional(),
  course_date: z.string().min(1, "Data obrigatoria"),
  location: z.string().optional(),
  instructor_id: z.string().min(1, "Instrutor obrigatorio"),
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

Adicionar a rota **antes** de `app.get("/api/v1/cursos/:id", ...)` (linha ~385):

```typescript
app.post(
  "/api/v1/cursos/importar",
  { preHandler: requireRole(["admin", "animador"]) },
  async (request, reply) => {
    const parsedBody = ImportCourseSchema.safeParse(request.body);
    if (!parsedBody.success) {
      return reply.status(400).send({
        error: "invalid_request",
        message: parsedBody.error.issues[0].message,
      });
    }

    const { title, description, course_date, location, instructor_id, members } =
      parsedBody.data;

    const courseDate = parseDate(course_date);
    if (!courseDate) {
      return reply.status(400).send({
        error: "invalid_request",
        message: "Data do curso invalida",
      });
    }

    if (!(await getUserById(instructor_id))) {
      return reply.status(404).send({
        error: "not_found",
        message: "Instrutor nao encontrado",
      });
    }

    // Verificar duplicatas na lista de membros
    const memberIds = members.map((m) => m.member_id);
    const uniqueIds = new Set(memberIds);
    if (uniqueIds.size !== memberIds.length) {
      return reply.status(400).send({
        error: "invalid_request",
        message: "Membros duplicados na lista",
      });
    }

    // Verificar que todos os membros existem
    for (const memberId of memberIds) {
      if (!(await getUserById(memberId))) {
        return reply.status(404).send({
          error: "not_found",
          message: "Membro nao encontrado",
        });
      }
    }

    const course = await importCourse(request.user!.id, {
      instructorId: instructor_id,
      title,
      description,
      courseDate,
      location,
      members: members.map((m) => ({
        memberId: m.member_id,
        status: m.status,
      })),
    });

    return reply.status(201).send({
      data: {
        id: course.id,
        imported_count: course.enrollments.length,
      },
    });
  }
);
```

Adicionar `importCourse` ao import do store no topo do arquivo:

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
  importCourse,          // <-- adicionar
  listArchivedCourses,
  listCourses,
  removeEnrollment,
  updateCourse,
  updateEnrollmentStatus,
} from "./store.js";
```

- [ ] **Step 4: Rodar os testes para confirmar que passam**

```bash
cd backend && npx vitest run test/cursos.integration.test.ts
```

Esperado: todos os testes passam, incluindo os novos.

- [ ] **Step 5: Verificar TypeScript**

```bash
cd backend && npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Step 6: Commit**

```bash
git add backend/src/cursos/store.ts backend/src/cursos/routes.ts backend/test/cursos.integration.test.ts
git commit -m "feat: endpoint POST /api/v1/cursos/importar para importar cursos historicos"
```

---

## Task 3: Função `importCourse` na API do frontend

**Files:**
- Modify: `frontend/lib/api.ts`

### Contexto

A função deve chamar `POST /api/v1/cursos/importar` com o body correspondente. Segue o padrão das outras funções do arquivo.

- [ ] **Step 1: Adicionar a função `importCourse` em `frontend/lib/api.ts`**

Adicionar logo após `finalizeCourse` (linha ~476):

```typescript
export async function importCourse(input: {
  title: string;
  description?: string;
  course_date: string;
  location?: string;
  instructor_id: string;
  members: Array<{ member_id: string; status: "attended" | "missed" }>;
}) {
  return request("/cursos/importar", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
```

- [ ] **Step 2: Verificar TypeScript do frontend**

```bash
cd frontend && npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/api.ts
git commit -m "feat: adicionar funcao importCourse na api do frontend"
```

---

## Task 4: Modal de importação no frontend

**Files:**
- Modify: `frontend/app/cursos/page.tsx`

### Contexto

A página `cursos/page.tsx` já possui vários modais (criar/editar, visualizar, deletar, cancelar inscrição, finalizar). O padrão é: estado booleano para abrir/fechar + estado de dados + função de submit. O componente `Modal` de `frontend/components/Modal.tsx` é reutilizado — ele aceita `size`, `title`, `footer` e `children`.

O modal de importação precisa de:
1. **Campos do curso:** título (obrigatório), descrição, data (obrigatório), local, instrutor (select com membros)
2. **Busca de membros:** input de texto que filtra a lista de membros em tempo real (usando `normalizeString` já importado)
3. **Lista de resultados da busca:** cada item tem botão "Adicionar" (desabilitado se já adicionado)
4. **Lista de participantes adicionados:** cada item mostra o nome + toggle "Compareceu / Não compareceu" + botão de remover
5. **Botão de submit:** "Importar Curso" — chama `importCourse` e fecha o modal em caso de sucesso

O botão de abrir o modal deve aparecer apenas para `admin` e `animador` (igual ao botão de criar curso).

### Observações de UX

- O campo de data deve aceitar data passada (nenhuma restrição de `min` no input)
- Ao abrir o modal, a lista de membros já é carregada (reaproveitar o `members` state já existente)
- Ao fechar o modal, limpar todos os estados de importação
- O instrutor do modal de importação usa o mesmo `members` state do modal de criar curso (já carregado)
- Status padrão ao adicionar um membro: `"attended"` (compareceu)
- O modal usa `size="lg"` para ter espaço para a busca e lista

- [ ] **Step 1: Adicionar os estados do modal de importação**

Após a linha que declara `const [finalizing, setFinalizing] = useState(false);` (próximo de linha ~121), adicionar:

```typescript
// --- modal importar curso ---
const importModalTitleId = useId();
const [importModalOpen, setImportModalOpen] = useState(false);
const [importSaving, setImportSaving] = useState(false);
const [importFormError, setImportFormError] = useState<string | null>(null);
const [importTitle, setImportTitle] = useState("");
const [importDescription, setImportDescription] = useState("");
const [importDate, setImportDate] = useState("");
const [importTime, setImportTime] = useState("");
const [importLocation, setImportLocation] = useState("");
const [importInstructorId, setImportInstructorId] = useState("");
const [importSearch, setImportSearch] = useState("");
const [importParticipants, setImportParticipants] = useState<
  Array<{ id: string; name: string; status: "attended" | "missed" }>
>([]);
const importTrapRef = useFocusTrap(importModalOpen);
```

- [ ] **Step 2: Adicionar a função de reset e a função de submit**

Após os estados acima, adicionar:

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
}

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
    await importCourse({
      title: importTitle.trim(),
      description: importDescription.trim() || undefined,
      course_date: `${importDate}T${importTime}`,
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
    // Recarregar lista de cursos (buscar arquivados se filtro for archived, senão manter filtro atual)
    getCourses({ status: statusFilter }).then((data) => setCourses(data.data));
  } catch (err) {
    setImportFormError(getErrorMessage(err));
  } finally {
    setImportSaving(false);
  }
}
```

Adicionar `importCourse` aos imports de `../../lib/api` no topo do arquivo:

```typescript
import {
  cancelEnrollment,
  createCourse,
  deleteCourse,
  enrollInCourse,
  finalizeCourse,
  getCourse,
  getCourses,
  getErrorMessage,
  getMember,
  getMembers,
  importCourse,        // <-- adicionar
  updateCourse,
} from "../../lib/api";
```

- [ ] **Step 3: Adicionar o botão "Importar Curso" na toolbar da página**

Localizar onde está o botão de criar curso (buscar por `"Criar Curso"` ou `"novo curso"` na página). Ao lado desse botão, adicionar (visível apenas para `admin` e `animador`):

```tsx
{isRoleAllowed(currentRole, ["admin", "animador"]) && (
  <button
    type="button"
    className="btn btn-secondary"
    onClick={() => {
      setImportInstructorId(members[0]?.id ?? "");
      setImportModalOpen(true);
    }}
  >
    Importar Curso
  </button>
)}
```

- [ ] **Step 4: Adicionar o JSX do modal de importação**

Adicionar antes do `</div>` final da página (junto com os outros modais):

```tsx
{/* Modal: Importar Curso Histórico */}
{importModalOpen && (
  <div
    className="modal-backdrop"
    role="dialog"
    aria-modal="true"
    aria-labelledby={importModalTitleId}
    onClick={(e) => {
      if (e.target === e.currentTarget) {
        setImportModalOpen(false);
        resetImportModal();
      }
    }}
  >
    <div className="modal-card modal-lg" ref={importTrapRef}>
      <header className="modal-header">
        <h2 className="section-title" id={importModalTitleId}>
          Importar Curso Histórico
        </h2>
        <button
          type="button"
          className="icon-button"
          aria-label="Fechar modal"
          onClick={() => {
            setImportModalOpen(false);
            resetImportModal();
          }}
        >
          <FiX aria-hidden="true" />
        </button>
      </header>

      <div className="modal-body">
        <form id="import-course-form" onSubmit={handleImportSubmit}>
          {/* Dados do curso */}
          <div className="form-group">
            <label htmlFor="import-title">Título *</label>
            <input
              id="import-title"
              type="text"
              className="form-input"
              value={importTitle}
              onChange={(e) => setImportTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="import-description">Descrição</label>
            <input
              id="import-description"
              type="text"
              className="form-input"
              value={importDescription}
              onChange={(e) => setImportDescription(e.target.value)}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="import-date">Data *</label>
              <input
                id="import-date"
                type="date"
                className="form-input"
                value={importDate}
                onChange={(e) => setImportDate(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="import-time">Hora *</label>
              <input
                id="import-time"
                type="time"
                className="form-input"
                value={importTime}
                onChange={(e) => setImportTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="import-location">Local</label>
            <input
              id="import-location"
              type="text"
              className="form-input"
              value={importLocation}
              onChange={(e) => setImportLocation(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="import-instructor">Instrutor *</label>
            <select
              id="import-instructor"
              className="form-input"
              value={importInstructorId}
              onChange={(e) => setImportInstructorId(e.target.value)}
              required
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Busca e adição de participantes */}
          <div className="form-group">
            <label htmlFor="import-search">Adicionar Participantes</label>
            <input
              id="import-search"
              type="text"
              className="form-input"
              placeholder="Pesquisar membro..."
              value={importSearch}
              onChange={(e) => setImportSearch(e.target.value)}
            />
          </div>

          {/* Resultados da busca */}
          {importSearch.trim() && (
            <ul className="member-search-results">
              {members
                .filter((m) =>
                  normalizeString(m.name).includes(normalizeString(importSearch))
                )
                .slice(0, 8)
                .map((m) => {
                  const alreadyAdded = importParticipants.some((p) => p.id === m.id);
                  return (
                    <li key={m.id} className="member-search-item">
                      <span>{m.name}</span>
                      <button
                        type="button"
                        className="btn btn-sm btn-secondary"
                        disabled={alreadyAdded}
                        onClick={() => {
                          if (!alreadyAdded) {
                            setImportParticipants((prev) => [
                              ...prev,
                              { id: m.id, name: m.name, status: "attended" },
                            ]);
                            setImportSearch("");
                          }
                        }}
                      >
                        {alreadyAdded ? "Adicionado" : "Adicionar"}
                      </button>
                    </li>
                  );
                })}
            </ul>
          )}

          {/* Lista de participantes adicionados */}
          {importParticipants.length > 0 && (
            <div className="import-participants-list">
              <p className="form-label">
                Participantes ({importParticipants.length})
              </p>
              <ul>
                {importParticipants.map((p) => (
                  <li key={p.id} className="import-participant-item">
                    <span>{p.name}</span>
                    <div className="participant-controls">
                      <button
                        type="button"
                        className={`btn btn-sm ${p.status === "attended" ? "btn-primary" : "btn-ghost"}`}
                        onClick={() =>
                          setImportParticipants((prev) =>
                            prev.map((x) =>
                              x.id === p.id ? { ...x, status: "attended" } : x
                            )
                          )
                        }
                      >
                        Compareceu
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${p.status === "missed" ? "btn-danger" : "btn-ghost"}`}
                        onClick={() =>
                          setImportParticipants((prev) =>
                            prev.map((x) =>
                              x.id === p.id ? { ...x, status: "missed" } : x
                            )
                          )
                        }
                      >
                        Faltou
                      </button>
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`Remover ${p.name}`}
                        onClick={() =>
                          setImportParticipants((prev) =>
                            prev.filter((x) => x.id !== p.id)
                          )
                        }
                      >
                        <FiX aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {importFormError && (
            <p className="form-error" role="alert">
              {importFormError}
            </p>
          )}
        </form>
      </div>

      <div className="modal-footer">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            setImportModalOpen(false);
            resetImportModal();
          }}
          disabled={importSaving}
        >
          Cancelar
        </button>
        <button
          type="submit"
          form="import-course-form"
          className="btn btn-primary"
          disabled={importSaving}
        >
          {importSaving ? "Importando..." : "Importar Curso"}
        </button>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 5: Verificar TypeScript do frontend**

```bash
cd frontend && npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Step 6: Testar manualmente no browser**

1. Abrir a página de Cursos
2. Clicar em "Importar Curso"
3. Preencher título, data passada (ex: 01/01/2024), hora e instrutor
4. Pesquisar um membro na barra de busca e clicar em "Adicionar"
5. Confirmar que o status padrão é "Compareceu"
6. Clicar em "Faltou" e confirmar que muda
7. Clicar em "Importar Curso"
8. Confirmar que aparece o notice de sucesso
9. Mudar o filtro para "Arquivados" e confirmar que o curso aparece
10. Clicar no curso e confirmar que o participante aparece com o status correto

- [ ] **Step 7: Commit**

```bash
git add frontend/app/cursos/page.tsx frontend/lib/api.ts
git commit -m "feat: modal de importar cursos historicos com busca de participantes"
```

---

## Notas adicionais

### CSS
Os seletores de classe usados no modal (`member-search-results`, `member-search-item`, `import-participants-list`, `import-participant-item`, `participant-controls`) provavelmente precisarão ser adicionados ao arquivo `frontend/app/cursos/page.css`. Seguir o padrão visual dos outros elementos da página.

### Permissões
- Botão "Importar Curso" visível para: `admin`, `animador`
- Endpoint `/api/v1/cursos/importar`: restrição via `requireRole(["admin", "animador"])`
- `recreador` não pode importar cursos

### O que NÃO foi incluído neste plano (intencionalmente)
- Migração de banco de dados: não há mudança de schema — a tabela `Course` e `CourseEnrollment` já suportam o fluxo de importação (campo `archivedAt` já existe, status `attended`/`missed` já existem no enum)
- Paginação na busca de membros do modal: `getMembers({ limit: 200 })` já é chamado na abertura do modal de criar curso e reutilizado aqui
