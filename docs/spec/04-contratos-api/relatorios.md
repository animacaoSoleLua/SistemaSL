# 4.3 Relatorios

**Versao:** 1.0.0
**Ultima Atualizacao:** 2026-01-20

← [Voltar para Contratos de API](README.md)

---

## GET /api/v1/relatorios

**Descricao:** Lista relatorios (admin ve todos, animador ve os seus).

**Query:** `period_start`, `period_end`, `author_id`, `search`, `page`, `limit`

**Response 200 OK:**

```json
{
  "data": [
    {
      "id": "uuid",
      "event_date": "2026-01-10",
      "contractor_name": "string",
      "author_id": "uuid"
    }
  ]
}
```

---

## POST /api/v1/relatorios

**Descricao:** Cria relatorio.

**Request Body:**

```json
{
  "event_date": "2026-01-10",
  "contractor_name": "string",
  "location": "string",
  "team_summary": "string",
  "quality_sound": 4,
  "quality_microphone": 4,
  "notes": "string",
  "feedbacks": [
    { "member_id": "uuid", "feedback": "string" }
  ]
}
```

**Response 201 Created:**

```json
{
  "data": {
    "id": "uuid"
  }
}
```

---

## GET /api/v1/relatorios/:id

**Descricao:** Detalhe do relatorio.

**Response 200 OK:**

```json
{
  "data": {
    "id": "uuid",
    "media": [],
    "feedbacks": []
  }
}
```

---

## POST /api/v1/relatorios/:id/media

**Descricao:** Anexa midia ao relatorio.

**Request Body:**

```json
{
  "media_type": "image|video",
  "url": "string"
}
```

**Response 201 Created:**

```json
{
  "data": {
    "id": "uuid",
    "url": "string"
  }
}
```

---

← [Voltar para Contratos de API](README.md)
