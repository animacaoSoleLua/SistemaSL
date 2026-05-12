# Múltiplos Tipos de Locomoção no Relatório

**Data:** 2026-05-12
**Status:** Aprovado

## Problema

O formulário de novo relatório aceita apenas um tipo de locomoção por evento (Uber/99, Carro da Empresa ou Carro Pessoal). Na prática, animadores usam combinações no mesmo evento (ex: carro da empresa + uber na volta).

## Solução

Substituir o `<select>` único por checkboxes, permitindo selecionar múltiplos tipos simultaneamente. Ao menos um tipo deve ser selecionado.

---

## Banco de Dados

**Mudança:** `transportType String @db.VarChar(30)` → `transportTypes String[] @map("transport_types")`

Usar array nativo do PostgreSQL via Prisma (`String[]`). Os campos opcionais existentes permanecem:
- `uberGoValue Float?`
- `uberReturnValue Float?`
- `otherCarResponsible String?`

**Migration:** Converter dados existentes.
```sql
-- Exemplo de conversão
UPDATE "Report" SET transport_types = ARRAY[transport_type];
-- Em seguida, dropar a coluna antiga e renomear/adicionar a nova
```

A migration Prisma cuidará do DDL; a conversão de dados existentes deve ser incluída como SQL raw na migration.

---

## Backend (`backend/src/relatorios/routes.ts`)

**Schema de entrada** (create e update):
- Remover `transport_type: string`
- Adicionar `transport_types: string[]`

**Validação:**
- `transport_types` deve ser array não vazio
- Cada elemento deve ser um de: `"uber99"`, `"carro_empresa"`, `"outro"`
- `uberGoValue` e `uberReturnValue` são validados como money apenas se `"uber99"` está no array
- `otherCarResponsible` é validado/exigido apenas se `"outro"` está no array

**Resposta:** Retornar `transport_types: string[]` no lugar de `transport_type: string`.

---

## Frontend — Formulário (`frontend/app/novo-relatorio/page.tsx`)

**Tipo:**
```ts
// antes
type TransportType = "" | "uber99" | "carro_empresa" | "outro";
const [transportType, setTransportType] = useState<TransportType>("uber99");

// depois
type TransportType = "uber99" | "carro_empresa" | "outro";
const [transportTypes, setTransportTypes] = useState<Set<TransportType>>(new Set(["uber99"]));
```

**UI — seção Locomoção:**
```
Tipo de locomoção (obrigatório, selecione ao menos um)

[x] Uber/99
[ ] Carro da Empresa
[ ] Carro Pessoal
```

Campos condicionais:
- `"uber99"` selecionado → exibe "Valor do Uber na ida" e "Valor do Uber na volta"
- `"outro"` selecionado → exibe "Responsável pelo carro"
- `"carro_empresa"` selecionado → sem campos extras

**Validação no submit:** se `transportTypes.size === 0`, bloquear envio com mensagem de erro (toast ou inline).

**Payload enviado:** `transport_types: Array.from(transportTypes)`

---

## Frontend — Visualização (`frontend/app/relatorios/page.tsx`)

**`formatTransportType`:** passa a receber `string[]` e retorna os labels separados por ` + `.
```ts
function formatTransportType(values?: string[] | null) {
  const map: Record<string, string> = {
    uber99: "Uber/99",
    carro_empresa: "Carro da Empresa",
    outro: "Carro Pessoal",
  };
  return (values ?? []).map((v) => map[v] ?? v).join(" + ") || "—";
}
```

**Lógica condicional:** trocar comparações de `=== "uber99"` / `=== "outro"` por `.includes("uber99")` / `.includes("outro")`.

**Tipo no `Report`:**
```ts
// antes
transport_type?: string | null;

// depois
transport_types?: string[] | null;
```

---

## Arquivos Afetados

| Arquivo | Mudança |
|---|---|
| `backend/prisma/schema.prisma` | `transportType String` → `transportTypes String[]` |
| `backend/prisma/migrations/...` | Nova migration com conversão de dados |
| `backend/src/relatorios/routes.ts` | Validação e persistência para array |
| `frontend/app/novo-relatorio/page.tsx` | Estado + UI (checkboxes) + payload |
| `frontend/app/relatorios/page.tsx` | Tipo + `formatTransportType` + condicionais |
