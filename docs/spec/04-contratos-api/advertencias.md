# 4.5 Advertencias

**Versao:** 1.0.0
**Ultima Atualizacao:** 2026-01-20

← [Voltar para Contratos de API](README.md)

---

## GET /api/v1/advertencias

**Descricao:** Lista advertencias (admin ve todas, membro ve as suas).

**Query:** `member_id`, `page`, `limit`

**Response 200 OK:**

```json
{
  "data": [
    {
      "id": "uuid",
      "member_id": "uuid",
      "reason": "string",
      "warning_date": "2026-01-10"
    }
  ]
}
```

---

## POST /api/v1/advertencias

**Descricao:** Cria advertencia.

**Request Body:**

```json
{
  "member_id": "uuid",
  "reason": "string",
  "warning_date": "2026-01-10"
}
```

**Response 201 Created:**

```json
{
  "data": { "id": "uuid" }
}
```

---

## DELETE /api/v1/advertencias/:id

**Descricao:** Apaga advertencia (admin).

**Response 204 No Content**

---

← [Voltar para Contratos de API](README.md)
