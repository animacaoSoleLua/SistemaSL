# 9. Deployment e Infraestrutura

**Versao:** 1.0.0
**Ultima Atualizacao:** 2026-01-20

← [Voltar para SPEC](README.md)

---

## 9.1 Arquitetura de Deployment

- VPS com Docker
- Banco PostgreSQL na mesma VPS (inicialmente)
- Redis na mesma VPS
- Object Storage externo para midias

---

## 9.2 Recursos Sugeridos

| Servico | Especificacao | Custo |
|---------|---------------|-------|
| VPS | 2 vCPU / 4GB RAM | R$ 150-250 |
| Storage | 20-50 GB | R$ 0-100 |

---

## 9.3 Variaveis de Ambiente

```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:pass@host:5432/sol_e_lua
REDIS_URL=redis://host:6379
JWT_SECRET=change-me
RESEND_API_KEY=xxx
STORAGE_ENDPOINT=xxx
STORAGE_BUCKET=sol-e-lua
```

---

← [Voltar para SPEC](README.md)
