# Excluir Conta Permanentemente — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que um usuário exclua sua própria conta permanentemente a partir da aba Segurança de Configurações, com confirmação por senha e modal de alerta com overlay.

**Architecture:** Novo endpoint `DELETE /api/v1/membros/:id/conta` no backend (auto-exclusão com verificação de senha, separado do endpoint admin-only existente). No frontend, um card de zona de perigo ao final da aba Segurança abre um modal com overlay que coleta a senha e dispara a exclusão, após a qual a sessão é limpa e o usuário é redirecionado para `/login`.

**Tech Stack:** Fastify + Prisma (backend), Next.js 14 App Router + React (frontend), Vitest (testes de integração backend).

---

### Task 1: Backend — endpoint de auto-exclusão com teste

**Files:**
- Modify: `backend/src/membros/routes.ts` (adicionar novo route ao final de `membrosRoutes`)
- Modify: `backend/test/membros.integration.test.ts` (adicionar casos de teste)

- [ ] **Step 1: Escrever o teste que falha**

Abra `backend/test/membros.integration.test.ts` e adicione estes dois casos **antes** do `}`  que fecha o `describe`:

```typescript
  it("allows member to delete their own account with correct password", async () => {
    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "animador@sol-e-lua.com", password: "animador123" },
    });
    const token = login.json().data.access_token;
    const memberId = login.json().data.user.id;

    const deleteResponse = await app.inject({
      method: "DELETE",
      url: `/api/v1/membros/${memberId}/conta`,
      headers: { authorization: `Bearer ${token}` },
      payload: { password: "animador123" },
    });

    expect(deleteResponse.statusCode).toBe(204);

    // Conta não existe mais
    const adminLogin = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "arthurssousa2004@gmail.com", password: "admin123" },
    });
    const adminToken = adminLogin.json().data.access_token;

    const getResponse = await app.inject({
      method: "GET",
      url: `/api/v1/membros/${memberId}`,
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(getResponse.statusCode).toBe(404);
  });

  it("rejects self-deletion with wrong password", async () => {
    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "animador@sol-e-lua.com", password: "animador123" },
    });
    const token = login.json().data.access_token;
    const memberId = login.json().data.user.id;

    const deleteResponse = await app.inject({
      method: "DELETE",
      url: `/api/v1/membros/${memberId}/conta`,
      headers: { authorization: `Bearer ${token}` },
      payload: { password: "senha-errada" },
    });

    expect(deleteResponse.statusCode).toBe(400);
    expect(deleteResponse.json().error).toBe("invalid_password");
  });

  it("forbids member from deleting another account via self-delete route", async () => {
    const adminLogin = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "arthurssousa2004@gmail.com", password: "admin123" },
    });
    const adminToken = adminLogin.json().data.access_token;

    const animadorLogin = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "animador@sol-e-lua.com", password: "animador123" },
    });
    const animadorId = animadorLogin.json().data.user.id;

    const deleteResponse = await app.inject({
      method: "DELETE",
      url: `/api/v1/membros/${animadorId}/conta`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { password: "admin123" },
    });

    expect(deleteResponse.statusCode).toBe(403);
  });
```

- [ ] **Step 2: Rodar os testes para confirmar que falham**

```bash
cd backend
npx vitest run test/membros.integration.test.ts 2>&1 | tail -20
```

Esperado: 3 testes novos falhando com algo como `404` (rota não existe ainda).

- [ ] **Step 3: Implementar o endpoint no backend**

Em `backend/src/membros/routes.ts`, adicione este bloco **antes** do `}` final que fecha `membrosRoutes`:

```typescript
  app.delete("/api/v1/membros/:id/conta", async (request, reply) => {
    const params = request.params as { id?: string };
    if (!params.id) {
      return reply.status(400).send({
        error: "invalid_request",
        message: "Membro invalido",
      });
    }

    if (!request.user) {
      return reply.status(401).send({
        error: "unauthorized",
        message: "Token ausente",
      });
    }

    if (request.user.id !== params.id) {
      return reply.status(403).send({
        error: "forbidden",
        message: "Acesso negado",
      });
    }

    const member = await getUserById(params.id);
    if (!member) {
      return reply.status(404).send({
        error: "not_found",
        message: "Membro nao encontrado",
      });
    }

    const body = request.body as { password?: unknown };
    if (typeof body?.password !== "string" || !body.password) {
      return reply.status(400).send({
        error: "invalid_request",
        message: "Senha obrigatoria",
      });
    }

    const { valid } = verifyPassword(body.password, member.passwordHash);
    if (!valid) {
      return reply.status(400).send({
        error: "invalid_password",
        message: "Senha incorreta",
      });
    }

    await deleteUser(params.id);

    auditLog(request.log, "MEMBER_SELF_DELETED", request.user.id, {
      targetId: params.id,
      ip: request.ip ?? "unknown",
    });

    return reply.status(204).send();
  });
```

- [ ] **Step 4: Rodar os testes para confirmar que passam**

```bash
cd backend
npx vitest run test/membros.integration.test.ts 2>&1 | tail -20
```

Esperado: todos os testes do arquivo passando, incluindo os 3 novos.

- [ ] **Step 5: Commit**

```bash
git add backend/src/membros/routes.ts backend/test/membros.integration.test.ts
git commit -m "feat: add self-account deletion endpoint with password verification"
```

---

### Task 2: Frontend — helper de API

**Files:**
- Modify: `frontend/lib/api.ts`

- [ ] **Step 1: Adicionar a função `deleteSelfAccount`**

Em `frontend/lib/api.ts`, localize a função `deleteMember` existente:

```typescript
export async function deleteMember(id: string) {
  return request(`/membros/${id}`, { method: 'DELETE' });
}
```

Adicione logo após ela:

```typescript
export async function deleteSelfAccount(id: string, password: string) {
  return request(`/membros/${id}/conta`, {
    method: "DELETE",
    body: JSON.stringify({ password }),
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/lib/api.ts
git commit -m "feat: add deleteSelfAccount API helper"
```

---

### Task 3: Frontend — zona de perigo e modal na aba Segurança

**Files:**
- Modify: `frontend/app/configuracoes/seguranca/page.tsx`

- [ ] **Step 1: Adicionar os estados do modal**

Em `configuracoes/seguranca/page.tsx`, localize o bloco de estados existente (os vários `useState`). Após o último `useState` existente (antes do `useEffect`), adicione:

```typescript
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
```

- [ ] **Step 2: Adicionar o import de `deleteSelfAccount`**

No topo do arquivo, localize a linha de import de `../../../lib/api`:

```typescript
import { changePassword, getErrorMessage, getMember, updateMember } from "../../../lib/api";
```

Substitua por:

```typescript
import { changePassword, deleteSelfAccount, getErrorMessage, getMember, updateMember } from "../../../lib/api";
```

- [ ] **Step 3: Adicionar o handler de exclusão**

Após o handler `handleSavePassword` (antes do `if (loading) return ...`), adicione:

```typescript
  const handleDeleteAccount = async () => {
    if (!member || !deletePassword) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteSelfAccount(member.id, deletePassword);
      sessionStorage.removeItem("authToken");
      sessionStorage.removeItem("user");
      router.push("/login");
    } catch (err: unknown) {
      setDeleteError(getErrorMessage(err, "Erro ao excluir conta."));
      setDeleting(false);
    }
  };
```

- [ ] **Step 4: Adicionar zona de perigo e modal ao JSX**

No `return` do componente, após o fechamento do segundo `<form>` (o de senha), antes do fragmento `</>`, adicione:

```tsx
      {/* Zona de perigo */}
      <div style={{ marginTop: "32px" }}>
        <article
          className="form-card"
          style={{ borderColor: "var(--red, #dc2626)", borderWidth: "1px", borderStyle: "solid" }}
        >
          <div className="form-card-head">
            <h2 className="section-title" style={{ color: "var(--red, #dc2626)" }}>
              Zona de perigo
            </h2>
            <p>Excluir sua conta é uma ação permanente e não pode ser desfeita.</p>
          </div>
          <div className="form-actions">
            <div className="form-buttons">
              <button
                type="button"
                onClick={() => { setShowDeleteModal(true); setDeletePassword(""); setDeleteError(null); }}
                style={{
                  background: "transparent",
                  color: "var(--red, #dc2626)",
                  border: "1.5px solid var(--red, #dc2626)",
                  borderRadius: "8px",
                  padding: "8px 20px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Excluir minha conta
              </button>
            </div>
          </div>
        </article>
      </div>

      {/* Modal de confirmação */}
      {showDeleteModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Confirmar exclusão de conta"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
          onClick={(e) => { if (e.target === e.currentTarget && !deleting) { setShowDeleteModal(false); } }}
          onKeyDown={(e) => { if (e.key === "Escape" && !deleting) setShowDeleteModal(false); }}
        >
          <div
            style={{
              background: "var(--bg, #fff)",
              borderRadius: "16px",
              padding: "32px 28px",
              maxWidth: "440px",
              width: "100%",
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <div style={{ textAlign: "center", fontSize: "40px", lineHeight: 1 }}>⚠️</div>
            <h2
              style={{
                margin: 0,
                fontSize: "18px",
                fontWeight: 700,
                textAlign: "center",
                color: "var(--red, #dc2626)",
              }}
            >
              Excluir conta permanentemente
            </h2>
            <p style={{ margin: 0, textAlign: "center", color: "var(--muted)", fontSize: "14px" }}>
              Esta ação <strong>não pode ser desfeita</strong>. Seu perfil, cursos, advertências e
              todos os dados relacionados serão apagados para sempre.
            </p>
            <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "14px", fontWeight: 500 }}>
              Digite sua senha para confirmar
              <input
                className="input"
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Sua senha atual"
                autoFocus
                disabled={deleting}
                autoComplete="current-password"
              />
            </label>
            {deleteError && (
              <p style={{ margin: 0, color: "var(--red, #dc2626)", fontSize: "14px" }} role="alert" aria-live="polite">
                {deleteError}
              </p>
            )}
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                style={{
                  background: "var(--accent-soft)",
                  border: "none",
                  borderRadius: "8px",
                  padding: "9px 20px",
                  fontWeight: 600,
                  cursor: "pointer",
                  color: "var(--muted)",
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleting || !deletePassword}
                style={{
                  background: "var(--red, #dc2626)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "9px 20px",
                  fontWeight: 600,
                  cursor: "pointer",
                  opacity: deleting || !deletePassword ? 0.6 : 1,
                }}
              >
                {deleting ? "Excluindo..." : "Excluir minha conta"}
              </button>
            </div>
          </div>
        </div>
      )}
```

- [ ] **Step 5: Verificar que o TypeScript compila sem erros**

```bash
cd frontend
npx tsc --noEmit 2>&1 | head -30
```

Esperado: sem erros de tipo.

- [ ] **Step 6: Commit**

```bash
git add frontend/app/configuracoes/seguranca/page.tsx
git commit -m "feat: add permanent account deletion UI with password confirmation modal"
```

---

## Verificação manual

Após implementar todas as tasks:

1. Suba o backend: `cd backend && npm run dev`
2. Suba o frontend: `cd frontend && npm run dev`
3. Acesse `http://localhost:3000/configuracoes/seguranca`
4. Role até a **Zona de perigo** — deve aparecer card com borda vermelha
5. Clique em **Excluir minha conta** — modal deve abrir com overlay escuro
6. Tente confirmar com senha errada — deve exibir "Senha incorreta"
7. Pressione Escape — modal deve fechar
8. Abra novamente, digite a senha correta, clique em **Excluir minha conta**
9. Deve redirecionar para `/login` e a conta não deve mais existir
