# Sprint 3 — Acessibilidade

**Prioridade:** Alta
**Status:** Concluída
**Conformidade alvo:** WCAG 2.1 Nível AA

---

## Objetivo

Tornar o sistema utilizável por pessoas com deficiência visual, motora ou cognitiva, atingindo conformidade WCAG 2.1 AA nas telas principais.

---

## Referência Rápida WCAG

| Critério | Nível | Descrição |
|----------|-------|-----------|
| 1.1.1 | A | Todo conteúdo não textual tem alternativa textual |
| 1.3.1 | A | Informação e relações transmitidas por apresentação também por código |
| 1.4.3 | AA | Contraste mínimo 4.5:1 para texto normal |
| 2.1.1 | A | Todo conteúdo operável por teclado |
| 2.4.3 | A | Foco segue ordem lógica |
| 4.1.2 | A | Nome, função, valor para todos os componentes de UI |

---

## Tarefas

### AUD-S3-01 — Associar labels a todos os campos de formulário

**Severidade:** Crítica
**Arquivos:** Todas as páginas com formulários

**Problema:**
Muitos inputs não têm `<label>` associado. Leitores de tela não conseguem identificar o campo.

```tsx
// ❌ Atual — sem label
<input type="email" placeholder="Email" />

// ❌ Atual — label sem htmlFor
<label>Email</label>
<input type="email" />
```

**Solução:**
```tsx
// ✅ Label com htmlFor + id no input
<label htmlFor="login-email">Email</label>
<input
  id="login-email"
  type="email"
  autoComplete="email"
  aria-required="true"
/>

// ✅ Alternativa com aria-label (quando sem label visual)
<input
  type="search"
  aria-label="Buscar membro pelo nome"
  placeholder="Buscar..."
/>
```

**Páginas a corrigir:**
- [ ] `login/page.tsx` — email, senha
- [ ] `cadastro/page.tsx` — todos os campos
- [ ] `advertencias/page.tsx` — campos do modal
- [ ] `cursos/page.tsx` — campos do modal
- [ ] `usuarios/page.tsx` — campos do modal
- [ ] `perfil/page.tsx` — campos de edição
- [ ] `tela-recuperacao/page.tsx`
- [ ] `tela-redefinicao/page.tsx`

**Critérios de Conclusão:**
- [ ] Cada `<input>` e `<select>` tem `<label htmlFor>` correspondente ou `aria-label`
- [ ] Campos obrigatórios têm `aria-required="true"`
- [ ] Validação com leitor de tela (NVDA/VoiceOver) confirma leitura correta

---

### AUD-S3-02 — Corrigir contraste de cores (WCAG 1.4.3)

**Severidade:** Alta
**Arquivos:** `frontend/app/globals.css`

**Problema:**
A cor `muted` (`#6b617d`) sobre fundo `paper` (`#f6f4fb`) tem contraste de ~3.8:1, abaixo do mínimo 4.5:1.

**Verificar e corrigir:**
```css
/* ❌ Atual — contraste insuficiente */
--color-muted: #6b617d;    /* ~3.8:1 em paper */
--color-paper: #f6f4fb;

/* ✅ Escurecer muted para atingir 4.5:1+ */
--color-muted: #524865;    /* ~5.2:1 em paper — verificar com contrast checker */
```

**Outras cores a verificar:**
- Texto de placeholder (`::placeholder`)
- Rótulos desabilitados
- Texto em botões secundários
- Badges de status (ativo/inativo)

**Ferramenta:** https://webaim.org/resources/contrastchecker/

**Critérios de Conclusão:**
- [ ] Todas as combinações de texto+fundo têm contraste ≥ 4.5:1 (texto normal)
- [ ] Textos grandes (18px+ ou 14px+ bold) têm contraste ≥ 3:1
- [ ] Placeholders têm contraste ≥ 3:1
- [ ] Testar tema claro e escuro (`theme-purple`)

---

### AUD-S3-03 — Implementar focus trap em modais

**Severidade:** Alta
**Arquivos:** `frontend/app/usuarios/page.tsx`, `frontend/app/advertencias/page.tsx`, `frontend/app/cursos/page.tsx`

**Problema:**
Ao abrir um modal, o foco não fica preso dentro dele. O usuário pode tabular para elementos por baixo do overlay.

**Solução:**
```tsx
// ✅ Hook reutilizável — frontend/lib/useFocusTrap.ts
import { useEffect, useRef } from "react";

export function useFocusTrap(active: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active || !containerRef.current) return;

    const focusable = containerRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    first?.focus();

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.();
    };

    document.addEventListener("keydown", handleTab);
    document.addEventListener("keydown", handleEsc);

    return () => {
      document.removeEventListener("keydown", handleTab);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [active]);

  return containerRef;
}

// ✅ Uso no modal
function Modal({ isOpen, onClose, title, children }) {
  const ref = useFocusTrap(isOpen);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      ref={ref}
    >
      <h2 id="modal-title">{title}</h2>
      {children}
      <button onClick={onClose}>Fechar</button>
    </div>
  );
}
```

**Critérios de Conclusão:**
- [ ] Hook `useFocusTrap` criado em `frontend/lib/useFocusTrap.ts`
- [ ] Foco vai para o primeiro campo ao abrir o modal
- [ ] Tab fica preso dentro do modal
- [ ] ESC fecha o modal
- [ ] Foco retorna ao botão que abriu o modal ao fechar
- [ ] Aplicado em todos os modais do sistema

---

### AUD-S3-04 — Adicionar aria-label em ícones interativos

**Severidade:** Alta
**Arquivos:** Todas as páginas

**Problema:**
Botões com apenas ícone (sem texto) não têm descrição para leitores de tela.

```tsx
// ❌ Atual
<button onClick={handleDelete}>
  <FiTrash2 />
</button>

// ❌ Ícone com aria-hidden mas sem alternativa
<FiFileText aria-hidden="true" />
```

**Solução:**
```tsx
// ✅ Botão com aria-label
<button onClick={handleDelete} aria-label={`Excluir membro ${member.name}`}>
  <FiTrash2 aria-hidden="true" />
</button>

// ✅ Ícone decorativo — sempre aria-hidden
<FiFileText aria-hidden="true" />
<span>Relatórios</span>  {/* texto visível já descreve */}
```

**Critérios de Conclusão:**
- [ ] Todos os botões sem texto visível têm `aria-label` descritivo
- [ ] Todos os ícones puramente decorativos têm `aria-hidden="true"`
- [ ] Ícones com significado semântico têm `role="img"` e `aria-label`

---

### AUD-S3-05 — Semântica HTML — fieldset, legend, nav

**Severidade:** Média
**Arquivos:** Formulários, menu lateral

**Problema:**
Formulários com múltiplos grupos de campos não usam `<fieldset>`/`<legend>`. O menu lateral não usa `<nav>`.

**Solução:**
```tsx
// ✅ Formulário de cadastro
<form>
  <fieldset>
    <legend>Dados pessoais</legend>
    <label htmlFor="name">Nome</label>
    <input id="name" type="text" />
    <label htmlFor="cpf">CPF</label>
    <input id="cpf" type="text" />
  </fieldset>

  <fieldset>
    <legend>Acesso</legend>
    <label htmlFor="email">Email</label>
    <input id="email" type="email" />
    <label htmlFor="password">Senha</label>
    <input id="password" type="password" />
  </fieldset>
</form>

// ✅ Menu lateral
<nav aria-label="Menu principal">
  <ul>
    <li><a href="/dashboard">Dashboard</a></li>
    <li><a href="/usuarios">Usuários</a></li>
    ...
  </ul>
</nav>
```

**Critérios de Conclusão:**
- [ ] Menu lateral usa `<nav aria-label="Menu principal">`
- [ ] Formulários com múltiplos grupos usam `<fieldset>` e `<legend>`
- [ ] Listas de itens usam `<ul>` ou `<ol>` com `<li>`
- [ ] Cabeçalhos seguem hierarquia correta (h1 > h2 > h3)

---

### AUD-S3-06 — Mensagens de erro acessíveis

**Severidade:** Média
**Arquivos:** Formulários frontend

**Problema:**
Erros de validação não são anunciados por leitores de tela automaticamente.

**Solução:**
```tsx
// ✅ Usar role="alert" para anúncio automático
{errors.email && (
  <span
    role="alert"
    aria-live="polite"
    id="email-error"
    className="field-error"
  >
    {errors.email.message}
  </span>
)}

<input
  id="email"
  type="email"
  aria-describedby={errors.email ? "email-error" : undefined}
  aria-invalid={!!errors.email}
/>
```

**Critérios de Conclusão:**
- [ ] Mensagens de erro com `role="alert"` ou `aria-live="polite"`
- [ ] Input com `aria-invalid="true"` quando inválido
- [ ] Input com `aria-describedby` apontando para o erro
- [ ] Erro de formulário global (ex: "credenciais inválidas") também anunciado

---

### AUD-S3-07 — Indicar página/seção atual no menu

**Severidade:** Baixa
**Arquivos:** Layout/menu lateral

**Problema:**
O item de menu ativo não tem indicação semântica — apenas visual.

**Solução:**
```tsx
// ✅ Usando aria-current
<nav aria-label="Menu principal">
  <a href="/dashboard" aria-current={pathname === "/dashboard" ? "page" : undefined}>
    Dashboard
  </a>
  <a href="/usuarios" aria-current={pathname === "/usuarios" ? "page" : undefined}>
    Usuários
  </a>
</nav>
```

**Critérios de Conclusão:**
- [ ] Item ativo no menu tem `aria-current="page"`
- [ ] Estilo visual do item ativo não depende apenas de cor

---

## Ferramentas de Teste

| Ferramenta | Como usar |
|------------|-----------|
| axe DevTools | Extensão Chrome/Firefox — analisa a página |
| NVDA (Windows) | Leitor de tela gratuito |
| VoiceOver (Mac/iOS) | Cmd+F5 para ativar |
| Keyboard only | Navegar sem mouse, verificar Tab/Shift+Tab/Enter/Esc |
| Contrast Checker | https://webaim.org/resources/contrastchecker/ |

---

## Checklist de Conclusão da Sprint

- [x] AUD-S3-01 — Labels em todos os inputs
- [x] AUD-S3-02 — Contraste mínimo 4.5:1
- [x] AUD-S3-03 — Focus trap em modais
- [x] AUD-S3-04 — aria-label em ícones interativos
- [x] AUD-S3-05 — Semântica HTML (fieldset, nav)
- [x] AUD-S3-06 — Mensagens de erro acessíveis
- [x] AUD-S3-07 — aria-current no menu
- [ ] Testar com axe DevTools — zero erros críticos
- [ ] Testar navegação completa com teclado

---

**Sprint Anterior:** [Sprint 2 — Validação](sprint-2-validacao.md)
**Próxima Sprint:** [Sprint 4 — Performance](sprint-4-performance.md)
