# 4.1 Auth

**Versao:** 1.0.0
**Ultima Atualizacao:** 2026-02-06

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

## POST /api/v1/auth/register

**Descricao:** Cadastro publico (apenas animador/recreador).

**Request Body:**

```json
{
  "name": "string",
  "last_name": "string",
  "email": "string",
  "birth_date": "2026-01-10",
  "region": "string",
  "phone": "string",
  "role": "animador|recreador",
  "password": "string"
}
```

**Response 201 Created:**

```json
{
  "data": {
    "id": "uuid",
    "name": "string",
    "last_name": "string",
    "role": "recreador"
  }
}
```

---

---

## POST /api/v1/auth/forgot-password

**Descricao:** Envia token de redefinicao para o email do usuario.

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
    "sent": true
  }
}
```

---

## POST /api/v1/auth/verify-reset-token

**Descricao:** Verifica se o token informado ainda e valido.

**Request Body:**

```json
{
  "email": "string",
  "token": "string"
}
```

**Response 200 OK:**

```json
{
  "data": {
    "valid": true
  }
}
```

---

## POST /api/v1/auth/reset-password

**Descricao:** Redefine a senha usando email + token validado.

**Request Body:**

```json
{
  "email": "string",
  "token": "string",
  "novaSenha": "string",
  "novaSenhaConfirmacao": "string"
}
```

**Response 200 OK:**

```json
{
  "data": {
    "updated": true
  }
}
```

---

← [Voltar para Contratos de API](README.md)
