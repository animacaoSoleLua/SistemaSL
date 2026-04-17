# 4.X {{NOME_DOMINIO}}

**Versão:** 1.0.0
**Última Atualização:** {{DATA}}

← [Voltar para Contratos de API](README.md)

---

## POST /api/v1/{{dominio}}

**Descrição:** Cria novo {{item}}.

**Autenticação:** Bearer token (JWT)

**Request Body:**

```json
{
  "name": "string (obrigatório, 3-100 chars)",
  "description": "string (opcional)",
  "config": {
    "option1": "value",
    "option2": true
  }
}
```

**Response 201 Created:**

```json
{
  "id": "uuid",
  "name": "string",
  "description": "string",
  "config": {},
  "status": "draft",
  "created_at": "ISO 8601",
  "updated_at": "ISO 8601"
}
```

**Response 400 Bad Request:**

```json
{
  "error": "validation_error",
  "message": "Validation failed",
  "details": [
    {
      "field": "name",
      "error": "Name is required"
    }
  ]
}
```

**Regras de Negócio:**
- Nome deve ser único por usuário
- Campos obrigatórios: name
- Status inicial: draft

---

## GET /api/v1/{{dominio}}

**Descrição:** Lista {{itens}} do usuário com paginação.

**Autenticação:** Bearer token (JWT)

**Query Parameters:**

| Parâmetro | Tipo | Default | Descrição |
|-----------|------|---------|-----------|
| page | number | 1 | Página atual |
| limit | number | 20 | Itens por página (max: 100) |
| status | string | - | Filtrar por status |
| sort | string | -created_at | Ordenação |
| search | string | - | Busca por nome |

**Response 200 OK:**

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "string",
      "status": "string",
      "created_at": "ISO 8601",
      "updated_at": "ISO 8601"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "pages": 3
  }
}
```

---

## GET /api/v1/{{dominio}}/:id

**Descrição:** Obtém detalhes de {{item}} específico.

**Autenticação:** Bearer token (JWT)

**Path Parameters:**
- `id` (obrigatório): UUID do {{item}}

**Response 200 OK:**

```json
{
  "id": "uuid",
  "name": "string",
  "description": "string",
  "config": {},
  "status": "string",
  "stats": {
    "count1": 10,
    "count2": 5
  },
  "created_at": "ISO 8601",
  "updated_at": "ISO 8601"
}
```

**Response 404 Not Found:**

```json
{
  "error": "not_found",
  "message": "{{Item}} not found"
}
```

---

## PATCH /api/v1/{{dominio}}/:id

**Descrição:** Atualiza {{item}} existente.

**Autenticação:** Bearer token (JWT)

**Path Parameters:**
- `id` (obrigatório): UUID do {{item}}

**Request Body** (campos opcionais):

```json
{
  "name": "string",
  "description": "string",
  "config": {}
}
```

**Response 200 OK:**

```json
{
  "id": "uuid",
  "name": "string (atualizado)",
  "updated_at": "ISO 8601"
}
```

**Regras de Negócio:**
- Não pode atualizar {{item}} com status "completed"
- Alterações são auditadas

---

## DELETE /api/v1/{{dominio}}/:id

**Descrição:** Exclui {{item}} (soft delete).

**Autenticação:** Bearer token (JWT)

**Path Parameters:**
- `id` (obrigatório): UUID do {{item}}

**Response 204 No Content**

**Regras:**
- Soft delete (marca como deleted)
- Dados relacionados são mantidos
- Pode ser restaurado via API admin

---

## POST /api/v1/{{dominio}}/:id/{{acao}}

**Descrição:** Executa {{acao}} no {{item}}.

**Autenticação:** Bearer token (JWT)

**Response 200 OK:**

```json
{
  "id": "uuid",
  "status": "new_status",
  "{{acao}}_at": "ISO 8601"
}
```

**Efeitos Colaterais:**
- Atualiza status
- Dispara eventos relacionados
- Registra no audit log

---

**Anterior:** [← Índice API](README.md) | **Próximo:** [Próximo Domínio →](outro-dominio.md)
