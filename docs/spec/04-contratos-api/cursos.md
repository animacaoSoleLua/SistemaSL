# 4.4 Cursos

**Versao:** 1.0.0
**Ultima Atualizacao:** 2026-01-20

← [Voltar para Contratos de API](README.md)

---

## GET /api/v1/cursos

**Descricao:** Lista cursos disponiveis.

**Query:** `status`, `page`, `limit`

**Response 200 OK:**

```json
{
  "data": [
    {
      "id": "uuid",
      "title": "string",
      "course_date": "2026-02-01",
      "capacity": 20,
      "created_by": "uuid",
      "instructor": {
        "id": "uuid",
        "name": "string"
      }
    }
  ]
}
```

---

## POST /api/v1/cursos

**Descricao:** Cria curso (admin).

**Request Body:**

```json
{
  "title": "string",
  "description": "string",
  "course_date": "2026-02-01",
  "location": "string",
  "capacity": 20,
  "instructor_id": "uuid"
}
```

**Response 201 Created:**

```json
{
  "data": { "id": "uuid" }
}
```

---

## PATCH /api/v1/cursos/:id

**Descricao:** Atualiza dados do curso (admin ou criador).

**Request Body:**

```json
{
  "title": "string",
  "description": "string",
  "course_date": "2026-02-01",
  "location": "string",
  "capacity": 20,
  "instructor_id": "uuid"
}
```

**Response 200 OK:**

```json
{
  "data": { "id": "uuid" }
}
```

---

## GET /api/v1/cursos/:id

**Descricao:** Detalhe do curso.

**Response 200 OK:**

```json
{
  "data": {
    "id": "uuid",
    "title": "string",
    "created_by": "uuid",
    "instructor": {
      "id": "uuid",
      "name": "string"
    }
  }
}
```

---

## DELETE /api/v1/cursos/:id

**Descricao:** Remove curso (admin ou criador).

**Response 200 OK:**

```json
{
  "data": { "id": "uuid" }
}
```

---

## POST /api/v1/cursos/:id/inscricoes

**Descricao:** Inscreve membro no curso.

**Request Body:**

```json
{
  "member_id": "uuid"
}
```

**Response 201 Created:**

```json
{
  "data": { "id": "uuid", "status": "enrolled" }
}
```

---

## PATCH /api/v1/cursos/:id/inscricoes/:inscricaoId

**Descricao:** Atualiza presenca/falta.

**Request Body:**

```json
{
  "status": "attended|missed"
}
```

**Response 200 OK:**

```json
{
  "data": { "id": "uuid", "status": "attended" }
}
```

---

← [Voltar para Contratos de API](README.md)
