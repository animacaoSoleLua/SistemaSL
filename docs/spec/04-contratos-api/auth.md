# 4.1 Auth

**Versao:** 1.0.0
**Ultima Atualizacao:** 2026-01-20

← [Voltar para Contratos de API](README.md)

---

## POST /api/v1/auth/login

**Descricao:** Autentica usuario.

**Request Body:**

```json
{
  "email": "string",
  "password": "string"
}
```

**Response 200 OK:**

```json
{
  "data": {
    "access_token": "jwt",
    "user": {
      "id": "uuid",
      "name": "string",
      "role": "admin|animador|recreador"
    }
  }
}
```

---

## POST /api/v1/auth/forgot-password

**Descricao:** Solicita reset de senha.

**Request Body:**

```json
{
  "email": "string"
}
```

**Response 200 OK:**

```json
{
  "data": {
    "message": "Email enviado"
  }
}
```

---

## POST /api/v1/auth/reset-password

**Descricao:** Redefine senha com token.

**Request Body:**

```json
{
  "token": "string",
  "password": "string"
}
```

**Response 200 OK:**

```json
{
  "data": {
    "message": "Senha atualizada"
  }
}
```

---

← [Voltar para Contratos de API](README.md)
