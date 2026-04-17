# Reports Statistics Redesign

**Date:** 2026-04-14  
**Status:** Approved  
**Scope:** Redesign the statistics cards in the "Relatórios" (Reports) tab of the Gerência page

## Overview

Replace two statistics metrics in the Reports tab with new, more operationally relevant metrics. The change involves creating a new backend endpoint to calculate and return aggregated statistics, improving performance and separation of concerns.

## Current State

The Reports tab currently displays 4 statistics cards:
1. **Total de Relatórios** — number of reports (events with reports)
2. **Fora de Brasília** — count of events outside Brasília
3. **Eventos Exclusivos** — count of exclusive events
4. **Qualidade Média** — average event quality score

## Desired State

The Reports tab will display 4 new statistics cards:
1. **Total de Relatórios** — number of reports (kept, unchanged)
2. **Gastos de Uber mensal** — sum of all Uber costs (GO + return rides)
3. **Qualidade Média da Caixa de Som** — average sound system quality score
4. **Qualidade Média de Eventos** — average event quality score (renamed from current)

## Removed Metrics

- **Fora de Brasília** — no longer needed operationally
- **Eventos Exclusivos** — no longer needed operationally

## Architecture

### Backend Changes

**New endpoint:** `GET /api/reports/stats` (or appropriate path in routing structure)

**Parameters:**
- `month` (number, 1-12) — month to calculate stats for
- `year` (number) — year to calculate stats for

**Response:**
```json
{
  "total": 15,
  "uberCostTotal": 1250.50,
  "avgSoundQuality": 8.5,
  "avgEventQuality": 7.2
}
```

**Calculations:**
1. `total` — count all reports in the period
2. `uberCostTotal` — sum of `uber_go_value + uber_return_value` for all reports in the period
3. `avgSoundQuality` — average of `quality_sound` field (only non-null values)
4. `avgEventQuality` — average of `event_quality_score` field (only non-null values)

### Frontend Changes

**File:** `frontend/app/gerencia/page.tsx`

**Updates in `loadReportsStats()` function:**
1. Replace current calculation logic with a single API call to `/api/reports/stats`
2. Update the `reportsStats` state to match the new response shape
3. Update the `renderStats()` function to display the new metrics with appropriate icons and labels

**State structure stays the same:**
```typescript
const [reportsStats, setReportsStats] = useState({
  total: 0,
  uberCostTotal: 0,      // new field (rename from outsideBrasilia)
  avgSoundQuality: 0,    // new field (rename from exclusive)
  avgEventQuality: 0,    // existing field, just renamed
});
```

## UI Changes

The 4 stat cards will maintain the same visual design (icons, colors, layout). Changes are semantic only:

| Card | Icon | Color | New Label | Tooltip |
|------|------|-------|-----------|---------|
| 1 | FiFileText | Green | Total de Relatórios | (unchanged) |
| 2 | (new icon TBD) | (TBD) | Gastos de Uber mensal | Soma de todas as corridas Uber (GO + retorno) no período |
| 3 | (new icon TBD) | (TBD) | Qualidade Média da Caixa de Som | Avaliação média de qualidade da caixa de som/eletrônica |
| 4 | FiFileText | Blue | Qualidade Média de Eventos | Média das notas de qualidade dos eventos (0-10) |

## Data Source Mapping

| Metric | Database Field | Type | Calculation |
|--------|---|---|---|
| Total de Relatórios | count(*) | Integer | Row count |
| Gastos de Uber mensal | `uber_go_value`, `uber_return_value` | Float | Sum of both fields |
| Qualidade Média da Caixa de Som | `quality_sound` | Integer (0-10) | Average (non-null only) |
| Qualidade Média de Eventos | `event_quality_score` | Integer (0-10) | Average (non-null only) |

## Implementation Notes

- Period filtering is based on `event_date` in the reports table
- All metrics should handle null/missing values gracefully (exclude from average, show 0 for sums)
- The endpoint should accept the same month/year parameters as the current frontend logic
- Tooltip explanations should clarify what each metric measures (see UI section above)

## Testing Considerations

- Test with reports containing null sound quality or event quality scores
- Test with reports with 0 or null Uber costs
- Verify calculations match the current frontend calculations for total/avgEventQuality
- Test month/year filtering boundaries

## Files Modified

- Backend: Create/update reports stats endpoint (routes + controller/service)
- Frontend: Update `frontend/app/gerencia/page.tsx` (loadReportsStats function, renderStats function, state shape)
- Frontend: Update `frontend/app/gerencia/page.css` if new icon colors are different

## Success Criteria

- ✅ New endpoint returns all 4 metrics correctly
- ✅ Frontend displays new metrics in place of old ones
- ✅ Calculations are accurate for various data scenarios
- ✅ Tooltips clearly explain each metric
- ✅ No performance regression (endpoint is as fast or faster than current frontend processing)
