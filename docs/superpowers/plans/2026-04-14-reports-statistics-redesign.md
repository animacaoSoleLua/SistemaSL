# Reports Statistics Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a backend endpoint to calculate reports statistics and update the frontend gerência page to display new metrics (Uber costs, sound quality, event quality).

**Architecture:** New stats endpoint in backend calculates aggregated metrics based on month/year filters; frontend calls this endpoint instead of performing calculations client-side. All four stat cards updated with proper labels, icons, and tooltips.

**Tech Stack:** Fastify (backend routes), Prisma (queries), React (frontend state/rendering)

---

### Task 1: Create Reports Stats DTO

**Files:**
- Create: `backend/src/relatorios/dto/reports-stats.dto.ts`

- [ ] **Step 1: Write the DTO file with response shape**

```typescript
export interface ReportsStatsResponse {
  total: number;
  uberCostTotal: number;
  avgSoundQuality: number;
  avgEventQuality: number;
}
```

- [ ] **Step 2: Commit the DTO**

```bash
git add backend/src/relatorios/dto/reports-stats.dto.ts
git commit -m "feat: create reports stats response DTO"
```

---

### Task 2: Add Stats Calculation Method to Store

**Files:**
- Modify: `backend/src/relatorios/store.ts` (add new function)

- [ ] **Step 1: Add the stats calculation function to store.ts**

Add this function at the end of the file (before any export statements if present):

```typescript
export async function getReportsStats(
  month: number,
  year: number
): Promise<{ total: number; uberCostTotal: number; avgSoundQuality: number; avgEventQuality: number }> {
  // Calculate date range for the month
  const startDate = new Date(year, month - 1, 1); // month is 1-indexed
  const endDate = new Date(year, month, 0); // last day of month

  // Query all reports in the period
  const reports = await prisma.report.findMany({
    where: {
      eventDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      uberGoValue: true,
      uberReturnValue: true,
      qualitySound: true,
      eventQualityScore: true,
    },
  });

  // Calculate total count
  const total = reports.length;

  // Calculate Uber costs (sum of GO + return values)
  const uberCostTotal = reports.reduce((sum, report) => {
    const goValue = report.uberGoValue ?? 0;
    const returnValue = report.uberReturnValue ?? 0;
    return sum + goValue + returnValue;
  }, 0);

  // Calculate average sound quality (exclude nulls)
  const soundQualityValues = reports
    .map((r) => r.qualitySound)
    .filter((q) => q !== null && q !== undefined) as number[];
  const avgSoundQuality = soundQualityValues.length > 0
    ? Math.round(soundQualityValues.reduce((a, b) => a + b, 0) / soundQualityValues.length)
    : 0;

  // Calculate average event quality (exclude nulls)
  const eventQualityValues = reports
    .map((r) => r.eventQualityScore)
    .filter((q) => q !== null && q !== undefined) as number[];
  const avgEventQuality = eventQualityValues.length > 0
    ? Math.round(eventQualityValues.reduce((a, b) => a + b, 0) / eventQualityValues.length)
    : 0;

  return {
    total,
    uberCostTotal,
    avgSoundQuality,
    avgEventQuality,
  };
}
```

- [ ] **Step 2: Commit the store changes**

```bash
git add backend/src/relatorios/store.ts
git commit -m "feat: add getReportsStats function to calculate monthly statistics"
```

---

### Task 3: Add Stats Endpoint to Routes

**Files:**
- Modify: `backend/src/relatorios/routes.ts` (add new route)

- [ ] **Step 1: Import the DTO and the new store function**

At the top of routes.ts, after the existing imports from "./store.js", add:

```typescript
import { getReportsStats } from "./store.js";
import type { ReportsStatsResponse } from "./dto/reports-stats.dto.js";
```

- [ ] **Step 2: Add the stats endpoint**

Add this route after the `app.get("/api/v1/relatorios")` route (around line 410):

```typescript
  app.get("/api/v1/relatorios/stats", async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({
        error: "unauthorized",
        message: "Token ausente",
      });
    }

    const query = request.query as { month?: string; year?: string };
    const month = query.month ? Number(query.month) : undefined;
    const year = query.year ? Number(query.year) : undefined;

    if (!month || !year || month < 1 || month > 12 || year < 2020) {
      return reply.status(400).send({
        error: "invalid_request",
        message: "Mes ou ano invalido",
      });
    }

    const stats = await getReportsStats(month, year);

    return reply.status(200).send({
      data: stats,
    });
  });
```

**Important:** Make sure this route is added BEFORE the `app.get("/api/v1/relatorios/:id")` route, otherwise the `:id` route will catch the `/stats` request.

- [ ] **Step 3: Commit the routes changes**

```bash
git add backend/src/relatorios/routes.ts
git commit -m "feat: add GET /api/v1/relatorios/stats endpoint for monthly statistics"
```

---

### Task 4: Update Frontend State Shape

**Files:**
- Modify: `frontend/app/gerencia/page.tsx` (update state initialization)

- [ ] **Step 1: Find and update the reportsStats state declaration**

Around line 115, replace:

```typescript
  const [reportsStats, setReportsStats] = useState({
    total: 0,
    outsideBrasilia: 0,
    exclusive: 0,
    avgQuality: 0,
  });
```

With:

```typescript
  const [reportsStats, setReportsStats] = useState({
    total: 0,
    uberCostTotal: 0,
    avgSoundQuality: 0,
    avgEventQuality: 0,
  });
```

- [ ] **Step 2: Commit the state changes**

```bash
git add frontend/app/gerencia/page.tsx
git commit -m "feat: update reportsStats state shape to match new endpoint"
```

---

### Task 5: Update loadReportsStats Function

**Files:**
- Modify: `frontend/app/gerencia/page.tsx` (replace the loadReportsStats function)

- [ ] **Step 1: Replace the entire loadReportsStats function (lines 256-279)**

Replace the current `loadReportsStats` async function with:

```typescript
    const loadReportsStats = async () => {
      try {
        const response = await fetch(
          `/api/v1/relatorios/stats?month=${reportsMonth}&year=${reportsYear}`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch reports stats");
        }
        const json = await response.json();
        setReportsStats(json.data);
      } catch (error) {
        console.error("Error loading reports stats:", error);
        setReportsStats({
          total: 0,
          uberCostTotal: 0,
          avgSoundQuality: 0,
          avgEventQuality: 0,
        });
      }
    };
```

- [ ] **Step 2: Test that the function signature and behavior is correct**

The function should be called from the useEffect on line 312-319. Verify the useEffect includes `reportsMonth` and `reportsYear` in dependencies.

- [ ] **Step 3: Commit the loadReportsStats changes**

```bash
git add frontend/app/gerencia/page.tsx
git commit -m "feat: replace loadReportsStats to call new backend stats endpoint"
```

---

### Task 6: Update Stats Rendering (Part 1 - Card Data)

**Files:**
- Modify: `frontend/app/gerencia/page.tsx` (update renderStats function for relatórios tab)

- [ ] **Step 1: Update the relatórios section of renderStats (lines 488-550)**

Replace the entire `else if (activeTab === "relatorios")` block with:

```typescript
    } else if (activeTab === "relatorios") {
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
            <span className="stat-icon stat-icon--amber"><FiDownload aria-hidden="true" /></span>
            <div className="stat-body">
              <span className="stat-value">{statsLoading ? "—" : `R$ ${reportsStats.uberCostTotal.toFixed(2)}`}</span>
              <span className="stat-label">
                Gastos de Uber mensal
                <TooltipIcon
                  label="Gastos de Uber mensal"
                  content="Soma de todas as corridas Uber (GO + retorno) registradas no período. Baseado nos valores informados nos relatórios."
                  position="top"
                />
              </span>
            </div>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-icon stat-icon--purple"><FiVolume2 aria-hidden="true" /></span>
            <div className="stat-body">
              <span className="stat-value">{statsLoading ? "—" : `${reportsStats.avgSoundQuality}`}</span>
              <span className="stat-label">
                Qualidade Média da Caixa de Som
                <TooltipIcon
                  label="Qualidade Média da Caixa de Som"
                  content="Avaliação média (0-10) da qualidade da caixa de som e eletrônica durante os eventos do período."
                  position="top"
                />
              </span>
            </div>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-icon stat-icon--blue"><FiFileText aria-hidden="true" /></span>
            <div className="stat-body">
              <span className="stat-value">{statsLoading ? "—" : `${reportsStats.avgEventQuality}`}</span>
              <span className="stat-label">
                Qualidade Média de Eventos
                <TooltipIcon
                  label="Qualidade Média de Eventos"
                  content="Média aritmética das notas de qualidade (0-10) atribuídas aos eventos no período."
                  position="top"
                />
              </span>
            </div>
          </div>
        </>
      );
```

- [ ] **Step 2: Add FiVolume2 and FiDownload to imports (top of file)**

Update the import statement around line 6-16 to include `FiVolume2` and `FiDownload`:

```typescript
import {
  FiBookOpen,
  FiCheckCircle,
  FiDownload,
  FiFileText,
  FiSmile,
  FiTrendingUp,
  FiUserX,
  FiUsers,
  FiVolume2,
  FiXCircle,
} from "react-icons/fi";
```

- [ ] **Step 3: Commit the renderStats changes**

```bash
git add frontend/app/gerencia/page.tsx
git commit -m "feat: update renderStats to display new reports statistics cards"
```

---

### Task 7: Add CSS Styling for New Icons (if needed)

**Files:**
- Modify: `frontend/app/gerencia/page.css` (verify or add new icon color styles)

- [ ] **Step 1: Check if stat-icon--amber and stat-icon--purple styles exist**

Look at lines 139-162 in page.css. They should already exist. If they don't, add:

```css
.stat-icon--purple { color: #6f4cff; background: rgba(111, 76, 255, 0.1); }
.stat-icon--amber  { color: #f59e0b; background: rgba(245, 158, 11, 0.1); }
```

These are already in the file, so no changes needed.

- [ ] **Step 2: Verify dark theme overrides exist**

Around lines 450-500, verify that dark theme styles are already defined. They should be.

- [ ] **Step 3: No CSS changes needed - styles already exist**

The existing CSS covers all the new colors and icons. No commit needed.

---

### Task 8: Test Backend Endpoint

**Files:**
- Test: Manual API call

- [ ] **Step 1: Start the backend server**

```bash
cd backend
npm run dev
```

Expected: Server starts on port 3001 (or configured port)

- [ ] **Step 2: Test the endpoint with curl or Postman**

```bash
curl -X GET "http://localhost:3001/api/v1/relatorios/stats?month=4&year=2026" \
  -H "Authorization: Bearer <your-test-token>"
```

Expected response:
```json
{
  "data": {
    "total": 5,
    "uberCostTotal": 125.50,
    "avgSoundQuality": 8,
    "avgEventQuality": 7
  }
}
```

- [ ] **Step 3: Test with invalid parameters**

```bash
curl -X GET "http://localhost:3001/api/v1/relatorios/stats?month=13&year=2026" \
  -H "Authorization: Bearer <your-test-token>"
```

Expected: 400 error with message "Mes ou ano invalido"

- [ ] **Step 4: No commit needed for manual testing**

---

### Task 9: Test Frontend Integration

**Files:**
- Test: Manual browser testing

- [ ] **Step 1: Start the frontend dev server**

```bash
cd frontend
npm run dev
```

Expected: Frontend starts on http://localhost:3000

- [ ] **Step 2: Navigate to gerência page and click Relatórios tab**

- [ ] **Step 3: Verify the 4 new statistics cards display**

Expected cards in order:
1. Total de Relatórios (green FiFileText icon)
2. Gastos de Uber mensal (amber FiDownload icon) - shows currency format
3. Qualidade Média da Caixa de Som (purple FiVolume2 icon) - shows 0-10 value
4. Qualidade Média de Eventos (blue FiFileText icon) - shows 0-10 value

- [ ] **Step 4: Verify tooltips work on each card**

Hover over each stat label and verify tooltip appears with correct description.

- [ ] **Step 5: Verify month/year filter works**

Change the month/year selectors and verify the stats update with new values.

- [ ] **Step 6: No commit needed for manual testing**

---

### Task 10: Final Review and Cleanup

**Files:**
- Review: All modified files

- [ ] **Step 1: Check git status for uncommitted changes**

```bash
git status
```

Expected: All relevant changes should be committed. Only docs/superpowers/specs/ files may be uncommitted.

- [ ] **Step 2: View git log to verify commits**

```bash
git log --oneline -10
```

Expected: Should see commits for:
- "feat: create reports stats response DTO"
- "feat: add getReportsStats function to calculate monthly statistics"
- "feat: add GET /api/v1/relatorios/stats endpoint for monthly statistics"
- "feat: update reportsStats state shape to match new endpoint"
- "feat: replace loadReportsStats to call new backend stats endpoint"
- "feat: update renderStats to display new reports statistics cards"

- [ ] **Step 3: Run type checking if available**

```bash
cd backend && npm run build  # or tsc --noEmit
cd frontend && npm run build
```

Expected: No TypeScript errors

- [ ] **Step 4: Final manual testing in browser**

Verify all 4 cards appear, load data correctly, and respond to filter changes.

- [ ] **Step 5: Create final commit summarizing the feature**

```bash
git log --oneline -6 | head -6
```

No additional commit needed - the feature is complete with individual commits.
