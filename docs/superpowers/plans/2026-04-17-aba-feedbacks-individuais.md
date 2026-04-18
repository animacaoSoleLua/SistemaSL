# Aba de Feedbacks Individuais — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Renomear a aba "Feedbacks" (ClientFeedback) para "Clientes" e adicionar nova aba "Feedbacks" que lista feedbacks individuais de relatórios com texto, data do evento e nome do animador.

**Architecture:** O backend já retorna `feedbacks` (ReportFeedback) em `GET /api/v1/membros/:id` sem o nome do autor. Adicionamos `authorName` via Prisma include no store, expõe `author_name` na rota e no frontend adicionamos a nova aba que lê `selectedMemberDetails.feedbacks` (já carregado pelo `getMember` existente — sem nova chamada de API).

**Tech Stack:** TypeScript, Prisma, Fastify (backend); React/Next.js (frontend); Vitest (testes de integração)

---

## File Map

| Arquivo | Mudança |
|---|---|
| `backend/src/relatorios/store.ts` | Adicionar `authorName: string` em `MemberFeedbackRecord`; atualizar `listFeedbacksForMember` com include do autor |
| `backend/src/membros/routes.ts` | Adicionar `author_name: entry.authorName` no map de feedbacks |
| `backend/test/membros.integration.test.ts` | Adicionar teste que verifica `author_name` na resposta |
| `frontend/app/usuarios/page.tsx` | Adicionar `author_name` em `MemberFeedback`; atualizar union `detailsTab`; renomear aba "feedbacks"→"clientes"; adicionar aba "feedbacks"; renderizar lista de feedbacks individuais |

---

### Task 1: Backend store — adicionar `authorName` em `MemberFeedbackRecord` e `listFeedbacksForMember`

**Files:**
- Modify: `backend/src/relatorios/store.ts:24-32` (interface)
- Modify: `backend/src/relatorios/store.ts:529-546` (função)

- [ ] **Step 1: Adicionar `authorName` na interface `MemberFeedbackRecord`**

Em `backend/src/relatorios/store.ts`, localizar a interface `MemberFeedbackRecord` (linha 24) e substituir:

```typescript
export interface MemberFeedbackRecord {
  id: string;
  reportId: string;
  memberId: string;
  feedback: string;
  eventDate: Date;
  contractorName: string;
  createdAt: Date;
}
```

Por:

```typescript
export interface MemberFeedbackRecord {
  id: string;
  reportId: string;
  memberId: string;
  feedback: string;
  eventDate: Date;
  contractorName: string;
  authorName: string;
  createdAt: Date;
}
```

- [ ] **Step 2: Atualizar `listFeedbacksForMember` para incluir o autor do relatório**

Substituir o corpo da função (linha 529):

```typescript
export async function listFeedbacksForMember(
  memberId: string
): Promise<MemberFeedbackRecord[]> {
  const feedbacks = await prisma.reportFeedback.findMany({
    where: { memberId },
    include: { report: true },
  });

  return feedbacks.map((entry) => ({
    id: entry.id,
    reportId: entry.reportId,
    memberId: entry.memberId,
    feedback: entry.feedback,
    eventDate: entry.report.eventDate,
    contractorName: entry.report.contractorName,
    createdAt: entry.createdAt,
  }));
}
```

Por:

```typescript
export async function listFeedbacksForMember(
  memberId: string
): Promise<MemberFeedbackRecord[]> {
  const feedbacks = await prisma.reportFeedback.findMany({
    where: { memberId },
    include: {
      report: {
        include: { author: { select: { name: true, lastName: true } } },
      },
    },
  });

  return feedbacks.map((entry) => ({
    id: entry.id,
    reportId: entry.reportId,
    memberId: entry.memberId,
    feedback: entry.feedback,
    eventDate: entry.report.eventDate,
    contractorName: entry.report.contractorName,
    authorName: [entry.report.author.name, entry.report.author.lastName]
      .filter(Boolean)
      .join(" "),
    createdAt: entry.createdAt,
  }));
}
```

- [ ] **Step 3: Verificar tipagem**

```bash
cd backend && npx tsc --noEmit
```

Esperado: sem erros de tipo.

---

### Task 2: Backend route — expor `author_name` na resposta de detalhes do membro

**Files:**
- Modify: `backend/src/membros/routes.ts:531-537`

- [ ] **Step 1: Adicionar `author_name` no mapeamento de feedbacks**

Localizar o bloco `feedbacks: feedbacks.map(...)` (linha ~531) e substituir:

```typescript
feedbacks: feedbacks.map((entry) => ({
  id: entry.id,
  report_id: entry.reportId,
  feedback: entry.feedback,
  event_date: formatDate(entry.eventDate),
  contractor_name: entry.contractorName,
})),
```

Por:

```typescript
feedbacks: feedbacks.map((entry) => ({
  id: entry.id,
  report_id: entry.reportId,
  feedback: entry.feedback,
  event_date: formatDate(entry.eventDate),
  contractor_name: entry.contractorName,
  author_name: entry.authorName,
})),
```

- [ ] **Step 2: Verificar tipagem**

```bash
cd backend && npx tsc --noEmit
```

Esperado: sem erros de tipo.

---

### Task 3: Backend test — verificar `author_name` na resposta do endpoint

**Files:**
- Modify: `backend/test/membros.integration.test.ts`

- [ ] **Step 1: Adicionar import de `createReport`**

No topo de `backend/test/membros.integration.test.ts`, após as importações existentes, adicionar:

```typescript
import { createReport } from "../src/relatorios/store.js";
```

- [ ] **Step 2: Escrever o teste de integração**

Dentro do `describe("Membros (integration)")`, antes do `afterAll`, adicionar:

```typescript
it("returns report feedbacks with author_name for admin", async () => {
  const login = await app.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    payload: { email: "arthurssousa2004@gmail.com", password: "admin123" },
  });
  const token = login.json().data.access_token;
  const admin = await getUserByEmail("arthurssousa2004@gmail.com");
  expect(admin).toBeDefined();

  const createResponse = await app.inject({
    method: "POST",
    url: "/api/v1/membros",
    headers: { authorization: `Bearer ${token}` },
    payload: {
      name: "Recreador",
      last_name: "Teste",
      email: "recreador-feedback@sol-e-lua.com",
      role: "recreador",
    },
  });
  expect(createResponse.statusCode).toBe(201);
  const member = createResponse.json().data;

  await createReport(admin!.id, {
    eventDate: new Date("2026-03-15"),
    contractorName: "Clube Teste",
    location: "Brasília",
    teamSummary: "Equipe bem entrosada",
    feedbacks: [
      { memberId: member.id, feedback: "Excelente desempenho no evento" },
    ],
  });

  const detailResponse = await app.inject({
    method: "GET",
    url: `/api/v1/membros/${member.id}`,
    headers: { authorization: `Bearer ${token}` },
  });

  expect(detailResponse.statusCode).toBe(200);
  const feedbacks = detailResponse.json().data.feedbacks as Array<{
    id: string;
    feedback: string;
    author_name: string;
    event_date: string;
  }>;
  expect(feedbacks).toHaveLength(1);
  expect(feedbacks[0].feedback).toBe("Excelente desempenho no evento");
  expect(feedbacks[0].author_name).toBe(
    [admin!.name, admin!.lastName].filter(Boolean).join(" ")
  );
  expect(feedbacks[0].event_date).toBe("2026-03-15");
});
```

- [ ] **Step 3: Rodar o teste para verificar que falha (TDD — red)**

```bash
cd backend && npx vitest run test/membros.integration.test.ts -t "returns report feedbacks with author_name"
```

Esperado: FAIL — `author_name` ausente na resposta.

- [ ] **Step 4: Rodar o teste novamente após Tasks 1 e 2 (green)**

```bash
cd backend && npx vitest run test/membros.integration.test.ts
```

Esperado: todos os testes PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/relatorios/store.ts backend/src/membros/routes.ts backend/test/membros.integration.test.ts
git commit -m "feat: include author_name in member report feedbacks endpoint"
```

---

### Task 4: Frontend — atualizar tipos, abas e renderização

**Files:**
- Modify: `frontend/app/usuarios/page.tsx:94-100` (interface `MemberFeedback`)
- Modify: `frontend/app/usuarios/page.tsx:177` (estado `detailsTab`)
- Modify: `frontend/app/usuarios/page.tsx:989-1013` (array de abas)
- Modify: `frontend/app/usuarios/page.tsx:1106` (condição aba clientes)
- Modify: `frontend/app/usuarios/page.tsx:1109` (título da aba clientes)
- Add: bloco de render da nova aba "feedbacks" individuais

- [ ] **Step 1: Adicionar `author_name` na interface `MemberFeedback`**

Localizar (linha 94) e substituir:

```typescript
interface MemberFeedback {
  id: string;
  report_id: string;
  feedback: string;
  event_date: string;
  contractor_name: string;
}
```

Por:

```typescript
interface MemberFeedback {
  id: string;
  report_id: string;
  feedback: string;
  event_date: string;
  contractor_name: string;
  author_name: string;
}
```

- [ ] **Step 2: Atualizar o tipo do estado `detailsTab`**

Localizar (linha 177) e substituir:

```typescript
const [detailsTab, setDetailsTab] = useState<"dados" | "cursos" | "advertencias" | "feedbacks">("dados");
```

Por:

```typescript
const [detailsTab, setDetailsTab] = useState<"dados" | "cursos" | "advertencias" | "clientes" | "feedbacks">("dados");
```

- [ ] **Step 3: Atualizar array de abas, labels e contadores**

Localizar o array dentro do `<div className="details-tabs">` (linha 989) e substituir:

```tsx
{(["dados", "feedbacks", "cursos", "advertencias"] as const).map((tab) => {
  const labels = { dados: "Dados", feedbacks: "Feedbacks", cursos: "Cursos", advertencias: "Advertências" };
  const counts: Record<string, number | null> = {
    dados: null,
    feedbacks: feedbackCounts ? feedbackCounts.positive + feedbackCounts.negative : null,
    cursos: detailsLoading ? null : courses.length,
    advertencias: detailsLoading ? null : warnings.length,
  };
```

Por:

```tsx
{(["dados", "feedbacks", "clientes", "cursos", "advertencias"] as const).map((tab) => {
  const labels = { dados: "Dados", feedbacks: "Feedbacks", clientes: "Clientes", cursos: "Cursos", advertencias: "Advertências" };
  const counts: Record<string, number | null> = {
    dados: null,
    feedbacks: detailsLoading ? null : (selectedMemberDetails?.feedbacks?.length ?? 0),
    clientes: feedbackCounts ? feedbackCounts.positive + feedbackCounts.negative : null,
    cursos: detailsLoading ? null : courses.length,
    advertencias: detailsLoading ? null : warnings.length,
  };
```

- [ ] **Step 4: Renomear a condição da aba de clientes de `"feedbacks"` para `"clientes"`**

Localizar (linha 1106):

```tsx
{isAdmin && detailsTab === "feedbacks" && (
  <div className="member-section">
    <div className="member-section-header">
      <h3 className="section-title">Feedbacks</h3>
```

Substituir por:

```tsx
{isAdmin && detailsTab === "clientes" && (
  <div className="member-section">
    <div className="member-section-header">
      <h3 className="section-title">Feedbacks</h3>
```

- [ ] **Step 5: Adicionar o bloco de render da nova aba "Feedbacks" individuais**

Logo após o bloco `{isAdmin && detailsTab === "clientes" && (...)}` e antes de `{isAdmin && detailsTab === "cursos" && (...)}`, inserir:

```tsx
{isAdmin && detailsTab === "feedbacks" && (
  <div className="member-section">
    <div className="member-section-header">
      <h3 className="section-title">Feedbacks</h3>
      <span className="member-section-count">
        {selectedMemberDetails?.feedbacks?.length ?? 0}
      </span>
    </div>
    {detailsLoading ? (
      <p className="member-section-empty">Carregando feedbacks...</p>
    ) : detailsError ? (
      <p className="member-section-error">{detailsError}</p>
    ) : !selectedMemberDetails?.feedbacks?.length ? (
      <p className="member-section-empty">Nenhum feedback individual registrado.</p>
    ) : (
      <ul className="member-section-list">
        {selectedMemberDetails.feedbacks.map((entry) => (
          <li className="member-section-item" key={entry.id}>
            <div className="member-section-meta">
              <span className="member-section-date">{formatDateBR(entry.event_date)}</span>
              <strong className="member-section-title">{entry.author_name}</strong>
            </div>
            <p className="member-section-subtitle">{entry.feedback}</p>
          </li>
        ))}
      </ul>
    )}
  </div>
)}
```

- [ ] **Step 6: Verificar tipagem do frontend**

```bash
cd frontend && npx tsc --noEmit
```

Esperado: sem erros de tipo.

- [ ] **Step 7: Commit**

```bash
git add frontend/app/usuarios/page.tsx
git commit -m "feat: rename Feedbacks tab to Clientes and add individual feedbacks tab"
```

---

## Self-Review

### Spec coverage

| Requisito | Coberto |
|---|---|
| Renomear aba "Feedbacks" → "Clientes" | Task 4, Steps 3–4 |
| Nova aba "Feedbacks" com contador de `feedbacks.length` | Task 4, Steps 3, 5 |
| Exibir texto do feedback | Task 4, Step 5 |
| Exibir data do evento formatada em BR | Task 4, Step 5 (`formatDateBR`) |
| Exibir nome do animador (`author_name`) | Task 4, Step 5 |
| Estado vazio: "Nenhum feedback individual registrado." | Task 4, Step 5 |
| Estado de carregamento via `detailsLoading` | Task 4, Step 5 |
| `authorName` adicionado no store | Task 1 |
| `author_name` exposto na rota | Task 2 |
| Nenhuma nova chamada de API | Confirmado — dados chegam via `getMember` existente |
| Nenhuma migração de banco | Confirmado — `ReportFeedback` já existe |
| `ClientFeedback` e sua contagem intactos na aba "Clientes" | Task 4, Steps 3–4 (mantém bloco existente, só renomeia condição) |

### Notas de implementação

- `member-section-subtitle` é uma classe que pode não existir no CSS. Se o dev encontrar erro de estilo, pode usar `member-section-date` para o texto do feedback, ou inspecionar o CSS do projeto para a classe correta.
- A ordem das abas no array de Task 4 Step 3 é `["dados", "feedbacks", "clientes", "cursos", "advertencias"]` — "Feedbacks" antes de "Clientes" conforme design do spec.
- `selectedMemberDetails?.feedbacks` usa optional chaining pois `feedbacks` é `MemberFeedback[] | undefined` em `MemberDetails` (linha 137 do arquivo).
