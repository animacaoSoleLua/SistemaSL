# Notificações por Email via Resend — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Disparar notificações por email via Resend para 4 eventos: criação de curso, inscrição em curso, advertência e suspensão.

**Architecture:** Criar `backend/src/lib/email.ts` com a função base `sendEmail` (fetch direto, sem SDK, mesmo padrão de `password-reset-email.ts`) e 4 funções de alto nível. Conectar os disparos nos handlers de `POST /api/v1/cursos`, `POST /api/v1/cursos/:id/inscricoes` e `POST /api/v1/advertencias` como fire-and-forget (falhas logadas via `console.error`, sem afetar a resposta da API). Exportar `countWarningsInWindow` de `advertencias/store.ts` para uso no disparo do email de advertência.

**Tech Stack:** TypeScript, Vitest (unit tests com `vi.stubGlobal`), Resend REST API via `fetch`, variáveis `RESEND_API_KEY` e `RESEND_FROM`.

---

## File Map

| Ação | Arquivo |
|------|---------|
| Create | `backend/src/lib/email.ts` |
| Create | `backend/test/email.unit.test.ts` |
| Modify | `backend/src/advertencias/store.ts` (exportar `countWarningsInWindow`) |
| Modify | `backend/src/cursos/routes.ts` (disparar emails após criação e inscrição) |
| Modify | `backend/src/advertencias/routes.ts` (disparar emails após advertência/suspensão) |

---

## Task 1: Criar `backend/src/lib/email.ts` e seus testes unitários

**Files:**
- Create: `backend/src/lib/email.ts`
- Create: `backend/test/email.unit.test.ts`

- [ ] **Step 1: Escrever os testes que falham**

Criar `backend/test/email.unit.test.ts`:

```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  sendCourseCreatedEmail,
  sendEnrollmentConfirmationEmail,
  sendSuspensionEmail,
  sendWarningEmail,
} from "../src/lib/email.js";
import type { CourseRecord } from "../src/cursos/store.js";
import type { UserRecord } from "../src/auth/store.js";
import type { WarningRecord, SuspensionRecord } from "../src/advertencias/store.js";

const mockFetch = vi.fn();

const fakeCourse: CourseRecord = {
  id: "course-1",
  createdBy: "user-1",
  instructorId: "user-1",
  instructorName: "João Silva",
  title: "Curso de Som",
  description: "Treinamento técnico",
  courseDate: new Date("2026-05-01T10:00:00Z"),
  location: "Sala 1",
  capacity: 10,
  createdAt: new Date("2026-01-01"),
  enrollments: [],
};

const fakeMember: UserRecord = {
  id: "member-1",
  name: "Maria",
  lastName: "Santos",
  email: "maria@example.com",
  passwordHash: "hash",
  role: "recreador",
};

const fakeWarning: WarningRecord = {
  id: "warning-1",
  memberId: "member-1",
  createdBy: "admin-1",
  reason: "Conduta inadequada",
  warningDate: new Date("2026-04-09"),
  createdAt: new Date("2026-04-09"),
};

const fakeSuspension: SuspensionRecord = {
  id: "suspension-1",
  memberId: "member-1",
  startDate: new Date("2026-04-09"),
  endDate: new Date("2026-05-09"),
  reason: "3 advertencias",
  createdAt: new Date("2026-04-09"),
};

describe("email", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
    process.env.RESEND_API_KEY = "test-key";
    process.env.RESEND_FROM = "noreply@test.com";
    mockFetch.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM;
    vi.clearAllMocks();
  });

  it("sendCourseCreatedEmail envia para todos os membros", async () => {
    const members = [fakeMember, { ...fakeMember, id: "m2", email: "joao@example.com" }];
    await sendCourseCreatedEmail(fakeCourse, members);
    expect(mockFetch).toHaveBeenCalledOnce();
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.subject).toBe("Novo curso disponível: Curso de Som");
    expect(body.to).toEqual(["maria@example.com", "joao@example.com"]);
    expect(body.html).toContain("Curso de Som");
    expect(body.html).toContain("João Silva");
  });

  it("sendCourseCreatedEmail nao envia se nao ha membros", async () => {
    await sendCourseCreatedEmail(fakeCourse, []);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("sendEnrollmentConfirmationEmail envia para o membro inscrito", async () => {
    await sendEnrollmentConfirmationEmail(fakeCourse, fakeMember);
    expect(mockFetch).toHaveBeenCalledOnce();
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.subject).toBe("Inscrição confirmada: Curso de Som");
    expect(body.to).toEqual(["maria@example.com"]);
    expect(body.html).toContain("Maria");
    expect(body.html).toContain("Curso de Som");
  });

  it("sendWarningEmail envia para o membro advertido com contagem", async () => {
    await sendWarningEmail(fakeMember, fakeWarning, 2);
    expect(mockFetch).toHaveBeenCalledOnce();
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.subject).toBe("Você recebeu uma advertência");
    expect(body.to).toEqual(["maria@example.com"]);
    expect(body.html).toContain("Conduta inadequada");
    expect(body.html).toContain("2ª advertência");
  });

  it("sendSuspensionEmail envia para o membro suspenso", async () => {
    await sendSuspensionEmail(fakeMember, fakeSuspension);
    expect(mockFetch).toHaveBeenCalledOnce();
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.subject).toBe("Você foi suspenso");
    expect(body.to).toEqual(["maria@example.com"]);
    expect(body.html).toContain("3 advertências");
  });

  it("sendEmail lanca erro se RESEND_API_KEY ausente", async () => {
    delete process.env.RESEND_API_KEY;
    await expect(sendEnrollmentConfirmationEmail(fakeCourse, fakeMember)).rejects.toThrow(
      "missing_env_RESEND_API_KEY"
    );
  });
});
```

- [ ] **Step 2: Rodar os testes para confirmar que falham**

```bash
cd /home/arthu/UnB\ -\ Linux/SL/SistemaSL/backend && npx vitest run test/email.unit.test.ts 2>&1 | tail -20
```

Esperado: FAIL — `Cannot find module '../src/lib/email.js'`

- [ ] **Step 3: Criar `backend/src/lib/email.ts`**

```typescript
import type { CourseRecord } from "../cursos/store.js";
import type { UserRecord } from "../auth/store.js";
import type { WarningRecord, SuspensionRecord } from "../advertencias/store.js";

const RESEND_API_URL = "https://api.resend.com/emails";

function requireEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`missing_env_${name}`);
  }
  return value;
}

function ordinal(n: number): string {
  if (n === 1) return "1ª";
  if (n === 2) return "2ª";
  if (n === 3) return "3ª";
  return `${n}ª`;
}

export async function sendEmail(
  to: string[],
  subject: string,
  html: string,
  text: string
): Promise<void> {
  const apiKey = requireEnv(process.env.RESEND_API_KEY, "RESEND_API_KEY");
  const from = requireEnv(process.env.RESEND_FROM, "RESEND_FROM");

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html, text }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `resend_failed_${response.status}${errorText ? `_${errorText}` : ""}`
    );
  }
}

export async function sendCourseCreatedEmail(
  course: CourseRecord,
  members: UserRecord[]
): Promise<void> {
  if (members.length === 0) return;

  const to = members.map((m) => m.email);
  const subject = `Novo curso disponível: ${course.title}`;

  const dateStr = course.courseDate.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Novo curso disponível: ${course.title}</h2>
      <p><strong>Data:</strong> ${dateStr}</p>
      <p><strong>Local:</strong> ${course.location ?? "A definir"}</p>
      <p><strong>Instrutor:</strong> ${course.instructorName}</p>
      ${course.description ? `<p><strong>Descrição:</strong> ${course.description}</p>` : ""}
      ${course.capacity !== null ? `<p><strong>Vagas disponíveis:</strong> ${course.capacity}</p>` : ""}
    </div>
  `;

  const text = [
    `Novo curso disponível: ${course.title}`,
    `Data: ${dateStr}`,
    `Local: ${course.location ?? "A definir"}`,
    `Instrutor: ${course.instructorName}`,
    course.description ? `Descrição: ${course.description}` : "",
    course.capacity !== null ? `Vagas disponíveis: ${course.capacity}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  await sendEmail(to, subject, html, text);
}

export async function sendEnrollmentConfirmationEmail(
  course: CourseRecord,
  member: UserRecord
): Promise<void> {
  const subject = `Inscrição confirmada: ${course.title}`;
  const memberName = [member.name, member.lastName].filter(Boolean).join(" ");

  const dateStr = course.courseDate.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Inscrição confirmada!</h2>
      <p>Olá, <strong>${memberName}</strong>! Sua inscrição foi confirmada.</p>
      <p><strong>Curso:</strong> ${course.title}</p>
      <p><strong>Data:</strong> ${dateStr}</p>
      <p><strong>Local:</strong> ${course.location ?? "A definir"}</p>
      <p><strong>Instrutor:</strong> ${course.instructorName}</p>
    </div>
  `;

  const text = [
    `Inscrição confirmada: ${course.title}`,
    `Olá, ${memberName}! Sua inscrição foi confirmada.`,
    `Curso: ${course.title}`,
    `Data: ${dateStr}`,
    `Local: ${course.location ?? "A definir"}`,
    `Instrutor: ${course.instructorName}`,
  ].join("\n");

  await sendEmail([member.email], subject, html, text);
}

export async function sendWarningEmail(
  member: UserRecord,
  warning: WarningRecord,
  warningCount: number
): Promise<void> {
  const subject = "Você recebeu uma advertência";
  const memberName = [member.name, member.lastName].filter(Boolean).join(" ");
  const dateStr = warning.warningDate.toLocaleDateString("pt-BR");
  const ordinalCount = ordinal(warningCount);

  const suspensionNotice =
    warningCount < 3
      ? `Esta é sua ${ordinalCount} advertência no último mês. Ao atingir 3, você será suspenso.`
      : `Esta é sua ${ordinalCount} advertência no último mês.`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Você recebeu uma advertência</h2>
      <p>Olá, <strong>${memberName}</strong>.</p>
      <p><strong>Motivo:</strong> ${warning.reason}</p>
      <p><strong>Data:</strong> ${dateStr}</p>
      <p>${suspensionNotice}</p>
    </div>
  `;

  const text = [
    "Você recebeu uma advertência.",
    `Olá, ${memberName}.`,
    `Motivo: ${warning.reason}`,
    `Data: ${dateStr}`,
    suspensionNotice,
  ].join("\n");

  await sendEmail([member.email], subject, html, text);
}

export async function sendSuspensionEmail(
  member: UserRecord,
  suspension: SuspensionRecord
): Promise<void> {
  const subject = "Você foi suspenso";
  const memberName = [member.name, member.lastName].filter(Boolean).join(" ");
  const startStr = suspension.startDate.toLocaleDateString("pt-BR");
  const endStr = suspension.endDate.toLocaleDateString("pt-BR");

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Você foi suspenso</h2>
      <p>Olá, <strong>${memberName}</strong>.</p>
      <p><strong>Motivo:</strong> Você acumulou 3 advertências no período de 1 mês.</p>
      <p><strong>Início da suspensão:</strong> ${startStr}</p>
      <p><strong>Fim da suspensão:</strong> ${endStr}</p>
    </div>
  `;

  const text = [
    "Você foi suspenso.",
    `Olá, ${memberName}.`,
    "Motivo: Você acumulou 3 advertências no período de 1 mês.",
    `Início da suspensão: ${startStr}`,
    `Fim da suspensão: ${endStr}`,
  ].join("\n");

  await sendEmail([member.email], subject, html, text);
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

```bash
cd /home/arthu/UnB\ -\ Linux/SL/SistemaSL/backend && npx vitest run test/email.unit.test.ts 2>&1 | tail -20
```

Esperado: todos os 5 testes PASS.

- [ ] **Step 5: Commit**

```bash
cd /home/arthu/UnB\ -\ Linux/SL/SistemaSL && git add backend/src/lib/email.ts backend/test/email.unit.test.ts && git commit -m "feat: add email notification helpers for course, enrollment, warning, and suspension"
```

---

## Task 2: Exportar `countWarningsInWindow` de `advertencias/store.ts`

**Files:**
- Modify: `backend/src/advertencias/store.ts:44`

- [ ] **Step 1: Adicionar `export` à função `countWarningsInWindow`**

Em `backend/src/advertencias/store.ts`, linha 44, trocar:

```typescript
async function countWarningsInWindow(
```

por:

```typescript
export async function countWarningsInWindow(
```

- [ ] **Step 2: Verificar que os testes existentes ainda passam**

```bash
cd /home/arthu/UnB\ -\ Linux/SL/SistemaSL/backend && npx vitest run test/advertencias.integration.test.ts 2>&1 | tail -20
```

Esperado: PASS (nenhuma mudança de comportamento).

- [ ] **Step 3: Commit**

```bash
cd /home/arthu/UnB\ -\ Linux/SL/SistemaSL && git add backend/src/advertencias/store.ts && git commit -m "feat: export countWarningsInWindow from advertencias store"
```

---

## Task 3: Disparar emails em `backend/src/cursos/routes.ts`

**Files:**
- Modify: `backend/src/cursos/routes.ts`

Dois pontos de disparo:
1. `POST /api/v1/cursos` — após `createCourse()`, notificar todos os membros
2. `POST /api/v1/cursos/:id/inscricoes` — após `addEnrollment()`, notificar o membro inscrito

- [ ] **Step 1: Adicionar imports de email e listUsers no topo do arquivo**

No início de `backend/src/cursos/routes.ts`, após as importações existentes, adicionar:

```typescript
import { listUsers } from "../auth/store.js";
import {
  sendCourseCreatedEmail,
  sendEnrollmentConfirmationEmail,
} from "../lib/email.js";
```

> Nota: `getUserById` já está importado neste arquivo.

- [ ] **Step 2: Disparar email após `createCourse()` (POST /api/v1/cursos)**

Localizar este trecho em `cursos/routes.ts` (linha ~209):

```typescript
      const course = await createCourse(request.user!.id, {
        instructorId: instructor_id,
        title,
        description,
        courseDate,
        location,
        capacity,
      });

      // GOOGLE_CALENDAR_DISABLED_START
```

Substituir por:

```typescript
      const course = await createCourse(request.user!.id, {
        instructorId: instructor_id,
        title,
        description,
        courseDate,
        location,
        capacity,
      });

      listUsers().then((members) =>
        sendCourseCreatedEmail(course, members).catch((err) =>
          console.error("sendCourseCreatedEmail failed", err)
        )
      ).catch((err) => console.error("listUsers failed for course email", err));

      // GOOGLE_CALENDAR_DISABLED_START
```

- [ ] **Step 3: Disparar email após `addEnrollment()` (POST /api/v1/cursos/:id/inscricoes)**

Localizar este trecho em `cursos/routes.ts` (linha ~525):

```typescript
    const enrollment = await addEnrollment(course, member_id);

    // GOOGLE_CALENDAR_DISABLED_START
```

Substituir por:

```typescript
    const enrollment = await addEnrollment(course, member_id);

    getUserById(member_id).then((member) => {
      if (member) {
        sendEnrollmentConfirmationEmail(course, member).catch((err) =>
          console.error("sendEnrollmentConfirmationEmail failed", err)
        );
      }
    }).catch((err) => console.error("getUserById failed for enrollment email", err));

    // GOOGLE_CALENDAR_DISABLED_START
```

- [ ] **Step 4: Verificar que os testes de cursos passam**

```bash
cd /home/arthu/UnB\ -\ Linux/SL/SistemaSL/backend && npx vitest run test/cursos.integration.test.ts 2>&1 | tail -20
```

Esperado: PASS (os emails falham silenciosamente pois `RESEND_API_KEY` não está configurada no ambiente de teste, sem afetar as respostas da API).

- [ ] **Step 5: Commit**

```bash
cd /home/arthu/UnB\ -\ Linux/SL/SistemaSL && git add backend/src/cursos/routes.ts && git commit -m "feat: trigger email notifications on course creation and enrollment"
```

---

## Task 4: Disparar emails em `backend/src/advertencias/routes.ts`

**Files:**
- Modify: `backend/src/advertencias/routes.ts`

Ponto de disparo: `POST /api/v1/advertencias` — após `createWarning()`, disparar email de advertência e, se `suspensionApplied === true`, email de suspensão.

- [ ] **Step 1: Adicionar imports de email, countWarningsInWindow e getActiveSuspension**

No início de `backend/src/advertencias/routes.ts`, após as importações existentes, adicionar:

```typescript
import {
  countWarningsInWindow,
  getActiveSuspension,
} from "./store.js";
import { sendWarningEmail, sendSuspensionEmail } from "../lib/email.js";
```

> Nota: `getUserById` já está importado neste arquivo.

- [ ] **Step 2: Disparar emails após `createWarning()` (POST /api/v1/advertencias)**

Localizar este trecho em `advertencias/routes.ts` (linha ~188):

```typescript
      const result = await createWarning(request.user!.id, {
        memberId: member.id,
        reason: reason.trim(),
        warningDate: parsedDate,
      });

      auditLog(request.log, "WARNING_CREATED", request.user!.id, {
```

Substituir por:

```typescript
      const result = await createWarning(request.user!.id, {
        memberId: member.id,
        reason: reason.trim(),
        warningDate: parsedDate,
      });

      const windowStart = new Date(parsedDate);
      windowStart.setMonth(windowStart.getMonth() - 1);
      countWarningsInWindow(member.id, windowStart, parsedDate).then((warningCount) =>
        sendWarningEmail(member, result.warning, warningCount).catch((err) =>
          console.error("sendWarningEmail failed", err)
        )
      ).catch((err) => console.error("countWarningsInWindow failed for warning email", err));

      if (result.suspensionApplied) {
        getActiveSuspension(member.id).then((suspension) => {
          if (suspension) {
            sendSuspensionEmail(member, suspension).catch((err) =>
              console.error("sendSuspensionEmail failed", err)
            );
          }
        }).catch((err) => console.error("getActiveSuspension failed for suspension email", err));
      }

      auditLog(request.log, "WARNING_CREATED", request.user!.id, {
```

- [ ] **Step 3: Verificar que os testes de advertências passam**

```bash
cd /home/arthu/UnB\ -\ Linux/SL/SistemaSL/backend && npx vitest run test/advertencias.integration.test.ts 2>&1 | tail -20
```

Esperado: PASS (os emails falham silenciosamente pois `RESEND_API_KEY` não está configurada no ambiente de teste).

- [ ] **Step 4: Rodar toda a suite de testes**

```bash
cd /home/arthu/UnB\ -\ Linux/SL/SistemaSL/backend && npx vitest run 2>&1 | tail -30
```

Esperado: todos os testes PASS.

- [ ] **Step 5: Commit**

```bash
cd /home/arthu/UnB\ -\ Linux/SL/SistemaSL && git add backend/src/advertencias/routes.ts && git commit -m "feat: trigger email notifications on warning creation and suspension"
```
