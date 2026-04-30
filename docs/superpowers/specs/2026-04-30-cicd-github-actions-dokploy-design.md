---
name: CI/CD GitHub Actions + Dokploy
description: Pipeline de CI/CD com GitHub Actions que testa backend e frontend em paralelo e faz deploy via webhook do Dokploy na VPS Hostinger
type: project
---

# CI/CD GitHub Actions + Dokploy

## Visão Geral

Pipeline de integração e entrega contínua acionado por push na branch `main`. Roda testes de backend (com banco de dados efêmero) e frontend em paralelo. Se ambos passarem, dispara os webhooks do Dokploy para que ele rebuilde e suba os serviços na VPS.

```
push na main
  ├── test-backend  (postgres efêmero via service container)
  └── test-frontend (jest)
        ↓ ambos passaram
      deploy
        ├── POST → Dokploy webhook backend
        └── POST → Dokploy webhook frontend
```

## Stack

- **Backend**: Node.js 20 / TypeScript / Fastify / Prisma / Vitest
- **Frontend**: Next.js 14 / Jest
- **VPS**: Hostinger com Dokploy
  - Backend: build via Dockerfile
  - Frontend: build via Nixpacks
- **CI**: GitHub Actions
- **Registry**: nenhum — Dokploy builda direto do git

## Jobs

### `test-backend`

Roda em `ubuntu-latest` com um serviço PostgreSQL 18 efêmero.

Passos:
1. `actions/checkout@v4`
2. `actions/setup-node@v4` com Node 20 e cache npm
3. `npm ci` em `./backend`
4. `npx prisma generate`
5. `npx prisma migrate deploy` (aplica migrations no banco de teste)
6. `npm test` (vitest run — unitários + integração)

Variáveis de ambiente:
- `DATABASE_URL` → aponta para o postgres efêmero do CI (`localhost:5432`)

### `test-frontend`

Roda em `ubuntu-latest`, sem dependências externas.

Passos:
1. `actions/checkout@v4`
2. `actions/setup-node@v4` com Node 20 e cache npm
3. `npm ci` em `./frontend`
4. `npm test` (jest)

### `deploy`

Depende de `test-backend` AND `test-frontend` (ambos devem passar).
Usa o ambiente `production` do GitHub (permite proteção com aprovação manual).

Passos:
1. `curl -X POST $DOKPLOY_BACKEND_WEBHOOK`
2. `curl -X POST $DOKPLOY_FRONTEND_WEBHOOK`

O Dokploy recebe cada webhook, puxa o código mais recente do git e rebuilda o serviço correspondente. O `entrypoint.sh` do backend já garante que `prisma migrate deploy` rode antes de iniciar o servidor.

## Secrets (GitHub Environment: `production`)

| Secret | Descrição |
|---|---|
| `DATABASE_URL_TEST` | `postgresql://slr:slrAdmin@localhost:5432/slr_test` |
| `DOKPLOY_BACKEND_WEBHOOK` | URL de webhook do serviço backend no Dokploy |
| `DOKPLOY_FRONTEND_WEBHOOK` | URL de webhook do serviço frontend no Dokploy |

## Configuração do GitHub Environment

1. Repositório → **Settings → Environments → New environment**
2. Nome: `production`
3. (Opcional) Ativar **Required reviewers** para exigir aprovação manual antes do deploy
4. Adicionar os 3 secrets listados acima

## Localização do Webhook no Dokploy

No Dokploy, acesse cada aplicação → aba **General** → seção **Deploy** → copie a **Webhook URL**.

## Arquivo do Pipeline

`.github/workflows/ci-cd.yml` na raiz do repositório.

## Comportamento esperado

- Push na `main` com testes passando → deploy automático (ou com aprovação, se configurado)
- Push na `main` com qualquer teste falhando → pipeline para, deploy **não** acontece
- Migrations de banco são aplicadas automaticamente pelo `entrypoint.sh` ao subir o container
- Frontend e backend são deployados de forma independente via seus respectivos webhooks
