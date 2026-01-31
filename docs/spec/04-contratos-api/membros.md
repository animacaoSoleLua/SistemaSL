# 4.2 Membros

**Versao:** 1.0.0
**Ultima Atualizacao:** 2026-01-20

← [Voltar para Contratos de API](README.md)

---

## GET /api/v1/membros

**Descricao:** Lista membros (admin ve todos, membro ve lista basica).

**Query:** `search`, `role`, `page`, `limit`

**Response 200 OK:**

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "string",
      "email": "string",
      "role": "animador",
      "photo_url": "string"
    }
  ]
}
```

---

## POST /api/v1/membros

**Descricao:** Cria membro (admin).

**Request Body:**

```json
{
  "name": "string",
  "email": "string",
  "role": "admin|animador|recreador",
  "password": "string (opcional)"
}
```

**Response 201 Created:**

```json
{
  "data": {
    "id": "uuid",
    "name": "string",
    "email": "string",
    "role": "recreador"
  }
}
```

---

## GET /api/v1/membros/:id

**Descricao:** Detalhe do membro.

**Response 200 OK:**

```json
{
  "data": {
    "id": "uuid",
    "name": "string",
    "email": "string",
    "role": "animador",
    "courses": [],
    "warnings": [
      {
        "id": "uuid",
        "reason": "string",
        "warning_date": "2026-01-10",
        "created_by": "uuid"
      }
    ],
    "warnings_total": 1,
    "suspension": {
      "status": "active",
      "start_date": null,
      "end_date": null
    }
  }
}
```

---

## PATCH /api/v1/membros/:id

**Descricao:** Atualiza dados do membro.

**Request Body:**

```json
{
  "name": "string",
  "email": "string",
  "role": "animador",
  "photo_url": "string"
}
```

**Response 200 OK:**

```json
{
  "data": {
    "id": "uuid",
    "name": "string"
  }
}
```

---

## DELETE /api/v1/membros/:id

**Descricao:** Exclui membro.

**Response 204 No Content**

---

← [Voltar para Contratos de API](README.md)
