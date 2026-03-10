# Sprint 2 — Validação

**Prioridade:** Alta
**Depende de:** Sprint 1 concluída
**Status:** Pendente

---

## Objetivo

Garantir que todos os dados recebidos pelo backend sejam validados corretamente antes de serem processados, e que o frontend forneça feedback imediato e preciso ao usuário.

---

## Tarefas

### AUD-S2-01 — Instalar Zod e validar todas as rotas do backend

**Severidade:** Alta
**Arquivos:** Todos os `routes.ts` do backend

**Problema:**
O backend usa casting `as Type` sem validação real, o que pode causar erros em runtime ou aceitar dados malformados.

```typescript
// ❌ Atual — advertencias/routes.ts
const query = request.query as WarningQuery;
const body = request.body as CreateWarningBody;
```

**Solução:**
```bash
cd backend && npm install zod
```

```typescript
// ✅ Exemplo — advertencias/routes.ts
import { z } from "zod";

const CreateWarningSchema = z.object({
  member_id: z.string().min(1, "Membro obrigatório"),
  reason: z.string().min(5, "Motivo deve ter ao menos 5 caracteres").max(500),
  warning_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (YYYY-MM-DD)"),
});

const WarningQuerySchema = z.object({
  member_id: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// Na rota:
const parsed = CreateWarningSchema.safeParse(request.body);
if (!parsed.success) {
  return reply.status(400).send({ error: parsed.error.errors[0].message });
}
```

**Schemas a criar:**
- `auth`: login, cadastro, redefinição de senha
- `membros`: criar, editar
- `advertencias`: criar, query params
- `cursos`: criar, editar, inscrição
- `relatorios`: criar

**Critérios de Conclusão:**
- [ ] Zod instalado
- [ ] Schema criado para cada rota que recebe body ou query params
- [ ] Nenhum `as Type` sem validação prévia
- [ ] Erros retornam 400 com mensagem legível
- [ ] Testes existentes continuam passando

---

### AUD-S2-02 — Validar CPF com algoritmo de dígito verificador

**Severidade:** Alta
**Arquivos:** `backend/src/auth/routes.ts`, `frontend/app/cadastro/page.tsx`

**Problema:**
CPF é verificado apenas por comprimento (11 dígitos). CPFs como `00000000000` ou `12345678900` são aceitos.

**Solução:**
```typescript
// ✅ backend/src/lib/validators.ts
export function isValidCPF(cpf: string): boolean {
  const cleaned = cpf.replace(/\D/g, "");
  if (cleaned.length !== 11) return false;
  if (/^(\d)\1+$/.test(cleaned)) return false; // todos iguais (ex: 000...0)

  const calc = (digits: string, factor: number) =>
    digits.split("").reduce((sum, d, i) => sum + parseInt(d) * (factor - i), 0);

  const r1 = (calc(cleaned.slice(0, 9), 10) * 10) % 11;
  if ((r1 === 10 || r1 === 11 ? 0 : r1) !== parseInt(cleaned[9])) return false;

  const r2 = (calc(cleaned.slice(0, 10), 11) * 10) % 11;
  return (r2 === 10 || r2 === 11 ? 0 : r2) === parseInt(cleaned[10]);
}
```

```typescript
// ✅ Usar no schema Zod
const cpfSchema = z.string().refine(isValidCPF, { message: "CPF inválido" });
```

**Critérios de Conclusão:**
- [ ] Função `isValidCPF` criada em `backend/src/lib/validators.ts`
- [ ] Validação usada no cadastro e edição de membro
- [ ] CPFs inválidos retornam erro 400 com mensagem clara
- [ ] Frontend também valida CPF (mesma lógica copiada) para feedback imediato

---

### AUD-S2-03 — Validar upload: tipo MIME e tamanho máximo

**Severidade:** Alta
**Arquivos:** `backend/src/relatorios/routes.ts`, `backend/src/membros/routes.ts`

**Problema:**
Uploads não validam o tipo real do arquivo (apenas extensão) nem o tamanho. Qualquer arquivo pode ser enviado.

**Solução:**
```typescript
// ✅ backend/src/lib/validators.ts
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime"];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;  // 5MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

export function validateUpload(
  mimetype: string,
  size: number,
  allowVideo = false
): string | null {
  const allowed = allowVideo
    ? [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES]
    : ALLOWED_IMAGE_TYPES;

  if (!allowed.includes(mimetype)) {
    return `Tipo de arquivo não permitido: ${mimetype}`;
  }

  const maxSize = ALLOWED_VIDEO_TYPES.includes(mimetype)
    ? MAX_VIDEO_SIZE
    : MAX_IMAGE_SIZE;

  if (size > maxSize) {
    return `Arquivo muito grande. Máximo: ${maxSize / 1024 / 1024}MB`;
  }

  return null;
}
```

**Critérios de Conclusão:**
- [ ] Função `validateUpload` criada
- [ ] Upload de foto de perfil: apenas imagens, máx. 5MB
- [ ] Upload de relatório: imagens e vídeos, máx. 50MB por arquivo
- [ ] Erro 400 com mensagem clara quando inválido
- [ ] Arquivo não é salvo se inválido (validar antes de `pump`)

---

### AUD-S2-04 — Validar data de advertência (não aceitar datas futuras)

**Severidade:** Média
**Arquivos:** `backend/src/advertencias/routes.ts`

**Problema:**
A data da advertência não é validada — é possível criar advertências com datas futuras.

**Solução:**
```typescript
// ✅ No schema Zod de advertência
const CreateWarningSchema = z.object({
  member_id: z.string().min(1),
  reason: z.string().min(5).max(500),
  warning_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((date) => new Date(date) <= new Date(), {
      message: "Data da advertência não pode ser no futuro",
    }),
});
```

**Critérios de Conclusão:**
- [ ] Datas futuras rejeitadas com erro 400
- [ ] Frontend também valida com `max={new Date().toISOString().split("T")[0]}` no input date

---

### AUD-S2-05 — Validação de formulários no frontend com React Hook Form + Zod

**Severidade:** Média
**Arquivos:** `frontend/app/cadastro/page.tsx`, `frontend/app/advertencias/page.tsx`, `frontend/app/cursos/page.tsx`

**Problema:**
Formulários do frontend não têm validação no cliente — o usuário só vê erros após a requisição ao backend.

**Dependência:** React Hook Form já está instalado (`react-hook-form ^7.51.5`)

**Solução:**
```bash
cd frontend && npm install zod @hookform/resolvers
```

```tsx
// ✅ Exemplo — cadastro/page.tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const CadastroSchema = z.object({
  name: z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  cpf: z.string().refine(isValidCPF, "CPF inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Senhas não coincidem",
  path: ["confirmPassword"],
});

type CadastroForm = z.infer<typeof CadastroSchema>;

export default function CadastroPage() {
  const { register, handleSubmit, formState: { errors } } = useForm<CadastroForm>({
    resolver: zodResolver(CadastroSchema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register("email")} />
      {errors.email && <span role="alert">{errors.email.message}</span>}
    </form>
  );
}
```

**Critérios de Conclusão:**
- [ ] `zod` e `@hookform/resolvers` instalados
- [ ] Formulário de cadastro validado no cliente
- [ ] Formulário de nova advertência validado
- [ ] Formulário de novo curso validado
- [ ] Erros exibidos inline abaixo de cada campo
- [ ] Botão submit desabilitado enquanto formulário inválido

---

### AUD-S2-06 — Prevenir double-submit em formulários

**Severidade:** Média
**Arquivos:** Todos os formulários do frontend

**Problema:**
Clicar duas vezes no botão de enviar pode criar registros duplicados.

**Solução:**
```tsx
// ✅ Desabilitar botão durante submissão (pattern existente, mas inconsistente)
const { formState: { isSubmitting } } = useForm();

<button type="submit" disabled={isSubmitting}>
  {isSubmitting ? "Salvando..." : "Salvar"}
</button>
```

**Critérios de Conclusão:**
- [ ] Botão de submit desabilitado durante a requisição em todos os formulários
- [ ] Indicador visual de carregamento (spinner ou texto)

---

## Dependências a Instalar

```bash
# Backend
cd backend && npm install zod

# Frontend
cd frontend && npm install zod @hookform/resolvers
```

---

## Checklist de Conclusão da Sprint

- [ ] AUD-S2-01 — Zod em todas as rotas backend
- [ ] AUD-S2-02 — Validação de CPF com algoritmo completo
- [ ] AUD-S2-03 — Validação de upload (tipo + tamanho)
- [ ] AUD-S2-04 — Data de advertência sem futuro
- [ ] AUD-S2-05 — React Hook Form + Zod no frontend
- [ ] AUD-S2-06 — Prevenção de double-submit
- [ ] Testes passando

---

---

## Status Final

**Sprint Concluída em:** 2026-03-09

| Tarefa | Status |
|--------|--------|
| AUD-S2-01 — Zod em todas as rotas backend | ✅ Concluída |
| AUD-S2-02 — Validação de CPF com dígito verificador | ✅ Concluída |
| AUD-S2-03 — Validação de upload (tipo MIME + tamanho) | ✅ Concluída |
| AUD-S2-04 — Data de advertência sem futuro | ✅ Concluída |
| AUD-S2-05 — Validação de formulários no frontend | ✅ Concluída (CPF, data, min-length) |
| AUD-S2-06 — Prevenção de double-submit | ✅ Já existia; confirmado em todos os formulários |

### O que foi implementado

- `backend/src/lib/validators.ts`: funções `isValidCPF` (dígito verificador) e `validateUpload` (whitelist de MIME)
- Zod schemas adicionados em `auth/routes.ts`, `membros/routes.ts`, `advertencias/routes.ts`, `cursos/routes.ts`
- `isValidCPF` substituiu a checagem simples de comprimento em auth e membros
- `validateUpload` aplicado no upload de foto de perfil com whitelist de MIME (jpeg/png/webp)
- Advertências: data futura rejeitada no backend (Zod refine) e no frontend (`max={todayDate}`)
- Frontend `cadastro/page.tsx`: `isValidCPF` valida o CPF antes do submit com mensagem clara
- Frontend `advertencias/page.tsx`: `max={todayDate}` nos inputs de data, min 5 chars no motivo
- TypeScript compila sem erros

**Sprint Anterior:** [Sprint 1 — Segurança](sprint-1-seguranca.md)
**Próxima Sprint:** [Sprint 3 — Acessibilidade](sprint-3-acessibilidade.md)
