# 📚 Documentação - SistemaSL Design System

## 🎯 Começar Por Aqui

Este diretório contém toda a documentação do Design System visual do SistemaSL.

### Para Devs Ocupados ⚡
→ Leia: **STYLE_QUICK_REFERENCE.md** (5 min)

### Para Implementação Completa 📖
→ Leia: **DESIGN_SYSTEM.md** (20 min)

### Para Copiar & Colar 🚀
→ Use: **design-system-template.css**

### Para Entender o Conceito 🎨
→ Leia: **DESIGN_SYSTEM_README.md** (10 min)

---

## 📁 Arquivos Neste Diretório

```
docs/
├── README.md                      # Este arquivo (você está aqui!)
├── STYLE_QUICK_REFERENCE.md       # ⚡ Quick reference (5 min)
├── DESIGN_SYSTEM.md               # 📖 Documentação completa (20 min)
├── DESIGN_SYSTEM_README.md        # 🎨 Visão geral (10 min)
└── design-system-template.css     # 🚀 CSS template copy & paste
```

---

## 🗺️ Mapa de Recursos

```
Preciso implementar uma página nova
  ↓
1. Copiar: design-system-template.css
2. Ler: STYLE_QUICK_REFERENCE.md (5 min)
3. Referir: DESIGN_SYSTEM.md quando precisar
4. Exemplo: /app/cursos/ (página real)
```

```
Não entendo como o design funciona
  ↓
1. Ler: DESIGN_SYSTEM_README.md (visão geral)
2. Estudar: DESIGN_SYSTEM.md (detalhes)
3. Analisar: /app/cursos/page.tsx (exemplo vivo)
```

```
Preciso encontrar X componente/cor/animation
  ↓
1. Verificar: STYLE_QUICK_REFERENCE.md
2. Se não achar, procurar: DESIGN_SYSTEM.md
3. Copiar CSS de: design-system-template.css
```

---

## 📚 Tabela de Conteúdo por Arquivo

### STYLE_QUICK_REFERENCE.md
| Seção | Inclui |
|-------|--------|
| Colors | Palette cores principais |
| Fonts | Tipografia resumida |
| Components | Buttons, cards, forms |
| Spacing | Escala de espaçamento |
| Animations | Transições padrão |
| Dark Mode | Como fazer override |
| Responsive | Breakpoints |
| Troubleshooting | Problemas comuns |

### DESIGN_SYSTEM.md
| Seção | Inclui |
|-------|--------|
| Palette | Todas as cores com hex |
| Typography | Fonts, sizes, weights |
| Components | Todos com CSS completo |
| Animations | Detalhes de timing |
| Dark Mode | Overrides completos |
| Spacing | Grid e gaps |
| Examples | Código pronto |
| Checklist | O que fazer |

### DESIGN_SYSTEM_README.md
| Seção | Inclui |
|-------|--------|
| Overview | O que é o DS |
| Quick Start | Como começar |
| Structure | Folders e arquivos |
| Principles | Filosofia do design |
| Customization | Como estender |
| Checklist | Para novas páginas |

### design-system-template.css
| Seção | Inclui |
|-------|--------|
| Variables | :root colors |
| Stats Cards | Componente completo |
| List Items | Card com actions |
| Buttons | Todos os variants |
| Forms | Inputs e labels |
| Animations | keyframes prontos |
| Dark Mode | Todos os overrides |
| Responsive | Media queries |

---

## 🎯 Fluxos de Uso

### Cenário 1: Criar Nova Página (Desenvolvimento)

```
1. mkdir frontend/app/nova-pagina
2. cp frontend/styles/design-system-template.css frontend/app/nova-pagina/page.css
3. Criar: frontend/app/nova-pagina/page.tsx
4. Importar: import './page.css'
5. Usar classes: class="stat", class="report-item", etc
6. Consultar: STYLE_QUICK_REFERENCE.md para dúvidas
7. Testar: npm run dev
8. Dark mode: Adicionar body.theme-purple overrides
9. Mobile: Testar <960px, <600px, <480px
```

### Cenário 2: Estender com Novo Componente

```
1. Criar CSS em seu page.css
2. Seguir padrão: padding/border/transition/dark-mode
3. Adicionar ao DESIGN_SYSTEM.md
4. Adicionar ao design-system-template.css
5. Adicionar ao STYLE_QUICK_REFERENCE.md
6. Testar em 3 breakpoints
7. Validar em dark mode
```

### Cenário 3: Corrigir Bug Visual

```
1. Verificar em STYLE_QUICK_REFERENCE.md
2. Procurar em DESIGN_SYSTEM.md
3. Comparar com /app/cursos/
4. Ajustar CSS
5. Testar light + dark
6. Atualizar documentação
```

### Cenário 4: Aprender o Design System

```
1. Ler: DESIGN_SYSTEM_README.md (10 min)
2. Ler: STYLE_QUICK_REFERENCE.md (5 min)
3. Abrir: /app/cursos/page.tsx e page.css (lado a lado)
4. Explorar: DESIGN_SYSTEM.md (como referência)
5. Praticar: Criar componente simples
6. Estender: Adicionar dark mode
```

---

## ⚡ Atalhos Comuns

| Necessidade | Arquivo | Seção |
|-------------|---------|-------|
| **Quais cores usar?** | STYLE_QUICK_REFERENCE.md | Colors |
| **Como fazer botão?** | design-system-template.css | Buttons |
| **Como fazer dark mode?** | DESIGN_SYSTEM.md | Dark Mode |
| **Como fazer responsivo?** | STYLE_QUICK_REFERENCE.md | Responsive |
| **Quais animações?** | DESIGN_SYSTEM.md | Animations |
| **Como fazer form?** | design-system-template.css | Forms |
| **Qual tamanho de padding?** | STYLE_QUICK_REFERENCE.md | Spacing |
| **Como adicionar novo componente?** | DESIGN_SYSTEM.md | Components |

---

## 🔍 Índice por Componente

### Cards
- Stat Card → `DESIGN_SYSTEM.md` - Componentes - Stat Cards
- List Item → `DESIGN_SYSTEM.md` - Componentes - Card Items

### Buttons
- Secondary → `design-system-template.css` - button-secondary
- Danger → `design-system-template.css` - button-danger
- Enrolled → `design-system-template.css` - enrolled-button
- Ghost → `design-system-template.css` - button-ghost

### Forms
- Input → `design-system-template.css` - form-input
- Group → `design-system-template.css` - form-group
- Label → `design-system-template.css` - form-label

### Lists
- Search Results → `DESIGN_SYSTEM.md` - Form Inputs
- Member Item → `design-system-template.css` - member-item

### Status
- Pills → `design-system-template.css` - status-pill
- Active/Inactive → `design-system-template.css` - status-pill.active/inactive

---

## 📊 Design System em Números

| Métrica | Valor |
|---------|-------|
| Cores principais | 5 |
| Componentes | 10+ |
| Font families | 2 |
| Animações | 3 |
| Breakpoints | 3 |
| Dark mode colors | ✅ Completo |
| Documentação | 4 arquivos |
| Exemplo real | /app/cursos/ |
| Linhas de CSS | ~800 |

---

## ✅ Checklist Rápido

Ao criar uma nova página, use este checklist:

```markdown
- [ ] Copiar design-system-template.css
- [ ] Importar em page.tsx
- [ ] Implementar componentes (stats, items, buttons)
- [ ] Adicionar ícones aos botões (FiIcon)
- [ ] Testar em light mode
- [ ] Adicionar dark mode overrides
- [ ] Testar dark mode
- [ ] Testar responsividade:
  - [ ] Desktop (960px+)
  - [ ] Tablet (600px-960px)
  - [ ] Mobile (<600px)
- [ ] Verificar contraste de cores
- [ ] Validar animações
```

---

## 🎓 Leitura Recomendada

### Para Iniciantes
1. **DESIGN_SYSTEM_README.md** (10 min) - Entender o conceito
2. **STYLE_QUICK_REFERENCE.md** (5 min) - Referência rápida
3. **Exemplo real** - Abrir `/app/cursos/` em outro editor

### Para Avançados
1. **DESIGN_SYSTEM.md** (20 min) - Documentação completa
2. **design-system-template.css** - Entender cada classe
3. **DESIGN_SYSTEM_README.md** - Princípios de extensão

---

## 🔗 Links Internos

- **Design System Readme:** `../DESIGN_SYSTEM_README.md`
- **Design System Completo:** `../DESIGN_SYSTEM.md`
- **Template CSS:** `../styles/design-system-template.css`
- **Exemplo Real:** `../app/cursos/page.tsx`

---

## 🆘 Precisa de Ajuda?

| Problema | Solução |
|----------|---------|
| Não sei por onde começar | Leia DESIGN_SYSTEM_README.md |
| Preciso implementar rápido | Use design-system-template.css |
| Preciso entender cores | Veja STYLE_QUICK_REFERENCE.md |
| Preciso de referência completa | Consulte DESIGN_SYSTEM.md |
| Quero ver exemplo vivo | Abra /app/cursos/ |
| Dark mode não funciona | Verificar seção Dark Mode em DESIGN_SYSTEM.md |
| Responsividade quebrada | Verificar media queries em STYLE_QUICK_REFERENCE.md |

---

## 📝 Notas Importantes

⭐ **Sempre use CSS variables** - `var(--color-navy)` em vez de `#1a2744`

🌙 **Dark mode é obrigatório** - Implemente junto com light mode

📱 **Mobile first ou responsive** - Teste <960px, <600px, <480px

⚡ **Use transições padrão** - `0.3s cubic-bezier(0.4, 0, 0.2, 1)`

♿ **Mantenha acessibilidade** - ARIA labels e keyboard support

---

## 📚 Estrutura de Documentação

```
Design System Hierarchy:
│
├─ 1️⃣ README.md (Este arquivo)
│   └─ Entry point, orienta para outros docs
│
├─ 2️⃣ STYLE_QUICK_REFERENCE.md
│   └─ Referência rápida para devs ocupados
│
├─ 3️⃣ DESIGN_SYSTEM_README.md
│   └─ Visão geral, princípios, estrutura
│
├─ 4️⃣ DESIGN_SYSTEM.md
│   └─ Documentação completa e detalhada
│
└─ 5️⃣ design-system-template.css
    └─ CSS pronto para copiar
```

---

**Última atualização:** 2026-04-14  
**Status:** ✅ Completo  
**Versão:** 1.0
