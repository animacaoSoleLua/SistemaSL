# Tooltip Stats Design — Tooltips Explicativos nas Abas de Gerência

**Date:** 2026-04-14  
**Scope:** Adicionar ícones de interrogação com tooltips explicativos em todos os cards de stats nas três abas da página de Gerência (Membros, Relatórios, Cursos)  
**Approach:** Componente Tooltip reutilizável + TooltipIcon wrapper

---

## 1. Visão Geral

Adicionar tooltips explicativos em cada card de estatística da página `/gerencia`. Quando o usuário passa o mouse sobre um ícone de interrogação pequeno próximo ao label do stat, um tooltip aparece com fade in mostrando:
- Uma explicação técnica detalhada da métrica
- A origem/fonte dos dados
- Como a métrica é calculada

**Escopo limitado:** Apenas a página de Gerência com suas 3 abas (membros, relatórios, cursos).

---

## 2. Arquitetura

### 2.1 Componentes a criar

```
frontend/components/Tooltip.tsx
├─ Props: children, content, position?, delay?
├─ Estado: isVisible (booleano)
└─ Comportamento: mostra/esconde ao hover

frontend/components/TooltipIcon.tsx
├─ Props: content, label, position?
├─ Wraps: FiHelpCircle icon + Tooltip
└─ Uso: <TooltipIcon content="..." label="Saúde Disciplinar" />
```

### 2.2 Integração

Modificar `frontend/app/gerencia/page.tsx`:
- Importar `TooltipIcon`
- Envolver cada label do stat com `TooltipIcon`
- Passar `content` com o texto explicativo apropriado

---

## 3. Componentes Detalhados

### 3.1 Tooltip.tsx

**Props:**
- `children` (ReactNode) — elemento que ativa o tooltip ao hover
- `content` (string | ReactNode) — conteúdo do tooltip
- `position` ('top' | 'bottom' | 'left' | 'right') — posição relativa ao elemento (padrão: 'top')
- `delay` (number) — delay em ms antes de mostrar (padrão: 0)

**Comportamento:**
- Mostra tooltip ao mouseenter
- Esconde ao mouseleave
- Fade in 200ms ease-out
- Fade out instantâneo ao sair
- Z-index alto o suficiente para não ser coberto

**CSS:**
- Fundo: #333 (dark gray)
- Texto: #fff (white)
- Padding: 8px 12px
- Border-radius: 4px
- Max-width: 280px (quebra texto longo em múltiplas linhas)
- Sombra: 0 2px 8px rgba(0, 0, 0, 0.15)

### 3.2 TooltipIcon.tsx

**Props:**
- `content` (string) — texto do tooltip
- `label` (string) — label do stat (para contexto/acessibilidade)
- `position` ('top' | 'bottom') — padrão: 'top'

**Renderização:**
```jsx
<span className="tooltip-icon-wrapper">
  <Tooltip content={content} position={position}>
    <button 
      type="button"
      className="tooltip-icon-button"
      aria-label={`Informações sobre ${label}`}
    >
      <FiHelpCircle size={16} />
    </button>
  </Tooltip>
</span>
```

**Styling:**
- Ícone: 16px, cor #666 (gray)
- Hover: cor #333, cursor pointer
- Transição: color 150ms ease
- Margin-left: 6px (espaço depois do label)

---

## 4. Conteúdo dos Tooltips

### 4.1 Aba Membros

| Stat | Tooltip |
|------|---------|
| **Saúde Disciplinar** | "Porcentagem de membros que não possuem nenhuma advertência ativa no sistema. Calculado em tempo real baseado no registro de advertências." |
| **Satisfação do Cliente** | "Porcentagem de feedbacks positivos coletados nos últimos 30 dias. Baseado em pesquisas de satisfação preenchidas após eventos." |
| **Taxa de Assiduidade** | "Porcentagem de participantes que compareceram aos cursos nos últimos 30 dias. Calculado a partir do status de presença registrado no sistema." |
| **Taxa de Cancelamento** | "Porcentagem de inscritos que não compareceram aos cursos nos últimos 30 dias. Complementa a taxa de assiduidade." |

### 4.2 Aba Relatórios

| Stat | Tooltip |
|------|---------|
| **Total de Relatórios** | "Número total de eventos com relatórios registrados no período selecionado." |
| **Fora de Brasília** | "Quantidade de eventos realizados fora da região de Brasília conforme indicado no formulário de relatório." |
| **Eventos Exclusivos** | "Quantidade de eventos marcados como exclusivos no sistema durante o período." |
| **Qualidade Média** | "Média aritmética das notas de qualidade (0-10) atribuídas aos eventos no período." |

### 4.3 Aba Cursos

| Stat | Tooltip |
|------|---------|
| **Total de Cursos** | "Número total de cursos realizados no período selecionado." |
| **Total de Inscrições** | "Soma de todas as inscrições em cursos durante o período. Um participante pode se inscrever em múltiplos cursos." |
| **Ocupação Média** | "Porcentagem média de vagas preenchidas nos cursos do período. Calculado apenas para cursos com capacidade definida." |
| **Instrutores Ativos** | "Número de instrutores únicos que ministraram cursos no período selecionado." |

---

## 5. Comportamento e Interações

### 5.1 Ativação
- Mouseenter no ícone → tooltip aparece com fade in (200ms)
- Mouseleave → tooltip desaparece

### 5.2 Posicionamento
- Padrão: acima do ícone ('top')
- Se não houver espaço acima (viewport), fallback para 'bottom'
- Tooltip nunca sai da viewport (padding de 8px das bordas)

### 5.3 Acessibilidade
- Botão do ícone tem `aria-label="Informações sobre [stat]"`
- Tooltip com role="tooltip" (aria)
- Teclado: tooltip ativa ao focus (não apenas hover)

---

## 6. Modificações em gerencia/page.tsx

### 6.1 Imports
```typescript
import TooltipIcon from "../../components/TooltipIcon";
```

### 6.2 Exemplo de uso dentro de renderStats()

**Antes:**
```jsx
<span className="stat-label">Saúde Disciplinar</span>
```

**Depois:**
```jsx
<span className="stat-label">
  Saúde Disciplinar
  <TooltipIcon 
    label="Saúde Disciplinar"
    content="Porcentagem de membros que não possuem nenhuma advertência ativa no sistema. Calculado em tempo real baseado no registro de advertências."
    position="top"
  />
</span>
```

---

## 7. Estilos e Animações

### 7.1 CSS da animação fade-in
```css
@keyframes tooltip-fade-in {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.tooltip-content {
  animation: tooltip-fade-in 200ms ease-out;
}
```

### 7.2 Cores e typography
- Tooltip background: #333
- Tooltip text: #fff
- Font-size: 13px (um pouco menor que o corpo)
- Line-height: 1.4
- Font-weight: normal

---

## 8. Estrutura de Arquivos

```
frontend/
├─ components/
│  ├─ Tooltip.tsx (novo)
│  └─ TooltipIcon.tsx (novo)
└─ app/
   └─ gerencia/
      └─ page.tsx (modificado)
```

---

## 9. Checklist de Implementação

- [ ] Criar `Tooltip.tsx` com lógica de hover e posicionamento
- [ ] Criar `TooltipIcon.tsx` como wrapper do ícone
- [ ] Adicionar animação CSS fade-in
- [ ] Atualizar `gerencia/page.tsx` — renderStats()
  - [ ] Aba Membros: 4 TooltipIcons
  - [ ] Aba Relatórios: 4 TooltipIcons
  - [ ] Aba Cursos: 4 TooltipIcons
- [ ] Testar hover em diferentes posições na viewport
- [ ] Verificar acessibilidade (teclado, screen reader)
- [ ] Verificar responsividade em mobile

---

## 10. Considerações Futuras

- Reutilizar `Tooltip` em outras páginas (usuários, cursos, etc.) se necessário
- Adicionar configuração de tema de cores (dark/light) se expandir para outras seções

---

**Status:** Pronto para implementação  
**Reviewer:** —
