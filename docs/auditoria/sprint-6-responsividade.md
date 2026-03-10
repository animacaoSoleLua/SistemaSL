# Sprint 6 — Responsividade Mobile

**Prioridade:** Alta
**Status:** Pendente

---

## Objetivo

Garantir que todas as páginas do sistema funcionem corretamente em dispositivos móveis (320px–428px), eliminando overflow horizontal, modais inutilizáveis, botões pequenos demais para toque e formulários que excedem a tela.

---

## Diagnóstico Atual

O sistema já tem breakpoints em `960px` e `600px` na maioria das páginas, mas faltam ajustes críticos para telas de celular (≤ 480px). Os problemas mais graves são:

- Modais (`.modal-card`) sem `max-width` responsivo — estouram horizontalmente em 390px
- `.page-header` com `flex-direction: row` estica o título contra o botão em telas pequenas
- Botões de ação (`.button.small`) abaixo dos 44×44px mínimos de touch target (WCAG 2.5.5)
- Formulário de novo relatório com grade de 2 colunas que não quebra abaixo de 960px em alguns inputs
- Painel lateral de detalhe de membro (`.member-panel`) aparece abaixo da lista em telas intermediárias mas sem padding adequado

---

## Tarefas

### AUD-M6-01 — Corrigir modais em telas pequenas

**Severidade:** Crítica
**Arquivos:** `frontend/app/globals.css`, `frontend/app/usuarios/page.css`, `frontend/app/relatorios/page.css`

**Problema:**
`.modal-card` e `.report-modal` têm `width` ou `min-width` fixos que causam scroll horizontal em telas menores que 480px. O usuário não consegue ver os botões "Salvar" / "Confirmar" em celulares comuns.

**Solução:**
```css
/* ✅ globals.css — breakpoint mobile para todos os modais */
@media (max-width: 480px) {
  .modal-backdrop {
    align-items: flex-end; /* modal sobe do rodapé como bottom sheet */
    padding: 0;
  }

  .modal-card {
    width: 100%;
    max-width: 100%;
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    max-height: 90dvh;
    overflow-y: auto;
  }

  .modal-header,
  .modal-footer {
    padding: 16px;
  }

  .modal-body {
    padding: 16px;
  }

  .modal-footer {
    flex-direction: column;
    gap: 8px;
  }

  .modal-footer .button {
    width: 100%;
  }
}
```

**Critérios de Conclusão:**
- [ ] Todos os modais visíveis sem scroll horizontal em 390px
- [ ] Botões do modal acessíveis (não cortados)
- [ ] `.report-modal` com corpo com scroll interno em telas pequenas
- [ ] `.confirm-modal` ocupa largura total em mobile

---

### AUD-M6-02 — Page header responsivo

**Severidade:** Alta
**Arquivos:** `frontend/app/globals.css`

**Problema:**
O `.page-header` usa `display: flex; justify-content: space-between` e não quebra em telas pequenas. Em 390px, o título "Relatórios" e o botão "+ Novo Relatório" ficam espremidos na mesma linha ou o botão transborda.

**Solução:**
```css
/* ✅ globals.css */
@media (max-width: 480px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .page-header .button {
    width: 100%;
    text-align: center;
  }
}
```

**Critérios de Conclusão:**
- [ ] Título e botão de ação em colunas separadas em mobile
- [ ] Botão ocupa largura total para facilitar toque
- [ ] Aplicado em: Relatórios, Usuários, Advertências, Cursos

---

### AUD-M6-03 — Touch targets mínimos de 44×44px

**Severidade:** Alta
**Arquivos:** `frontend/app/globals.css`

**Problema:**
`.button.small` tem `padding: 4px 10px` com fonte de 13px, resultando em altura de ~28px — abaixo dos 44px recomendados pelo WCAG 2.5.5 e pelo Apple HIG. Em mobile isso causa erros de toque frequentes.

**Solução:**
```css
/* ✅ globals.css — em mobile, small buttons ganham área mínima de toque */
@media (max-width: 480px) {
  .button.small {
    padding: 10px 14px;
    font-size: 14px;
    min-height: 44px;
  }

  .icon-button {
    min-width: 44px;
    min-height: 44px;
  }
}
```

**Critérios de Conclusão:**
- [ ] Todos os botões com `min-height: 44px` em mobile
- [ ] `.icon-button` (fechar modal, etc.) com área mínima 44×44px
- [ ] Botões de ação de linha (Ver / Excluir) facilmente tocáveis

---

### AUD-M6-04 — Formulário de novo relatório em mobile

**Severidade:** Alta
**Arquivos:** `frontend/app/novo-relatorio/page.css`

**Problema:**
O formulário tem múltiplos grupos de 2 colunas (`.form-grid`) que colapsam em 960px, mas em 480px ainda há elementos com `gap` e `padding` pensados para desktop. Os toggles de opção (`.toggle-card`) e a seção de feedback da equipe ficam cortados.

**Solução:**
```css
/* ✅ novo-relatorio/page.css */
@media (max-width: 480px) {
  .form-card {
    padding: 16px;
    border-radius: var(--radius-md);
  }

  .form-card h2 {
    font-size: 16px;
  }

  .team-feedback-row {
    flex-direction: column;
    gap: 8px;
  }

  .team-feedback-row select,
  .team-feedback-row input {
    width: 100%;
  }

  .score-group {
    grid-template-columns: 1fr;
  }

  .form-buttons {
    flex-direction: column;
  }

  .form-buttons .button {
    width: 100%;
  }
}
```

**Critérios de Conclusão:**
- [ ] Formulário sem overflow horizontal em 390px
- [ ] Toggles e scores empilhados verticalmente
- [ ] Botões Salvar / Cancelar em coluna, largura total
- [ ] Campos de upload visíveis e utilizáveis

---

### AUD-M6-05 — Lista e painel de membros em mobile

**Severidade:** Alta
**Arquivos:** `frontend/app/usuarios/page.css`

**Problema:**
O `.users-board` já colapsa em 1 coluna em 960px, mas o `.member-panel` (painel de detalhe lateral) tem altura e padding fixos. Em mobile, o painel aparece logo abaixo da lista sem separação visual clara e com muitos dados comprimidos.

**Solução:**
```css
/* ✅ usuarios/page.css */
@media (max-width: 480px) {
  .users-board {
    gap: 0;
  }

  .member-panel {
    border-radius: 0;
    border-left: none;
    border-top: 2px solid rgba(111, 76, 255, 0.15);
    padding: 16px;
  }

  .member-detail-tabs {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }

  .member-detail-tabs::-webkit-scrollbar {
    display: none;
  }

  .member-row-actions {
    flex-wrap: wrap;
    gap: 6px;
  }

  .users-summary {
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
}
```

**Critérios de Conclusão:**
- [ ] Painel de detalhe legível em 390px
- [ ] Abas de navegação (feedbacks, cursos, advertências) scrolláveis horizontalmente
- [ ] Botões de ação (Editar, Excluir) acessíveis

---

### AUD-M6-06 — Lista de advertências e cursos em mobile

**Severidade:** Média
**Arquivos:** `frontend/app/advertencias/page.css`, `frontend/app/cursos/page.css`

**Problema:**
- `advertencias/page.css`: `.warning-row` com `display: flex` horizontal pode ter itens cortados. Os botões de ação e a data ficam espremidos em telas de 390px.
- `cursos/page.css`: `.report-item` (reutilizado para cursos) já vira coluna em 960px, mas o header de curso com título + botão "Inscrever" pode não caber.

**Solução:**
```css
/* ✅ advertencias/page.css */
@media (max-width: 480px) {
  .warning-row {
    flex-direction: column;
    gap: 8px;
    padding: 14px;
  }

  .warning-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .warning-date {
    font-size: 12px;
  }
}

/* ✅ cursos/page.css */
@media (max-width: 480px) {
  .course-header-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .course-actions {
    width: 100%;
  }

  .course-actions .button {
    flex: 1;
  }
}
```

**Critérios de Conclusão:**
- [ ] Advertências legíveis e acionáveis em 390px
- [ ] Cursos com botões de inscrição acessíveis
- [ ] Datas não truncadas

---

### AUD-M6-07 — Sidebar e navegação mobile

**Severidade:** Média
**Arquivos:** `frontend/app/globals.css`, `frontend/app/components/SidebarNav.tsx`

**Problema:**
O menu hamburguer já existe em 960px, mas o overlay mobile (`.mobile-menu-overlay`) pode não ocupar 100% da altura da tela em navegadores móveis que têm barra de endereço dinâmica. Além disso, o menu lateral aberto não fecha ao clicar em um link de navegação.

**Solução:**
```css
/* ✅ globals.css — altura real em mobile browsers */
@media (max-width: 960px) {
  .mobile-menu-overlay {
    height: 100dvh; /* dynamic viewport height */
  }

  .app-mobile-menu {
    height: 100dvh;
    overflow-y: auto;
  }
}
```

```tsx
// ✅ SidebarNav.tsx — fechar ao navegar
const pathname = usePathname();

useEffect(() => {
  setMobileOpen(false); // fecha o menu ao mudar de rota
}, [pathname]);
```

**Critérios de Conclusão:**
- [ ] Menu mobile usa `100dvh` para cobrir a tela corretamente
- [ ] Menu fecha automaticamente ao clicar em um item
- [ ] Overlay fecha ao clicar fora do menu

---

### AUD-M6-08 — Dashboard em mobile

**Severidade:** Média
**Arquivos:** `frontend/app/dashboard/page.css`

**Problema:**
Os cards de estatísticas já colapsam para 1 coluna em 600px, mas o `.summary-value` tem `font-size` grande que pode quebrar o layout. A lista de relatórios recentes não tem padding adequado.

**Solução:**
```css
/* ✅ dashboard/page.css */
@media (max-width: 480px) {
  .summary-card {
    padding: 16px;
  }

  .summary-value {
    font-size: 28px;
  }

  .dashboard-report-list {
    gap: 6px;
  }

  .dashboard-report-item {
    padding: 10px 12px;
  }

  .report-panel {
    padding: 16px;
  }

  .report-header {
    flex-direction: column;
    gap: 12px;
  }
}
```

**Critérios de Conclusão:**
- [ ] Cards de estatísticas legíveis em 390px
- [ ] Lista de relatórios recentes sem overflow
- [ ] Números grandes não quebram o card

---

### AUD-M6-09 — Tela de perfil em mobile

**Severidade:** Média
**Arquivos:** `frontend/app/perfil/page.css`

**Problema:**
A tela de perfil já colapsa o `profile-photo-block` em 960px, mas o formulário de edição tem inputs e selects que podem ter largura fixa. Em 390px, o bloco de foto e informações fica espremido.

**Solução:**
```css
/* ✅ perfil/page.css */
@media (max-width: 480px) {
  .profile-photo-block {
    padding: 16px;
    gap: 16px;
  }

  .profile-photo-wrap {
    width: 72px;
    height: 72px;
  }

  .profile-photo-meta strong {
    font-size: 16px;
  }

  .form-actions {
    flex-direction: column;
  }

  .form-actions .button {
    width: 100%;
  }
}
```

**Critérios de Conclusão:**
- [ ] Foto de perfil e nome visíveis em 390px
- [ ] Formulário de edição sem overflow
- [ ] Botões Salvar / Cancelar em coluna

---

### AUD-M6-10 — Eliminar scroll horizontal global

**Severidade:** Alta
**Arquivos:** `frontend/app/globals.css`

**Problema:**
Qualquer elemento com largura maior que a viewport causa scroll horizontal indesejado no body — degradando a experiência mobile. O `body` não tem `overflow-x: hidden` e nenhum elemento tem `max-width: 100vw` como fallback.

**Solução:**
```css
/* ✅ globals.css */
html, body {
  overflow-x: hidden;
  max-width: 100%;
}

/* Garantir que imagens e mídias não estourem */
img, video, iframe {
  max-width: 100%;
  height: auto;
}

/* Inputs e selects não devem transbordar */
input, select, textarea {
  max-width: 100%;
}
```

**Critérios de Conclusão:**
- [ ] Nenhuma página tem scroll horizontal em 390px
- [ ] Imagens e vídeos contidos na viewport
- [ ] Inputs e selects respeitam a largura do container

---

## Dispositivos-Alvo para Teste

| Dispositivo | Largura | Prioridade |
|-------------|---------|------------|
| iPhone SE (2022) | 375px | Alta |
| iPhone 14 Pro | 393px | Alta |
| Samsung Galaxy S23 | 393px | Alta |
| Pixel 7 | 412px | Média |
| iPad Mini (portrait) | 768px | Média |

---

## Ferramentas de Teste

```bash
# Verificar no navegador
# Chrome DevTools → Toggle Device Toolbar → iPhone SE (375px)
# Firefox → Responsive Design Mode → 390x844

# Automatizado (opcional)
npx playwright test --project=mobile-chrome
```

---

## Checklist de Conclusão da Sprint

- [x] AUD-M6-01 — Modais responsivos (bottom sheet em mobile)
- [x] AUD-M6-02 — Page header em coluna em mobile
- [x] AUD-M6-03 — Touch targets ≥ 44px
- [x] AUD-M6-04 — Formulário de novo relatório em mobile
- [x] AUD-M6-05 — Lista e painel de membros em mobile
- [x] AUD-M6-06 — Advertências e cursos em mobile
- [x] AUD-M6-07 — Sidebar / menu mobile correto (100dvh + fecha ao navegar)
- [x] AUD-M6-08 — Dashboard em mobile
- [x] AUD-M6-09 — Tela de perfil em mobile
- [x] AUD-M6-10 — Sem scroll horizontal global (overflow-x: hidden no html/body)
- [ ] Testado em iPhone SE (375px) e Galaxy S23 (393px)
- [ ] Nenhum overflow horizontal em nenhuma página

---

**Sprint Anterior:** [Sprint 5 — Refatoração](sprint-5-refatoracao.md)
