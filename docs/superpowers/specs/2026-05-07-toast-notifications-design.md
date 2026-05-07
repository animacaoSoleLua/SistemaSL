# Toast Notifications — Design Spec

**Date:** 2026-05-07
**Status:** Approved

## Problem

Errors de submit aparecem como `<p className="text-red-500">` inline no final de formulários longos. O usuário frequentemente não percebe o erro porque precisa rolar a página para baixo. Não há feedback visual de sucesso.

## Objetivo

Substituir os erros de submit (e adicionar feedbacks de sucesso) por um sistema de toast flutuante no canto superior direito, com auto-dismiss em 3 segundos e fechamento manual.

## Escopo

**Incluído:**
- Erros de submit/ação (ex: falha ao salvar relatório, falha ao alterar senha)
- Mensagens de sucesso de submit (ex: relatório salvo, senha alterada)

**Excluído:**
- Erros de carregamento de dados (ex: "Erro ao carregar membros") — esses permanecem inline
- Erros de validação de campo — esses permanecem próximos ao campo

## Arquitetura

### Novos arquivos

**`frontend/app/context/ToastContext.tsx`**

Context com:
- Estado: `toasts: Toast[]` onde `Toast = { id: string; message: string; type: "error" | "success" }`
- `showToast(message: string, type: "error" | "success")` — adiciona toast com id único e agenda remoção em 3000ms
- `dismissToast(id: string)` — remove toast imediatamente
- `<ToastProvider>` exporta o context e renderiza `<ToastContainer>` internamente

**`frontend/components/Toast.tsx`**

Componente de apresentação puro. Recebe a lista de toasts e o callback `onDismiss`. Renderiza no `document.body` via `createPortal` para garantir `z-index` acima de modais.

**`frontend/components/Toast.css`**

Estilos para o container flutuante e para cada item de toast. Reutiliza variáveis e tokens do design system existente (mesmas cores e bordas do `.alert-card.error` / `.alert-card.success`).

### Modificações em arquivos existentes

**`frontend/app/layout.tsx`**
- Adicionar `<ToastProvider>` envolvendo `<AppShell>`

**Páginas com erros de submit** (substituição de padrão):

| Arquivo | States a remover | Substituição |
|---|---|---|
| `app/novo-relatorio/page.tsx` | `submitError` | `showToast(..., "error")` |
| `app/configuracoes/seguranca/page.tsx` | `emailError`, `passwordError` | `showToast(..., "error/success")` |
| `app/cursos/page.tsx` | `formError`, `importFormError` | `showToast(..., "error/success")` |
| `app/advertencias/page.tsx` | `createError`, `actionError` | `showToast(..., "error/success")` |
| `app/feedbacks/page.tsx` | `createError` | `showToast(..., "error/success")` |
| `app/usuarios/page.tsx` | `actionError`, `cpfActionError` | `showToast(..., "error/success")` |

Para cada página: remover o `useState` do erro, remover o `<p>` ou `<div>` de erro do JSX, e substituir o `setXxxError(...)` por `showToast(...)`.

## Visual

```
┌─────────────────────────────────────────────┐  ← fixed, top-right
│  [✗]  Mensagem de erro aqui             [×] │  ← error (fundo #fff4f4)
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│  [✓]  Operação realizada com sucesso    [×] │  ← success (fundo #f1fbf4)
└─────────────────────────────────────────────┘
```

- Posição: `position: fixed; top: 24px; right: 24px`
- Z-index: acima de modais (ex: 9999)
- Múltiplos toasts empilham verticalmente com `gap: 8px`
- Auto-dismiss: 3000ms
- Fechamento manual: botão × no canto do card

## Fluxo de dados

```
Página chama showToast("msg", "error")
  → ToastContext adiciona { id: uuid, message, type } à lista
  → setTimeout 3s → dismissToast(id)
  → ToastContainer re-renderiza via portal
  → Usuário vê o toast no canto superior direito
  → Pode fechar manualmente clicando no ×
```

## Acessibilidade

- Container com `role="region"` e `aria-label="Notificações"`
- Cada toast com `role="alert"` e `aria-live="assertive"` (erros) ou `aria-live="polite"` (sucesso)
