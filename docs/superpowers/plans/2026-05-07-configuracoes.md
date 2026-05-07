# Configurações com Sub-abas — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Renomear a aba "Perfil" para "Configurações" e dividir seu conteúdo em quatro sub-abas: Perfil, Segurança, Cursos e Advertências, com endpoint de troca de senha no backend.

**Architecture:** Next.js App Router com layout compartilhado em `app/configuracoes/layout.tsx` que renderiza a barra de abas horizontal. Cada sub-aba é uma rota separada que faz seu próprio fetch de dados. O backend recebe um novo endpoint `PATCH /api/v1/membros/:id/senha` que verifica a senha atual antes de atualizar.

**Tech Stack:** Next.js 14 App Router, TypeScript, Fastify (backend), Zod, Vitest (testes backend), CSS Modules locais.

---

## Mapa de Arquivos

**Criar:**
- `frontend/app/configuracoes/layout.tsx` — layout com barra de abas e auth guard
- `frontend/app/configuracoes/layout.css` — estilos das abas
- `frontend/app/configuracoes/page.tsx` — redirect server-side para `/configuracoes/perfil`
- `frontend/app/configuracoes/perfil/page.tsx` — formulário de dados pessoais (sem e-mail)
- `frontend/app/configuracoes/perfil/page.css` — estilos do formulário (cópia de `app/perfil/page.css`)
- `frontend/app/configuracoes/seguranca/page.tsx` — blocos de e-mail e senha
- `frontend/app/configuracoes/cursos/page.tsx` — lista de cursos
- `frontend/app/configuracoes/advertencias/page.tsx` — alerta de suspensão + lista de advertências

**Modificar:**
- `backend/src/membros/routes.ts` — adicionar schema + rota `PATCH /api/v1/membros/:id/senha`
- `backend/test/membros.integration.test.ts` — adicionar testes do novo endpoint
- `frontend/lib/api.ts` — adicionar função `changePassword`
- `frontend/app/components/SidebarNav.tsx` — renomear item + atualizar href e isActive
- `frontend/app/perfil/page.tsx` — substituir por redirect para `/configuracoes`

---

## Task 1: Backend — endpoint PATCH /api/v1/membros/:id/senha

**Files:**
- Modify: `backend/src/membros/routes.ts`
- Modify: `backend/test/membros.integration.test.ts`

- [ ] **Step 1: Escrever os testes que falham**

Adicionar ao final do `describe("Membros (integration)")` em `backend/test/membros.integration.test.ts`:

```typescript
  async function loginAs(email: string, password: string): Promise<string> {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email, password },
    });
    return res.json().data.access_token;
  }

  describe("PATCH /membros/:id/senha", () => {
    it("altera a senha com sucesso quando a senha atual está correta", async () => {
      const member = await getUserByEmail(testMember1.email);
      const token = await loginAs(testMember1.email, testMember1.password);

      const res = await app.inject({
        method: "PATCH",
        url: `/api/v1/membros/${member!.id}/senha`,
        headers: { authorization: `Bearer ${token}` },
        payload: {
          current_password: testMember1.password,
          new_password: "NovaSenha1",
        },
      });

      expect(res.statusCode).toBe(200);

      // confirma que o login com a nova senha funciona
      const loginRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: { email: testMember1.email, password: "NovaSenha1" },
      });
      expect(loginRes.statusCode).toBe(200);
    });

    it("retorna 400 quando a senha atual está errada", async () => {
      const member = await getUserByEmail(testMember1.email);
      const token = await loginAs(testMember1.email, testMember1.password);

      const res = await app.inject({
        method: "PATCH",
        url: `/api/v1/membros/${member!.id}/senha`,
        headers: { authorization: `Bearer ${token}` },
        payload: {
          current_password: "SenhaErrada1",
          new_password: "NovaSenha1",
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error).toBe("invalid_password");
    });

    it("retorna 400 quando a nova senha é fraca", async () => {
      const member = await getUserByEmail(testMember1.email);
      const token = await loginAs(testMember1.email, testMember1.password);

      const res = await app.inject({
        method: "PATCH",
        url: `/api/v1/membros/${member!.id}/senha`,
        headers: { authorization: `Bearer ${token}` },
        payload: {
          current_password: testMember1.password,
          new_password: "fraca",
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error).toBe("invalid_request");
    });

    it("retorna 403 quando membro tenta alterar senha de outro membro", async () => {
      const member2 = await getUserByEmail(testMember2.email);
      const token = await loginAs(testMember1.email, testMember1.password);

      const res = await app.inject({
        method: "PATCH",
        url: `/api/v1/membros/${member2!.id}/senha`,
        headers: { authorization: `Bearer ${token}` },
        payload: {
          current_password: testMember1.password,
          new_password: "NovaSenha1",
        },
      });

      expect(res.statusCode).toBe(403);
    });
  });
```

Também adicionar import de `testMember2` na linha de imports se ainda não estiver (já importa `testMember1` e `testMember2` no topo do arquivo).

- [ ] **Step 2: Rodar os testes para confirmar que falham**

```bash
cd backend && npx vitest run test/membros.integration.test.ts
```

Esperado: falha com "Route PATCH:/api/v1/membros/:id/senha not found" ou similar.

- [ ] **Step 3: Adicionar o schema e a rota em `backend/src/membros/routes.ts`**

Adicionar import de `verifyPassword` no topo do arquivo (junto com os outros imports de `../auth/`):

```typescript
import { verifyPassword } from "../auth/password.js";
import { updateUserPassword } from "../auth/store.js";
```

`updateUserPassword` já existe em `../auth/store.js` — verificar se já está importado. Se sim, não duplicar.

Adicionar o schema logo após `UpdateMemberSchema` (por volta da linha 76 do arquivo original):

```typescript
const ChangePasswordSchema = z.object({
  current_password: z.string().min(1, "Senha atual obrigatoria"),
  new_password: z.string().min(1, "Nova senha obrigatoria"),
});
```

Adicionar a rota no final da função `routes` (antes do `}`), após as outras rotas de membros:

```typescript
  app.patch("/api/v1/membros/:id/senha", async (request, reply) => {
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

    const parsedBody = ChangePasswordSchema.safeParse(request.body);
    if (!parsedBody.success) {
      return reply.status(400).send({
        error: "invalid_request",
        message: parsedBody.error.issues[0].message,
      });
    }

    const { current_password, new_password } = parsedBody.data;

    const { valid } = verifyPassword(current_password, member.passwordHash);
    if (!valid) {
      return reply.status(400).send({
        error: "invalid_password",
        message: "Senha atual incorreta",
      });
    }

    const passwordError = validatePasswordStrength(new_password);
    if (passwordError) {
      return reply.status(400).send({
        error: "invalid_request",
        message: passwordError,
      });
    }

    await updateUserPassword(params.id, new_password);

    return reply.status(200).send({ data: { message: "Senha alterada com sucesso" } });
  });
```

- [ ] **Step 4: Rodar os testes para confirmar que passam**

```bash
cd backend && npx vitest run test/membros.integration.test.ts
```

Esperado: todos os testes passam, incluindo os 4 novos do `PATCH /senha`.

- [ ] **Step 5: Commit**

```bash
git add backend/src/membros/routes.ts backend/test/membros.integration.test.ts
git commit -m "feat: add PATCH /membros/:id/senha endpoint with current password verification"
```

---

## Task 2: Frontend — função `changePassword` na API

**Files:**
- Modify: `frontend/lib/api.ts`

- [ ] **Step 1: Adicionar a função no final do arquivo `frontend/lib/api.ts`**

```typescript
export async function changePassword(
  id: string,
  current_password: string,
  new_password: string
) {
  return request(`/membros/${id}/senha`, {
    method: "PATCH",
    body: JSON.stringify({ current_password, new_password }),
  });
}
```

- [ ] **Step 2: Verificar que TypeScript compila sem erros**

```bash
cd frontend && npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/api.ts
git commit -m "feat: add changePassword API function"
```

---

## Task 3: Atualizar SidebarNav

**Files:**
- Modify: `frontend/app/components/SidebarNav.tsx`

- [ ] **Step 1: Atualizar o item de navegação**

Encontrar o objeto `{ label: "Perfil", href: "/perfil", ... }` no array `navItems` (por volta da linha 77) e alterar para:

```typescript
  {
    label: "Configurações",
    href: "/configuracoes",
    roles: ["admin", "animador", "recreador"],
    icon: <FiUser aria-hidden="true" />
  },
```

- [ ] **Step 2: Atualizar a função `isActive`**

Encontrar o bloco (por volta da linha 104):

```typescript
  if (href === "/perfil") {
    return pathname.startsWith("/perfil");
  }
```

Alterar para:

```typescript
  if (href === "/configuracoes") {
    return pathname.startsWith("/configuracoes");
  }
```

- [ ] **Step 3: Commit**

```bash
git add frontend/app/components/SidebarNav.tsx
git commit -m "feat: rename Perfil nav item to Configurações and update href"
```

---

## Task 4: Redirecionar `/perfil` → `/configuracoes`

**Files:**
- Modify: `frontend/app/perfil/page.tsx`

- [ ] **Step 1: Substituir o conteúdo de `frontend/app/perfil/page.tsx`**

Apagar todo o conteúdo atual e substituir por:

```typescript
import { redirect } from "next/navigation";

export default function PerfilPage() {
  redirect("/configuracoes");
}
```

O arquivo `frontend/app/perfil/page.css` pode ser mantido (não afeta nada) — não apagar.

- [ ] **Step 2: Confirmar que TypeScript compila**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add frontend/app/perfil/page.tsx
git commit -m "feat: redirect /perfil to /configuracoes"
```

---

## Task 5: Layout de Configurações (abas + auth guard)

**Files:**
- Create: `frontend/app/configuracoes/layout.tsx`
- Create: `frontend/app/configuracoes/layout.css`

- [ ] **Step 1: Criar `frontend/app/configuracoes/layout.css`**

```css
/* Configurações — barra de abas horizontal */

.settings-tabs {
  display: flex;
  gap: 0;
  border-bottom: 2px solid var(--accent-soft);
  margin-bottom: 28px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.settings-tabs::-webkit-scrollbar {
  display: none;
}

.settings-tab {
  padding: 10px 18px;
  font-weight: 600;
  font-size: 14px;
  color: var(--ink);
  white-space: nowrap;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: color 0.15s ease, border-color 0.15s ease;
  text-decoration: none;
  display: inline-block;
  opacity: 0.7;
}

.settings-tab:hover {
  color: var(--accent);
  opacity: 1;
}

.settings-tab.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
  opacity: 1;
}

@media (max-width: 480px) {
  .settings-tab {
    padding: 10px 14px;
    font-size: 13px;
  }
}
```

- [ ] **Step 2: Criar `frontend/app/configuracoes/layout.tsx`**

```typescript
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { getDefaultRoute, getStoredUser, isRoleAllowed } from "../../lib/auth";
import "./layout.css";

const tabs = [
  { label: "Perfil", href: "/configuracoes/perfil" },
  { label: "Segurança", href: "/configuracoes/seguranca" },
  { label: "Cursos", href: "/configuracoes/cursos" },
  { label: "Advertências", href: "/configuracoes/advertencias" },
];

export default function ConfiguracoesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      router.push("/login");
      return;
    }
    if (!isRoleAllowed(user.role, ["recreador", "animador", "admin"])) {
      router.push(getDefaultRoute(user.role));
    }
  }, [router]);

  return (
    <main className="app-page">
      <section className="shell reveal">
        <header className="page-header">
          <div>
            <h1 className="hero-title">Configurações</h1>
          </div>
        </header>
        <nav className="settings-tabs" aria-label="Seções de configurações">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`settings-tab${pathname === tab.href ? " active" : ""}`}
              aria-current={pathname === tab.href ? "page" : undefined}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
        {children}
      </section>
    </main>
  );
}
```

- [ ] **Step 3: Confirmar que TypeScript compila**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add frontend/app/configuracoes/layout.tsx frontend/app/configuracoes/layout.css
git commit -m "feat: add Configurações layout with horizontal tab navigation"
```

---

## Task 6: Página raiz de `/configuracoes` (redirect)

**Files:**
- Create: `frontend/app/configuracoes/page.tsx`

- [ ] **Step 1: Criar `frontend/app/configuracoes/page.tsx`**

```typescript
import { redirect } from "next/navigation";

export default function ConfiguracoesPage() {
  redirect("/configuracoes/perfil");
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/app/configuracoes/page.tsx
git commit -m "feat: redirect /configuracoes to /configuracoes/perfil"
```

---

## Task 7: Sub-aba Perfil (dados pessoais)

**Files:**
- Create: `frontend/app/configuracoes/perfil/page.tsx`
- Create: `frontend/app/configuracoes/perfil/page.css`

- [ ] **Step 1: Criar `frontend/app/configuracoes/perfil/page.css`**

Copiar o conteúdo completo de `frontend/app/perfil/page.css` para `frontend/app/configuracoes/perfil/page.css` (mesmos estilos são reutilizados).

- [ ] **Step 2: Criar `frontend/app/configuracoes/perfil/page.tsx`**

```typescript
"use client";

import "./page.css";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteMemberPhoto,
  getErrorMessage,
  getMember,
  resolveApiAssetUrl,
  updateMember,
  uploadMemberPhoto,
} from "../../../lib/api";
import { getStoredUser } from "../../../lib/auth";
import { displayToIso, formatDateInput, isoToDisplay } from "../../../lib/dateValidators";

interface MemberDetail {
  id: string;
  name: string;
  last_name?: string | null;
  cpf?: string | null;
  birth_date?: string | null;
  region?: string | null;
  phone?: string | null;
  pix?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  photo_url?: string | null;
}

export default function ConfiguracoesPerfil() {
  const router = useRouter();
  const [member, setMember] = useState<MemberDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editCpf, setEditCpf] = useState("");
  const [editBirthDate, setEditBirthDate] = useState("");
  const [editRegion, setEditRegion] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPix, setEditPix] = useState("");
  const [editEmergencyContactName, setEditEmergencyContactName] = useState("");
  const [editEmergencyContactPhone, setEditEmergencyContactPhone] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoInputKey, setPhotoInputKey] = useState(0);
  const [removingPhoto, setRemovingPhoto] = useState(false);
  const [confirmRemovePhoto, setConfirmRemovePhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      router.push("/login");
      return;
    }
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getMember(user.id);
        setMember(response.data as MemberDetail);
      } catch (err: unknown) {
        setError(getErrorMessage(err, "Erro ao carregar perfil."));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [router]);

  useEffect(() => {
    if (member) {
      setEditName(member.name);
      setEditLastName(member.last_name ?? "");
      setEditCpf(member.cpf ?? "");
      setEditBirthDate(member.birth_date ? isoToDisplay(member.birth_date) : "");
      setEditRegion(member.region ?? "");
      setEditPhone(formatPhone(member.phone ?? ""));
      setEditPix(member.pix ?? "");
      setEditEmergencyContactName(member.emergency_contact_name ?? "");
      setEditEmergencyContactPhone(formatPhone(member.emergency_contact_phone ?? ""));
      setPhotoFile(null);
    }
  }, [member]);

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview(null);
      return;
    }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits ? `(${digits}` : "";
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const formatCpf = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  };

  const hasProfileChanges =
    member &&
    (editName.trim() !== member.name ||
      editLastName.trim() !== (member.last_name ?? "") ||
      editCpf.trim() !== (member.cpf ?? "") ||
      editBirthDate !== (member.birth_date ? isoToDisplay(member.birth_date) : "") ||
      editRegion.trim() !== (member.region ?? "") ||
      editPhone.trim() !== (member.phone ?? "") ||
      editPix.trim() !== (member.pix ?? "") ||
      editEmergencyContactName.trim() !== (member.emergency_contact_name ?? "") ||
      editEmergencyContactPhone.trim() !== (member.emergency_contact_phone ?? ""));
  const hasChanges = !!hasProfileChanges || !!photoFile;

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!member) return;

    const trimmedName = editName.trim();
    const trimmedLastName = editLastName.trim();
    const trimmedCpf = editCpf.trim();
    const trimmedRegion = editRegion.trim();
    const trimmedPhone = editPhone.trim();

    if (!trimmedName || !trimmedLastName || !trimmedCpf || !editBirthDate || !trimmedRegion || !trimmedPhone) {
      setSaveError("Preencha todos os dados pessoais para salvar.");
      setSaveSuccess(null);
      return;
    }
    if (!hasChanges) {
      setSaveError(null);
      setSaveSuccess("Nenhuma alteração para salvar.");
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);
    try {
      if (hasProfileChanges) {
        await updateMember(member.id, {
          name: trimmedName,
          last_name: trimmedLastName,
          cpf: trimmedCpf,
          birth_date: displayToIso(editBirthDate),
          region: trimmedRegion,
          phone: trimmedPhone,
          pix: editPix.trim() || null,
          emergency_contact_name: editEmergencyContactName.trim() || null,
          emergency_contact_phone: editEmergencyContactPhone.trim() || null,
        });
        setMember((cur) =>
          cur
            ? {
                ...cur,
                name: trimmedName,
                last_name: trimmedLastName,
                cpf: trimmedCpf,
                birth_date: displayToIso(editBirthDate),
                region: trimmedRegion,
                phone: trimmedPhone,
                pix: editPix.trim() || null,
                emergency_contact_name: editEmergencyContactName.trim() || null,
                emergency_contact_phone: editEmergencyContactPhone.trim() || null,
              }
            : cur
        );
        const storedUser = getStoredUser();
        if (storedUser) {
          sessionStorage.setItem("user", JSON.stringify({ ...storedUser, name: trimmedName }));
          window.dispatchEvent(new Event("user-updated"));
        }
      }
      if (photoFile) {
        const response = await uploadMemberPhoto(member.id, photoFile);
        const photoUrl = response?.data?.photo_url ?? null;
        setMember((cur) => (cur ? { ...cur, photo_url: photoUrl } : cur));
        const storedUser = getStoredUser();
        if (storedUser) {
          sessionStorage.setItem("user", JSON.stringify({ ...storedUser, photo_url: photoUrl }));
          window.dispatchEvent(new Event("user-updated"));
        }
        setPhotoFile(null);
        setPhotoInputKey((prev) => prev + 1);
      }
      setSaveSuccess(
        hasProfileChanges && photoFile
          ? "Dados e foto atualizados com sucesso."
          : photoFile
          ? "Foto atualizada com sucesso."
          : "Dados atualizados com sucesso."
      );
    } catch (err: unknown) {
      setSaveError(getErrorMessage(err, "Erro ao salvar perfil."));
    } finally {
      setSaving(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!member || removingPhoto) return;
    setRemovingPhoto(true);
    setSaveError(null);
    setSaveSuccess(null);
    try {
      await deleteMemberPhoto(member.id);
      setMember((cur) => (cur ? { ...cur, photo_url: null } : cur));
      setPhotoFile(null);
      setPhotoInputKey((prev) => prev + 1);
      const storedUser = getStoredUser();
      if (storedUser) {
        sessionStorage.setItem("user", JSON.stringify({ ...storedUser, photo_url: null }));
        window.dispatchEvent(new Event("user-updated"));
      }
      setSaveSuccess("Foto removida com sucesso.");
    } catch (err: unknown) {
      setSaveError(getErrorMessage(err, "Erro ao remover foto."));
    } finally {
      setRemovingPhoto(false);
    }
  };

  const previewUrl = photoPreview ?? resolveApiAssetUrl(member?.photo_url);

  if (loading) return <div className="empty-state"><p>Carregando...</p></div>;
  if (error) return <div className="empty-state"><p className="text-red-500">{error}</p></div>;
  if (!member) return <div className="empty-state"><p>Perfil não encontrado.</p></div>;

  return (
    <form className="form-layout" onSubmit={handleSave}>
      <article className="form-card">
        <div className="form-card-head">
          <h2 className="section-title">Dados pessoais</h2>
          <p>Atualize seus dados pessoais para o sistema.</p>
        </div>
        <div className="form-grid">
          <div className="profile-photo-block">
            <div className="profile-photo-preview" aria-hidden="true">
              {previewUrl ? (
                <img className="avatar-image" src={previewUrl} alt="" />
              ) : (
                <span className="profile-photo-placeholder">Sem foto</span>
              )}
            </div>
            <div className="profile-photo-meta">
              <strong>Foto de perfil</strong>
              <label className="profile-photo-upload" htmlFor="profilePhotoFile">
                <span>Adicionar foto</span>
                <input
                  id="profilePhotoFile"
                  className="profile-photo-input"
                  type="file"
                  accept="image/*"
                  key={photoInputKey}
                  onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
                />
              </label>
              {(member.photo_url || photoFile) &&
                (confirmRemovePhoto ? (
                  <div className="profile-photo-confirm">
                    <span className="profile-photo-confirm-text">Remover a foto?</span>
                    <button
                      type="button"
                      className="profile-photo-confirm-yes"
                      onClick={() => {
                        setConfirmRemovePhoto(false);
                        const hasPersistedPhoto = Boolean(member.photo_url);
                        if (photoFile) {
                          setPhotoFile(null);
                          setPhotoInputKey((prev) => prev + 1);
                        }
                        if (hasPersistedPhoto) handleRemovePhoto();
                      }}
                      disabled={removingPhoto}
                    >
                      {removingPhoto ? "Removendo..." : "Confirmar"}
                    </button>
                    <button
                      type="button"
                      className="profile-photo-confirm-no"
                      onClick={() => setConfirmRemovePhoto(false)}
                      disabled={removingPhoto}
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="profile-photo-remove"
                    onClick={() => setConfirmRemovePhoto(true)}
                    disabled={removingPhoto}
                  >
                    Remover foto
                  </button>
                ))}
            </div>
          </div>

          <label className="field full" htmlFor="profileName">
            <span>Nome</span>
            <input id="profileName" className="input" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Seu nome" />
          </label>
          <label className="field full" htmlFor="profileLastName">
            <span>Sobrenome</span>
            <input id="profileLastName" className="input" value={editLastName} onChange={(e) => setEditLastName(e.target.value)} placeholder="Seu sobrenome" />
          </label>
          <label className="field full" htmlFor="profileCpf">
            <span>CPF</span>
            <input id="profileCpf" name="cpf" className="input" inputMode="numeric" autoComplete="national-id" value={editCpf} onChange={(e) => setEditCpf(formatCpf(e.target.value))} placeholder="000.000.000-00" />
          </label>
          <label className="field full" htmlFor="profileBirthDate">
            <span>Data de nascimento</span>
            <input id="profileBirthDate" className="input" type="text" inputMode="numeric" maxLength={10} placeholder="DD/MM/AAAA" value={editBirthDate} onChange={(e) => setEditBirthDate(formatDateInput(e.target.value))} />
          </label>
          <label className="field full" htmlFor="profileRegion">
            <span>Região administrativa</span>
            <input id="profileRegion" className="input" value={editRegion} onChange={(e) => setEditRegion(e.target.value)} placeholder="Ex: Ceilândia" />
          </label>
          <label className="field full" htmlFor="profilePhone">
            <span>Telefone</span>
            <input id="profilePhone" name="tel" className="input" type="tel" inputMode="tel" autoComplete="tel-national" value={editPhone} onChange={(e) => setEditPhone(formatPhone(e.target.value))} onBlur={(e) => setEditPhone(formatPhone(e.target.value))} placeholder="(61) 99999-9999" />
          </label>
          <label className="field full" htmlFor="profilePix">
            <span>Chave Pix</span>
            <input id="profilePix" className="input" value={editPix} onChange={(e) => setEditPix(e.target.value)} placeholder="CPF, e-mail, celular ou chave aleatória" />
          </label>
          <label className="field full" htmlFor="profileEmergencyContactName">
            <span>Contato de emergência — quem é</span>
            <input id="profileEmergencyContactName" className="input" value={editEmergencyContactName} onChange={(e) => setEditEmergencyContactName(e.target.value)} placeholder="Ex: Mãe, Pai, Cônjuge..." />
          </label>
          <label className="field full" htmlFor="profileEmergencyContactPhone">
            <span>Contato de emergência — telefone</span>
            <input id="profileEmergencyContactPhone" className="input" type="tel" inputMode="tel" value={editEmergencyContactPhone} onChange={(e) => setEditEmergencyContactPhone(formatPhone(e.target.value))} onBlur={(e) => setEditEmergencyContactPhone(formatPhone(e.target.value))} placeholder="(61) 99999-9999" />
          </label>
        </div>
        <div className="form-actions">
          <p className="helper">Revise antes de salvar.</p>
          <div className="form-buttons">
            <button type="submit" className="button" disabled={saving || !hasChanges}>
              {saving ? "Salvando..." : "Salvar perfil"}
            </button>
          </div>
        </div>
        {saveError && <p className="text-red-500" role="alert" aria-live="polite">{saveError}</p>}
        {saveSuccess && <p className="text-green-600" role="status" aria-live="polite">{saveSuccess}</p>}
      </article>
    </form>
  );
}
```

- [ ] **Step 3: Confirmar que TypeScript compila**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add frontend/app/configuracoes/perfil/page.tsx frontend/app/configuracoes/perfil/page.css
git commit -m "feat: add Configurações/Perfil sub-page with personal data form"
```

---

## Task 8: Sub-aba Segurança (e-mail + senha)

**Files:**
- Create: `frontend/app/configuracoes/seguranca/page.tsx`

- [ ] **Step 1: Criar `frontend/app/configuracoes/seguranca/page.tsx`**

```typescript
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { changePassword, getErrorMessage, getMember, updateMember } from "../../../lib/api";
import { getStoredUser } from "../../../lib/auth";

interface MemberBasic {
  id: string;
  email: string;
}

export default function ConfiguracoesSeguranca() {
  const router = useRouter();
  const [member, setMember] = useState<MemberBasic | null>(null);
  const [loading, setLoading] = useState(true);

  // email state
  const [newEmail, setNewEmail] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);

  // password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      router.push("/login");
      return;
    }
    const load = async () => {
      try {
        const response = await getMember(user.id);
        setMember({ id: response.data.id, email: response.data.email });
      } catch {
        // silently fail — user will see empty state
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [router]);

  const handleSaveEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) return;
    const trimmed = newEmail.trim();
    if (!trimmed) {
      setEmailError("Informe o novo e-mail.");
      return;
    }
    if (trimmed === member.email) {
      setEmailError("O novo e-mail é igual ao atual.");
      return;
    }
    setSavingEmail(true);
    setEmailError(null);
    setEmailSuccess(null);
    try {
      await updateMember(member.id, { email: trimmed });
      setMember((cur) => (cur ? { ...cur, email: trimmed } : cur));
      setNewEmail("");
      setEmailSuccess("E-mail atualizado com sucesso.");
    } catch (err: unknown) {
      setEmailError(getErrorMessage(err, "Erro ao atualizar e-mail."));
    } finally {
      setSavingEmail(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) return;
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Preencha todos os campos.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("A nova senha e a confirmação não coincidem.");
      return;
    }
    setSavingPassword(true);
    setPasswordError(null);
    setPasswordSuccess(null);
    try {
      await changePassword(member.id, currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess("Senha alterada com sucesso.");
    } catch (err: unknown) {
      setPasswordError(getErrorMessage(err, "Erro ao alterar senha."));
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) return <div className="empty-state"><p>Carregando...</p></div>;

  return (
    <>
      <form className="form-layout" onSubmit={handleSaveEmail}>
        <article className="form-card">
          <div className="form-card-head">
            <h2 className="section-title">E-mail de acesso</h2>
            <p>Seu e-mail é usado para fazer login na plataforma.</p>
          </div>
          <div className="form-grid">
            <label className="field full">
              <span>E-mail atual</span>
              <input className="input" type="email" value={member?.email ?? ""} readOnly disabled />
            </label>
            <label className="field full" htmlFor="newEmail">
              <span>Novo e-mail</span>
              <input
                id="newEmail"
                className="input"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="novo@email.com"
                autoComplete="email"
              />
            </label>
          </div>
          <div className="form-actions">
            <div className="form-buttons">
              <button type="submit" className="button" disabled={savingEmail || !newEmail.trim()}>
                {savingEmail ? "Salvando..." : "Salvar e-mail"}
              </button>
            </div>
          </div>
          {emailError && <p className="text-red-500" role="alert" aria-live="polite">{emailError}</p>}
          {emailSuccess && <p className="text-green-600" role="status" aria-live="polite">{emailSuccess}</p>}
        </article>
      </form>

      <form className="form-layout" onSubmit={handleSavePassword} style={{ marginTop: "24px" }}>
        <article className="form-card">
          <div className="form-card-head">
            <h2 className="section-title">Senha</h2>
            <p>Altere sua senha periodicamente para maior segurança.</p>
          </div>
          <div className="form-grid">
            <label className="field full" htmlFor="currentPassword">
              <span>Senha atual</span>
              <input
                id="currentPassword"
                className="input"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </label>
            <label className="field full" htmlFor="newPassword">
              <span>Nova senha</span>
              <input
                id="newPassword"
                className="input"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="••••••••"
              />
            </label>
            <label className="field full" htmlFor="confirmPassword">
              <span>Confirmar nova senha</span>
              <input
                id="confirmPassword"
                className="input"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="••••••••"
              />
            </label>
          </div>
          <div className="form-actions">
            <div className="form-buttons">
              <button
                type="submit"
                className="button"
                disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
              >
                {savingPassword ? "Salvando..." : "Salvar senha"}
              </button>
            </div>
          </div>
          {passwordError && <p className="text-red-500" role="alert" aria-live="polite">{passwordError}</p>}
          {passwordSuccess && <p className="text-green-600" role="status" aria-live="polite">{passwordSuccess}</p>}
        </article>
      </form>
    </>
  );
}
```

- [ ] **Step 2: Confirmar que TypeScript compila**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add frontend/app/configuracoes/seguranca/page.tsx
git commit -m "feat: add Configurações/Segurança sub-page with email and password change"
```

---

## Task 9: Sub-aba Cursos

**Files:**
- Create: `frontend/app/configuracoes/cursos/page.tsx`

- [ ] **Step 1: Criar `frontend/app/configuracoes/cursos/page.tsx`**

```typescript
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getErrorMessage, getMember } from "../../../lib/api";
import { getStoredUser } from "../../../lib/auth";

interface CourseItem {
  id: string;
  title: string;
  course_date: string;
  status: "enrolled" | "attended" | "missed";
}

export default function ConfiguracoesCursos() {
  const router = useRouter();
  const [courses, setCourses] = useState<CourseItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      router.push("/login");
      return;
    }
    const load = async () => {
      try {
        const response = await getMember(user.id);
        setCourses(response.data.courses as CourseItem[]);
      } catch (err: unknown) {
        setError(getErrorMessage(err, "Erro ao carregar cursos."));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [router]);

  const formatDateBR = (value: string) => {
    const [year, month, day] = value.split("-");
    if (!year || !month || !day) return value;
    return `${day}/${month}/${year}`;
  };

  const formatStatus = (status: "enrolled" | "attended" | "missed") => {
    if (status === "attended") return "Presente";
    if (status === "missed") return "Faltou";
    return "Inscrito";
  };

  if (loading) return <div className="empty-state"><p>Carregando...</p></div>;
  if (error) return <div className="empty-state"><p className="text-red-500">{error}</p></div>;

  return (
    <section className="report-panel">
      <div className="report-header">
        <div>
          <h2 className="section-title">Meus cursos</h2>
          <p>Total de cursos: {courses?.length ?? 0}</p>
        </div>
      </div>
      {courses && courses.length > 0 ? (
        <div className="warning-list">
          <article className="warning-card">
            <div className="warning-header">
              <div className="warning-meta">
                <strong className="warning-name">Cursos inscritos</strong>
                <span className="warning-count">{courses.length} curso(s)</span>
              </div>
            </div>
            <ul className="warning-items">
              {courses.map((course) => (
                <li key={course.id} className="warning-item">
                  <span className="warning-date">{formatDateBR(course.course_date)}</span>
                  <span className="warning-desc">{course.title} · {formatStatus(course.status)}</span>
                </li>
              ))}
            </ul>
          </article>
        </div>
      ) : (
        <div className="empty-state">
          <p>Nenhum curso inscrito.</p>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Confirmar que TypeScript compila**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add frontend/app/configuracoes/cursos/page.tsx
git commit -m "feat: add Configurações/Cursos sub-page"
```

---

## Task 10: Sub-aba Advertências

**Files:**
- Create: `frontend/app/configuracoes/advertencias/page.tsx`

- [ ] **Step 1: Criar `frontend/app/configuracoes/advertencias/page.tsx`**

```typescript
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getErrorMessage, getMember } from "../../../lib/api";
import { getStoredUser } from "../../../lib/auth";

interface WarningItem {
  id: string;
  reason: string;
  warning_date: string;
  created_by_name?: string | null;
}

interface SuspensionInfo {
  status: "active" | "suspended";
  start_date: string | null;
  end_date: string | null;
}

interface MemberData {
  warnings: WarningItem[];
  warnings_total: number;
  suspension: SuspensionInfo;
}

export default function ConfiguracoesAdvertencias() {
  const router = useRouter();
  const [data, setData] = useState<MemberData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      router.push("/login");
      return;
    }
    const load = async () => {
      try {
        const response = await getMember(user.id);
        setData({
          warnings: response.data.warnings,
          warnings_total: response.data.warnings_total,
          suspension: response.data.suspension,
        });
      } catch (err: unknown) {
        setError(getErrorMessage(err, "Erro ao carregar advertências."));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [router]);

  const formatDateBR = (value: string) => {
    const [year, month, day] = value.split("-");
    if (!year || !month || !day) return value;
    return `${day}/${month}/${year}`;
  };

  if (loading) return <div className="empty-state"><p>Carregando...</p></div>;
  if (error) return <div className="empty-state"><p className="text-red-500">{error}</p></div>;

  return (
    <>
      {data?.suspension.status === "suspended" && (
        <div className="suspension-alert">
          <div className="suspension-alert-title">SUSPENSÃO ATIVA</div>
          <p className="suspension-alert-text">
            Você está suspenso por 1 mês e não pode trabalhar.
          </p>
          {data.suspension.start_date && data.suspension.end_date && (
            <p className="suspension-alert-text">
              Período: {formatDateBR(data.suspension.start_date)} até{" "}
              {formatDateBR(data.suspension.end_date)}.
            </p>
          )}
        </div>
      )}
      <section className="report-panel">
        <div className="report-header">
          <div>
            <h2 className="section-title">Minhas advertências</h2>
            <p>Total de advertências: {data?.warnings_total ?? 0}</p>
          </div>
        </div>
        {data && data.warnings.length > 0 ? (
          <div className="warning-list">
            <article className="warning-card">
              <div className="warning-header">
                <div className="warning-meta">
                  <strong className="warning-name">Advertências</strong>
                  <span className="warning-count">{data.warnings.length} advertência(s)</span>
                </div>
              </div>
              <ul className="warning-items">
                {data.warnings.map((warning) => (
                  <li key={warning.id} className="warning-item">
                    <span className="warning-date">{formatDateBR(warning.warning_date)}</span>
                    <span className="warning-desc">{warning.reason}</span>
                    {warning.created_by_name && (
                      <span className="warning-issuer">Dada por: {warning.created_by_name}</span>
                    )}
                  </li>
                ))}
              </ul>
            </article>
          </div>
        ) : (
          <div className="empty-state">
            <p>Nenhuma advertência registrada.</p>
          </div>
        )}
      </section>
    </>
  );
}
```

- [ ] **Step 2: Confirmar que TypeScript compila**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add frontend/app/configuracoes/advertencias/page.tsx
git commit -m "feat: add Configurações/Advertências sub-page"
```

---

## Verificação Final

- [ ] Testar navegando para `/configuracoes` — deve redirecionar para `/configuracoes/perfil` com as abas visíveis
- [ ] Testar cada aba: Perfil, Segurança, Cursos, Advertências
- [ ] Testar em mobile (viewport estreito): abas devem rolar horizontalmente sem quebrar o layout
- [ ] Testar `/perfil` antigo — deve redirecionar para `/configuracoes`
- [ ] Testar troca de senha com senha atual errada — deve mostrar mensagem de erro clara
- [ ] Rodar todos os testes do backend: `cd backend && npx vitest run`
