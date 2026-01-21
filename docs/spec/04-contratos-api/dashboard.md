# 4.6 Dashboard

**Versao:** 1.0.0
**Ultima Atualizacao:** 2026-01-20

← [Voltar para Contratos de API](README.md)

---

## GET /api/v1/dashboard/resumo

**Descricao:** Resumo de relatorios por periodo.

**Query:** `period_start`, `period_end`

**Response 200 OK:**

```json
{
  "data": {
    "total_events": 10,
    "total_reports": 10,
    "avg_quality": 4.2
  }
}
```

---

## GET /api/v1/dashboard/animadores

**Descricao:** Eventos por animador.

**Query:** `period_start`, `period_end`

**Response 200 OK:**

```json
{
  "data": [
    { "animador": "string", "events": 5 }
  ]
}
```

---

## GET /api/v1/dashboard/qualidade

**Descricao:** Indicadores de qualidade.

**Query:** `period_start`, `period_end`

**Response 200 OK:**

```json
{
  "data": {
    "sound": 4.1,
    "microphone": 3.9
  }
}
```

---

← [Voltar para Contratos de API](README.md)
