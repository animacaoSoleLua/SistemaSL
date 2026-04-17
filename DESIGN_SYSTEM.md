# 🎨 Design System - SistemaSL

Documento de referência para manter consistência visual em todo o sistema.

## 📋 Índice
1. [Palette de Cores](#palette-de-cores)
2. [Tipografia](#tipografia)
3. [Componentes](#componentes)
4. [Animações](#animações)
5. [Dark Mode](#dark-mode)
6. [Espaçamento](#espaçamento)
7. [Exemplos de Uso](#exemplos-de-uso)

---

## 🎨 Palette de Cores

### CSS Variables (Root)
```css
:root {
  --color-navy: #1a2744;           /* Texto principal, elementos primários */
  --color-gold: #d4a574;           /* Accent color, highlights */
  --color-slate: #64748b;          /* Texto secundário, muted */
  --color-slate-light: #f1f5f9;    /* Backgrounds suaves, hover states */
  --color-navy-light: #f8fafc;     /* Backgrounds leves */
}
```

### Status Colors
```css
/* Success / Active */
background: rgba(34, 197, 94, 0.1);    /* Verde #22c55e */
color: #16a34a;
border-color: rgba(34, 197, 94, 0.2);

/* Danger / Destructive */
background: rgba(239, 68, 68, 0.1);    /* Vermelho #ef4444 */
color: #dc2626;
border-color: rgba(239, 68, 68, 0.2);

/* Inactive / Disabled */
background: rgba(107, 114, 128, 0.1);  /* Cinza #6b7280 */
color: #6b7280;
border-color: rgba(107, 114, 128, 0.2);
```

### Dark Mode Override
```css
body.theme-purple {
  --color-navy: #0f1729;
  --color-gold: #d4a574;
  --color-slate: #94a3b8;
  --color-slate-light: #1e293b;
  --color-navy-light: #0f1729;
}
```

---

## 🔤 Tipografia

### Imports
```css
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Geist:wght@400;500;600&display=swap');
```

### Font Families

**Display (Títulos, Destaque)**
```css
font-family: 'Playfair Display', serif;
font-weight: 600 | 700;
/* Uso: Stats numbers, course titles, section headers */
```

**Body (Texto Regular)**
```css
font-family: 'Geist', sans-serif;
font-weight: 400 | 500 | 600;
/* Uso: Labels, descriptions, buttons, body text */
```

### Font Sizes
```css
/* Display */
font-size: 28px;  /* Large headlines (stats) */
font-size: 24px;  /* Section titles */
font-size: 16px;  /* Card titles */

/* Body */
font-size: 14px;  /* Body text, form inputs */
font-size: 13px;  /* Labels, secondary text */
font-size: 12px;  /* Small labels, badges */
font-size: 11px;  /* Uppercase labels */
```

---

## 🧩 Componentes

### 1. Stat Cards
```css
.stat {
  background: linear-gradient(135deg, var(--color-navy-light) 0%, rgba(212, 165, 116, 0.03) 100%);
  border-radius: 12px;
  padding: 24px;
  border: 1px solid rgba(212, 165, 116, 0.15);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.stat::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--color-gold), transparent);
  opacity: 0.6;
}

.stat:hover {
  border-color: rgba(212, 165, 116, 0.3);
  box-shadow: 0 8px 24px rgba(26, 39, 68, 0.08);
  transform: translateY(-2px);
}

.stat strong {
  font-size: 28px;
  font-weight: 700;
  font-family: 'Playfair Display', serif;
  color: var(--color-navy);
}
```

### 2. Card Items (List)
```css
.report-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 20px 24px;
  border-radius: 12px;
  border: 1px solid rgba(26, 39, 68, 0.08);
  background: linear-gradient(135deg, var(--color-navy-light) 0%, rgba(212, 165, 116, 0.02) 100%);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.report-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: linear-gradient(180deg, var(--color-gold), transparent);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.report-item:hover {
  border-color: rgba(212, 165, 116, 0.25);
  box-shadow: 0 12px 32px rgba(26, 39, 68, 0.1);
  transform: translateY(-2px);
}

.report-item:hover::before {
  opacity: 1;
}

.report-name {
  font-weight: 600;
  font-size: 16px;
  font-family: 'Playfair Display', serif;
  color: var(--color-navy);
}

.report-date {
  font-size: 13px;
  color: var(--color-slate);
}
```

### 3. Buttons - Secondary
```css
.button-secondary {
  background: transparent;
  color: var(--color-slate);
  border: 1.5px solid rgba(26, 39, 68, 0.2);
  box-shadow: none;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
}

.button-secondary svg {
  width: 14px;
  height: 14px;
  stroke-width: 2;
}

.button-secondary:hover:not(:disabled) {
  background: rgba(26, 39, 68, 0.04);
  border-color: rgba(26, 39, 68, 0.3);
  box-shadow: none;
  filter: none;
  transform: translateY(-1px);
}
```

### 4. Buttons - Danger
```css
.button-danger {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
  border: 1.5px solid rgba(239, 68, 68, 0.2);
  box-shadow: none;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  padding: 8px 12px;
  border-radius: 8px;
}

.button-danger svg {
  width: 14px;
  height: 14px;
  stroke-width: 2;
}

.button-danger:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.3);
  transform: translateY(-1px);
}
```

### 5. Buttons - Enrolled/Accent
```css
.enrolled-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 8px;
  border: 1.5px solid rgba(212, 165, 116, 0.3);
  background: rgba(212, 165, 116, 0.08);
  color: var(--color-gold);
  font-weight: 500;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  white-space: nowrap;
}

.enrolled-button::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, transparent 100%);
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
}

.enrolled-button:hover {
  background: rgba(212, 165, 116, 0.15);
  border-color: rgba(212, 165, 116, 0.5);
  box-shadow: 0 4px 12px rgba(212, 165, 116, 0.1);
  transform: translateY(-1px);
}

.enrolled-button:hover::before {
  opacity: 1;
}

.enrolled-button svg {
  flex-shrink: 0;
  stroke-width: 2;
  width: 14px;
  height: 14px;
}
```

### 6. Status Pills
```css
.status-pill {
  display: inline-flex;
  align-items: center;
  padding: 5px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  background: rgba(26, 39, 68, 0.08);
  color: var(--color-slate);
  border: 1px solid rgba(26, 39, 68, 0.12);
}

.status-pill.active {
  background: rgba(34, 197, 94, 0.1);
  color: #16a34a;
  border-color: rgba(34, 197, 94, 0.2);
}

.status-pill.inactive {
  background: rgba(107, 114, 128, 0.1);
  color: #6b7280;
  border-color: rgba(107, 114, 128, 0.2);
}
```

### 7. Form Inputs
```css
.form-input {
  padding: 12px 14px;
  border-radius: 8px;
  border: 1.5px solid rgba(26, 39, 68, 0.12);
  background: var(--color-slate-light);
  font-size: 14px;
  font-weight: 400;
  color: var(--color-navy);
  font-family: inherit;
  width: 100%;
  transition: border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
}

.form-input::placeholder {
  color: var(--color-slate);
}

.form-input:focus {
  outline: none;
  border-color: rgba(212, 165, 116, 0.4);
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(212, 165, 116, 0.1);
}
```

### 8. Search Input / List Container
```css
.search-input,
.members-list,
.member-search-results {
  border: 1.5px solid rgba(26, 39, 68, 0.12);
  border-radius: 10px;
  background: var(--color-slate-light);
  scrollbar-width: thin;
  scrollbar-color: rgba(26, 39, 68, 0.1) transparent;
}

.member-item {
  padding: 12px 14px;
  border-bottom: 1px solid rgba(26, 39, 68, 0.08);
  font-size: 14px;
  color: var(--color-navy);
  transition: background 0.12s ease;
}

.member-item:hover {
  background-color: rgba(212, 165, 116, 0.06);
}
```

---

## ⚡ Animações

### Transições Padrão
```css
/* Hover suave */
transition: all 0.2s ease;

/* Elevação com cubic-bezier */
transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

/* Smooth fade */
transition: opacity 0.2s ease;
```

### Efeito Slide Up (Modais)
```css
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-card {
  animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
```

### Shimmer Animation (Importação)
```css
@keyframes import-shimmer {
  0%   { background-position: 0% 0%; }
  50%  { background-position: 100% 0%; }
  100% { background-position: 0% 0%; }
}

.import-modal::before {
  background: linear-gradient(90deg, var(--color-gold) 0%, rgba(212, 165, 116, 0.6) 50%, var(--color-gold) 100%);
  background-size: 200% 100%;
  animation: import-shimmer 3s ease infinite;
}
```

### Hover Transforms
```css
/* Elevação padrão */
.button:hover {
  transform: translateY(-1px);
}

/* Cards */
.card:hover {
  transform: translateY(-2px);
}
```

---

## 🌙 Dark Mode

### Aplicar em Todos os Componentes
```css
body.theme-purple {
  /* Backgrounds */
  --color-navy: #0f1729;
  --color-slate-light: #1e293b;
}

/* Stat Cards */
body.theme-purple .stat {
  background: linear-gradient(135deg, rgba(26, 39, 68, 0.6) 0%, rgba(212, 165, 116, 0.05) 100%);
  border-color: rgba(212, 165, 116, 0.2);
}

body.theme-purple .stat strong {
  color: #d4a574;
}

/* Report Items */
body.theme-purple .report-item {
  background: linear-gradient(135deg, rgba(26, 39, 68, 0.5) 0%, rgba(212, 165, 116, 0.03) 100%);
  border-color: rgba(212, 165, 116, 0.15);
}

body.theme-purple .report-item:hover {
  border-color: rgba(212, 165, 116, 0.25);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
}

body.theme-purple .report-name {
  color: #f1f5f9;
}

body.theme-purple .report-date {
  color: #94a3b8;
}

/* Form Inputs */
body.theme-purple .form-input {
  background: rgba(26, 39, 68, 0.3);
  border-color: rgba(212, 165, 116, 0.2);
  color: #f1f5f9;
}

body.theme-purple .form-input:focus {
  border-color: rgba(212, 165, 116, 0.4);
  background: rgba(26, 39, 68, 0.5);
}

/* Buttons */
body.theme-purple .enrolled-button {
  border-color: rgba(212, 165, 116, 0.3);
  background: rgba(212, 165, 116, 0.1);
  color: #d4a574;
}

body.theme-purple .enrolled-button:hover {
  background: rgba(212, 165, 116, 0.16);
  border-color: rgba(212, 165, 116, 0.4);
  box-shadow: 0 4px 12px rgba(212, 165, 116, 0.15);
}
```

---

## 📏 Espaçamento

### Gaps & Padding Padrão
```css
/* Cards e containers grandes */
padding: 24px;
gap: 24px;

/* Cards e elementos médios */
padding: 20px;
gap: 16px;

/* Elementos pequenos */
padding: 12px 14px;
gap: 8px;

/* Ícones com labels */
gap: 6px;

/* Componentes muito pequenos */
padding: 5px 10px;
gap: 4px;
```

### Grid & Layout
```css
/* Stats grid */
grid-template-columns: repeat(3, minmax(0, 1fr));
gap: 20px;

/* Form grid */
grid-template-columns: 1fr 1fr;
gap: 12px;

/* List items */
display: flex;
gap: 16px;  /* items */
gap: 8px;   /* inline items (buttons) */
```

---

## 📱 Responsividade

### Breakpoints Principais
```css
/* Tablets e grandes */
@media (max-width: 960px) {
  .stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  
  .course-actions {
    width: 100%;
    flex-wrap: wrap;
    justify-content: flex-start;
    gap: 6px;
  }
  
  .report-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
}

/* Mobile */
@media (max-width: 480px) {
  .report-item {
    gap: 10px;
    padding: 12px;
  }
  
  .course-actions {
    width: 100%;
  }
  
  .course-actions .button {
    flex: 1;
  }
}
```

---

## 📖 Exemplos de Uso

### 1. Criar uma Página com Design System

```tsx
// Imports
import './page.css';  // seu CSS local
import { FiEye, FiEdit2, FiTrash2, FiUsers } from 'react-icons/fi';

// Componente React
export default function MyPage() {
  return (
    <div>
      {/* Stat Cards */}
      <div className="stats">
        <div className="stat">
          <span>Total</span>
          <strong>42</strong>
        </div>
      </div>

      {/* List Items */}
      <div className="report-list">
        <article className="report-item">
          <div className="report-meta">
            <strong className="report-name">Item Title</strong>
            <span className="report-date">Data: 2026-04-14</span>
          </div>
          <div className="course-actions">
            <span className="status-pill active">Active</span>
            <button className="enrolled-button">
              <FiUsers size={14} />
              Ver (25)
            </button>
            <button className="button secondary">
              <FiEye size={14} />
              Detalhes
            </button>
            <button className="button secondary">
              <FiEdit2 size={14} />
              Editar
            </button>
            <button className="button danger">
              <FiTrash2 size={14} />
              Apagar
            </button>
          </div>
        </article>
      </div>

      {/* Form */}
      <form>
        <div className="form-group">
          <label className="form-label">Nome</label>
          <input 
            type="text" 
            className="form-input" 
            placeholder="Digite o nome"
          />
        </div>
      </form>
    </div>
  );
}
```

### 2. CSS Local Mínimo
```css
/* Apenas sobrescreva se necessário */
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Geist:wght@400;500;600&display=swap');

:root {
  --color-navy: #1a2744;
  --color-gold: #d4a574;
  --color-slate: #64748b;
  --color-slate-light: #f1f5f9;
  --color-navy-light: #f8fafc;
}

/* Copie os componentes necessários de cima */
```

### 3. Criar um Novo Componente
```css
/* Siga o padrão de espaçamento e animações */
.my-component {
  padding: 20px 24px;
  border-radius: 12px;
  border: 1px solid rgba(26, 39, 68, 0.08);
  background: linear-gradient(135deg, var(--color-navy-light) 0%, transparent 100%);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.my-component:hover {
  border-color: rgba(212, 165, 116, 0.25);
  box-shadow: 0 12px 32px rgba(26, 39, 68, 0.1);
  transform: translateY(-2px);
}
```

---

## ✅ Checklist para Novas Páginas

- [ ] Use as CSS variables (--color-navy, --color-gold, etc.)
- [ ] Implemente dark mode com `body.theme-purple` overrides
- [ ] Use 'Playfair Display' para títulos
- [ ] Use 'Geist' para body text
- [ ] Adicione ícones aos botões (gap: 6px)
- [ ] Use transições `cubic-bezier(0.4, 0, 0.2, 1)`
- [ ] Adicione transform hover em cards (`translateY(-2px)`)
- [ ] Implemente status pills com .active/.inactive
- [ ] Mantenha padding consistente (24px, 20px, 12px)
- [ ] Use rgba com opacity para borders e backgrounds
- [ ] Teste em mobile (<960px e <480px)
- [ ] Verifique contraste de cores em dark mode

---

## 📚 Referências

- **Font Family**: Playfair Display (display), Geist (body)
- **Primary Colors**: Navy (#1a2744), Gold (#d4a574)
- **Status Colors**: Verde (#22c55e), Vermelho (#ef4444), Cinza (#6b7280)
- **Transitions**: `0.2s ease`, `0.3s cubic-bezier(0.4, 0, 0.2, 1)`
- **Border Radius**: 8px (small), 10px (medium), 12px (large)
- **Spacing Unit**: 4px (base), escalando para 8, 12, 16, 20, 24px

---

**Última atualização**: 2026-04-14  
**Versão**: 1.0
