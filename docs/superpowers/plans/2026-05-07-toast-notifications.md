# Toast Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir erros de submit e adicionar feedbacks de sucesso com um sistema de toast flutuante no canto superior direito com auto-dismiss em 3 segundos.

**Architecture:** Um `ToastContext` centralizado no layout root expõe `showToast(message, type)` via hook. Um componente `Toast` renderizado via portal mostra os toasts flutuantes. Cada página com erros de submit substitui seus `useState` locais por chamadas ao hook.

**Tech Stack:** React 18, Next.js 14, TypeScript, CSS Modules, Jest (node environment)

---

### Task 1: Criar ToastContext com reducer testável

**Files:**
- Create: `frontend/app/context/ToastContext.tsx`
- Create: `frontend/app/context/toastReducer.test.ts`

- [ ] **Step 1: Escrever o teste do reducer**

```typescript
// frontend/app/context/toastReducer.test.ts
import { toastReducer } from "./ToastContext";

describe("toastReducer", () => {
  it("ADD adiciona toast à lista", () => {
    const toast = { id: "1", message: "Erro", type: "error" as const };
    const result = toastReducer([], { type: "ADD", toast });
    expect(result).toEqual([toast]);
  });

  it("ADD preserva toasts existentes", () => {
    const existing = { id: "1", message: "A", type: "error" as const };
    const incoming = { id: "2", message: "B", type: "success" as const };
    const result = toastReducer([existing], { type: "ADD", toast: incoming });
    expect(result).toHaveLength(2);
    expect(result[1]).toEqual(incoming);
  });

  it("DISMISS remove o toast pelo id", () => {
    const toasts = [
      { id: "1", message: "A", type: "error" as const },
      { id: "2", message: "B", type: "success" as const },
    ];
    const result = toastReducer(toasts, { type: "DISMISS", id: "1" });
    expect(result).toEqual([{ id: "2", message: "B", type: "success" }]);
  });

  it("DISMISS com id inexistente não altera a lista", () => {
    const toasts = [{ id: "1", message: "A", type: "error" as const }];
    const result = toastReducer(toasts, { type: "DISMISS", id: "999" });
    expect(result).toEqual(toasts);
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

```bash
cd frontend && npm test -- --testPathPattern="toastReducer" --no-coverage
```

Esperado: FAIL com "Cannot find module"

- [ ] **Step 3: Criar o ToastContext**

```typescript
// frontend/app/context/ToastContext.tsx
"use client";

import { createContext, useContext, useReducer, useCallback, type ReactNode } from "react";

export type ToastType = "error" | "success";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

type ToastAction =
  | { type: "ADD"; toast: Toast }
  | { type: "DISMISS"; id: string };

export function toastReducer(state: Toast[], action: ToastAction): Toast[] {
  switch (action.type) {
    case "ADD":
      return [...state, action.toast];
    case "DISMISS":
      return state.filter((t) => t.id !== action.id);
  }
}

interface ToastContextValue {
  toasts: Toast[];
  showToast: (message: string, type: ToastType) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue>({
  toasts: [],
  showToast: () => {},
  dismissToast: () => {},
});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, dispatch] = useReducer(toastReducer, []);

  const dismissToast = useCallback((id: string) => {
    dispatch({ type: "DISMISS", id });
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      dispatch({ type: "ADD", toast: { id, message, type } });
      setTimeout(() => dismissToast(id), 3000);
    },
    [dismissToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

```bash
cd frontend && npm test -- --testPathPattern="toastReducer" --no-coverage
```

Esperado: PASS (4 testes)

- [ ] **Step 5: Commit**

```bash
git add frontend/app/context/ToastContext.tsx frontend/app/context/toastReducer.test.ts
git commit -m "feat: add ToastContext with reducer"
```

---

### Task 2: Criar componente Toast visual

**Files:**
- Create: `frontend/components/Toast.tsx`
- Create: `frontend/components/Toast.css`

- [ ] **Step 1: Criar o CSS do Toast**

```css
/* frontend/components/Toast.css */
.toast-container {
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
}

.toast-item {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid transparent;
  background: #ffffff;
  box-shadow: 0 16px 30px rgba(24, 17, 43, 0.12);
  min-width: 280px;
  max-width: 420px;
  pointer-events: auto;
  animation: toast-in 0.2s ease;
}

@keyframes toast-in {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.toast-item.error {
  border-color: rgba(208, 75, 75, 0.25);
  background: #fff4f4;
}

.toast-item.success {
  border-color: rgba(40, 150, 90, 0.25);
  background: #f1fbf4;
}

.toast-icon {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
}

.toast-item.error .toast-icon {
  background: rgba(208, 75, 75, 0.12);
  color: #c44545;
}

.toast-item.success .toast-icon {
  background: rgba(40, 150, 90, 0.12);
  color: #2b7a52;
}

.toast-icon svg {
  width: 18px;
  height: 18px;
  stroke: currentColor;
  stroke-width: 1.8;
  fill: none;
}

.toast-message {
  flex: 1;
  font-size: 13px;
  color: var(--ink, #18112b);
  margin: 0;
}

.toast-close {
  flex-shrink: 0;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  color: var(--muted, #8a7fa0);
  font-size: 16px;
  line-height: 1;
  border-radius: 6px;
}

.toast-close:hover {
  color: var(--ink, #18112b);
}

/* Dark theme */
body.theme-purple .toast-item {
  background: rgba(21, 11, 34, 0.9);
  border-color: rgba(161, 97, 255, 0.2);
}

body.theme-purple .toast-item.error {
  background: rgba(208, 75, 75, 0.1);
  border-color: rgba(208, 75, 75, 0.3);
}

body.theme-purple .toast-item.success {
  background: rgba(31, 143, 95, 0.1);
  border-color: rgba(31, 143, 95, 0.3);
}

body.theme-purple .toast-message {
  color: var(--ink, #e8dfff);
}

body.theme-purple .toast-close {
  color: var(--muted, #9d8ec0);
}
```

- [ ] **Step 2: Criar o componente Toast**

```tsx
// frontend/components/Toast.tsx
"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import type { Toast as ToastItem } from "../app/context/ToastContext";
import "./Toast.css";

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

function ErrorIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function SuccessIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="toast-container" role="region" aria-label="Notificações">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast-item ${toast.type}`}
          role={toast.type === "error" ? "alert" : "status"}
          aria-live={toast.type === "error" ? "assertive" : "polite"}
        >
          <span className="toast-icon">
            {toast.type === "error" ? <ErrorIcon /> : <SuccessIcon />}
          </span>
          <p className="toast-message">{toast.message}</p>
          <button
            className="toast-close"
            type="button"
            aria-label="Fechar notificação"
            onClick={() => onDismiss(toast.id)}
          >
            ✕
          </button>
        </div>
      ))}
    </div>,
    document.body
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/components/Toast.tsx frontend/components/Toast.css
git commit -m "feat: add Toast component with portal"
```

---

### Task 3: Integrar ToastProvider e ToastContainer no layout

**Files:**
- Modify: `frontend/app/layout.tsx`
- Modify: `frontend/app/context/ToastContext.tsx`

O `ToastProvider` precisa renderizar o `ToastContainer` internamente para que qualquer página possa usar `useToast()` sem precisar adicionar o container manualmente.

- [ ] **Step 1: Atualizar o ToastContext para renderizar o ToastContainer**

No arquivo `frontend/app/context/ToastContext.tsx`, substitua o return do `ToastProvider`:

```tsx
// Adicionar import no topo do arquivo
import { ToastContainer } from "../../components/Toast";
```

Depois, substituir o corpo do `ToastProvider`:

Substituir:
```tsx
  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>
      {children}
    </ToastContext.Provider>
  );
```

Por:
```tsx
  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
```

- [ ] **Step 2: Adicionar ToastProvider no layout**

Arquivo: `frontend/app/layout.tsx`. Substituir o conteúdo inteiro:

```tsx
import "./globals.css";
import type { ReactNode } from "react";
import AppShell from "./components/AppShell";
import { ResetPasswordProvider } from "./context/ResetPasswordContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ToastProvider } from "./context/ToastContext";
import { ErrorBoundary } from "../components/ErrorBoundary";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <ThemeProvider>
          <ResetPasswordProvider>
            <ErrorBoundary>
              <ToastProvider>
                <AppShell>{children}</AppShell>
              </ToastProvider>
            </ErrorBoundary>
          </ResetPasswordProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Verificar que a aplicação compila sem erros**

```bash
cd frontend && npx tsc --noEmit
```

Esperado: nenhum erro de tipo.

- [ ] **Step 4: Commit**

```bash
git add frontend/app/layout.tsx frontend/app/context/ToastContext.tsx
git commit -m "feat: wire ToastProvider into root layout"
```

---

### Task 4: Migrar novo-relatorio/page.tsx

**Files:**
- Modify: `frontend/app/novo-relatorio/page.tsx`

Remover o state `submitError` e substituir todas as suas chamadas por `showToast`. Chamadas que limpam o erro (`setSubmitError("")`) são simplesmente removidas.

- [ ] **Step 1: Adicionar import do useToast**

No topo de `frontend/app/novo-relatorio/page.tsx`, adicionar:

```tsx
import { useToast } from "../context/ToastContext";
```

> Atenção: o arquivo já importa de `"../../lib/..."` — esses são imports de `frontend/lib/`. O `ToastContext` fica em `frontend/app/context/`, que é um nível acima (`../context/`).

- [ ] **Step 2: Adicionar hook e remover useState de submitError**

Localizar e remover a linha:
```tsx
  const [submitError, setSubmitError] = useState("");
```

Adicionar no início do componente, junto com os outros hooks:
```tsx
  const { showToast } = useToast();
```

- [ ] **Step 3: Substituir setSubmitError por showToast (erros reais)**

Aplicar estas substituições no arquivo (cada uma é uma ocorrência distinta):

**Linha ~408** — erro ao carregar relatório para edição:
```tsx
// ANTES
        setSubmitError(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar o relatório para edição."
        );
// DEPOIS
        showToast(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar o relatório para edição.",
          "error"
        );
```

**Linha ~508** — erro de validação de arquivo (handleEventPhotoAdd):
```tsx
// ANTES
        setSubmitError(error);
        return;
// DEPOIS
        showToast(error, "error");
        return;
```

**Linha ~515** — excesso de fotos por tópico (handleEventPhotoAdd):
```tsx
// ANTES
      setSubmitError(
        `${topicName}: o máximo permitido é ${MAX_EVENT_PHOTOS_PER_TOPIC} imagens por tópico.`
      );
      return;
// DEPOIS
      showToast(
        `${topicName}: o máximo permitido é ${MAX_EVENT_PHOTOS_PER_TOPIC} imagens por tópico.`,
        "error"
      );
      return;
```

**Linha ~531** — erro de validação de arquivo (handleDamageImagesAdd):
```tsx
// ANTES
        setSubmitError(error);
        return;
// DEPOIS
        showToast(error, "error");
        return;
```

**Linha ~551** — data no futuro (handleSubmit):
```tsx
// ANTES
        setSubmitError("A data do evento não pode ser no futuro.");
// DEPOIS
        showToast("A data do evento não pode ser no futuro.", "error");
```

**Linha ~614** — excesso de fotos por tópico (handleSubmit):
```tsx
// ANTES
      setSubmitError(
        `${topicOverLimit.topic}: o máximo permitido é ${MAX_EVENT_PHOTOS_PER_TOPIC} imagens por tópico.`
      );
// DEPOIS
      showToast(
        `${topicOverLimit.topic}: o máximo permitido é ${MAX_EVENT_PHOTOS_PER_TOPIC} imagens por tópico.`,
        "error"
      );
```

**Linha ~638** — arquivos inválidos (handleSubmit):
```tsx
// ANTES
      setSubmitError(
        `Alguns arquivos nao sao imagem/video: ${invalidNames}. Remova esses arquivos e tente novamente.`
      );
// DEPOIS
      showToast(
        `Alguns arquivos nao sao imagem/video: ${invalidNames}. Remova esses arquivos e tente novamente.`,
        "error"
      );
```

**Linha ~668** — catch do submit:
```tsx
// ANTES
      setSubmitError(
        error instanceof Error ? error.message : "Não foi possível salvar o relatório."
      );
// DEPOIS
      showToast(
        error instanceof Error ? error.message : "Não foi possível salvar o relatório.",
        "error"
      );
```

- [ ] **Step 4: Remover chamadas de limpeza de erro**

Remover estas linhas (simplesmente deletar — não há substituição):
- `setSubmitError("");` na linha ~351 (dentro do useEffect de load)
- `setSubmitError("");` na linha ~520 (fim do handleEventPhotoAdd, caso válido)
- `setSubmitError("");` na linha ~536 (fim do handleDamageImagesAdd, caso válido)
- `setSubmitError("");` na linha ~542 (início do handleSubmit)

- [ ] **Step 5: Remover o JSX de exibição de erro**

Localizar e remover:
```tsx
              {submitError ? <p className="text-red-500">{submitError}</p> : null}
```

- [ ] **Step 6: Verificar compilação**

```bash
cd frontend && npx tsc --noEmit
```

Esperado: nenhum erro. Se aparecer "Cannot find name 'setSubmitError'", alguma chamada foi esquecida — procure com `grep -n setSubmitError frontend/app/novo-relatorio/page.tsx`.

- [ ] **Step 7: Commit**

```bash
git add frontend/app/novo-relatorio/page.tsx
git commit -m "feat: migrate novo-relatorio to toast notifications"
```

---

### Task 5: Migrar configuracoes/seguranca/page.tsx

**Files:**
- Modify: `frontend/app/configuracoes/seguranca/page.tsx`

Esta página tem 4 states: `emailError`, `emailSuccess`, `passwordError`, `passwordSuccess`. Todos viram toasts.

- [ ] **Step 1: Adicionar import e hook**

```tsx
import { useToast } from "../../context/ToastContext";
```

> O arquivo fica em `frontend/app/configuracoes/seguranca/`. O `ToastContext` está em `frontend/app/context/` — dois níveis acima: `../../context/`.

Adicionar no corpo do componente:
```tsx
  const { showToast } = useToast();
```

- [ ] **Step 2: Remover os 4 useState**

Remover:
```tsx
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
```

Remover:
```tsx
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
```

- [ ] **Step 3: Substituir setEmailError / setEmailSuccess**

Para cada `setEmailError("mensagem")` substituir por `showToast("mensagem", "error")`.
Para cada `setEmailSuccess("mensagem")` substituir por `showToast("mensagem", "success")`.
Remover chamadas de limpeza `setEmailError(null)` e `setEmailSuccess(null)`.

- [ ] **Step 4: Substituir setPasswordError / setPasswordSuccess**

Para cada `setPasswordError("mensagem")` substituir por `showToast("mensagem", "error")`.
Para cada `setPasswordSuccess("mensagem")` substituir por `showToast("mensagem", "success")`.
Remover chamadas de limpeza `setPasswordError(null)` e `setPasswordSuccess(null)`.

- [ ] **Step 5: Remover JSX de exibição de erro/sucesso**

Localizar e remover:
```tsx
          {emailError && <p className="text-red-500" role="alert" aria-live="polite">{emailError}</p>}
          {emailSuccess && <p className="text-green-600" role="status" aria-live="polite">{emailSuccess}</p>}
```

Localizar e remover:
```tsx
          {passwordError && <p className="text-red-500" role="alert" aria-live="polite">{passwordError}</p>}
          {passwordSuccess && <p className="text-green-600" role="status" aria-live="polite">{passwordSuccess}</p>}
```

- [ ] **Step 6: Verificar compilação e commit**

```bash
cd frontend && npx tsc --noEmit
git add frontend/app/configuracoes/seguranca/page.tsx
git commit -m "feat: migrate seguranca page to toast notifications"
```

---

### Task 6: Migrar cursos/page.tsx

**Files:**
- Modify: `frontend/app/cursos/page.tsx`

States a migrar: `formError`, `importFormError`. O state `viewError` é de carregamento — NÃO migrar.

- [ ] **Step 1: Adicionar import e hook**

```tsx
import { useToast } from "../context/ToastContext";
```

Adicionar no componente:
```tsx
  const { showToast } = useToast();
```

- [ ] **Step 2: Remover os 2 useState**

Remover:
```tsx
  const [formError, setFormError] = useState<string | null>(null);
```

Remover:
```tsx
  const [importFormError, setImportFormError] = useState<string | null>(null);
```

- [ ] **Step 3: Substituir chamadas**

Para cada `setFormError("mensagem")` substituir por `showToast("mensagem", "error")`.
Para cada `setImportFormError("mensagem")` substituir por `showToast("mensagem", "error")`.
Remover chamadas de limpeza `setFormError(null)` e `setImportFormError(null)`.

- [ ] **Step 4: Remover JSX de exibição**

Localizar e remover (dentro do modal de edição/criação de curso):
```tsx
              {formError && (
                <p className="text-red-500" role="alert" aria-live="polite">
                  {formError}
                </p>
              )}
```

Localizar e remover (dentro do modal de importação):
```tsx
                {importFormError && (
                  <p className="form-error" role="alert">
                    {importFormError}
                  </p>
                )}
```

- [ ] **Step 5: Verificar compilação e commit**

```bash
cd frontend && npx tsc --noEmit
git add frontend/app/cursos/page.tsx
git commit -m "feat: migrate cursos page to toast notifications"
```

---

### Task 7: Migrar advertencias/page.tsx

**Files:**
- Modify: `frontend/app/advertencias/page.tsx`

States a migrar: `createError`, `actionError`. O state `error` (carregamento da lista) NÃO deve ser migrado.

- [ ] **Step 1: Adicionar import e hook**

```tsx
import { useToast } from "../context/ToastContext";
```

Adicionar no componente:
```tsx
  const { showToast } = useToast();
```

- [ ] **Step 2: Remover os 2 useState**

Remover:
```tsx
  const [createError, setCreateError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
```

- [ ] **Step 3: Substituir chamadas**

Para cada `setCreateError("mensagem")` substituir por `showToast("mensagem", "error")`.
Para cada `setActionError("mensagem")` substituir por `showToast("mensagem", "error")`.
Remover chamadas de limpeza `setCreateError(null)` e `setActionError(null)`.

- [ ] **Step 4: Remover JSX de exibição**

Remover (lista com `empty-state`):
```tsx
          {actionError && !editingWarning && (
            <div className="empty-state">
              <p className="text-red-500">{actionError}</p>
            </div>
          )}
```

Remover (dentro do formulário de edição):
```tsx
            {actionError && (
              <p className="text-red-500" role="alert" aria-live="polite">
                {actionError}
              </p>
            )}
```

Remover (dentro do modal de criação):
```tsx
          {createError && (
            <p className="text-red-500" role="alert" aria-live="polite">
              {createError}
            </p>
          )}
```

- [ ] **Step 5: Verificar compilação e commit**

```bash
cd frontend && npx tsc --noEmit
git add frontend/app/advertencias/page.tsx
git commit -m "feat: migrate advertencias page to toast notifications"
```

---

### Task 8: Migrar feedbacks/page.tsx

**Files:**
- Modify: `frontend/app/feedbacks/page.tsx`

State a migrar: `createError`. O state `error` (carregamento da lista) NÃO deve ser migrado.

- [ ] **Step 1: Adicionar import e hook**

```tsx
import { useToast } from "../context/ToastContext";
```

Adicionar no componente:
```tsx
  const { showToast } = useToast();
```

- [ ] **Step 2: Remover useState**

Remover:
```tsx
  const [createError, setCreateError] = useState<string | null>(null);
```

- [ ] **Step 3: Substituir chamadas**

Para cada `setCreateError("mensagem")` substituir por `showToast("mensagem", "error")`.
Remover chamadas de limpeza `setCreateError(null)`.

- [ ] **Step 4: Remover JSX de exibição**

Remover (dentro do modal de novo feedback):
```tsx
          {createError && (
            <div className="feedback-modal-error alert-card error" role="alert">
              <p>{createError}</p>
            </div>
          )}
```

- [ ] **Step 5: Verificar compilação e commit**

```bash
cd frontend && npx tsc --noEmit
git add frontend/app/feedbacks/page.tsx
git commit -m "feat: migrate feedbacks page to toast notifications"
```

---

### Task 9: Migrar usuarios/page.tsx

**Files:**
- Modify: `frontend/app/usuarios/page.tsx`

States a migrar: `actionError`, `cpfActionError`. O state `error` (carregamento da lista) e `detailsError` (carregamento de detalhes) NÃO devem ser migrados.

- [ ] **Step 1: Adicionar import e hook**

```tsx
import { useToast } from "../context/ToastContext";
```

Adicionar no componente:
```tsx
  const { showToast } = useToast();
```

- [ ] **Step 2: Remover os 2 useState**

Remover:
```tsx
  const [actionError, setActionError] = useState<string | null>(null);
```

Remover:
```tsx
  const [cpfActionError, setCpfActionError] = useState<string | null>(null);
```

- [ ] **Step 3: Substituir chamadas**

Para cada `setActionError("mensagem")` substituir por `showToast("mensagem", "error")`.
Para cada `setCpfActionError("mensagem")` substituir por `showToast("mensagem", "error")`.
Remover chamadas de limpeza `setActionError(null)` e `setCpfActionError(null)`.

- [ ] **Step 4: Remover JSX de exibição**

Remover:
```tsx
                <p className="text-red-500" role="alert" aria-live="polite">{actionError}</p>
```

Remover:
```tsx
                <p className="text-red-500" role="alert" aria-live="polite">{cpfActionError}</p>
```

- [ ] **Step 5: Verificar compilação final e commit**

```bash
cd frontend && npx tsc --noEmit
```

Esperado: zero erros de tipo em todo o projeto.

```bash
cd frontend && npm test -- --no-coverage
```

Esperado: todos os testes passando incluindo os 4 de `toastReducer`.

```bash
git add frontend/app/usuarios/page.tsx
git commit -m "feat: migrate usuarios page to toast notifications"
```
