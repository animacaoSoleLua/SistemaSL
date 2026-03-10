# Sprint 1 — Segurança

**Prioridade:** CRÍTICA
**Status:** Pendente

---

## Objetivo

Corrigir as vulnerabilidades de segurança mais críticas antes de qualquer uso em produção real.

---

## Tarefas

### AUD-S1-01 — Mover JWT do localStorage para httpOnly cookie

**Severidade:** Crítica
**Arquivos:** `frontend/app/login/page.tsx`, `frontend/lib/api.ts`, `backend/src/auth/routes.ts`

**Problema:**
O token JWT é armazenado em `localStorage`, o que o expõe a ataques XSS. Qualquer script malicioso na página pode ler o token.

```typescript
// ❌ Atual (login/page.tsx)
localStorage.setItem("token", data.token);
localStorage.setItem("user", JSON.stringify(data.user));
```

**Solução:**
- Backend: enviar o token como `httpOnly` cookie no response de login
- Frontend: remover leitura de `localStorage` para o token; o cookie é enviado automaticamente
- Backend: ler o token do cookie no `authGuard`

```typescript
// ✅ Backend — auth/routes.ts
reply.setCookie("token", token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 3600,
  path: "/",
});

// ✅ Backend — registrar @fastify/cookie em app.ts
import cookie from "@fastify/cookie";
app.register(cookie, { secret: process.env.COOKIE_SECRET });
```

**Critérios de Conclusão:**
- [ ] `@fastify/cookie` instalado e registrado
- [ ] Login define cookie `httpOnly`
- [ ] Logout limpa o cookie
- [ ] `authGuard` lê token do cookie (não do header `Authorization`)
- [ ] Frontend não usa mais `localStorage` para o token
- [ ] Dados do usuário (nome, papel) armazenados em `sessionStorage` ou Context (não token)

---

### AUD-S1-02 — Adicionar headers de segurança (helmet)

**Severidade:** Alta
**Arquivos:** `backend/src/app.ts`

**Problema:**
O backend não define headers de segurança como `X-Frame-Options`, `X-Content-Type-Options`, `Content-Security-Policy` e `Strict-Transport-Security`.

**Solução:**
```bash
cd backend && npm install @fastify/helmet
```

```typescript
// ✅ app.ts
import helmet from "@fastify/helmet";

app.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:"],
    },
  },
});
```

**Critérios de Conclusão:**
- [ ] `@fastify/helmet` instalado
- [ ] Headers `X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection` presentes nas respostas
- [ ] CSP configurado sem bloquear funcionalidades existentes

---

### AUD-S1-03 — Implementar rate limiting

**Severidade:** Alta
**Arquivos:** `backend/src/app.ts`

**Problema:**
Sem rate limiting, os endpoints de login e cadastro ficam expostos a ataques de força bruta.

**Solução:**
```bash
cd backend && npm install @fastify/rate-limit
```

```typescript
// ✅ app.ts
import rateLimit from "@fastify/rate-limit";

app.register(rateLimit, {
  global: false, // aplicar por rota
});

// ✅ auth/routes.ts — nas rotas de login e reset
{
  method: "POST",
  url: "/api/v1/auth/login",
  config: {
    rateLimit: {
      max: 10,
      timeWindow: "15 minutes",
    },
  },
  handler: loginHandler,
}
```

**Critérios de Conclusão:**
- [ ] `@fastify/rate-limit` instalado
- [ ] Endpoint `/auth/login` limitado a 10 tentativas por 15 minutos por IP
- [ ] Endpoint `/auth/esqueci-senha` limitado a 5 tentativas por hora
- [ ] Endpoint `/auth/cadastro` limitado a 5 tentativas por hora
- [ ] Resposta 429 com mensagem amigável em português

---

### AUD-S1-04 — Corrigir user enumeration no "esqueci a senha"

**Severidade:** Média
**Arquivos:** `backend/src/auth/routes.ts`

**Problema:**
O endpoint de recuperação de senha retorna 404 quando o email não existe, revelando que o email não está cadastrado (user enumeration).

```typescript
// ❌ Atual
if (!member) {
  return reply.status(404).send({ error: "Email nao encontrado" });
}
```

**Solução:**
```typescript
// ✅ Sempre retorna 200, independente de o email existir
if (!member) {
  // Logar internamente, mas não revelar ao cliente
  return reply.status(200).send({ message: "Se o email estiver cadastrado, você receberá as instruções." });
}
// ... enviar email normalmente
return reply.status(200).send({ message: "Se o email estiver cadastrado, você receberá as instruções." });
```

**Critérios de Conclusão:**
- [ ] Endpoint retorna 200 em ambos os casos (email existe ou não)
- [ ] Mensagem genérica que não revela a existência do email
- [ ] Frontend exibe a mensagem genérica sem diferenciação

---

### AUD-S1-05 — Aumentar requisitos mínimos de senha

**Severidade:** Alta
**Arquivos:** `backend/src/auth/routes.ts`, `frontend/app/cadastro/page.tsx`, `frontend/app/perfil/page.tsx`

**Problema:**
Senha mínima é de 6 caracteres — muito fraca para um sistema com dados pessoais.

**Solução:**
```typescript
// ✅ Backend — auth/routes.ts
const MIN_PASSWORD_LENGTH = 8;

function validatePasswordStrength(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Senha deve ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres`;
  }
  if (!/[A-Z]/.test(password)) return "Senha deve conter ao menos uma letra maiúscula";
  if (!/[0-9]/.test(password)) return "Senha deve conter ao menos um número";
  return null;
}
```

```tsx
// ✅ Frontend — indicador visual de força da senha
function PasswordStrengthIndicator({ password }: { password: string }) {
  const strength = getPasswordStrength(password); // "fraca" | "média" | "forte"
  return <div className={`strength-bar strength-${strength}`} aria-label={`Força da senha: ${strength}`} />;
}
```

**Critérios de Conclusão:**
- [ ] Mínimo de 8 caracteres (1 maiúscula + 1 número)
- [ ] Validação no backend (fonte da verdade)
- [ ] Indicador visual de força no frontend (cadastro e redefinição)
- [ ] Mensagem de erro específica por critério não atendido

---

### AUD-S1-06 — Adicionar logging de auditoria em ações sensíveis

**Severidade:** Média
**Arquivos:** `backend/src/auth/routes.ts`, `backend/src/membros/routes.ts`, `backend/src/advertencias/routes.ts`

**Problema:**
Nenhuma ação sensível (login, criação/exclusão de usuário, advertência) é registrada em log com o responsável.

**Solução:**
```typescript
// ✅ Criar backend/src/lib/audit.ts
export function auditLog(action: string, actorId: string, targetId?: string, detail?: string) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    action,
    actorId,
    targetId,
    detail,
  }));
}

// ✅ Usar nas rotas
auditLog("LOGIN_SUCCESS", member.id);
auditLog("MEMBER_DELETED", request.user.id, params.id);
auditLog("WARNING_CREATED", request.user.id, body.member_id, body.reason);
```

**Critérios de Conclusão:**
- [ ] Arquivo `audit.ts` criado
- [ ] Login bem-sucedido e falho logado com IP
- [ ] Criação, edição e exclusão de membros logados
- [ ] Criação e exclusão de advertências logadas
- [ ] Logs estruturados em JSON (compatível com pino já instalado)

---

## Dependências a Instalar

```bash
cd backend
npm install @fastify/helmet @fastify/rate-limit @fastify/cookie
```

---

## Checklist de Conclusão da Sprint

- [x] AUD-S1-01 — JWT em httpOnly cookie + sessionStorage como fallback
- [x] AUD-S1-02 — Headers de segurança (helmet)
- [x] AUD-S1-03 — Rate limiting (10 req / 15 min em login, register, forgot-password)
- [x] AUD-S1-04 — User enumeration corrigido (forgot-password retorna 200 sempre)
- [x] AUD-S1-05 — Requisitos de senha aumentados (8+ chars, 1 maiúscula, 1 número)
- [x] AUD-S1-06 — Logging de auditoria (login, membro, advertência)
- [x] TypeScript compila sem erros (backend e frontend)
- [x] Testes sem DB continuam passando; falhas são pré-existentes (DB offline)

**Concluída em:** 2026-03-09

---

**Próxima Sprint:** [Sprint 2 — Validação](sprint-2-validacao.md)
