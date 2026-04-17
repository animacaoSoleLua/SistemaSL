# 🎨 Quick Reference - Design System

Guia rápido para usar o Design System em novas páginas.

## 📋 Resumo Executivo

**Cores Principais:**
- `--color-navy: #1a2744` (Texto, primário)
- `--color-gold: #d4a574` (Accent, highlights)
- `--color-slate: #64748b` (Texto secundário)
- `--color-slate-light: #f1f5f9` (Backgrounds)

**Fonts:**
- Títulos: `'Playfair Display', serif` (600, 700)
- Corpo: `'Geist', sans-serif` (400, 500, 600)

**Animação padrão:** `0.3s cubic-bezier(0.4, 0, 0.2, 1)`

---

## 🚀 Como Usar em uma Nova Página

### Passo 1: Copiar Template CSS
```bash
cp frontend/styles/design-system-template.css frontend/app/sua-pagina/page.css
```

### Passo 2: Importar no Componente
```tsx
import './page.css';
import { FiEye, FiEdit2, FiTrash2 } from 'react-icons/fi';

export default function SuaPagina() {
  return (
    <div>
      {/* Use classes do template */}
    </div>
  );
}
```

### Passo 3: Estrutura Básica
```tsx
// Stat Cards
<div className="stats">
  <div className="stat">
    <span>Label</span>
    <strong>42</strong>
  </div>
</div>

// List Items
<article className="report-item">
  <div className="report-meta">
    <strong className="report-name">Título</strong>
    <span className="report-date">Meta</span>
  </div>
  <div className="course-actions">
    <button className="enrolled-button">
      <FiUsers size={14} /> 25
    </button>
    <button className="button-secondary">
      <FiEye size={14} /> Detalhes
    </button>
    <button className="button-secondary">
      <FiEdit2 size={14} /> Editar
    </button>
    <button className="button-danger">
      <FiTrash2 size={14} /> Apagar
    </button>
  </div>
</article>
```

---

## 🎯 Componentes Principais

### Stat Cards
```css
.stat { /* Fundo gradiente, hover elevação */ }
.stat::before { /* Linha de ouro no topo */ }
.stat strong { /* Playfair Display, tamanho 28px */ }
```

### List Items
```css
.report-item { /* Gradiente, barra lateral em hover */ }
.report-name { /* Playfair Display, 16px */ }
.report-date { /* Slate color, 13px */ }
.course-actions { /* Flex container para botões */ }
```

### Buttons
| Class | Uso | Hover |
|-------|-----|-------|
| `.button-secondary` | Ações secundárias | Background + elevação |
| `.button-danger` | Delete/destrutivo | Vermelho mais intenso |
| `.enrolled-button` | Info/accent | Fundo gold + shimmer |
| `.button-ghost` | Minimal | Discreto |

### Status Pills
```html
<span class="status-pill active">Active</span>
<span class="status-pill inactive">Inactive</span>
```

### Forms
```html
<div class="form-group">
  <label class="form-label">Nome</label>
  <input type="text" class="form-input" />
</div>
```

---

## 🎨 Cores por Contexto

### Light Mode (Padrão)
```css
Primário:    var(--color-navy)        /* #1a2744 */
Accent:      var(--color-gold)        /* #d4a574 */
Secundário:  var(--color-slate)       /* #64748b */
Background:  var(--color-slate-light) /* #f1f5f9 */
```

### Dark Mode (body.theme-purple)
```css
Primário:    #f1f5f9                  /* Texto claro */
Accent:      #d4a574                  /* Mantém gold */
Secundário:  #94a3b8                  /* Slate claro */
Background:  #0f1729, #1e293b         /* Navy escuro */
```

---

## 📏 Spacing Cheat Sheet

| Tamanho | Uso |
|---------|-----|
| 4px | Mínimo, gaps entre ícones |
| 6px | Gap ícone + label em botões |
| 8px | Botões pequenos, gaps |
| 10px | Padding em pills |
| 12px | Inputs, card padding pequeno |
| 14px | Gap entre elementos |
| 16px | Gaps padrão, padding cards |
| 20px | Card padding padrão |
| 24px | Card padding grande, padding-x |

---

## ⚡ Animações Padrão

```css
/* Smooth transition */
transition: all 0.2s ease;

/* Cubic bezier (preferido) */
transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

/* Hover transform */
transform: translateY(-1px);  /* Cards: -2px */

/* Modal slide up */
@keyframes slideUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
```

---

## 🌙 Dark Mode - Template

Copie isto para cada componente novo:

```css
/* Light Mode */
.my-component {
  background: var(--color-slate-light);
  color: var(--color-navy);
  border: 1px solid rgba(26, 39, 68, 0.08);
}

/* Dark Mode */
body.theme-purple .my-component {
  background: rgba(26, 39, 68, 0.3);
  color: #f1f5f9;
  border: 1px solid rgba(212, 165, 116, 0.15);
}
```

---

## 📱 Responsive Breakpoints

```css
/* Tablets (960px) */
@media (max-width: 960px) {
  .stats { grid-template-columns: repeat(2, 1fr); }
  .report-item { flex-direction: column; }
}

/* Mobile (480px) */
@media (max-width: 480px) {
  .report-item { padding: 12px; gap: 10px; }
  .course-actions { width: 100%; flex-wrap: wrap; }
}
```

---

## 🔧 Customização Rápida

### Mudar Accent Color
```css
:root {
  --color-gold: #seu-cor-aqui;
}
```

### Modificar Border Radius
```css
/* Antes */
border-radius: 12px;
/* Depois */
border-radius: 10px; /* ou 8px, 6px */
```

### Ajustar Sombra de Hover
```css
/* Padrão */
box-shadow: 0 12px 32px rgba(26, 39, 68, 0.1);
/* Mais sutil */
box-shadow: 0 4px 12px rgba(26, 39, 68, 0.08);
```

---

## ✅ Checklist de Implementação

- [ ] Copiar `design-system-template.css`
- [ ] Importar fonts (Playfair Display + Geist)
- [ ] Adicionar CSS variables ao `:root`
- [ ] Implementar componentes principais
- [ ] Adicionar dark mode overrides
- [ ] Testar em 960px, 600px, 480px
- [ ] Verificar contraste em dark mode
- [ ] Adicionar ícones aos botões
- [ ] Testar hover states
- [ ] Verificar animações

---

## 🐛 Troubleshooting

**Botões não flutuam em hover?**
→ Adicione `transform: translateY(-1px);` no `:hover`

**Dark mode não funciona?**
→ Verifique se há `body.theme-purple .classe { ... }` override

**Cores ficam erradas?**
→ Use `var(--color-navy)` em vez de hex direto

**Inputs não focam bem?**
→ Use `box-shadow: 0 0 0 3px rgba(212, 165, 116, 0.1);`

**Mobile quebrado?**
→ Verifique media queries em 960px, 600px, 480px

---

## 📚 Arquivos Relacionados

- **DESIGN_SYSTEM.md** - Documentação completa
- **design-system-template.css** - Template CSS reutilizável
- **app/cursos/page.css** - Exemplo real de implementação

---

## 💡 Dicas Profissionais

1. **Sempre use CSS variables** - Facilita manutenção global
2. **Copie o template first** - Não reinvente a roda
3. **Dark mode desde o início** - Não é pós-venda
4. **Icons com labels** - `gap: 6px` padrão
5. **Transitions: cubic-bezier** - Mais natural que `ease`
6. **Test in mobile** - <960px, <600px, <480px
7. **Use rgba com opacity** - Melhor que hex puro
8. **Siga padding scale** - 4, 8, 12, 16, 20, 24px

---

**Last Updated:** 2026-04-14  
**Version:** 1.0
