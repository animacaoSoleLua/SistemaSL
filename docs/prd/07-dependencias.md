# 7. Dependencias e Integracoes

**Versao:** 1.0.0
**Ultima Atualizacao:** 2026-01-20

[← Voltar para Indice PRD](README.md)

---

## 7.1 Dependencias Externas Criticas

### APIs de Terceiros

| Servico | Finalidade | Custo Estimado | Status |
|---------|------------|----------------|--------|
| Resend | Envio de email e recuperacao de senha | R$ 0-50/mes | Planejado |
| Object Storage (S3/R2) | Armazenar fotos e videos | R$ 0-100/mes | Planejado |
| VPS | Hospedagem do sistema | R$ 150-250/mes | Planejado |

### Detalhamento de Integracoes

#### Resend

- **Finalidade:** Email transacional
- **Tipo:** API REST
- **Autenticacao:** API Key
- **Rate Limits:** Conforme plano
- **Custo:** Plano inicial (estimado baixo)
- **Documentacao:** https://resend.com/docs

#### Object Storage

- **Finalidade:** Armazenar midias dos relatorios
- **Tipo:** API S3 compativel
- **Autenticacao:** Access key/secret
- **Rate Limits:** Conforme provedor
- **Custo:** Variavel por uso
- **Documentacao:** Provedor escolhido

---

## 7.2 Stack Tecnologico

### Backend

| Tecnologia | Versao | Finalidade |
|------------|--------|------------|
| Node.js | 18+ | Runtime |
| Fastify | 4+ | Framework web |
| Prisma | latest | ORM |

### Frontend

| Tecnologia | Versao | Finalidade |
|------------|--------|------------|
| Next.js | 14+ | Framework UI |
| React | 18+ | UI |
| TailwindCSS | 3+ | Estilizacao |

### Banco de Dados

| Tecnologia | Versao | Finalidade |
|------------|--------|------------|
| PostgreSQL | 15+ | Banco principal |
| Redis | 7+ | Cache/filas |

### Infraestrutura

| Servico | Provider | Finalidade |
|---------|----------|------------|
| VPS | Digital Ocean/Hetzner (exemplo) | Hospedagem |
| GitHub Actions | GitHub | CI/CD |
| UptimeRobot | UptimeRobot | Monitoramento basico |

---

## 7.3 Custo Estimado Mensal

| Categoria | Servico | Custo |
|-----------|---------|-------|
| Hospedagem | VPS | R$ 200 |
| Banco de Dados | PostgreSQL (na VPS) | R$ 0 |
| Integracoes | Resend + Storage | R$ 0-100 |
| Monitoramento | UptimeRobot | R$ 0 |
| **Total** | | **R$ 200-300** |

---

## 7.4 Matriz de Risco de Dependencias

| Dependencia | Criticidade | Risco | Mitigacao |
|-------------|-------------|-------|-----------|
| Resend | Media | Indisponibilidade | Trocar por outro provedor de email |
| Object Storage | Alta | Falha no upload | Reprocessar e salvar localmente temporario |
| VPS | Alta | Downtime | Backup e plano de contingencia |

---

[← Voltar para Indice PRD](README.md)
