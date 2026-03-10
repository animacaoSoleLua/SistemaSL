# Sprint 5 — Refatoração de Código

**Prioridade:** Média
**Status:** Concluída

---

## Objetivo

Reduzir duplicação de código, criar componentes reutilizáveis e melhorar a manutenibilidade geral do projeto sem alterar comportamento existente.

---

## Tarefas

### AUD-R5-01 — Criar componente Modal reutilizável

**Severidade:** Alta
**Arquivos:** Todas as páginas com modal

**Problema:**
Cada página reimplementa o mesmo padrão de modal inline, resultando em código duplicado e inconsistências visuais/comportamentais.

**Arquivos afetados:**
- `usuarios/page.tsx` — 3+ modais
- `advertencias/page.tsx` — 2 modais
- `cursos/page.tsx` — 2 modais
- `relatorios/page.tsx` — 1 modal

**Solução:**
```tsx
// ✅ frontend/components/Modal.tsx
import { useEffect } from "react";
import { useFocusTrap } from "@/lib/useFocusTrap"; // da Sprint 3

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

export function Modal({ isOpen, onClose, title, children, size = "md" }: ModalProps) {
  const ref = useFocusTrap(isOpen);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        ref={ref}
        className={`modal modal-${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="modal-title">{title}</h2>
          <button onClick={onClose} aria-label="Fechar modal" className="modal-close">
            ✕
          </button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}
```

**Critérios de Conclusão:**
- [ ] Componente `Modal` criado em `frontend/components/Modal.tsx`
- [ ] Substituído em todas as páginas
- [ ] Focus trap integrado (da Sprint 3)
- [ ] ESC fecha o modal
- [ ] Scroll da página travado enquanto modal aberto
- [ ] Visual consistente em todas as telas

---

### AUD-R5-02 — Criar componente FormField reutilizável

**Severidade:** Média
**Arquivos:** Formulários do frontend

**Problema:**
O padrão `label + input + mensagem de erro` é repetido dezenas de vezes com variações sutis.

**Solução:**
```tsx
// ✅ frontend/components/FormField.tsx
interface FormFieldProps {
  id: string;
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactElement;
}

export function FormField({ id, label, error, required, children }: FormFieldProps) {
  return (
    <div className="form-group">
      <label htmlFor={id}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      {React.cloneElement(children, {
        id,
        "aria-required": required,
        "aria-invalid": !!error,
        "aria-describedby": error ? `${id}-error` : undefined,
      })}
      {error && (
        <span id={`${id}-error`} role="alert" className="field-error">
          {error}
        </span>
      )}
    </div>
  );
}

// ✅ Uso
<FormField id="email" label="Email" error={errors.email?.message} required>
  <input type="email" {...register("email")} />
</FormField>
```

**Critérios de Conclusão:**
- [ ] Componente `FormField` criado
- [ ] Usado nos formulários de cadastro, login, advertência, curso
- [ ] Acessibilidade integrada (aria-invalid, aria-describedby)

---

### AUD-R5-03 — Criar componente Button reutilizável

**Severidade:** Média
**Arquivos:** Formulários e ações do frontend

**Problema:**
Botões têm estilos e comportamentos inconsistentes entre páginas. Alguns não desabilitam durante loading.

**Solução:**
```tsx
// ✅ frontend/components/Button.tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  isLoading?: boolean;
  children: React.ReactNode;
}

export function Button({
  variant = "primary",
  isLoading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      className={`btn btn-${variant} ${props.className ?? ""}`}
    >
      {isLoading ? <span aria-hidden="true">...</span> : children}
      {isLoading && <span className="sr-only">Carregando</span>}
    </button>
  );
}
```

**Critérios de Conclusão:**
- [ ] Componente `Button` criado
- [ ] Variantes: `primary`, `secondary`, `danger`, `ghost`
- [ ] Estado de loading com `aria-busy`
- [ ] Aplicado em formulários principais

---

### AUD-R5-04 — Refatorar estado fragmentado com useReducer

**Severidade:** Média
**Arquivos:** `frontend/app/usuarios/page.tsx`, `frontend/app/advertencias/page.tsx`

**Problema:**
Páginas têm 10-15 `useState` gerenciando um formulário, tornando o código difícil de ler e propenso a bugs.

**Solução:**
```typescript
// ✅ Exemplo — usuarios/page.tsx
type MemberFormState = {
  name: string;
  email: string;
  cpf: string;
  role: string;
  password: string;
  phone: string;
};

type MemberFormAction =
  | { type: "SET_FIELD"; field: keyof MemberFormState; value: string }
  | { type: "RESET" };

const initialState: MemberFormState = {
  name: "", email: "", cpf: "", role: "", password: "", phone: "",
};

function memberFormReducer(state: MemberFormState, action: MemberFormAction): MemberFormState {
  switch (action.type) {
    case "SET_FIELD":
      return { ...state, [action.field]: action.value };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

// Na página:
const [form, dispatch] = useReducer(memberFormReducer, initialState);
// dispatch({ type: "SET_FIELD", field: "email", value: e.target.value });
// dispatch({ type: "RESET" });
```

**Critérios de Conclusão:**
- [ ] `usuarios/page.tsx` usa `useReducer` para estado do formulário
- [ ] `advertencias/page.tsx` usa `useReducer`
- [ ] Estado de UI (modal aberto, loading, erro) separado do estado de formulário

---

### AUD-R5-05 — Adicionar ErrorBoundary global

**Severidade:** Média
**Arquivos:** `frontend/app/layout.tsx`

**Problema:**
Erros em runtime (ex: resposta inesperada da API) derrubam toda a página sem mensagem amigável.

**Solução:**
```tsx
// ✅ frontend/components/ErrorBoundary.tsx
import { Component, ReactNode } from "react";

interface State { hasError: boolean; error?: Error; }

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" className="error-boundary">
          <h2>Algo deu errado</h2>
          <p>Tente recarregar a página. Se o problema persistir, contate o suporte.</p>
          <button onClick={() => this.setState({ hasError: false })}>
            Tentar novamente
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ✅ frontend/app/layout.tsx
import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ErrorBoundary>{children}</ErrorBoundary>
      </body>
    </html>
  );
}
```

**Critérios de Conclusão:**
- [ ] `ErrorBoundary` criado e aplicado no layout raiz
- [ ] Mensagem amigável com opção de "tentar novamente"
- [ ] Erro logado (console ou serviço futuro)

---

### AUD-R5-06 — Consolidar estilos CSS e ativar Tailwind ou remover

**Severidade:** Média
**Arquivos:** `frontend/app/globals.css`, `frontend/app/*/page.css`

**Problema:**
- Tailwind CSS instalado mas não usado
- Cada página tem um `page.css` separado com estilos que se repetem
- Difícil de manter consistência visual

**Decisão a tomar:**
**Opção A:** Remover Tailwind e consolidar em `globals.css`
**Opção B:** Migrar para Tailwind e remover `page.css` files

**Solução (Opção A — menor esforço):**
```bash
cd frontend && npm uninstall tailwindcss autoprefixer postcss
rm frontend/tailwind.config.ts
rm frontend/postcss.config.js
```

Mover estilos de componentes comuns (modal, form-group, btn) para `globals.css` com comentários de seção:
```css
/* === COMPONENTES === */

/* Modal */
.modal-overlay { ... }
.modal { ... }

/* Formulários */
.form-group { ... }
.field-error { ... }

/* Botões */
.btn { ... }
.btn-primary { ... }
```

**Critérios de Conclusão:**
- [ ] Decisão tomada (Opção A ou B)
- [ ] `globals.css` organizado por seção com comentários
- [ ] Estilos duplicados entre `page.css` extraídos para `globals.css`
- [ ] Build sem warnings de CSS

---

## Estrutura de Arquivos Proposta

```
frontend/
  components/
    Modal.tsx          ← AUD-R5-01
    FormField.tsx      ← AUD-R5-02
    Button.tsx         ← AUD-R5-03
    ErrorBoundary.tsx  ← AUD-R5-05
  lib/
    useFocusTrap.ts    ← da Sprint 3
    hooks/
      useMembers.ts    ← da Sprint 4
      useWarnings.ts   ← da Sprint 4
      useCourses.ts    ← da Sprint 4
```

---

## Checklist de Conclusão da Sprint

- [x] AUD-R5-01 — Componente Modal (`frontend/components/Modal.tsx`) — integrado em `advertencias/page.tsx`
- [x] AUD-R5-02 — Componente FormField (`frontend/components/FormField.tsx`)
- [x] AUD-R5-03 — Componente Button (`frontend/components/Button.tsx`)
- [x] AUD-R5-04 — useReducer nos formulários (`advertencias` e `usuarios`)
- [x] AUD-R5-05 — ErrorBoundary (`frontend/components/ErrorBoundary.tsx`) no layout raiz
- [x] AUD-R5-06 — CSS consolidado (`.field-error`, `.text-error`, `.sr-only`, tamanhos de modal adicionados a `globals.css`)
- [x] Build sem erros TypeScript
- [x] Comportamento das páginas idêntico ao anterior

---

**Sprint Anterior:** [Sprint 4 — Performance](sprint-4-performance.md)
**Início:** [README da Auditoria](README.md)
