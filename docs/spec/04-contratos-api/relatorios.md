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
      "title_schedule": "string",
      "author_id": "uuid",
      "author_name": "string",
      "media": [
        {
          "id": "uuid",
          "url": "string",
          "media_type": "image|video",
          "size_bytes": 123456
        }
      ]
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
  "title_schedule": "string",
  "transport_type": "uber99|carro_empresa|outro",
  "uber_go_value": 12.5,
  "uber_return_value": 12.5,
  "other_car_responsible": "string",
  "has_extra_hours": true,
  "extra_hours_details": "string",
  "outside_brasilia": false,
  "exclusive_event": true,
  "team_summary": "string",
  "team_general_description": "string",
  "team_general_score": 4,
  "event_difficulties": "string",
  "event_difficulty_score": 2,
  "event_quality_score": 5,
  "quality_sound": 4,
  "quality_microphone": 4,
  "speaker_number": 7,
  "electronics_notes": "string",
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
    "author_name": "string",
    "media": [],
    "feedbacks": []
  }
}
```

---

## DELETE /api/v1/relatorios/:id

**Descricao:** Exclui relatorio (admin ou autor).

**Response 204 No Content**

**Erros:**
- 401 Token ausente
- 403 Acesso negado
- 404 Relatorio nao encontrado

---

## GET /api/v1/relatorios/:id/pdf

**Descricao:** Exporta relatorio em PDF.

**Response 200 OK:** `application/pdf` (arquivo)

**Headers:**

```
Content-Disposition: attachment; filename="relatorio-{id}.pdf"
```

**Erros:**
- 401 Token ausente
- 403 Acesso negado
- 404 Relatorio nao encontrado

---

## POST /api/v1/relatorios/:id/media

**Descricao:** Anexa midia ao relatorio.

**Request:** `multipart/form-data`

**Campos:**

```
file (arquivo) - obrigatório
media_type (image|video) - opcional, se não enviado o tipo é inferido pelo arquivo
```

**Validacoes:**
- `media_type` deve ser `image` ou `video`
- Arquivo deve ter extensao valida (ex: .jpg, .png, .mp4)
- Limites: image ate 10MB, video ate 50MB

**Response 201 Created:**

```json
{
  "data": {
    "id": "uuid",
    "url": "string",
    "media_type": "image",
    "size_bytes": 123456
  }
}
```

---

← [Voltar para Contratos de API](README.md)
