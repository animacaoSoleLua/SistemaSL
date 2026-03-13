# Sprint 7 — Correções de Lógica e Type Safety

**Prioridade:** Alta
**Status:** Concluída

---

## Objetivo

Corrigir problemas de lógica de negócio, eliminar uso de `any` no tratamento de erros, centralizar validadores duplicados e garantir que bugs sutis de data e ranges não afetem dados em produção.

---

## Diagnóstico Atual

Após auditoria de março/2026, foram identificados os seguintes problemas principais:

- Validação de CPF duplicada em 3 arquivos (backend + 2 páginas frontend)
- Validação de força de senha duplicada em 4 lugares
- `catch (err: any)` em ~22 ocorrências no frontend — perde type checking
- `setMonth()` para somar meses pode gerar datas erradas no último dia do mês
- Ranges de scores e capacidade de curso sem validação Zod
- `setTimeout` sem cleanup via `useEffect` em vários formulários

---

## Tarefas

### AUD-M7-01 — Centralizar validador de CPF no frontend

**Severidade:** Alta
**Arquivos:** `frontend/lib/validators.ts` (criar), `frontend/app/cadastro/page.tsx`, `frontend/app/usuarios/page.tsx`

**Problema:**
A mesma lógica de validação de CPF (com dígito verificador) está duplicada em:
- `backend/src/lib/validators.ts` — fonte original
- `frontend/app/cadastro/page.tsx:10-20`
- `frontend/app/usuarios/page.tsx:31-41`

Mudanças futuras na regra podem criar inconsistências silenciosas.

**Solução:**
```typescript
// ✅ frontend/lib/validators.ts (novo arquivo)
export function isValidCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;
  const calc = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += parseInt(digits[i]) * (len + 1 - i);
    const rem = (sum * 10) % 11;
    return rem === 10 || rem === 11 ? 0 : rem;
  };
  return calc(9) === parseInt(digits[9]) && calc(10) === parseInt(digits[10]);
}
```

Substituir as implementações inline de `cadastro/page.tsx` e `usuarios/page.tsx` pelo import de `@/lib/validators`.

**Critérios de Conclusão:**
- [ ] `frontend/lib/validators.ts` criado com `isValidCPF`
- [ ] `cadastro/page.tsx` importa de `@/lib/validators` (sem duplicação local)
- [ ] `usuarios/page.tsx` importa de `@/lib/validators` (sem duplicação local)
- [ ] Comportamento de validação idêntico ao anterior

---

### AUD-M7-02 — Centralizar validação de força de senha no frontend

**Severidade:** Alta
**Arquivos:** `frontend/lib/validators.ts`, `frontend/app/cadastro/page.tsx`, `frontend/app/usuarios/page.tsx`

**Problema:**
Lógica de validação de senha forte duplicada em:
- `backend/src/auth/routes.ts` (Zod schema)
- `backend/src/membros/routes.ts` (Zod schema)
- `frontend/app/usuarios/page.tsx:43-48`
- `frontend/app/cadastro/page.tsx:97-110`

**Solução:**
```typescript
// ✅ frontend/lib/validators.ts — adicionar junto ao isValidCPF
export function isStrongPassword(password: string): string | null {
  if (password.length < 8) return "Mínimo de 8 caracteres.";
  if (!/[A-Z]/.test(password)) return "Precisa de ao menos uma letra maiúscula.";
  if (!/[a-z]/.test(password)) return "Precisa de ao menos uma letra minúscula.";
  if (!/[0-9]/.test(password)) return "Precisa de ao menos um número.";
  return null; // senha válida
}
```

**Critérios de Conclusão:**
- [ ] `isStrongPassword` em `frontend/lib/validators.ts`
- [ ] `cadastro/page.tsx` usa função centralizada
- [ ] `usuarios/page.tsx` usa função centralizada
- [ ] Retorno `null` para senha válida, string de erro para inválida

---

### AUD-M7-03 — Criar tipo `ApiError` para substituir `any` em catches

**Severidade:** Alta
**Arquivos:** `frontend/lib/api.ts`, todas as páginas com `catch (err: any)`

**Problema:**
Aproximadamente 22 ocorrências de `catch (err: any)` no frontend. Isso desabilita o type checker e pode mascarar erros de lógica.

**Padrão atual (problemático):**
```typescript
catch (err: any) {
  setError(err?.message || "Erro desconhecido.");
}
```

**Solução:**
```typescript
// ✅ frontend/lib/api.ts — adicionar tipo e helper
export type ApiError = {
  message?: string;
  error?: string;
  statusCode?: number;
};

export function getErrorMessage(err: unknown, fallback = "Erro desconhecido."): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null) {
    const e = err as ApiError;
    return e.message ?? e.error ?? fallback;
  }
  return fallback;
}
```

Substituir todos os `catch (err: any)` por:
```typescript
catch (err: unknown) {
  setError(getErrorMessage(err));
}
```

**Critérios de Conclusão:**
- [ ] `ApiError` e `getErrorMessage` exportados de `frontend/lib/api.ts`
- [ ] Zero ocorrências de `catch (err: any)` no frontend
- [ ] Todas as mensagens de erro mantêm o mesmo comportamento visual

---

### AUD-M7-04 — Corrigir manipulação de datas com date-fns

**Severidade:** Alta
**Arquivos:** `backend/src/advertencias/store.ts`

**Problema:**
`addOneMonth()` usa `date.setMonth(date.getMonth() + 1)`. Em JavaScript, `new Date(2026-01-31).setMonth(1)` resulta em `2026-03-03` (março), não `2026-02-28`. Isso pode gerar suspensões com datas erradas para membros advertidos no último dia do mês.

**Solução:**
```bash
cd backend && npm install date-fns
```

```typescript
// ✅ backend/src/advertencias/store.ts
import { addMonths, subMonths } from "date-fns";

// Antes:
function addOneMonth(date: Date): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1);
  return d;
}

// Depois:
function addOneMonth(date: Date): Date {
  return addMonths(date, 1);
}

function subtractOneMonth(date: Date): Date {
  return subMonths(date, 1);
}
```

**Critérios de Conclusão:**
- [ ] `date-fns` instalado no backend
- [ ] `addOneMonth` e `subtractOneMonth` usam `date-fns`
- [ ] Teste manual: advertência em 31/01 → suspensão termina em 28/02 (não 03/03)

---

### AUD-M7-05 — Validação de ranges em schemas Zod

**Severidade:** Alta
**Arquivos:** `backend/src/relatorios/routes.ts`, `backend/src/cursos/routes.ts`

**Problema:**
Campos de score e capacidade sem validação de range aceitam valores absurdos via API (ex: `team_general_score: -100`, `capacity: 0`).

**Solução:**
```typescript
// ✅ backend/src/relatorios/routes.ts — schemas de score
const reportSchema = z.object({
  // ...
  team_general_score: z.number().min(0).max(10).nullable().optional(),
  team_punctuality_score: z.number().min(0).max(10).nullable().optional(),
  team_presentation_score: z.number().min(0).max(10).nullable().optional(),
  team_interaction_score: z.number().min(0).max(10).nullable().optional(),
});

// ✅ backend/src/cursos/routes.ts — capacidade
const courseSchema = z.object({
  // ...
  capacity: z.number().int().min(1).nullable().optional(),
  // null = ilimitado, 1+ = com limite
});
```

**Critérios de Conclusão:**
- [ ] Scores de relatório validados entre 0 e 10
- [ ] `capacity` de curso: `null` (ilimitado) ou inteiro ≥ 1
- [ ] API retorna erro 400 com mensagem clara para valores inválidos

---

### AUD-M7-06 — Cleanup de setTimeout com useEffect

**Severidade:** Média
**Arquivos:** `frontend/app/cadastro/page.tsx`, `frontend/app/advertencias/page.tsx`, `frontend/app/cursos/page.tsx`

**Problema:**
`setTimeout` chamado sem cleanup. Se o componente desmontar antes do timer disparar, React emite warning de "state update on unmounted component" e pode gerar erros silenciosos.

**Padrão atual (problemático):**
```typescript
setSuccess(true);
setTimeout(() => router.push("/login"), 1200);
```

**Solução:**
```typescript
// ✅ Usar useEffect com cleanup
useEffect(() => {
  if (!success) return;
  const timer = setTimeout(() => router.push("/login"), 1200);
  return () => clearTimeout(timer);
}, [success, router]);
```

```typescript
// ✅ Para mensagens de sucesso que somem sozinhas
useEffect(() => {
  if (!successMsg) return;
  const timer = setTimeout(() => setSuccessMsg(""), 3000);
  return () => clearTimeout(timer);
}, [successMsg]);
```

**Critérios de Conclusão:**
- [ ] `cadastro/page.tsx` — redirect com cleanup
- [ ] `advertencias/page.tsx` — mensagem de sucesso com cleanup
- [ ] `cursos/page.tsx` — mensagem de sucesso com cleanup
- [ ] Zero warnings de unmounted component no console

---

### AUD-M7-07 — Validação de environment variables no startup do backend

**Severidade:** Média
**Arquivos:** `backend/src/index.ts`

**Problema:**
Se `JWT_SECRET`, `DATABASE_URL` ou `RESEND_API_KEY` estiverem ausentes, o sistema inicia sem erro e só falha em runtime (na primeira requisição). Dificulta diagnóstico em produção.

**Solução:**
```typescript
// ✅ backend/src/index.ts — validar envs antes de iniciar
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatória"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET precisa ter ao menos 32 caracteres"),
  PORT: z.string().default("3001"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM: z.string().optional(),
  UPLOADS_DIR: z.string().default("./uploads"),
});

const env = envSchema.safeParse(process.env);
if (!env.success) {
  console.error("❌ Variáveis de ambiente inválidas:");
  console.error(env.error.issues.map(i => `  ${i.path}: ${i.message}`).join("\n"));
  process.exit(1);
}
```

**Critérios de Conclusão:**
- [ ] Backend falha imediatamente com mensagem clara se env estiver faltando
- [ ] Verificado que não quebra em dev com as variáveis atuais
- [ ] `RESEND_*` marcadas como opcionais (só obrigatórias em produção)

---

## Checklist de Conclusão da Sprint

- [x] AUD-M7-01 — CPF centralizado em `frontend/lib/validators.ts`
- [x] AUD-M7-02 — Validação de senha centralizada
- [x] AUD-M7-03 — `ApiError` + `getErrorMessage`, zero `any` em catches
- [x] AUD-M7-04 — `date-fns` para manipulação de meses
- [x] AUD-M7-05 — Ranges em schemas Zod (scores 0–10, capacity ≥ 1)
- [x] AUD-M7-06 — `setTimeout` com cleanup via `useEffect`
- [x] AUD-M7-07 — Validação de env vars no startup

---

**Sprint Anterior:** [Sprint 6 — Responsividade Mobile](sprint-6-responsividade.md)
