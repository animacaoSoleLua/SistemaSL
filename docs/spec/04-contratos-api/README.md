# 4. Contratos de API

**Versao:** 1.0.0
**Ultima Atualizacao:** 2026-01-20

← [Voltar para SPEC](../README.md)

---

## Visao Geral

API REST com autenticacao via JWT Bearer token.

### Base URL

```
Development: http://localhost:3000/api/v1
Production:  https://api.sol-e-lua.com/v1
```

### Autenticacao

Rotas (exceto auth) exigem header:

```
Authorization: Bearer {jwt_token}
```

---

## Indice de Endpoints

### Autenticacao
| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| POST | `/auth/login` | Fazer login |
| POST | `/auth/forgot-password` | Solicitar reset |
| POST | `/auth/reset-password` | Resetar senha |

### Membros
| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| GET | `/membros` | Listar membros |
| POST | `/membros` | Criar membro |
| GET | `/membros/:id` | Obter membro |
| PATCH | `/membros/:id` | Atualizar membro |
| DELETE | `/membros/:id` | Excluir membro |

### Relatorios
| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| GET | `/relatorios` | Listar relatorios |
| POST | `/relatorios` | Criar relatorio |
| GET | `/relatorios/:id` | Detalhe do relatorio |
| POST | `/relatorios/:id/media` | Anexar midia |

### Cursos
| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| GET | `/cursos` | Listar cursos |
| POST | `/cursos` | Criar curso |
| GET | `/cursos/:id` | Detalhe do curso |
| POST | `/cursos/:id/inscricoes` | Inscrever membro |
| PATCH | `/cursos/:id/inscricoes/:inscricaoId` | Atualizar presenca |

### Advertencias
| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| GET | `/advertencias` | Listar advertencias |
| POST | `/advertencias` | Criar advertencia |
| DELETE | `/advertencias/:id` | Apagar advertencia |

### Dashboard
| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| GET | `/dashboard/resumo` | Resumo por periodo |
| GET | `/dashboard/animadores` | Eventos por animador |
| GET | `/dashboard/qualidade` | Indicadores de qualidade |

---

## Documentacao Detalhada

- [Auth](auth.md)
- [Membros](membros.md)
- [Relatorios](relatorios.md)
- [Cursos](cursos.md)
- [Advertencias](advertencias.md)
- [Dashboard](dashboard.md)

---

## Padroes de Resposta

### Sucesso (2xx)

```json
{
  "data": { /* objeto ou array */ },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

### Erro (4xx/5xx)

```json
{
  "error": "error_code",
  "message": "Human readable message",
  "details": [
    {
      "field": "email",
      "error": "Invalid format"
    }
  ]
}
```

---

← [Voltar para SPEC](../README.md)
