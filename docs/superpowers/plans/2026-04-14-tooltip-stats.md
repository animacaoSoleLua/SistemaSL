# Tooltip Stats Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add tooltip icons with technical explanations to all stat cards in the Gerência page (Members, Reports, Courses tabs).

**Architecture:** Create a reusable `Tooltip` component for managing hover/visibility state and positioning, then a `TooltipIcon` wrapper that combines the help icon + tooltip. Integrate into `gerencia/page.tsx` by wrapping each stat label.

**Tech Stack:** React (hooks), TypeScript, CSS animations, react-icons (FiHelpCircle)

---

## File Structure

```
frontend/components/
├─ Tooltip.tsx          (new) — generic tooltip component
└─ TooltipIcon.tsx      (new) — help icon + tooltip wrapper

frontend/app/gerencia/
├─ page.tsx             (modified) — integrate TooltipIcons in renderStats()
└─ page.css             (modified) — add tooltip animations & styling
```

---

## Task 1: Create Tooltip.tsx Component

**Files:**
- Create: `frontend/components/Tooltip.tsx`

- [ ] **Step 1: Create Tooltip.tsx with hover state management**

Create `frontend/components/Tooltip.tsx`:

```typescript
"use client";

import { ReactNode, useState, useRef, useEffect } from "react";
import "./Tooltip.css";

interface TooltipProps {
  children: ReactNode;
  content: string;
  position?: "top" | "bottom" | "left" | "right";
  delay?: number;
}

export default function Tooltip({
  children,
  content,
  position = "top",
  delay = 0,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [adjustedPosition, setAdjustedPosition] = useState<"top" | "bottom" | "left" | "right">(position);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Adjust position if tooltip goes off-screen
  useEffect(() => {
    if (!isVisible || !tooltipRef.current || !triggerRef.current) return;

    const tooltip = tooltipRef.current.getBoundingClientRect();
    const trigger = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // Check if top position goes off-screen
    if (position === "top" && tooltip.top < 8) {
      setAdjustedPosition("bottom");
    } else if (position === "bottom" && tooltip.bottom > viewportHeight - 8) {
      setAdjustedPosition("top");
    }
  }, [isVisible, position]);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  const handleFocus = () => {
    setIsVisible(true);
  };

  const handleBlur = () => {
    setIsVisible(false);
  };

  return (
    <div
      ref={triggerRef}
      className="tooltip-trigger"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      {children}
      {isVisible && (
        <div
          ref={tooltipRef}
          className={`tooltip-content tooltip-${adjustedPosition}`}
          role="tooltip"
        >
          {content}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create Tooltip.css with styling and animations**

Create `frontend/components/Tooltip.css`:

```css
.tooltip-trigger {
  position: relative;
  display: inline-block;
}

.tooltip-content {
  position: absolute;
  background-color: #333;
  color: #fff;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 13px;
  line-height: 1.4;
  font-weight: normal;
  max-width: 280px;
  white-space: normal;
  word-wrap: break-word;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  pointer-events: none;
  animation: tooltip-fade-in 200ms ease-out;
}

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

/* Position variants */
.tooltip-top {
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
}

.tooltip-bottom {
  top: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
}

.tooltip-left {
  right: calc(100% + 8px);
  top: 50%;
  transform: translateY(-50%);
}

.tooltip-right {
  left: calc(100% + 8px);
  top: 50%;
  transform: translateY(-50%);
}
```

- [ ] **Step 3: Verify Tooltip.tsx and Tooltip.css are created correctly**

Run: `ls -la frontend/components/Tooltip.*`

Expected output:
```
frontend/components/Tooltip.tsx
frontend/components/Tooltip.css
```

---

## Task 2: Create TooltipIcon.tsx Component

**Files:**
- Create: `frontend/components/TooltipIcon.tsx`

- [ ] **Step 1: Create TooltipIcon.tsx**

Create `frontend/components/TooltipIcon.tsx`:

```typescript
"use client";

import { FiHelpCircle } from "react-icons/fi";
import Tooltip from "./Tooltip";
import "./TooltipIcon.css";

interface TooltipIconProps {
  content: string;
  label: string;
  position?: "top" | "bottom";
}

export default function TooltipIcon({
  content,
  label,
  position = "top",
}: TooltipIconProps) {
  return (
    <Tooltip content={content} position={position}>
      <button
        type="button"
        className="tooltip-icon-button"
        aria-label={`Informações sobre ${label}`}
        tabIndex={0}
      >
        <FiHelpCircle size={16} />
      </button>
    </Tooltip>
  );
}
```

- [ ] **Step 2: Create TooltipIcon.css**

Create `frontend/components/TooltipIcon.css`:

```css
.tooltip-icon-button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  margin-left: 6px;
  color: #666;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: color 150ms ease;
  vertical-align: middle;
}

.tooltip-icon-button:hover,
.tooltip-icon-button:focus {
  color: #333;
  outline: none;
}

.tooltip-icon-button:focus-visible {
  outline: 2px solid #007bff;
  outline-offset: 2px;
  border-radius: 2px;
}
```

- [ ] **Step 3: Verify TooltipIcon.tsx and TooltipIcon.css are created**

Run: `ls -la frontend/components/TooltipIcon.*`

Expected output:
```
frontend/components/TooltipIcon.tsx
frontend/components/TooltipIcon.css
```

---

## Task 3: Integrate TooltipIcon into gerencia/page.tsx — Membros Tab

**Files:**
- Modify: `frontend/app/gerencia/page.tsx:1-25` (add import)
- Modify: `frontend/app/gerencia/page.tsx:422-457` (Membros renderStats section)

- [ ] **Step 1: Add TooltipIcon import to gerencia/page.tsx**

In `frontend/app/gerencia/page.tsx`, after existing imports (around line 1), add:

```typescript
import TooltipIcon from "../../components/TooltipIcon";
```

Full import section should look like:

```typescript
import "./page.css";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FiBookOpen,
  FiCheckCircle,
  FiDownload,
  FiFileText,
  FiSmile,
  FiTrendingUp,
  FiUserX,
  FiUsers,
  FiXCircle,
} from "react-icons/fi";
import { getCourses, getEnrolledMembers, getFeedbacks, getMembers, getReports, getWarnings } from "../../lib/api";
import {
  getDefaultRoute,
  getStoredUser,
  isRoleAllowed,
  type Role,
} from "../../lib/auth";
import TooltipIcon from "../../components/TooltipIcon";
```

- [ ] **Step 2: Replace Membros stats section in renderStats()**

Find the `if (activeTab === "membros")` block (around line 423) and replace the entire stats rendering with:

```jsx
if (activeTab === "membros") {
  return (
    <>
      <div className="stat-item">
        <span className="stat-icon stat-icon--success"><FiCheckCircle aria-hidden="true" /></span>
        <div className="stat-body">
          <span className="stat-value">{statsLoading ? "—" : membersStats.disciplinary}%</span>
          <span className="stat-label">
            Saúde Disciplinar
            <TooltipIcon
              label="Saúde Disciplinar"
              content="Porcentagem de membros que não possuem nenhuma advertência ativa no sistema. Calculado em tempo real baseado no registro de advertências."
              position="top"
            />
          </span>
        </div>
      </div>
      <div className="stat-divider" />
      <div className="stat-item">
        <span className="stat-icon stat-icon--warning"><FiSmile aria-hidden="true" /></span>
        <div className="stat-body">
          <span className="stat-value">{statsLoading ? "—" : membersStats.satisfaction}%</span>
          <span className="stat-label">
            Satisfação do Cliente
            <TooltipIcon
              label="Satisfação do Cliente"
              content="Porcentagem de feedbacks positivos coletados nos últimos 30 dias. Baseado em pesquisas de satisfação preenchidas após eventos."
              position="top"
            />
          </span>
        </div>
      </div>
      <div className="stat-divider" />
      <div className="stat-item">
        <span className="stat-icon stat-icon--info"><FiTrendingUp aria-hidden="true" /></span>
        <div className="stat-body">
          <span className="stat-value">{statsLoading ? "—" : membersStats.attendance}%</span>
          <span className="stat-label">
            Taxa de Assiduidade
            <TooltipIcon
              label="Taxa de Assiduidade"
              content="Porcentagem de participantes que compareceram aos cursos nos últimos 30 dias. Calculado a partir do status de presença registrado no sistema."
              position="top"
            />
          </span>
        </div>
      </div>
      <div className="stat-divider" />
      <div className="stat-item">
        <span className="stat-icon stat-icon--danger"><FiXCircle aria-hidden="true" /></span>
        <div className="stat-body">
          <span className="stat-value">{statsLoading ? "—" : membersStats.cancelation}%</span>
          <span className="stat-label">
            Taxa de Cancelamento
            <TooltipIcon
              label="Taxa de Cancelamento"
              content="Porcentagem de inscritos que não compareceram aos cursos nos últimos 30 dias. Complementa a taxa de assiduidade."
              position="top"
            />
          </span>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 3: Commit Membros tab changes**

```bash
git add frontend/app/gerencia/page.tsx
git commit -m "feat: add tooltips to membros stats"
```

---

## Task 4: Integrate TooltipIcon into gerencia/page.tsx — Relatórios Tab

**Files:**
- Modify: `frontend/app/gerencia/page.tsx:459-494` (Relatórios renderStats section)

- [ ] **Step 1: Replace Relatórios stats section in renderStats()**

Find the `else if (activeTab === "relatorios")` block (around line 459) and replace the entire stats rendering with:

```jsx
else if (activeTab === "relatorios") {
  return (
    <>
      <div className="stat-item">
        <span className="stat-icon stat-icon--green"><FiFileText aria-hidden="true" /></span>
        <div className="stat-body">
          <span className="stat-value">{statsLoading ? "—" : reportsStats.total}</span>
          <span className="stat-label">
            Total de Relatórios
            <TooltipIcon
              label="Total de Relatórios"
              content="Número total de eventos com relatórios registrados no período selecionado."
              position="top"
            />
          </span>
        </div>
      </div>
      <div className="stat-divider" />
      <div className="stat-item">
        <span className="stat-icon stat-icon--purple"><FiFileText aria-hidden="true" /></span>
        <div className="stat-body">
          <span className="stat-value">{statsLoading ? "—" : reportsStats.outsideBrasilia}</span>
          <span className="stat-label">
            Fora de Brasília
            <TooltipIcon
              label="Fora de Brasília"
              content="Quantidade de eventos realizados fora da região de Brasília conforme indicado no formulário de relatório."
              position="top"
            />
          </span>
        </div>
      </div>
      <div className="stat-divider" />
      <div className="stat-item">
        <span className="stat-icon stat-icon--amber"><FiFileText aria-hidden="true" /></span>
        <div className="stat-body">
          <span className="stat-value">{statsLoading ? "—" : reportsStats.exclusive}</span>
          <span className="stat-label">
            Eventos Exclusivos
            <TooltipIcon
              label="Eventos Exclusivos"
              content="Quantidade de eventos marcados como exclusivos no sistema durante o período."
              position="top"
            />
          </span>
        </div>
      </div>
      <div className="stat-divider" />
      <div className="stat-item">
        <span className="stat-icon stat-icon--blue"><FiFileText aria-hidden="true" /></span>
        <div className="stat-body">
          <span className="stat-value">{statsLoading ? "—" : reportsStats.avgQuality}</span>
          <span className="stat-label">
            Qualidade Média
            <TooltipIcon
              label="Qualidade Média"
              content="Média aritmética das notas de qualidade (0-10) atribuídas aos eventos no período."
              position="top"
            />
          </span>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Commit Relatórios tab changes**

```bash
git add frontend/app/gerencia/page.tsx
git commit -m "feat: add tooltips to relatórios stats"
```

---

## Task 5: Integrate TooltipIcon into gerencia/page.tsx — Cursos Tab

**Files:**
- Modify: `frontend/app/gerencia/page.tsx:495-531` (Cursos renderStats section)

- [ ] **Step 1: Replace Cursos stats section in renderStats()**

Find the `else if (activeTab === "cursos")` block (around line 495) and replace the entire stats rendering with:

```jsx
else if (activeTab === "cursos") {
  return (
    <>
      <div className="stat-item">
        <span className="stat-icon stat-icon--blue"><FiBookOpen aria-hidden="true" /></span>
        <div className="stat-body">
          <span className="stat-value">{statsLoading ? "—" : coursesStats.total}</span>
          <span className="stat-label">
            Total de Cursos
            <TooltipIcon
              label="Total de Cursos"
              content="Número total de cursos realizados no período selecionado."
              position="top"
            />
          </span>
        </div>
      </div>
      <div className="stat-divider" />
      <div className="stat-item">
        <span className="stat-icon stat-icon--green"><FiUsers aria-hidden="true" /></span>
        <div className="stat-body">
          <span className="stat-value">{statsLoading ? "—" : coursesStats.enrollments}</span>
          <span className="stat-label">
            Total de Inscrições
            <TooltipIcon
              label="Total de Inscrições"
              content="Soma de todas as inscrições em cursos durante o período. Um participante pode se inscrever em múltiplos cursos."
              position="top"
            />
          </span>
        </div>
      </div>
      <div className="stat-divider" />
      <div className="stat-item">
        <span className="stat-icon stat-icon--amber"><FiBookOpen aria-hidden="true" /></span>
        <div className="stat-body">
          <span className="stat-value">{statsLoading ? "—" : coursesStats.avgOccupancy}%</span>
          <span className="stat-label">
            Ocupação Média
            <TooltipIcon
              label="Ocupação Média"
              content="Porcentagem média de vagas preenchidas nos cursos do período. Calculado apenas para cursos com capacidade definida."
              position="top"
            />
          </span>
        </div>
      </div>
      <div className="stat-divider" />
      <div className="stat-item">
        <span className="stat-icon stat-icon--purple"><FiUsers aria-hidden="true" /></span>
        <div className="stat-body">
          <span className="stat-value">{statsLoading ? "—" : coursesStats.activeInstructors}</span>
          <span className="stat-label">
            Instrutores Ativos
            <TooltipIcon
              label="Instrutores Ativos"
              content="Número de instrutores únicos que ministraram cursos no período selecionado."
              position="top"
            />
          </span>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Commit Cursos tab changes**

```bash
git add frontend/app/gerencia/page.tsx
git commit -m "feat: add tooltips to cursos stats"
```

---

## Task 6: Test Tooltips Locally

**Files:**
- Test: `frontend/app/gerencia/page.tsx` (manual browser testing)

- [ ] **Step 1: Start the dev server**

Run: `npm run dev` (from `frontend/` directory)

Expected: Server starts on `http://localhost:3000`

- [ ] **Step 2: Navigate to Gerência page**

Open browser to `http://localhost:3000/gerencia`

Expected: Page loads with 3 tabs (Membros, Relatórios, Cursos) and stats visible

- [ ] **Step 3: Test Membros tab tooltips**

- Click on Membros tab
- Hover over each help icon (❓) next to stat labels
- Verify: Tooltip appears with fade-in animation above icon
- Verify: Tooltip text is readable and complete
- Verify: Tooltip disappears when mouse moves away
- Verify: Can focus button with Tab key and tooltip appears on focus

Expected: All 4 help icons show appropriate tooltips:
1. Saúde Disciplinar ✓
2. Satisfação do Cliente ✓
3. Taxa de Assiduidade ✓
4. Taxa de Cancelamento ✓

- [ ] **Step 4: Test Relatórios tab tooltips**

- Click on Relatórios tab
- Hover over each help icon next to stat labels
- Verify: All 4 tooltips appear and are readable
- Test different periods (month/year selectors) — tooltips should still work

Expected: All 4 help icons show appropriate tooltips:
1. Total de Relatórios ✓
2. Fora de Brasília ✓
3. Eventos Exclusivos ✓
4. Qualidade Média ✓

- [ ] **Step 5: Test Cursos tab tooltips**

- Click on Cursos tab
- Hover over each help icon next to stat labels
- Verify: All 4 tooltips appear and are readable
- Test different periods — tooltips should still work

Expected: All 4 help icons show appropriate tooltips:
1. Total de Cursos ✓
2. Total de Inscrições ✓
3. Ocupação Média ✓
4. Instrutores Ativos ✓

- [ ] **Step 6: Test tooltip positioning at viewport edges**

- Scroll to bottom of Gerência page
- Hover over help icons near bottom
- Verify: If tooltip goes off-screen, it flips to opposite position (bottom → top)

Expected: Tooltips stay visible within viewport

- [ ] **Step 7: Test responsive behavior**

- Resize browser window to mobile size (< 640px)
- Navigate through tabs
- Hover over help icons
- Verify: Tooltips still visible and readable on narrow screens

Expected: Tooltips adapt to screen size

- [ ] **Step 8: Verify no console errors**

- Open DevTools (F12) → Console tab
- Check for any errors related to Tooltip or TooltipIcon
- Verify: No TypeScript errors in the IDE

Expected: Clean console, no errors

---

## Task 7: Final Verification and Commit

**Files:**
- Verify: `frontend/components/Tooltip.tsx`
- Verify: `frontend/components/Tooltip.css`
- Verify: `frontend/components/TooltipIcon.tsx`
- Verify: `frontend/components/TooltipIcon.css`
- Verify: `frontend/app/gerencia/page.tsx`

- [ ] **Step 1: Run type check (if applicable)**

Run: `npm run type-check` (or equivalent TypeScript check in your project)

Expected: No TypeScript errors

- [ ] **Step 2: View git log to confirm all commits**

Run: `git log --oneline -5`

Expected output (or similar):
```
abc1234 feat: add tooltips to cursos stats
def5678 feat: add tooltips to relatórios stats
ghi9101 feat: add tooltips to membros stats
jkl1112 some previous commit
```

- [ ] **Step 3: Final review of changes**

Run: `git diff HEAD~3 HEAD frontend/`

Expected: Shows all Tooltip and TooltipIcon component additions + modifications to gerencia/page.tsx

- [ ] **Step 4: Create summary commit (optional but recommended)**

If you want a single consolidated view, create an optional summary:

Run: `git log --oneline --graph -5`

Or leave as-is with 3 separate commits (Task 3, 4, 5).

---

## Success Criteria

✅ **Tooltip component created** — `Tooltip.tsx` with hover state, positioning logic, animations  
✅ **TooltipIcon component created** — `TooltipIcon.tsx` wraps help icon + tooltip  
✅ **Membros tab updated** — 4 tooltips with specific content  
✅ **Relatórios tab updated** — 4 tooltips with specific content  
✅ **Cursos tab updated** — 4 tooltips with specific content  
✅ **Animations working** — Fade-in 200ms on hover/focus  
✅ **Responsive** — Tooltips stay visible on all screen sizes  
✅ **Accessible** — Keyboard focus support (Tab), aria-labels present  
✅ **No console errors** — Clean browser console  

---

**Plan complete. Ready for execution.**
