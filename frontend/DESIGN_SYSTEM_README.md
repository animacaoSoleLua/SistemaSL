# 🎨 SistemaSL Design System

Documentação completa do Design System visual do SistemaSL. Use este guia para manter consistência visual em todas as páginas do sistema.

## 📚 Documentação

Este projeto conta com 3 níveis de documentação:

### 1. **Quick Reference** (Para Dev Rápido)
📄 **Arquivo:** `frontend/docs/STYLE_QUICK_REFERENCE.md`

Para quem precisa implementar rápido. Inclui:
- Cores principais e como usar
- Componentes básicos
- Animações padrão
- Responsividade essencial
- Troubleshooting rápido

**Tempo de leitura:** ~5 minutos

---

### 2. **Design System Completo** (Referência Total)
📄 **Arquivo:** `frontend/DESIGN_SYSTEM.md`

Documentação completa com tudo que você precisa saber. Inclui:
- Palette de cores (com valores hex)
- Tipografia (fonts, sizes, weights)
- Todos os componentes com CSS
- Animações e transições
- Dark mode setup
- Espaçamento e grid
- Exemplos de código
- Checklist de implementação

**Tempo de leitura:** ~20 minutos  
**Uso:** Referência durante desenvolvimento

---

### 3. **Template CSS** (Copy & Paste)
📄 **Arquivo:** `frontend/styles/design-system-template.css`

Arquivo CSS pronto para copiar em novas páginas. Inclui:
- Todos os componentes estilizados
- Variáveis de cor setup
- Dark mode overrides
- Media queries responsivas
- Animações

**Uso:** `cp frontend/styles/design-system-template.css frontend/app/sua-pagina/page.css`

---

## 🚀 Quick Start

### Para Criar uma Nova Página

#### 1. Copiar template CSS
```bash
cp frontend/styles/design-system-template.css frontend/app/sua-pagina/page.css
```

#### 2. Importar em seu componente TSX
```tsx
import './page.css';
import { FiEye, FiEdit2, FiTrash2 } from 'react-icons/fi';

export default function SuaPagina() {
  return (
    <div>
      <div className="stats">
        <div className="stat">
          <span>Total</span>
          <strong>42</strong>
        </div>
      </div>

      <article className="report-item">
        <div className="report-meta">
          <strong className="report-name">Título</strong>
          <span className="report-date">Data</span>
        </div>
        <div className="course-actions">
          <button className="button-secondary">
            <FiEye size={14} />
            Ver
          </button>
          <button className="button-danger">
            <FiTrash2 size={14} />
            Apagar
          </button>
        </div>
      </article>
    </div>
  );
}
```

#### 3. Referir ao Quick Reference para dúvidas
Consulte `frontend/docs/STYLE_QUICK_REFERENCE.md`

---

## 🎨 O Design System em Números

| Aspecto | Detalhes |
|---------|----------|
| **Cores** | 5 principais (Navy, Gold, Slate, etc) |
| **Fonts** | 2 families (Playfair Display, Geist) |
| **Componentes** | 10+ componentes reutilizáveis |
| **Animações** | 3 principais (slideUp, shimmer, hover) |
| **Dark Mode** | Suporte completo com overrides |
| **Responsive** | Breakpoints: 960px, 600px, 480px |
| **Exemplo Real** | `/frontend/app/cursos/page.tsx` |

---

## 📖 Índice de Componentes

### Cards & Containers
- `stat` - Card com estatísticas
- `report-item` - Item de lista com actions
- `modal-card` - Cards em modais

### Buttons
- `button-secondary` - Ações secundárias (com ícones)
- `button-danger` - Ações destrutivas (delete)
- `button-ghost` - Buttons minimalistas
- `enrolled-button` - Accent button com shimmer

### Forms
- `form-group` - Container do formulário
- `form-label` - Labels de inputs
- `form-input` - Inputs padronizados

### Lists
- `member-search-results` - Lista de busca
- `member-item` - Item de lista com hover
- `course-actions` - Container de actions

### Status
- `status-pill` - Badge com status
- `status-pill.active` - Verde (ativo)
- `status-pill.inactive` - Cinza (inativo)

---

## 🎯 Exemplo Real: Página de Cursos

A página de cursos (`frontend/app/cursos/page.tsx` e `frontend/app/cursos/page.css`) é uma implementação completa do Design System.

**Veja:**
- Stat cards no topo
- List items com múltiplos botões
- Status pills
- Modal com formulários
- Dark mode completo
- Responsividade em todas as breakpoints

```bash
# Exemplo completo em:
frontend/app/cursos/page.tsx
frontend/app/cursos/page.css
```

---

## 🔧 Customização & Extensão

### Adicionar Novo Componente

1. **Siga o padrão existente:**
```css
.novo-componente {
  padding: 20px 24px;           /* Use scale padrão */
  border-radius: 12px;          /* Consistente */
  border: 1px solid rgba(...);  /* RGBA com opacity */
  background: linear-gradient(.); /* Gradiente */
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); /* Transição */
}

.novo-componente:hover {
  transform: translateY(-2px);  /* Elevação */
  box-shadow: 0 12px 32px rgba(26, 39, 68, 0.1); /* Shadow */
}
```

2. **Adicionar dark mode:**
```css
body.theme-purple .novo-componente {
  background: rgba(26, 39, 68, 0.3);
  border-color: rgba(212, 165, 116, 0.15);
  color: #f1f5f9;
}
```

3. **Adicionar ao DESIGN_SYSTEM.md**

4. **Adicionar ao design-system-template.css**

### Modificar Cores Globais

Edite `:root` em `design-system-template.css`:
```css
:root {
  --color-navy: #seu-azul;
  --color-gold: #seu-dourado;
  /* ... */
}
```

---

## ✅ Checklist para Novas Páginas

Use este checklist ao criar uma nova página:

- [ ] Copiar `design-system-template.css`
- [ ] Renomear para `page.css` da nova página
- [ ] Importar em componente TSX: `import './page.css'`
- [ ] Implementar componentes: stats, items, actions
- [ ] Adicionar ícones aos botões
- [ ] Testar dark mode (`body.theme-purple`)
- [ ] Testar responsividade (<960px, <600px, <480px)
- [ ] Verificar contraste de cores
- [ ] Validar animações e transitions
- [ ] Revisar em browser

---

## 🎓 Principios de Design

Este Design System foi construído seguindo princípios:

### 1. **Editorial & Moderno**
- Tipografia caracterizada (Playfair Display para destaque)
- Palette refinada (Navy + Gold em vez de cores genéricas)
- Mucho espaço negativo e respiração visual

### 2. **Micro-interações Significativas**
- Hover states com elevação suave
- Transições cubic-bezier (mais naturais)
- Animações que comunicam, não distraem

### 3. **Dark Mode First**
- Não é pós-venda, é parte do design
- Palette invertida mantém harmonia
- Contraste verificado em ambos os modos

### 4. **Responsividade Completa**
- Desktop first, mobile perfected
- Breakpoints bem definidos
- Testes em <960px, <600px, <480px

### 5. **Acessibilidade**
- ARIA labels mantidos
- Keyboard navigation suportada
- Contraste WCAG AA

---

## 📊 Estrutura de Pastas

```
frontend/
├── DESIGN_SYSTEM.md                 # Documentação completa ⭐
├── DESIGN_SYSTEM_README.md          # Este arquivo
├── styles/
│   └── design-system-template.css  # Template CSS para novas páginas ⭐
├── docs/
│   └── STYLE_QUICK_REFERENCE.md    # Quick reference rápido ⭐
└── app/
    └── cursos/
        ├── page.tsx               # Exemplo real completo
        └── page.css               # CSS implementado
```

---

## 🔗 Links Rápidos

| Documento | Propósito | Link |
|-----------|-----------|------|
| **Quick Ref** | Dev rápido | `docs/STYLE_QUICK_REFERENCE.md` |
| **Complete** | Documentação total | `DESIGN_SYSTEM.md` |
| **Template** | CSS copy & paste | `styles/design-system-template.css` |
| **Exemplo Real** | Implementação viva | `app/cursos/page.tsx` |

---

## 🚦 Status

| Item | Status |
|------|--------|
| Palette de cores | ✅ Complete |
| Tipografia | ✅ Complete |
| Componentes básicos | ✅ Complete |
| Dark mode | ✅ Complete |
| Responsividade | ✅ Complete |
| Documentação | ✅ Complete |
| Template CSS | ✅ Complete |
| Exemplo real | ✅ Cursos |

---

## 🤝 Contribuindo

Ao adicionar novos componentes ou fazer mudanças:

1. **Atualize `DESIGN_SYSTEM.md`** com as mudanças
2. **Atualize `design-system-template.css`** com novos estilos
3. **Atualize `STYLE_QUICK_REFERENCE.md`** se for componente crítico
4. **Mantenha dark mode sempre** sincronizado
5. **Teste em mobile** antes de considerar pronto

---

## 📞 Suporte

**Dúvidas sobre o Design System?**

1. Consulte `STYLE_QUICK_REFERENCE.md` (5 min read)
2. Procure em `DESIGN_SYSTEM.md` (full reference)
3. Veja exemplo em `app/cursos/page.tsx` (implementação real)
4. Copie do `design-system-template.css` (copy & paste)

---

## 📝 Changelog

### v1.0 (2026-04-14)
- ✅ Design System inicial criado
- ✅ Implementado em página de cursos
- ✅ Documentação completa
- ✅ Template CSS
- ✅ Dark mode support
- ✅ Responsividade completa

---

## 📄 Licença

Uso interno - SistemaSL

---

**Última atualização:** 2026-04-14  
**Mantido por:** Tim de Design  
**Próxima review:** 2026-06-14
