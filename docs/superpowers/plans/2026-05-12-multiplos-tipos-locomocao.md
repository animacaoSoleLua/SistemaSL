# Múltiplos Tipos de Locomoção — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que um relatório registre múltiplos meios de locomoção (ex: Uber + Carro da Empresa) num mesmo evento, substituindo o campo de tipo único por um array de tipos.

**Architecture:** Troca `transportType String` (coluna única) por `transportTypes String[]` (array PostgreSQL nativo via Prisma). O store passa a gerenciar o campo via Prisma client em vez de raw SQL. Os endpoints de create/update aceitam `transport_types: string[]`; os endpoints de leitura retornam o mesmo. O frontend usa checkboxes em vez de select.

**Tech Stack:** Next.js 14 (frontend), Fastify + Prisma + PostgreSQL (backend), Vitest (backend tests)

---

## Mapa de Arquivos

| Arquivo | O que muda |
|---|---|
| `backend/prisma/schema.prisma` | `transportType String` → `transportTypes String[]` |
| `backend/prisma/migrations/<timestamp>_multiple_transport_types/migration.sql` | Nova migration com backfill de dados |
| `backend/src/relatorios/store.ts` | Tipos, raw SQL e Prisma calls para o novo campo |
| `backend/src/relatorios/routes.ts` | Validação e resposta dos endpoints POST e PATCH |
| `backend/test/relatorios.integration.test.ts` | Atualizar payloads e assertions |
| `frontend/app/novo-relatorio/page.tsx` | Estado + UI (checkboxes) + payload enviado |
| `frontend/app/relatorios/page.tsx` | Tipo + `formatTransportType` + lógica condicional |

---

## Task 1: Schema Prisma + Migration

**Files:**
- Modify: `backend/prisma/schema.prisma:77`
- Create: `backend/prisma/migrations/<timestamp>_multiple_transport_types/migration.sql`

- [ ] **Step 1: Editar schema.prisma**

Em `backend/prisma/schema.prisma`, substituir a linha 77:
```prisma
// antes
transportType          String           @map("transport_type") @db.VarChar(30)

// depois
transportTypes         String[]         @map("transport_types")
```

- [ ] **Step 2: Gerar a migration sem aplicar**

```bash
cd backend && npx prisma migrate dev --name multiple_transport_types --create-only
```

Isso cria um arquivo em `backend/prisma/migrations/<timestamp>_multiple_transport_types/migration.sql`.

- [ ] **Step 3: Editar a migration SQL para incluir o backfill**

Abrir o arquivo `migration.sql` gerado. Ele terá algo como:
```sql
ALTER TABLE "reports" ADD COLUMN "transport_types" TEXT[];
ALTER TABLE "reports" DROP COLUMN "transport_type";
```

Editar para:
```sql
ALTER TABLE "reports" ADD COLUMN "transport_types" TEXT[] NOT NULL DEFAULT '{}';
UPDATE "reports" SET "transport_types" = ARRAY["transport_type"];
ALTER TABLE "reports" DROP COLUMN "transport_type";
ALTER TABLE "reports" ALTER COLUMN "transport_types" DROP DEFAULT;
```

> A ordem importa: ADD COLUMN com DEFAULT → backfill → DROP COLUMN → DROP DEFAULT.

- [ ] **Step 4: Aplicar a migration**

```bash
cd backend && npx prisma migrate dev
```

Saída esperada: `Your database is now in sync with your schema.`

- [ ] **Step 5: Verificar o Prisma Client gerado**

```bash
cd backend && npx prisma generate
```

Saída esperada: `Generated Prisma Client` sem erros.

- [ ] **Step 6: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "feat: migrate transport_type column to transport_types array"
```

---

## Task 2: Backend Store

**Files:**
- Modify: `backend/src/relatorios/store.ts`

- [ ] **Step 1: Atualizar `ReportRecord`**

Substituir as linhas 43-46:
```typescript
// antes
transportType?: string;
uberGoValue?: number | null;
uberReturnValue?: number | null;
otherCarResponsible?: string;

// depois
transportTypes: string[];
uberGoValue?: number | null;
uberReturnValue?: number | null;
otherCarResponsible?: string;
```

- [ ] **Step 2: Atualizar `CreateReportInput`**

Substituir as linhas 72-75:
```typescript
// antes
transportType: string;
uberGoValue?: number;
uberReturnValue?: number;
otherCarResponsible?: string;

// depois
transportTypes: string[];
uberGoValue?: number;
uberReturnValue?: number;
otherCarResponsible?: string;
```

- [ ] **Step 3: Atualizar o parâmetro de `toReportRecord`**

No tipo inline do parâmetro de `toReportRecord` (linha ~153), substituir:
```typescript
// antes
transportType?: string | null;

// depois
transportTypes?: string[] | null;
```

- [ ] **Step 4: Atualizar o corpo de `toReportRecord`**

Substituir a linha ~205:
```typescript
// antes
transportType: report.transportType ?? undefined,

// depois
transportTypes: report.transportTypes ?? [],
```

- [ ] **Step 5: Remover `transportType` de `ReportExtraFields`**

Remover `"transportType"` do `Pick` na linha ~235:
```typescript
// antes
type ReportExtraFields = Partial<
  Pick<
    CreateReportInput,
    | "titleSchedule"
    | "birthdayAge"
    | "transportType"      // ← remover esta linha
    | "uberGoValue"
    | ...
  >
>;

// depois
type ReportExtraFields = Partial<
  Pick<
    CreateReportInput,
    | "titleSchedule"
    | "birthdayAge"
    | "uberGoValue"
    | ...
  >
>;
```

- [ ] **Step 6: Remover `transport_type` do raw SQL em `updateReportExtraFields`**

Na função `updateReportExtraFields` (linha ~257), remover a linha:
```typescript
// remover:
"transport_type" = COALESCE(${fields.transportType ?? null}, "transport_type"),
```

- [ ] **Step 7: Remover `transportType` de `getReportExtraFields`**

Na função `getReportExtraFields`:
- Remover `transportType?: string | null;` da tipagem de retorno (~linha 286)
- Remover `"transport_type"` do SELECT e do campo `transport_type: string | null` da tipagem do `$queryRaw` (~linha 306)
- Remover `transportType: row.transport_type,` do objeto de retorno (~linha 354)

- [ ] **Step 8: Atualizar `createReport` — Prisma create**

Substituir na chamada `prisma.report.create()` (~linha 382):
```typescript
// antes
transportType: input?.transportType ?? "",

// depois
transportTypes: input?.transportTypes ?? [],
```

- [ ] **Step 9: Atualizar `createReport` — chamada de `updateReportExtraFields`**

Remover `transportType: input?.transportType,` da chamada `updateReportExtraFields` (~linha 410).

- [ ] **Step 10: Atualizar `updateReport` — Prisma update**

Na chamada `prisma.report.update()` (~linha 444), adicionar `transportTypes` no `data`:
```typescript
await prisma.report.update({
  where: { id },
  data: {
    eventDate: input.eventDate ?? new Date(),
    contractorName: input.contractorName ?? "Nao informado",
    teamSummary: input.teamSummary ?? "Nao informado",
    transportTypes: input.transportTypes ?? [],   // ← adicionar
    qualitySound: input.qualitySound,
    qualityMicrophone: input.qualityMicrophone,
    notes: input.notes,
  },
});
```

- [ ] **Step 11: Atualizar `updateReport` — chamada de `updateReportExtraFields`**

Remover `transportType: input.transportType,` da chamada `updateReportExtraFields` (~linha 459).

- [ ] **Step 12: Verificar que compila**

```bash
cd backend && npx tsc --noEmit
```

Saída esperada: sem erros.

- [ ] **Step 13: Commit**

```bash
git add backend/src/relatorios/store.ts
git commit -m "feat: update relatorios store for transport_types array"
```

---

## Task 3: Backend Routes

**Files:**
- Modify: `backend/src/relatorios/routes.ts`

- [ ] **Step 1: Atualizar `ReportBody`**

Substituir nas linhas 45-48:
```typescript
// antes
transport_type: string;
uber_go_value?: number;
uber_return_value?: number;
other_car_responsible?: string;

// depois
transport_types: string[];
uber_go_value?: number;
uber_return_value?: number;
other_car_responsible?: string;
```

- [ ] **Step 2: Atualizar destructuring no POST create (~linha 384)**

```typescript
// antes
transport_type,

// depois
transport_types,
```

- [ ] **Step 3: Atualizar validação de campos obrigatórios no POST create (~linha 406)**

```typescript
// antes
if (!event_date || !contractor_name || !team_summary || !title_schedule || !transport_type) {

// depois
if (!event_date || !contractor_name || !team_summary || !title_schedule ||
    !Array.isArray(transport_types) || transport_types.length === 0) {
```

- [ ] **Step 4: Adicionar validação dos valores permitidos para transport_types no POST create**

Adicionar logo após a verificação de campos obrigatórios (~linha 412):
```typescript
const VALID_TRANSPORT_TYPES = ["uber99", "carro_empresa", "outro"] as const;
if (!transport_types.every((t) => (VALID_TRANSPORT_TYPES as readonly string[]).includes(t))) {
  return reply.status(400).send({
    error: "invalid_request",
    message: "Tipo de locomoção invalido",
  });
}
```

- [ ] **Step 5: Atualizar validação de valores Uber no POST create (~linha 437)**

```typescript
// antes
if (
  !isValidOptionalMoney(uber_go_value) ||
  !isValidOptionalMoney(uber_return_value)
) {

// depois
const hasUber = transport_types.includes("uber99");
if (
  (hasUber && !isValidOptionalMoney(uber_go_value)) ||
  (hasUber && !isValidOptionalMoney(uber_return_value))
) {
```

- [ ] **Step 6: Atualizar chamada de `createReport` no POST create (~linha 494)**

```typescript
// antes
transportType: transport_type,

// depois
transportTypes: transport_types,
```

Também ajustar os campos uber condicionais na chamada:
```typescript
// antes
uberGoValue: uber_go_value,
uberReturnValue: uber_return_value,
otherCarResponsible: other_car_responsible,

// depois
uberGoValue: transport_types.includes("uber99") ? uber_go_value : undefined,
uberReturnValue: transport_types.includes("uber99") ? uber_return_value : undefined,
otherCarResponsible: transport_types.includes("outro") ? other_car_responsible : undefined,
```

- [ ] **Step 7: Atualizar resposta do GET por ID (~linha 592)**

```typescript
// antes
transport_type: report.transportType,

// depois
transport_types: report.transportTypes,
```

- [ ] **Step 8: Atualizar destructuring no PATCH update (~linha 666)**

```typescript
// antes
transport_type,

// depois
transport_types,
```

- [ ] **Step 9: Atualizar validação de campos obrigatórios no PATCH update (~linha 688)**

Mesmo padrão do Step 3:
```typescript
// antes
if (!event_date || !contractor_name || !team_summary || !title_schedule || !transport_type) {

// depois
if (!event_date || !contractor_name || !team_summary || !title_schedule ||
    !Array.isArray(transport_types) || transport_types.length === 0) {
```

- [ ] **Step 10: Adicionar validação de tipos e uber no PATCH update (~linha 694)**

Mesmo padrão dos Steps 4 e 5, logo após a validação de campos obrigatórios:
```typescript
const VALID_TRANSPORT_TYPES = ["uber99", "carro_empresa", "outro"] as const;
if (!transport_types.every((t) => (VALID_TRANSPORT_TYPES as readonly string[]).includes(t))) {
  return reply.status(400).send({
    error: "invalid_request",
    message: "Tipo de locomoção invalido",
  });
}
```

E a validação de dinheiro:
```typescript
const hasUber = transport_types.includes("uber99");
if (
  (hasUber && !isValidOptionalMoney(uber_go_value)) ||
  (hasUber && !isValidOptionalMoney(uber_return_value))
) {
  return reply.status(400).send({
    error: "invalid_request",
    message: "Valor de locomoção invalido",
  });
}
```

- [ ] **Step 11: Atualizar chamada de `updateReport` no PATCH (~linha 777)**

```typescript
// antes
transportType: transport_type,
uberGoValue: uber_go_value,
uberReturnValue: uber_return_value,
otherCarResponsible: other_car_responsible,

// depois
transportTypes: transport_types,
uberGoValue: transport_types.includes("uber99") ? uber_go_value : undefined,
uberReturnValue: transport_types.includes("uber99") ? uber_return_value : undefined,
otherCarResponsible: transport_types.includes("outro") ? other_car_responsible : undefined,
```

- [ ] **Step 12: Atualizar linha de texto do download PDF (~linha 893)**

```typescript
// antes
`Locomocao: ${report.transportType ?? "-"}`,

// depois
`Locomocao: ${report.transportTypes.join(", ") || "-"}`,
```

- [ ] **Step 13: Verificar que compila**

```bash
cd backend && npx tsc --noEmit
```

Saída esperada: sem erros.

- [ ] **Step 14: Commit**

```bash
git add backend/src/relatorios/routes.ts
git commit -m "feat: update relatorios routes to accept transport_types array"
```

---

## Task 4: Backend Tests

**Files:**
- Modify: `backend/test/relatorios.integration.test.ts`

- [ ] **Step 1: Escrever teste para múltiplos tipos de locomoção**

Adicionar no final do `describe`, antes do último `}`):
```typescript
it("creates report with multiple transport types", async () => {
  const login = await app.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    payload: { email: "animador@sol-e-lua.com", password: "animador123" },
  });
  const token = login.json().data.access_token;

  const createResponse = await app.inject({
    method: "POST",
    url: "/api/v1/relatorios",
    headers: { authorization: `Bearer ${token}` },
    payload: {
      event_date: "2026-02-01",
      contractor_name: "Empresa Teste",
      title_schedule: "Evento corporativo",
      transport_types: ["uber99", "carro_empresa"],
      uber_go_value: 40,
      uber_return_value: 35,
      team_summary: "Equipe mista",
    },
  });

  expect(createResponse.statusCode).toBe(201);
  const reportId = createResponse.json().data.id;

  const detailResponse = await app.inject({
    method: "GET",
    url: `/api/v1/relatorios/${reportId}`,
    headers: { authorization: `Bearer ${token}` },
  });

  expect(detailResponse.statusCode).toBe(200);
  const body = detailResponse.json();
  expect(body.data.transport_types).toEqual(["uber99", "carro_empresa"]);
  expect(body.data.uber_go_value).toBe(40);
  expect(body.data.uber_return_value).toBe(35);
});

it("rejects report with empty transport_types", async () => {
  const login = await app.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    payload: { email: "animador@sol-e-lua.com", password: "animador123" },
  });
  const token = login.json().data.access_token;

  const createResponse = await app.inject({
    method: "POST",
    url: "/api/v1/relatorios",
    headers: { authorization: `Bearer ${token}` },
    payload: {
      event_date: "2026-02-02",
      contractor_name: "Empresa X",
      title_schedule: "Evento",
      transport_types: [],
      team_summary: "Equipe",
    },
  });

  expect(createResponse.statusCode).toBe(400);
  expect(createResponse.json().error).toBe("invalid_request");
});
```

- [ ] **Step 2: Rodar os novos testes para ver falhar**

```bash
cd backend && npx vitest run test/relatorios.integration.test.ts 2>&1 | tail -30
```

Esperado: os 2 novos testes falham, os existentes também falham (ainda usam `transport_type`).

- [ ] **Step 3: Atualizar todos os payloads existentes no arquivo de teste**

Substituir todas as ocorrências de `transport_type:` por `transport_types:` **no payload**, convertendo o valor de string para array de um elemento. Há 8 ocorrências, exemplos:

```typescript
// antes
transport_type: "uber99",

// depois
transport_types: ["uber99"],
```

```typescript
// antes
transport_type: "particular",

// depois
transport_types: ["carro_pessoal"],   // atenção: "particular" não é um valor válido;
                                       // checar se era intencional ou usar "outro"
```

> ⚠️ Os testes com `"particular"` provavelmente eram um valor informal/incorreto que passava antes. Com a nova validação, usar `"outro"` (Carro Pessoal).

- [ ] **Step 4: Atualizar a assertion `transport_type` no teste existente (~linha 414)**

```typescript
// antes
expect(body.data.transport_type).toBe("outro");

// depois
expect(body.data.transport_types).toEqual(["outro"]);
```

- [ ] **Step 5: Rodar todos os testes de relatorios**

```bash
cd backend && npx vitest run test/relatorios.integration.test.ts 2>&1 | tail -30
```

Saída esperada: todos os testes passam.

- [ ] **Step 6: Rodar a suite completa**

```bash
cd backend && npx vitest run 2>&1 | tail -20
```

Saída esperada: todos os testes passam.

- [ ] **Step 7: Commit**

```bash
git add backend/test/relatorios.integration.test.ts
git commit -m "test: update relatorios tests for transport_types array"
```

---

## Task 5: Frontend — Formulário de Novo Relatório

**Files:**
- Modify: `frontend/app/novo-relatorio/page.tsx`

- [ ] **Step 1: Atualizar o tipo `TransportType`**

Substituir (~linha 21):
```typescript
// antes
type TransportType = "" | "uber99" | "carro_empresa" | "outro";

// depois
type TransportType = "uber99" | "carro_empresa" | "outro";
```

- [ ] **Step 2: Atualizar o estado de transporte**

Substituir (~linha 287):
```typescript
// antes
const [transportType, setTransportType] = useState<TransportType>("uber99");

// depois
const [transportTypes, setTransportTypes] = useState<Set<TransportType>>(
  new Set(["uber99"])
);
```

- [ ] **Step 3: Atualizar a carga dos dados no modo edição**

Substituir (~linha 361):
```typescript
// antes
setTransportType((report.transport_type as TransportType) ?? "uber99");

// depois
const types = (report.transport_types as TransportType[] | undefined) ?? ["uber99"];
setTransportTypes(new Set(types));
```

- [ ] **Step 4: Atualizar o payload enviado ao submeter**

No objeto `reportPayload` (~linha 561), substituir:
```typescript
// antes
transport_type: transportType,
uber_go_value:
  transportType === "uber99" && uberGoValue.trim()
    ? Number(uberGoValue)
    : undefined,
uber_return_value:
  transportType === "uber99" && uberReturnValue.trim()
    ? Number(uberReturnValue)
    : undefined,
other_car_responsible:
  transportType === "outro" && otherCarResponsible.trim()
    ? otherCarResponsible.trim()
    : undefined,

// depois
transport_types: Array.from(transportTypes),
uber_go_value:
  transportTypes.has("uber99") && uberGoValue.trim()
    ? Number(uberGoValue)
    : undefined,
uber_return_value:
  transportTypes.has("uber99") && uberReturnValue.trim()
    ? Number(uberReturnValue)
    : undefined,
other_car_responsible:
  transportTypes.has("outro") && otherCarResponsible.trim()
    ? otherCarResponsible.trim()
    : undefined,
```

- [ ] **Step 5: Substituir o `<select>` por checkboxes na UI**

Substituir o bloco do `<label className="field" htmlFor="transportType">` (~linha 772) pelo seguinte:
```tsx
<fieldset className="field">
  <legend>Tipo de locomoção</legend>
  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.25rem" }}>
    {(
      [
        { value: "uber99", label: "Uber/99" },
        { value: "carro_empresa", label: "Carro da Empresa" },
        { value: "outro", label: "Carro Pessoal" },
      ] as const
    ).map(({ value, label }) => (
      <label key={value} style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={transportTypes.has(value)}
          onChange={(e) => {
            setTransportTypes((prev) => {
              const next = new Set(prev);
              if (e.target.checked) {
                next.add(value);
              } else {
                next.delete(value);
              }
              return next;
            });
          }}
        />
        {label}
      </label>
    ))}
  </div>
</fieldset>
```

- [ ] **Step 6: Atualizar as condicionais dos campos extras**

Substituir (~linha 802):
```tsx
// antes
{transportType === "uber99" && (

// depois
{transportTypes.has("uber99") && (
```

Substituir (~linha 835):
```tsx
// antes
{transportType === "outro" && (

// depois
{transportTypes.has("outro") && (
```

- [ ] **Step 7: Adicionar validação no submit (ao menos um tipo obrigatório)**

Logo antes de montar `reportPayload` no handler de submit, adicionar:
```typescript
if (transportTypes.size === 0) {
  showToast("Selecione ao menos um tipo de locomoção.", "error");
  setIsSubmitting(false);
  return;
}
```

- [ ] **Step 8: Verificar TypeScript**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep -E "error|warning" | head -20
```

Saída esperada: sem erros relacionados ao campo de transporte.

- [ ] **Step 9: Commit**

```bash
git add frontend/app/novo-relatorio/page.tsx
git commit -m "feat: replace transport select with checkboxes for multiple types"
```

---

## Task 6: Frontend — Visualização de Relatórios

**Files:**
- Modify: `frontend/app/relatorios/page.tsx`

- [ ] **Step 1: Atualizar o tipo do Report**

Substituir (~linha 34):
```typescript
// antes
transport_type?: string | null;

// depois
transport_types?: string[] | null;
```

- [ ] **Step 2: Atualizar `formatTransportType`**

Substituir a função (~linha 113):
```typescript
// antes
function formatTransportType(value?: string | null) {
  if (value === "uber99") return "Uber/99";
  if (value === "outro") return "Carro Pessoal";
  if (value === "carro_empresa") return "Carro da Empresa";
  return value ?? "—";
}

// depois
function formatTransportType(values?: string[] | null) {
  const map: Record<string, string> = {
    uber99: "Uber/99",
    carro_empresa: "Carro da Empresa",
    outro: "Carro Pessoal",
  };
  const labels = (values ?? []).map((v) => map[v] ?? v);
  return labels.length > 0 ? labels.join(" + ") : "—";
}
```

- [ ] **Step 3: Atualizar a lógica condicional de exibição (~linha 476)**

Substituir:
```typescript
// antes
const transportType = selectedReport.transport_type ?? "";
const showUberValues = transportType === "uber99";
const showOtherCarResponsible = transportType === "outro";

// depois
const transportTypes = selectedReport.transport_types ?? [];
const showUberValues = transportTypes.includes("uber99");
const showOtherCarResponsible = transportTypes.includes("outro");
```

- [ ] **Step 4: Atualizar a chamada de `formatTransportType` no JSX (~linha 610)**

```tsx
// antes
<p className="report-value">{formatTransportType(selectedReport.transport_type)}</p>

// depois
<p className="report-value">{formatTransportType(selectedReport.transport_types)}</p>
```

- [ ] **Step 5: Verificar TypeScript**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep -E "error|warning" | head -20
```

Saída esperada: sem erros.

- [ ] **Step 6: Commit**

```bash
git add frontend/app/relatorios/page.tsx
git commit -m "feat: update relatorios view to display multiple transport types"
```

---

## Task 7: Verificação Final

- [ ] **Step 1: Rodar todos os testes do backend**

```bash
cd backend && npx vitest run 2>&1 | tail -15
```

Saída esperada: todos os testes passam.

- [ ] **Step 2: Build do frontend**

```bash
cd frontend && npx next build 2>&1 | tail -20
```

Saída esperada: build concluído sem erros de tipo.

- [ ] **Step 3: Commit final se necessário**

Se houver ajustes finais não commitados:
```bash
git add -p
git commit -m "fix: transport types final adjustments"
```
