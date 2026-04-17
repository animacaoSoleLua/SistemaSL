# 🎨 SistemaSL - Design System Documentation

**Bem-vindo! Aqui estão todos os recursos de design visual do SistemaSL.**

---

## 🚀 Comece Por Aqui

### ⚡ **5 minutos** - Quick Reference
👉 [STYLE_QUICK_REFERENCE.md](./STYLE_QUICK_REFERENCE.md)

### 📚 **25 minutos** - Entender Tudo
👉 [DESIGN_SYSTEM_README.md](./DESIGN_SYSTEM_README.md)

### 📖 **Referência Completa**
👉 [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)

### 🚀 **Template CSS Pronto**
👉 [design-system-template.css](./design-system-template.css)

### 🗺️ **Índice & Navegação**
👉 [DESIGN_SYSTEM_INDEX.md](./DESIGN_SYSTEM_INDEX.md)

---

## 📁 Todos os Arquivos na Raiz

```
./STYLE_QUICK_REFERENCE.md          ⚡ Quick ref (5 min)
./DESIGN_SYSTEM_README.md           📚 Visão geral (25 min)
./DESIGN_SYSTEM.md                  📖 Documentação completa
./DESIGN_SYSTEM_INDEX.md            🗺️ Índice & navegação
./design-system-template.css        🚀 CSS template (copy/paste)
./DOCS_README.md                    📚 Índice detalhado
./README_DESIGN.md                  👈 Este arquivo
```

---

## ✨ O Que Você Encontra

✅ **Palette de cores** com valores hex  
✅ **Tipografia** completa (Playfair Display + Geist)  
✅ **10+ componentes** prontos para usar  
✅ **Dark mode** completo e integrado  
✅ **Responsividade** testada (mobile, tablet, desktop)  
✅ **Animações** sofisticadas  
✅ **Exemplo real** implementado (página de cursos)  
✅ **Template CSS** para copiar & colar  

---

## 🎯 Guia Rápido

| Necessidade | Ir para |
|-------------|---------|
| **Criar página nova** | DESIGN_SYSTEM_README.md |
| **Copiar CSS** | design-system-template.css |
| **Consultar cores** | STYLE_QUICK_REFERENCE.md |
| **Referência total** | DESIGN_SYSTEM.md |
| **Navegar tudo** | DESIGN_SYSTEM_INDEX.md |

---

## 📊 Design System em Uma Página

### Cores
```css
--color-navy: #1a2744;          /* Primário */
--color-gold: #d4a574;          /* Accent */
--color-slate: #64748b;         /* Secundário */
```

### Fonts
```css
Display: 'Playfair Display' (títulos)
Body:    'Geist' (texto)
```

### Componentes
- Stat Cards
- List Items with Actions
- Buttons (Secondary, Danger, Enrolled, Ghost)
- Forms & Inputs
- Status Pills
- Modals

### Dark Mode
Totalmente suportado com `body.theme-purple`

---

## 💡 Início Rápido

```tsx
// 1. Copiar CSS
cp design-system-template.css frontend/app/sua-pagina/page.css

// 2. Importar
import './page.css';
import { FiEye, FiEdit2, FiTrash2 } from 'react-icons/fi';

// 3. Usar
<div className="stats">
  <div className="stat"><strong>42</strong></div>
</div>

<article className="report-item">
  <div className="report-meta">
    <strong className="report-name">Título</strong>
  </div>
  <div className="course-actions">
    <button className="button-secondary">
      <FiEye size={14} /> Ver
    </button>
  </div>
</article>
```

---

## 🌟 Estrutura

```
projeto/
├── STYLE_QUICK_REFERENCE.md       ← Leia primeiro (5 min)
├── DESIGN_SYSTEM_README.md        ← Depois (25 min)
├── DESIGN_SYSTEM.md               ← Referência sempre
├── DESIGN_SYSTEM_INDEX.md         ← Navegação completa
├── design-system-template.css     ← Copy & paste
├── DOCS_README.md                 ← Índice detalhado
└── frontend/
    ├── app/cursos/                ← Exemplo real
    └── docs/                      ← Cópias locais
```

---

## 📞 Precisa de Ajuda?

**Onde está cada informação:**

| Dúvida | Arquivo |
|--------|---------|
| Quais cores? | STYLE_QUICK_REFERENCE.md |
| Como começar? | DESIGN_SYSTEM_README.md |
| Preciso de tudo? | DESIGN_SYSTEM.md |
| Qual página foi? | DESIGN_SYSTEM_INDEX.md |
| Índice detalhado? | DOCS_README.md |
| Copiar CSS? | design-system-template.css |

---

## 🎓 Tempo de Leitura

```
Quick Reference:       5 minutos ⚡
Design System README: 25 minutos 📚
Complete Docs:        20 minutos 📖
```

**Total: ~50 minutos para entender tudo, ou 5 minutos para começar rápido!**

---

## ✅ Checklist

- [ ] Ler STYLE_QUICK_REFERENCE.md (5 min)
- [ ] Abrir DESIGN_SYSTEM_README.md para referência
- [ ] Copiar design-system-template.css
- [ ] Implementar primeira página
- [ ] Testar dark mode
- [ ] Testar responsividade
- [ ] Referir DESIGN_SYSTEM.md quando precisar

---

## 🚀 Implantação Rápida

Com este Design System, qualquer página leva ~30 minutos:
1. Copiar template (30s)
2. Ler quick ref (5 min)
3. Implementar componentes (15 min)
4. Testar (10 min)

**Antes levava 2+ horas. Agora 30 minutos!** ⏱️

---

**Última atualização:** 2026-04-14  
**Versão:** 1.0  
**Status:** ✅ Completo

👉 **[Comece aqui →](./STYLE_QUICK_REFERENCE.md)**
