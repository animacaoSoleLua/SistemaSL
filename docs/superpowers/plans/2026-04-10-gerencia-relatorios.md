# Gerência — Relatórios Gerenciais — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar a página `/gerencia` com cards de resumo, tabelas filtráveis e geração de PDFs para membros, relatórios de eventos e cursos.

**Architecture:** Página client-only em Next.js App Router com 4 cards de resumo no topo e 3 seções independentes (membros, relatórios, cursos), cada uma com filtros e botão "Gerar PDF". PDFs gerados client-side via `@react-pdf/renderer` com dynamic import nos handlers. Backend recebe filtro de data em GET /cursos espelhando o padrão existente em GET /relatorios.

**Tech Stack:** Next.js 14 (App Router), TypeScript, `@react-pdf/renderer`, Fastify (backend), Prisma, Vitest (testes de integração backend)

---

## Mapa de Arquivos

| Ação | Arquivo |
|---|---|
| Modificar | `backend/src/cursos/routes.ts` |
| Modificar (teste) | `backend/test/cursos.integration.test.ts` |
| Modificar | `frontend/lib/api.ts` |
| Modificar | `frontend/app/components/SidebarNav.tsx` |
| Criar | `frontend/app/gerencia/page.tsx` |
| Criar | `frontend/app/gerencia/page.css` |
| Criar | `frontend/app/gerencia/pdf/MembersPdf.tsx` |
| Criar | `frontend/app/gerencia/pdf/ReportsPdf.tsx` |
| Criar | `frontend/app/gerencia/pdf/CoursesPdf.tsx` |

---

## Task 1: Backend — Filtro de data em GET /cursos

**Files:**
- Modify: `backend/src/cursos/routes.ts`
- Test: `backend/test/cursos.integration.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

Abrir `backend/test/cursos.integration.test.ts` e adicionar este `it` dentro do `describe("Cursos (integration)")`, após os testes existentes:

```typescript
it("filters courses by period_start and period_end", async () => {
  const loginAdmin = await app.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    payload: {
      email: "arthurssousa2004@gmail.com",
      password: "admin123",
    },
  });
  const adminToken = loginAdmin.json().data.access_token;
  const adminUser = await getUserByEmail("arthurssousa2004@gmail.com");

  await app.inject({
    method: "POST",
    url: "/api/v1/cursos",
    headers: { authorization: `Bearer ${adminToken}` },
    payload: {
      title: "Curso Fevereiro",
      course_date: "2026-02-15T10:00",
      instructor_id: adminUser!.id,
    },
  });

  await app.inject({
    method: "POST",
    url: "/api/v1/cursos",
    headers: { authorization: `Bearer ${adminToken}` },
    payload: {
      title: "Curso Marco",
      course_date: "2026-03-10T10:00",
      instructor_id: adminUser!.id,
    },
  });

  const response = await app.inject({
    method: "GET",
    url: "/api/v1/cursos?period_start=2026-02-01&period_end=2026-02-28&status=all",
    headers: { authorization: `Bearer ${adminToken}` },
  });

  expect(response.statusCode).toBe(200);
  const data = response.json().data as Array<{ title: string }>;
  expect(data.some((c) => c.title === "Curso Fevereiro")).toBe(true);
  expect(data.some((c) => c.title === "Curso Marco")).toBe(false);
});
```

- [ ] **Step 2: Rodar o teste para confirmar falha**

```bash
cd "/home/arthu/UnB - Linux/SL/SistemaSL/backend"
npx vitest run test/cursos.integration.test.ts
```

Esperado: falha com mensagem de que "Curso Marco" foi encontrado (filtro ainda não existe).

- [ ] **Step 3: Implementar o filtro de data no backend**

Abrir `backend/src/cursos/routes.ts`.

**3a.** Localizar a interface `CourseQuery` (linha ~80) e adicionar os dois novos campos:

```typescript
interface CourseQuery {
  status?: string;
  page?: string;
  limit?: string;
  period_start?: string;
  period_end?: string;
}
```

**3b.** No handler `app.get("/api/v1/cursos", ...)`, logo após a validação de `query.limit` (antes de `let courses = ...`), adicionar:

```typescript
    const periodStart = parseDate(query.period_start);
    const periodEnd = parseDate(query.period_end);

    if (query.period_start && !periodStart) {
      return reply.status(400).send({
        error: "invalid_request",
        message: "Periodo inicial invalido",
      });
    }

    if (query.period_end && !periodEnd) {
      return reply.status(400).send({
        error: "invalid_request",
        message: "Periodo final invalido",
      });
    }
```

**3c.** Após o bloco `if (query.status && ...)` que filtra por vagas (logo antes de `courses.sort(...)`), adicionar:

```typescript
    if (periodStart) {
      courses = courses.filter((course) => course.courseDate >= periodStart);
    }
    if (periodEnd) {
      courses = courses.filter((course) => course.courseDate <= periodEnd);
    }
```

- [ ] **Step 4: Rodar os testes para confirmar que passam**

```bash
cd "/home/arthu/UnB - Linux/SL/SistemaSL/backend"
npx vitest run test/cursos.integration.test.ts
```

Esperado: todos os testes do arquivo passam, incluindo o novo.

- [ ] **Step 5: Commit**

```bash
cd "/home/arthu/UnB - Linux/SL/SistemaSL"
git add backend/src/cursos/routes.ts backend/test/cursos.integration.test.ts
git commit -m "feat(cursos): add period_start/period_end filter to GET /cursos"
```

---

## Task 2: Frontend — Atualizar funções de API

**Files:**
- Modify: `frontend/lib/api.ts`

- [ ] **Step 1: Atualizar `getReports` para aceitar datas e limit**

Localizar a função `getReports` em `frontend/lib/api.ts` (linha ~98) e substituir:

```typescript
// ANTES
export async function getReports() {
  return request('/relatorios', { method: 'GET' });
}
```

Por:

```typescript
// DEPOIS
export async function getReports(params: {
  period_start?: string;
  period_end?: string;
  limit?: number;
} = {}) {
  const searchParams = new URLSearchParams();
  if (params.period_start) searchParams.set("period_start", params.period_start);
  if (params.period_end) searchParams.set("period_end", params.period_end);
  if (params.limit) searchParams.set("limit", String(params.limit));
  const query = searchParams.toString();
  const endpoint = query ? `/relatorios?${query}` : "/relatorios";
  return request(endpoint, { method: "GET" });
}
```

- [ ] **Step 2: Atualizar `getCourses` para aceitar datas**

Localizar a função `getCourses` em `frontend/lib/api.ts` (linha ~390) e substituir:

```typescript
// ANTES
export async function getCourses(params: {
  status?: "available" | "full" | "all" | "archived";
  page?: number;
  limit?: number;
} = {}) {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.set("status", params.status);
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));

  const query = searchParams.toString();
  const endpoint = query ? `/cursos?${query}` : "/cursos";
  return request(endpoint, { method: "GET" });
}
```

Por:

```typescript
// DEPOIS
export async function getCourses(params: {
  status?: "available" | "full" | "all" | "archived";
  page?: number;
  limit?: number;
  period_start?: string;
  period_end?: string;
} = {}) {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.set("status", params.status);
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));
  if (params.period_start) searchParams.set("period_start", params.period_start);
  if (params.period_end) searchParams.set("period_end", params.period_end);

  const query = searchParams.toString();
  const endpoint = query ? `/cursos?${query}` : "/cursos";
  return request(endpoint, { method: "GET" });
}
```

- [ ] **Step 3: Confirmar que o TypeScript compila**

```bash
cd "/home/arthu/UnB - Linux/SL/SistemaSL/frontend"
npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Step 4: Commit**

```bash
cd "/home/arthu/UnB - Linux/SL/SistemaSL"
git add frontend/lib/api.ts
git commit -m "feat(api): add date and limit params to getReports and getCourses"
```

---

## Task 3: Frontend — Instalar @react-pdf/renderer

**Files:**
- Modify: `frontend/package.json`, `frontend/package-lock.json`

- [ ] **Step 1: Instalar a biblioteca**

```bash
cd "/home/arthu/UnB - Linux/SL/SistemaSL/frontend"
npm install @react-pdf/renderer
```

Esperado: `@react-pdf/renderer` aparece em `dependencies` no `package.json`.

- [ ] **Step 2: Confirmar que o TypeScript reconhece os tipos**

```bash
cd "/home/arthu/UnB - Linux/SL/SistemaSL/frontend"
node -e "require('@react-pdf/renderer'); console.log('ok')"
```

Esperado: imprime `ok`.

- [ ] **Step 3: Commit**

```bash
cd "/home/arthu/UnB - Linux/SL/SistemaSL"
git add frontend/package.json frontend/package-lock.json
git commit -m "chore(frontend): install @react-pdf/renderer"
```

---

## Task 4: Frontend — Componentes PDF

**Files:**
- Create: `frontend/app/gerencia/pdf/MembersPdf.tsx`
- Create: `frontend/app/gerencia/pdf/ReportsPdf.tsx`
- Create: `frontend/app/gerencia/pdf/CoursesPdf.tsx`

- [ ] **Step 1: Criar MembersPdf.tsx**

Criar o arquivo `frontend/app/gerencia/pdf/MembersPdf.tsx`:

```tsx
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

export interface MemberPdfItem {
  id: string;
  name: string;
  last_name?: string | null;
  cpf?: string | null;
  birth_date?: string | null;
  role: string;
}

interface MembersPdfProps {
  members: MemberPdfItem[];
  roleFilter: string;
  generatedAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  animador: "Animador",
  recreador: "Recreador",
};

function calcAge(birthDate: string): number {
  const today = new Date();
  const birth = new Date(`${birthDate}T00:00:00`);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

const s = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica", fontSize: 9 },
  header: { marginBottom: 18 },
  title: { fontSize: 16, fontWeight: "bold", marginBottom: 4 },
  meta: { fontSize: 9, color: "#666", marginBottom: 2 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#6f4cff",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginBottom: 2,
  },
  row: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eeeeee",
    borderBottomStyle: "solid",
  },
  rowAlt: { backgroundColor: "#f9f7ff" },
  hText: { color: "#ffffff", fontWeight: "bold" },
  cName: { width: "35%" },
  cCpf: { width: "20%" },
  cBirth: { width: "18%" },
  cAge: { width: "10%" },
  cRole: { width: "17%" },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: { fontSize: 8, color: "#aaaaaa" },
});

export function MembersPdf({ members, roleFilter, generatedAt }: MembersPdfProps) {
  const roleLabel =
    roleFilter === "all" ? "Todos" : (ROLE_LABELS[roleFilter] ?? roleFilter);

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.title}>Relação de Membros</Text>
          <Text style={s.meta}>Função: {roleLabel}</Text>
          <Text style={s.meta}>Gerado em: {generatedAt}</Text>
          <Text style={s.meta}>Total: {members.length} membro(s)</Text>
        </View>

        <View style={s.tableHeader}>
          <Text style={[s.cName, s.hText]}>Nome Completo</Text>
          <Text style={[s.cCpf, s.hText]}>CPF</Text>
          <Text style={[s.cBirth, s.hText]}>Nascimento</Text>
          <Text style={[s.cAge, s.hText]}>Idade</Text>
          <Text style={[s.cRole, s.hText]}>Função</Text>
        </View>

        {members.map((m, i) => (
          <View key={m.id} style={[s.row, i % 2 === 1 ? s.rowAlt : {}]}>
            <Text style={s.cName}>
              {m.name}
              {m.last_name ? ` ${m.last_name}` : ""}
            </Text>
            <Text style={s.cCpf}>{m.cpf ?? "-"}</Text>
            <Text style={s.cBirth}>
              {m.birth_date
                ? new Date(`${m.birth_date}T00:00:00`).toLocaleDateString("pt-BR")
                : "-"}
            </Text>
            <Text style={s.cAge}>
              {m.birth_date ? String(calcAge(m.birth_date)) : "-"}
            </Text>
            <Text style={s.cRole}>{ROLE_LABELS[m.role] ?? m.role}</Text>
          </View>
        ))}

        <View style={s.footer} fixed>
          <Text style={s.footerText}>Sol e Lua Animação</Text>
          <Text
            style={s.footerText}
            render={({ pageNumber, totalPages }) =>
              `Página ${pageNumber} de ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
```

- [ ] **Step 2: Criar ReportsPdf.tsx**

Criar o arquivo `frontend/app/gerencia/pdf/ReportsPdf.tsx`:

```tsx
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

export interface ReportPdfItem {
  id: string;
  event_date: string;
  contractor_name: string;
  title_schedule?: string | null;
  author_name?: string | null;
}

interface ReportsPdfProps {
  reports: ReportPdfItem[];
  period: string;
  generatedAt: string;
}

const s = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica", fontSize: 9 },
  header: { marginBottom: 18 },
  title: { fontSize: 16, fontWeight: "bold", marginBottom: 4 },
  meta: { fontSize: 9, color: "#666", marginBottom: 2 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#6f4cff",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginBottom: 2,
  },
  row: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eeeeee",
    borderBottomStyle: "solid",
  },
  rowAlt: { backgroundColor: "#f9f7ff" },
  hText: { color: "#ffffff", fontWeight: "bold" },
  cDate: { width: "15%" },
  cContractor: { width: "30%" },
  cTitle: { width: "30%" },
  cAuthor: { width: "25%" },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: { fontSize: 8, color: "#aaaaaa" },
});

export function ReportsPdf({ reports, period, generatedAt }: ReportsPdfProps) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.title}>Relatórios de Eventos</Text>
          <Text style={s.meta}>Período: {period}</Text>
          <Text style={s.meta}>Gerado em: {generatedAt}</Text>
          <Text style={s.meta}>Total: {reports.length} relatório(s)</Text>
        </View>

        <View style={s.tableHeader}>
          <Text style={[s.cDate, s.hText]}>Data</Text>
          <Text style={[s.cContractor, s.hText]}>Contratante</Text>
          <Text style={[s.cTitle, s.hText]}>Título do Roteiro</Text>
          <Text style={[s.cAuthor, s.hText]}>Autor</Text>
        </View>

        {reports.map((r, i) => (
          <View key={r.id} style={[s.row, i % 2 === 1 ? s.rowAlt : {}]}>
            <Text style={s.cDate}>
              {new Date(`${r.event_date.slice(0, 10)}T00:00:00`).toLocaleDateString("pt-BR")}
            </Text>
            <Text style={s.cContractor}>{r.contractor_name}</Text>
            <Text style={s.cTitle}>{r.title_schedule ?? "-"}</Text>
            <Text style={s.cAuthor}>{r.author_name ?? "-"}</Text>
          </View>
        ))}

        <View style={s.footer} fixed>
          <Text style={s.footerText}>Sol e Lua Animação</Text>
          <Text
            style={s.footerText}
            render={({ pageNumber, totalPages }) =>
              `Página ${pageNumber} de ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
```

- [ ] **Step 3: Criar CoursesPdf.tsx**

Criar o arquivo `frontend/app/gerencia/pdf/CoursesPdf.tsx`:

```tsx
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

export interface CoursePdfItem {
  id: string;
  title: string;
  course_date: string;
  instructor: { name: string };
  capacity?: number | null;
  enrolled_count: number;
}

interface CoursesPdfProps {
  courses: CoursePdfItem[];
  period: string;
  generatedAt: string;
}

const s = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica", fontSize: 9 },
  header: { marginBottom: 18 },
  title: { fontSize: 16, fontWeight: "bold", marginBottom: 4 },
  meta: { fontSize: 9, color: "#666", marginBottom: 2 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#6f4cff",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginBottom: 2,
  },
  row: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eeeeee",
    borderBottomStyle: "solid",
  },
  rowAlt: { backgroundColor: "#f9f7ff" },
  hText: { color: "#ffffff", fontWeight: "bold" },
  cTitle: { width: "35%" },
  cDate: { width: "18%" },
  cInstructor: { width: "28%" },
  cCapacity: { width: "19%" },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: { fontSize: 8, color: "#aaaaaa" },
});

export function CoursesPdf({ courses, period, generatedAt }: CoursesPdfProps) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.title}>Cursos por Período</Text>
          <Text style={s.meta}>Período: {period}</Text>
          <Text style={s.meta}>Gerado em: {generatedAt}</Text>
          <Text style={s.meta}>Total: {courses.length} curso(s)</Text>
        </View>

        <View style={s.tableHeader}>
          <Text style={[s.cTitle, s.hText]}>Curso</Text>
          <Text style={[s.cDate, s.hText]}>Data</Text>
          <Text style={[s.cInstructor, s.hText]}>Instrutor</Text>
          <Text style={[s.cCapacity, s.hText]}>Inscritos / Vagas</Text>
        </View>

        {courses.map((c, i) => (
          <View key={c.id} style={[s.row, i % 2 === 1 ? s.rowAlt : {}]}>
            <Text style={s.cTitle}>{c.title}</Text>
            <Text style={s.cDate}>
              {new Date(`${c.course_date.slice(0, 10)}T00:00:00`).toLocaleDateString("pt-BR")}
            </Text>
            <Text style={s.cInstructor}>{c.instructor.name}</Text>
            <Text style={s.cCapacity}>
              {c.enrolled_count} / {c.capacity ?? "∞"}
            </Text>
          </View>
        ))}

        <View style={s.footer} fixed>
          <Text style={s.footerText}>Sol e Lua Animação</Text>
          <Text
            style={s.footerText}
            render={({ pageNumber, totalPages }) =>
              `Página ${pageNumber} de ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
```

- [ ] **Step 4: Confirmar que TypeScript compila os novos arquivos**

```bash
cd "/home/arthu/UnB - Linux/SL/SistemaSL/frontend"
npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Step 5: Commit**

```bash
cd "/home/arthu/UnB - Linux/SL/SistemaSL"
git add frontend/app/gerencia/pdf/
git commit -m "feat(gerencia): add PDF components for members, reports and courses"
```

---

## Task 5: Frontend — Página de Gerência

**Files:**
- Create: `frontend/app/gerencia/page.css`
- Create: `frontend/app/gerencia/page.tsx`

- [ ] **Step 1: Criar page.css**

Criar o arquivo `frontend/app/gerencia/page.css`:

```css
/* Gerência — relatórios gerenciais */

.gerencia-header {
  margin-bottom: 28px;
}

.gerencia-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--ink);
  margin: 0 0 4px;
}

.gerencia-subtitle {
  font-size: 14px;
  color: var(--muted);
  margin: 0;
}

/* Grid de 4 cards de resumo */
.gerencia-summary-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 48px;
}

/* Seções */
.gerencia-section {
  margin-bottom: 48px;
}

.gerencia-section-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--ink);
  margin: 0 0 16px;
}

.gerencia-section-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.gerencia-filters {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.gerencia-count {
  font-size: 13px;
  color: var(--muted);
  white-space: nowrap;
}

/* Tabela */
.gerencia-table-wrapper {
  overflow-x: auto;
  border-radius: 12px;
  border: 1px solid rgba(111, 76, 255, 0.1);
}

.gerencia-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.gerencia-table thead th {
  background: var(--accent-soft);
  color: var(--accent);
  text-align: left;
  padding: 10px 14px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.gerencia-table tbody tr {
  border-bottom: 1px solid rgba(111, 76, 255, 0.06);
}

.gerencia-table tbody tr:last-child {
  border-bottom: none;
}

.gerencia-table tbody td {
  padding: 10px 14px;
  color: var(--ink);
}

.gerencia-empty {
  text-align: center;
  padding: 32px;
  color: var(--muted);
  font-size: 14px;
}

/* Responsivo */
@media (max-width: 960px) {
  .gerencia-summary-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .gerencia-summary-grid {
    grid-template-columns: 1fr;
  }

  .gerencia-section-controls {
    flex-direction: column;
    align-items: flex-start;
  }
}
```

- [ ] **Step 2: Criar page.tsx**

Criar o arquivo `frontend/app/gerencia/page.tsx`:

```tsx
"use client";

import "./page.css";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FiBookOpen,
  FiDownload,
  FiFileText,
  FiUserX,
  FiUsers,
} from "react-icons/fi";
import { getCourses, getMembers, getReports } from "../../lib/api";
import {
  getDefaultRoute,
  getStoredUser,
  isRoleAllowed,
  type Role,
} from "../../lib/auth";

const allowedRoles: Role[] = ["admin"];

interface MemberItem {
  id: string;
  name: string;
  last_name?: string | null;
  cpf?: string | null;
  birth_date?: string | null;
  role: string;
}

interface ReportItem {
  id: string;
  event_date: string;
  contractor_name: string;
  title_schedule?: string | null;
  author_name?: string | null;
}

interface CourseItem {
  id: string;
  title: string;
  course_date: string;
  instructor: { id: string; name: string };
  capacity?: number | null;
  enrolled_count: number;
}

const MONTH_NAMES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  animador: "Animador",
  recreador: "Recreador",
};

function getMonthBounds(month: number, year: number) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

function formatPeriodLabel(month: number, year: number) {
  return `${MONTH_NAMES[month - 1]}/${year}`;
}

function formatDateBR(value: string) {
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("pt-BR");
}

function calcAge(birthDate: string): number {
  const today = new Date();
  const birth = new Date(`${birthDate}T00:00:00`);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

async function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function GerenciaPage() {
  const router = useRouter();
  const [canLoad, setCanLoad] = useState(false);

  // Summary cards
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [totalMembers, setTotalMembers] = useState(0);
  const [minorCount, setMinorCount] = useState(0);
  const [reportsThisMonth, setReportsThisMonth] = useState(0);
  const [coursesThisMonth, setCoursesThisMonth] = useState(0);

  // Members section
  const [membersLoading, setMembersLoading] = useState(false);
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [membersRoleFilter, setMembersRoleFilter] = useState("all");
  const [generatingMembersPdf, setGeneratingMembersPdf] = useState(false);

  // Reports section
  const now = new Date();
  const [reportsMonth, setReportsMonth] = useState(now.getMonth() + 1);
  const [reportsYear, setReportsYear] = useState(now.getFullYear());
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportItems, setReportItems] = useState<ReportItem[]>([]);
  const [generatingReportsPdf, setGeneratingReportsPdf] = useState(false);

  // Courses section
  const [coursesMonth, setCoursesMonth] = useState(now.getMonth() + 1);
  const [coursesYear, setCoursesYear] = useState(now.getFullYear());
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [courseItems, setCourseItems] = useState<CourseItem[]>([]);
  const [generatingCoursesPdf, setGeneratingCoursesPdf] = useState(false);

  const currentYear = now.getFullYear();
  const years = Array.from({ length: currentYear - 2022 + 2 }, (_, i) => 2022 + i);

  // Auth check
  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!isRoleAllowed(user.role, allowedRoles)) {
      router.replace(getDefaultRoute(user.role));
      return;
    }
    setCanLoad(true);
  }, [router]);

  // Summary cards: load once on mount
  useEffect(() => {
    if (!canLoad) return;
    setSummaryLoading(true);
    const { start, end } = getMonthBounds(now.getMonth() + 1, now.getFullYear());
    Promise.all([
      getMembers({ limit: 1000 }),
      getReports({ period_start: start, period_end: end, limit: 1000 }),
      getCourses({ status: "all", period_start: start, period_end: end, limit: 1000 }),
    ])
      .then(([membersRes, reportsRes, coursesRes]) => {
        const allMembers: MemberItem[] = membersRes.data ?? [];
        setTotalMembers(allMembers.length);
        setMinorCount(
          allMembers.filter((m) => m.birth_date && calcAge(m.birth_date) < 18).length
        );
        setReportsThisMonth((reportsRes.data ?? []).length);
        setCoursesThisMonth((coursesRes.data ?? []).length);
      })
      .finally(() => setSummaryLoading(false));
  }, [canLoad]); // eslint-disable-line react-hooks/exhaustive-deps

  // Members section: reload when role filter changes
  useEffect(() => {
    if (!canLoad) return;
    setMembersLoading(true);
    getMembers({
      role: membersRoleFilter === "all" ? undefined : membersRoleFilter,
      limit: 1000,
    })
      .then((res) => setMembers(res.data ?? []))
      .finally(() => setMembersLoading(false));
  }, [canLoad, membersRoleFilter]);

  // Reports section: reload when month/year changes
  useEffect(() => {
    if (!canLoad) return;
    setReportsLoading(true);
    const { start, end } = getMonthBounds(reportsMonth, reportsYear);
    getReports({ period_start: start, period_end: end, limit: 1000 })
      .then((res) => setReportItems(res.data ?? []))
      .finally(() => setReportsLoading(false));
  }, [canLoad, reportsMonth, reportsYear]);

  // Courses section: reload when month/year changes
  useEffect(() => {
    if (!canLoad) return;
    setCoursesLoading(true);
    const { start, end } = getMonthBounds(coursesMonth, coursesYear);
    getCourses({ status: "all", period_start: start, period_end: end, limit: 1000 })
      .then((res) => setCourseItems(res.data ?? []))
      .finally(() => setCoursesLoading(false));
  }, [canLoad, coursesMonth, coursesYear]);

  const handleGenerateMembersPdf = async () => {
    setGeneratingMembersPdf(true);
    try {
      const [{ pdf }, { MembersPdf }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./pdf/MembersPdf"),
      ]);
      const roleLabel =
        membersRoleFilter === "all"
          ? "todos"
          : (ROLE_LABELS[membersRoleFilter] ?? membersRoleFilter).toLowerCase();
      const blob = await pdf(
        <MembersPdf
          members={members}
          roleFilter={membersRoleFilter}
          generatedAt={new Date().toLocaleString("pt-BR")}
        />
      ).toBlob();
      await triggerDownload(blob, `membros-${roleLabel}.pdf`);
    } finally {
      setGeneratingMembersPdf(false);
    }
  };

  const handleGenerateReportsPdf = async () => {
    setGeneratingReportsPdf(true);
    try {
      const [{ pdf }, { ReportsPdf }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./pdf/ReportsPdf"),
      ]);
      const period = formatPeriodLabel(reportsMonth, reportsYear);
      const blob = await pdf(
        <ReportsPdf
          reports={reportItems}
          period={period}
          generatedAt={new Date().toLocaleString("pt-BR")}
        />
      ).toBlob();
      await triggerDownload(blob, `relatorios-${period.toLowerCase().replace("/", "-")}.pdf`);
    } finally {
      setGeneratingReportsPdf(false);
    }
  };

  const handleGenerateCoursesPdf = async () => {
    setGeneratingCoursesPdf(true);
    try {
      const [{ pdf }, { CoursesPdf }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./pdf/CoursesPdf"),
      ]);
      const period = formatPeriodLabel(coursesMonth, coursesYear);
      const blob = await pdf(
        <CoursesPdf
          courses={courseItems}
          period={period}
          generatedAt={new Date().toLocaleString("pt-BR")}
        />
      ).toBlob();
      await triggerDownload(blob, `cursos-${period.toLowerCase().replace("/", "-")}.pdf`);
    } finally {
      setGeneratingCoursesPdf(false);
    }
  };

  if (!canLoad) return null;

  const minorPercent =
    totalMembers > 0 ? Math.round((minorCount / totalMembers) * 100) : 0;

  return (
    <main className="page">
      <div className="gerencia-header">
        <h1 className="gerencia-title">Gerência</h1>
        <p className="gerencia-subtitle">Relatórios gerenciais e indicadores da empresa</p>
      </div>

      {/* Cards de resumo */}
      <div className="gerencia-summary-grid">
        <div className="summary-card">
          <div className="summary-head">
            <span className="summary-label">Total de Membros</span>
            <span className="summary-icon">
              <FiUsers aria-hidden="true" />
            </span>
          </div>
          <div className="summary-value">
            {summaryLoading ? "—" : totalMembers}
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-head">
            <span className="summary-label">Menores de Idade</span>
            <span className="summary-icon">
              <FiUserX aria-hidden="true" />
            </span>
          </div>
          <div className="summary-value">
            {summaryLoading ? "—" : minorCount}
          </div>
          {!summaryLoading && totalMembers > 0 && (
            <span className="summary-note">{minorPercent}% do total</span>
          )}
        </div>

        <div className="summary-card">
          <div className="summary-head">
            <span className="summary-label">Relatórios este Mês</span>
            <span className="summary-icon">
              <FiFileText aria-hidden="true" />
            </span>
          </div>
          <div className="summary-value">
            {summaryLoading ? "—" : reportsThisMonth}
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-head">
            <span className="summary-label">Cursos este Mês</span>
            <span className="summary-icon">
              <FiBookOpen aria-hidden="true" />
            </span>
          </div>
          <div className="summary-value">
            {summaryLoading ? "—" : coursesThisMonth}
          </div>
        </div>
      </div>

      {/* Seção: Membros */}
      <section className="gerencia-section">
        <h2 className="gerencia-section-title">Relação de Membros</h2>
        <div className="gerencia-section-controls">
          <div className="gerencia-filters">
            <select
              className="input"
              value={membersRoleFilter}
              onChange={(e) => setMembersRoleFilter(e.target.value)}
              aria-label="Filtrar por função"
            >
              <option value="all">Todos</option>
              <option value="admin">Administrador</option>
              <option value="animador">Animador</option>
              <option value="recreador">Recreador</option>
            </select>
            <span className="gerencia-count">
              {membersLoading ? "Carregando..." : `${members.length} membro(s)`}
            </span>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleGenerateMembersPdf}
            disabled={generatingMembersPdf || membersLoading || members.length === 0}
          >
            <FiDownload aria-hidden="true" />
            {generatingMembersPdf ? "Gerando..." : "Gerar PDF"}
          </button>
        </div>

        <div className="gerencia-table-wrapper">
          <table className="gerencia-table">
            <thead>
              <tr>
                <th>Nome Completo</th>
                <th>CPF</th>
                <th>Data de Nascimento</th>
                <th>Idade</th>
                <th>Função</th>
              </tr>
            </thead>
            <tbody>
              {membersLoading ? (
                <tr>
                  <td colSpan={5} className="gerencia-empty">Carregando...</td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={5} className="gerencia-empty">Nenhum membro encontrado.</td>
                </tr>
              ) : (
                members.map((m) => (
                  <tr key={m.id}>
                    <td>{m.name}{m.last_name ? ` ${m.last_name}` : ""}</td>
                    <td>{m.cpf ?? "—"}</td>
                    <td>{m.birth_date ? formatDateBR(m.birth_date) : "—"}</td>
                    <td>{m.birth_date ? calcAge(m.birth_date) : "—"}</td>
                    <td>{ROLE_LABELS[m.role] ?? m.role}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Seção: Relatórios de Eventos */}
      <section className="gerencia-section">
        <h2 className="gerencia-section-title">Relatórios de Eventos por Mês</h2>
        <div className="gerencia-section-controls">
          <div className="gerencia-filters">
            <select
              className="input"
              value={reportsMonth}
              onChange={(e) => setReportsMonth(Number(e.target.value))}
              aria-label="Mês dos relatórios"
            >
              {MONTH_NAMES.map((name, i) => (
                <option key={i + 1} value={i + 1}>{name}</option>
              ))}
            </select>
            <select
              className="input"
              value={reportsYear}
              onChange={(e) => setReportsYear(Number(e.target.value))}
              aria-label="Ano dos relatórios"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <span className="gerencia-count">
              {reportsLoading ? "Carregando..." : `${reportItems.length} relatório(s)`}
            </span>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleGenerateReportsPdf}
            disabled={generatingReportsPdf || reportsLoading || reportItems.length === 0}
          >
            <FiDownload aria-hidden="true" />
            {generatingReportsPdf ? "Gerando..." : "Gerar PDF"}
          </button>
        </div>

        <div className="gerencia-table-wrapper">
          <table className="gerencia-table">
            <thead>
              <tr>
                <th>Data do Evento</th>
                <th>Contratante</th>
                <th>Título do Roteiro</th>
                <th>Autor</th>
              </tr>
            </thead>
            <tbody>
              {reportsLoading ? (
                <tr>
                  <td colSpan={4} className="gerencia-empty">Carregando...</td>
                </tr>
              ) : reportItems.length === 0 ? (
                <tr>
                  <td colSpan={4} className="gerencia-empty">Nenhum relatório encontrado neste período.</td>
                </tr>
              ) : (
                reportItems.map((r) => (
                  <tr key={r.id}>
                    <td>{formatDateBR(r.event_date)}</td>
                    <td>{r.contractor_name}</td>
                    <td>{r.title_schedule ?? "—"}</td>
                    <td>{r.author_name ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Seção: Cursos */}
      <section className="gerencia-section">
        <h2 className="gerencia-section-title">Cursos por Mês</h2>
        <div className="gerencia-section-controls">
          <div className="gerencia-filters">
            <select
              className="input"
              value={coursesMonth}
              onChange={(e) => setCoursesMonth(Number(e.target.value))}
              aria-label="Mês dos cursos"
            >
              {MONTH_NAMES.map((name, i) => (
                <option key={i + 1} value={i + 1}>{name}</option>
              ))}
            </select>
            <select
              className="input"
              value={coursesYear}
              onChange={(e) => setCoursesYear(Number(e.target.value))}
              aria-label="Ano dos cursos"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <span className="gerencia-count">
              {coursesLoading ? "Carregando..." : `${courseItems.length} curso(s)`}
            </span>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleGenerateCoursesPdf}
            disabled={generatingCoursesPdf || coursesLoading || courseItems.length === 0}
          >
            <FiDownload aria-hidden="true" />
            {generatingCoursesPdf ? "Gerando..." : "Gerar PDF"}
          </button>
        </div>

        <div className="gerencia-table-wrapper">
          <table className="gerencia-table">
            <thead>
              <tr>
                <th>Curso</th>
                <th>Data</th>
                <th>Instrutor</th>
                <th>Inscritos / Vagas</th>
              </tr>
            </thead>
            <tbody>
              {coursesLoading ? (
                <tr>
                  <td colSpan={4} className="gerencia-empty">Carregando...</td>
                </tr>
              ) : courseItems.length === 0 ? (
                <tr>
                  <td colSpan={4} className="gerencia-empty">Nenhum curso encontrado neste período.</td>
                </tr>
              ) : (
                courseItems.map((c) => (
                  <tr key={c.id}>
                    <td>{c.title}</td>
                    <td>{formatDateBR(c.course_date)}</td>
                    <td>{c.instructor.name}</td>
                    <td>{c.enrolled_count} / {c.capacity ?? "∞"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 3: Confirmar que TypeScript compila**

```bash
cd "/home/arthu/UnB - Linux/SL/SistemaSL/frontend"
npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Step 4: Commit**

```bash
cd "/home/arthu/UnB - Linux/SL/SistemaSL"
git add frontend/app/gerencia/page.tsx frontend/app/gerencia/page.css
git commit -m "feat(gerencia): add management reports page with summary cards and PDF export"
```

---

## Task 6: Frontend — Adicionar item de navegação

**Files:**
- Modify: `frontend/app/components/SidebarNav.tsx`

- [ ] **Step 1: Adicionar import do ícone**

No topo do arquivo `frontend/app/components/SidebarNav.tsx`, adicionar `FiBarChart2` à lista de imports do `react-icons/fi`:

```typescript
// Localizar a linha que começa com:
import {
  FiAlertTriangle,
  FiBookOpen,
  FiFileText,
  FiGrid,
  FiMenu,
  FiMessageSquare,
  FiMoon,
  FiSun,
  FiUser,
  FiUsers,
  FiX,
} from "react-icons/fi";

// Adicionar FiBarChart2 à lista (em ordem alfabética):
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
  FiUser,
  FiUsers,
  FiX,
} from "react-icons/fi";
```

- [ ] **Step 2: Adicionar item ao navItems**

No array `navItems`, adicionar o item de Gerência após o item de Dashboard:

```typescript
// ANTES (trecho do array navItems):
const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    roles: ["admin"],
    icon: <FiGrid aria-hidden="true" />
  },
  {
    label: "Relatorios",
    href: "/relatorios",
    ...
  },
  ...
];

// DEPOIS (adicionar entre Dashboard e Relatorios):
const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    roles: ["admin"],
    icon: <FiGrid aria-hidden="true" />
  },
  {
    label: "Gerência",
    href: "/gerencia",
    roles: ["admin"],
    icon: <FiBarChart2 aria-hidden="true" />
  },
  {
    label: "Relatorios",
    href: "/relatorios",
    ...
  },
  ...
];
```

- [ ] **Step 3: Adicionar handler isActive para /gerencia**

Na função `isActive`, adicionar o caso para `/gerencia` após o caso de `/relatorios`:

```typescript
// Adicionar após o bloco de /relatorios:
if (href === "/gerencia") {
  return pathname.startsWith("/gerencia");
}
```

- [ ] **Step 4: Confirmar que TypeScript compila**

```bash
cd "/home/arthu/UnB - Linux/SL/SistemaSL/frontend"
npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Step 5: Commit**

```bash
cd "/home/arthu/UnB - Linux/SL/SistemaSL"
git add frontend/app/components/SidebarNav.tsx
git commit -m "feat(nav): add Gerência item to sidebar navigation"
```

---

## Self-Review

**Spec coverage:**
- ✅ Rota `/gerencia` admin-only → Task 5 (auth check no useEffect)
- ✅ 4 cards de resumo (total membros, menores, relatórios mês, cursos mês) → Task 5
- ✅ Seção membros com filtro de role + tabela CPF/nascimento/idade → Task 5
- ✅ Seção relatórios com seletor mês/ano → Task 5
- ✅ Seção cursos com seletor mês/ano → Task 5
- ✅ Botão "Gerar PDF" em cada seção → Task 5
- ✅ PDFs com cabeçalho, filtros aplicados, tabela, rodapé → Task 4
- ✅ Geração client-side com `@react-pdf/renderer` → Tasks 3, 4, 5
- ✅ Backend date filter para GET /cursos → Task 1
- ✅ `getReports` atualizado com date params → Task 2
- ✅ `getCourses` atualizado com date params → Task 2
- ✅ Item de navegação no sidebar → Task 6

**Consistência de tipos:**
- `MemberItem` definida em `page.tsx` e `MemberPdfItem` em `MembersPdf.tsx` — compatíveis (mesmos campos, `MemberPdfItem` é subconjunto)
- `ReportItem` / `ReportPdfItem` — mesmos campos
- `CourseItem` / `CoursePdfItem` — mesmos campos, incluindo `instructor.name`

**Notas de implementação:**
- `getReports` na página de relatórios existente chama `getReports()` sem params → ainda compatível pois os params são opcionais
- O campo `location` não está na resposta do list de relatórios (confirmado no backend) → tabela usa `title_schedule` no lugar
- `status: "all"` no `getCourses` para cursos garante que cursos sem vagas também apareçam nos resultados; cursos arquivados **não** aparecem (usa `listCourses()` que filtra `archivedAt: null`) — comportamento adequado para relatório gerencial
