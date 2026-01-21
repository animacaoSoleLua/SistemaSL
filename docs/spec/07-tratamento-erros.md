# 7. Tratamento de Erros

**Versao:** 1.0.0
**Ultima Atualizacao:** 2026-01-20

← [Voltar para SPEC](README.md)

---

## 7.1 Padrao de Resposta

```json
{
  "error": "error_code",
  "message": "Mensagem amigavel",
  "details": [
    { "field": "email", "error": "invalid_format" }
  ]
}
```

---

## 7.2 Codigos de Erro

| Codigo HTTP | Tipo | Quando acontece |
|-------------|------|----------------|
| 400 | validation_error | Dados invalidos |
| 401 | unauthorized | Token ausente/invalido |
| 403 | forbidden | Sem permissao |
| 404 | not_found | Recurso nao existe |
| 409 | conflict | Conflito de dados |
| 422 | business_rule | Regra de negocio |
| 429 | rate_limited | Limite excedido |
| 500 | internal_error | Erro interno |

---

## 7.3 Regras de Retry

- Retry automatico apenas para 429 e 5xx
- Maximo 3 tentativas com backoff

---

## 7.4 Erros de Negocio Comuns

| Erro | Descricao |
|------|-----------|
| course_full | Curso sem vagas |
| already_enrolled | Membro ja inscrito |
| suspended_member | Membro suspenso |

---

← [Voltar para SPEC](README.md)
