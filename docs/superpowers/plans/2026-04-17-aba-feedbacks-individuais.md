# Aba de Feedbacks Individuais no Detalhe de Membro — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar nome do animador nos feedbacks individuais de relatórios retornados pelo backend e exibir esses feedbacks em uma nova aba "Feedbacks" no modal de detalhes do membro (renomeando a aba atual de "Feedbacks" para "Clientes").

**Architecture:** O backend já retorna `feedbacks` (ReportFeedback) em `GET /api/v1/membros/:id`, mas sem o nome do autor do relatório. Atualizamos `listFeedbacksForMember` para incluir o author via join, adicionamos `author_name` no response do endpoint, e no frontend adicionamos a nova aba que lê `selectedMemberDetails.feedbacks` (já carregado pelo `getMember` existente).

**Tech Stack:** TypeScript, Prisma (Fastify backend), React/Next.js (frontend), Vitest (integration tests)

---

### Task 1: Backend — adicionar `authorName` em `MemberFeedbackRecord` e `listFeedbacksForMember`

**Files:**
- Modify: `backend/src/relatorios/store.ts`

- [ ] **Step 1: Adicionar `authorName` em `MemberFeedbackRecord`**

Em `backend/src/relatorios/store.ts`, linha 24–32, atualizar a interface:

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

- [ ] **Step 2: Atualizar `listFeedbacksForMember` para incluir autor do relatório**

Localizar a função `listFeedbacksForMember` (linha ~529). Substituir:

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
        include: {
          author: { select: { name: true, lastName: true } },
        },
      },
    },
  });

  return feedbacks.map((entry) => {
    const author = entry.report.author;
    const authorName = author
      ? [author.name, author.lastName].filter(Boolean).join(" ")
      : "Animador desconhecido";
    return {
      id: entry.id,
      reportId: entry.reportId,
      memberId: entry.memberId,
      feedback: entry.feedback,
      eventDate: entry.report.eventDate,
      contractorName: entry.report.contractorName,
      authorName,
      createdAt: entry.createdAt,
    };
  });
}
```

---

### Task 2: Backend — expor `author_name` na rota de detalhes do membro

**Files:**
- Modify: `backend/src/membros/routes.ts`

- [ ] **Step 1: Adicionar `author_name` no mapeamento de feedbacks**

Localizar o bloco `feedbacks: feedbacks.map(...)` dentro do handler `GET /api/v1/membros/:id` (linha ~531). Substituir:

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

---

### Task 3: Backend — teste de integração para `author_name` nos feedbacks do membro

**Files:**
- Modify: `backend/test/membros.integration.test.ts`

- [ ] **Step 1: Adicionar imports necessários**

No topo do arquivo `backend/test/membros.integration.test.ts`, adicionar `createReport` ao import existente de `relatorios/store`:

```typescript
import { createReport } from "../src/relatorios/store.js";
```

- [ ] **Step 2: Adicionar teste que verifica `author_name` nos feedbacks**

Dentro do `describe("Membros (integration)")`, após os testes existentes, adicionar:

```typescript
it("returns report feedbacks with author_name in member details", async () => {
  const animador = await getUserByEmail("animador@sol-e-lua.com");
  const recreador = await getUserByEmail("recreador@sol-e-lua.com");
  expect(animador).toBeDefined();
  expect(recreador).toBeDefined();

  await createReport(animador!.id, {
    eventDate: new Date("2026-03-15"),
    contractorName: "Clube Teste",
    location: "Brasília",
    teamSummary: "Equipe bem entrosada",
    feedbacks: [
      { memberId: recreador!.id, feedback: "Excelente desempenho no evento" },
    ],
  });

  const login = await app.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    payload: { email: "arthurssousa2004@gmail.com", password: "admin123" },
  });
  const token = login.json().data.access_token;

  const detailResponse = await app.inject({
    method: "GET",
    url: `/api/v1/membros/${recreador!.id}`,
    headers: { authorization: `Bearer ${token}` },
  });

  expect(detailResponse.statusCode).toBe(200);
  const feedbacks = detailResponse.json().data.feedbacks;
  expect(feedbacks).toHaveLength(1);
  expect(feedbacks[0].feedback).toBe("Excelente desempenho no evento");
  expect(feedbacks[0].author_name).toBe(
    [animador!.name, animador!.lastName].filter(Boolean).join(" ")
  );
  expect(feedbacks[0].event_date).toBe("2026-03-15");
});
```

- [ ] **Step 3: Rodar os testes de membros e verificar que passam**

```bash
cd backend && npx vitest run test/membros.integration.test.ts
```

Expected: todos os testes PASS, incluindo o novo.

- [ ] **Step 4: Commit**

```bash
git add backend/src/relatorios/store.ts backend/src/membros/routes.ts backend/test/membros.integration.test.ts
git commit -m "feat: include author_name in member report feedbacks endpoint"
```

---

### Task 4: Frontend — atualizar interface e aba "Clientes"

**Files:**
- Modify: `frontend/app/usuarios/page.tsx`

- [ ] **Step 1: Adicionar `author_name` em `MemberFeedback`**

Localizar a interface `MemberFeedback` (linha ~94). Substituir:

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

- [ ] **Step 2: Atualizar o tipo de `detailsTab` para incluir `"clientes"` e o novo `"feedbacks"`**

Localizar (linha ~177):

```typescript
const [detailsTab, setDetailsTab] = useState<"dados" | "cursos" | "advertencias" | "feedbacks">("dados");
```

Substituir por:

```typescript
const [detailsTab, setDetailsTab] = useState<"dados" | "cursos" | "advertencias" | "clientes" | "feedbacks">("dados");
```

- [ ] **Step 3: Atualizar o array de abas e seus labels**

Localizar o array de abas dentro do `<div className="details-tabs">` (linha ~989):

```typescript
{(["dados", "feedbacks", "cursos", "advertencias"] as const).map((tab) => {
  const labels = { dados: "Dados", feedbacks: "Feedbacks", cursos: "Cursos", advertencias: "Advertências" };
  const counts: Record<string, number | null> = {
    dados: null,
    feedbacks: feedbackCounts ? feedbackCounts.positive + feedbackCounts.negative : null,
    cursos: detailsLoading ? null : courses.length,
    advertencias: detailsLoading ? null : warnings.length,
  };
```

Substituir por:

```typescript
{(["dados", "feedbacks", "clientes", "cursos", "advertencias"] as const).map((tab) => {
  const labels = { dados: "Dados", feedbacks: "Feedbacks", clientes: "Clientes", cursos: "Cursos", advertencias: "Advertências" };
  const reportFeedbacks = selectedMemberDetails?.feedbacks ?? [];
  const counts: Record<string, number | null> = {
    dados: null,
    feedbacks: detailsLoading ? null : reportFeedbacks.length,
    clientes: feedbackCounts ? feedbackCounts.positive + feedbackCounts.negative : null,
    cursos: detailsLoading ? null : courses.length,
    advertencias: detailsLoading ? null : warnings.length,
  };
```

- [ ] **Step 4: Atualizar a condição de renderização da aba de clientes**

Localizar (linha ~1106):

```typescript
{isAdmin && detailsTab === "feedbacks" && (
  <div className="member-section">
    <div className="member-section-header">
      <h3 className="section-title">Feedbacks</h3>
```

Substituir por:

```typescript
{isAdmin && detailsTab === "clientes" && (
  <div className="member-section">
    <div className="member-section-header">
      <h3 className="section-title">Clientes</h3>
```

- [ ] **Step 5: Adicionar renderização da nova aba "Feedbacks"**

Logo após o bloco `{isAdmin && detailsTab === "clientes" && (...)}` e antes de `{isAdmin && detailsTab === "cursos" && (...)}`, inserir:

```typescript
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
            <span className="member-section-date">{formatDateBR(entry.event_date)}</span>
            <strong className="member-section-title">{entry.author_name}</strong>
            <span className="member-section-text">{entry.feedback}</span>
          </li>
        ))}
      </ul>
    )}
  </div>
)}
```

- [ ] **Step 6: Commit**

```bash
git add frontend/app/usuarios/page.tsx
git commit -m "feat: add individual report feedbacks tab in member details"
```
