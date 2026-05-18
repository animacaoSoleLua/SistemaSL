---
name: CI/CD GitHub Actions + Dokploy
description: Pipeline de CI/CD com GitHub Actions que testa e builda backend e frontend em paralelo e faz deploy sequencial via webhooks do Dokploy na VPS Hostinger
type: project
---

# CI/CD GitHub Actions + Dokploy

## Visão Geral

Pipeline de integração e entrega contínua acionado por:
- **Pull request para `main`**: roda apenas testes + builds (gate antes do merge).
- **Push na `main`**: roda testes + builds e, se passarem, dispara deploy.

Em paralelo, roda testes + build do backend (com Postgres efêmero) e testes + build do frontend. Se ambos passarem **e** o evento for `push: main`, dispara os webhooks do Dokploy **sequencialmente** (backend primeiro, depois frontend) para que ele rebuilde e suba os serviços na VPS. Se qualquer etapa falhar, o deploy não acontece e a versão estável no Dokploy permanece intocada.

> **Por que rodar em PR também?** Sem o gate em PR, código quebrado pode chegar em `main` e só falhar depois do merge — a `main` fica vermelha mesmo que o deploy não aconteça. Rodar em PR mantém `main` sempre verde.

```
pull_request → main           push → main
  ├── test-backend             ├── test-backend
  └── test-frontend            └── test-frontend
       (sem deploy)                  ↓ ambos passaram
                                   deploy
                                     ├── POST → Dokploy webhook backend
                                     ├── polling /health (compara commit SHA)
                                     └── POST → Dokploy webhook frontend
```

## Stack

- **Backend**: Node.js 20 / TypeScript / Fastify / Prisma / Vitest
- **Frontend**: Next.js 14 / Jest
- **Banco em produção**: PostgreSQL 18 (serviço separado no Dokploy)
- **Banco em CI**: PostgreSQL 18 como service container do GitHub Actions
- **VPS**: Hostinger com Dokploy
  - Backend: build via **Dockerfile** (`backend/Dockerfile.prod`)
  - Frontend: build via **Dockerfile** (`frontend/Dockerfile`)
- **CI**: GitHub Actions
- **Registry**: nenhum — Dokploy clona do git e builda na VPS

### Decisão: Dockerfile (não Nixpacks)

O backend tem hoje um `nixpacks.toml` e um `Dockerfile.prod` coexistindo. Esta spec assume **Dockerfile**, pois:
- O `docker-compose.yml` usa `Dockerfile.prod`.
- O `entrypoint.sh` (rota das migrations) só roda no caminho Docker.
- Padronizar elimina ambiguidade sobre quem roda `prisma migrate deploy`.

**Ação pré-implementação**: confirmar que cada aplicação no Dokploy está configurada com `Build Type = Dockerfile` e remover `backend/nixpacks.toml` do repositório.

## Jobs

### `test-backend`

Roda em `ubuntu-latest` com Postgres 18 como service container.

Todos os steps usam `working-directory: ./backend`:

```yaml
defaults:
  run:
    working-directory: ./backend

services:
  postgres:
    image: postgres:18
    env:
      POSTGRES_USER: slr
      POSTGRES_PASSWORD: slrAdmin
      POSTGRES_DB: slr_test
    ports:
      - 5432:5432
    options: >-
      --health-cmd "pg_isready -U slr -d slr_test"
      --health-interval 5s
      --health-timeout 3s
      --health-retries 10
```

Passos:
1. `actions/checkout@v4`
2. `actions/setup-node@v4` com Node 20, `cache: npm` e `cache-dependency-path: backend/package-lock.json`
3. `npm ci`
4. `npx prisma generate`
5. `npx prisma migrate deploy` (aplica migrations no Postgres do CI)
6. `npx vitest run` (sem `--coverage` para acelerar — o script `npm test` atual inclui coverage)
7. `npm run build` (sanity check de `tsc -p tsconfig.build.json` — evita que erros de tipo só apareçam no Dokploy)

Variáveis de ambiente do job (não usam Secrets — credenciais efêmeras):
```yaml
env:
  DATABASE_URL: postgresql://slr:slrAdmin@localhost:5432/slr_test
  JWT_SECRET: test-secret-0123456789abcdef0123456789abcdef
  R2_ENDPOINT: https://test.r2.cloudflarestorage.com
  R2_ACCESS_KEY_ID: test-access-key
  R2_SECRET_ACCESS_KEY: test-secret-key
  R2_BUCKET_NAME: test-bucket
  NODE_ENV: test
```

> Esses valores espelham os fallbacks já existentes em `backend/test/setup.ts`. Declarar no workflow torna a intenção explícita e protege contra mudanças no `setup.ts`.

### `test-frontend`

Roda em `ubuntu-latest`, sem dependências externas. Todos os steps usam `working-directory: ./frontend`.

Passos:
1. `actions/checkout@v4`
2. `actions/setup-node@v4` com Node 20, `cache: npm` e `cache-dependency-path: frontend/package-lock.json`
3. `npm ci`
4. `npm test` (jest)
5. `npm run build` (`next build`) com `NEXT_PUBLIC_API_BASE_URL` dummy — sanity check da build (`next build` já faz type-check; lint é opcional via `npm run lint` se quiser gate)

Variáveis de ambiente do job:
```yaml
env:
  NEXT_PUBLIC_API_BASE_URL: http://localhost:3001
```

### `deploy`

Depende de `test-backend` AND `test-frontend` (ambos devem passar).
Roda **apenas** em `push: main` (não em PR):

```yaml
if: github.event_name == 'push' && github.ref == 'refs/heads/main'
```

Usa o ambiente `production` do GitHub (permite proteção com aprovação manual via Required reviewers, se desejado).

**Concurrency** — evita race condition de dois deploys simultâneos quando dois commits chegam em sequência:

```yaml
concurrency:
  group: deploy-${{ github.ref }}
  cancel-in-progress: false
```

Passos (sequenciais, não paralelos):
1. Disparar webhook do **backend** — `curl -fsS -X POST "$DOKPLOY_BACKEND_WEBHOOK"`
   - `-f`: falha o job se o Dokploy retornar HTTP ≥ 400
   - `-s`: silencia output de progresso (evita poluir log com a URL/token)
2. **Aguardar versão nova ficar saudável** — polling de `GET $BACKEND_HEALTH_URL` comparando o campo `commit` da resposta com `${{ github.sha }}`. Timeout máximo: 5 min; falhar o job se exceder.
3. Disparar webhook do **frontend** — `curl -fsS -X POST "$DOKPLOY_FRONTEND_WEBHOOK"`

> ⚠️ **Webhook do Dokploy retorna 200 imediatamente**, antes do build/migration terminar. `curl -f` só falha se o webhook em si falhar — não detecta build quebrada nem migration que falhou. Por isso o passo 2 precisa **comparar o commit SHA**, não só HTTP 200. Health endpoint precisa expor o SHA da build atual:
>
> ```ts
> // backend/src/app.ts — endpoint /health
> { status: "ok", commit: process.env.GIT_COMMIT_SHA ?? "unknown" }
> ```
>
> No `backend/Dockerfile.prod`, injetar via build arg:
> ```dockerfile
> ARG GIT_COMMIT_SHA
> ENV GIT_COMMIT_SHA=$GIT_COMMIT_SHA
> ```
> Configurar no Dokploy o build arg `GIT_COMMIT_SHA` a partir do commit que ele puxou (Dokploy expõe isso como variável de build).

> **Por que sequencial?** O frontend novo pode depender de rotas/contratos que só existem no backend novo. Disparar em paralelo cria janela de erro pros usuários. Se a equipe aceitar essa janela, simplifica pra dois `curl` em paralelo — registre a escolha explicitamente.

O Dokploy recebe cada webhook, puxa o código mais recente do git e rebuilda o serviço correspondente. O `entrypoint.sh` do backend roda `prisma migrate deploy` antes de iniciar o servidor.

### Rollback

Configurar no Dokploy (painel do app, aba **Advanced** ou equivalente):
- **Health check** ativo apontando para `/health` do backend (e rota equivalente do frontend).
- **Rolling update / zero-downtime**: Dokploy mantém o container anterior rodando até o novo passar no health check. Se o novo nunca ficar saudável, o tráfego continua no antigo e o deploy é marcado como falho.

Sem essa configuração, deploy quebrado = downtime total. **Verificar no painel antes do primeiro deploy real.**

## Secrets e variáveis

### Secrets (GitHub Environment: `production`)

Apenas dados realmente sensíveis:

| Secret | Descrição |
|---|---|
| `DOKPLOY_BACKEND_WEBHOOK` | URL completa do webhook do serviço backend no Dokploy (contém token) |
| `DOKPLOY_FRONTEND_WEBHOOK` | URL completa do webhook do serviço frontend no Dokploy (contém token) |

### Variáveis (não-secret)

| Variável | Descrição |
|---|---|
| `BACKEND_HEALTH_URL` | URL pública de health do backend (ex.: `https://api.seudominio.com.br/health`) — usada no polling pós-deploy |

### Variáveis configuradas no próprio Dokploy (não no GitHub)

Não fazem parte do workflow, mas precisam existir **antes** do primeiro deploy ou a build falha:

**Serviço backend** (Environment do app no Dokploy):
- `DATABASE_URL`, `JWT_SECRET`, `RESEND_API_KEY`, `RESEND_FROM`, `R2_*`, `GOOGLE_*`, `FRONTEND_URL`, `HOST=0.0.0.0`, `PORT=3001`

**Serviço frontend** (Build Args + Environment do app no Dokploy):
- `NEXT_PUBLIC_API_BASE_URL` — **obrigatório como build arg**, pois `frontend/Dockerfile` declara `ARG NEXT_PUBLIC_API_BASE_URL` e fixa o valor no bundle no build time.

## Configuração do GitHub Environment

1. Repositório → **Settings → Environments → New environment**
2. Nome: `production`
3. (Opcional) Ativar **Required reviewers** para exigir aprovação manual antes do deploy
4. Adicionar os 2 secrets e a 1 variável listados acima

## Localização do Webhook no Dokploy

No Dokploy, acesse cada aplicação → aba **General** → seção **Deploy** → copie a **Webhook URL**. Tratar essa URL como secret (contém token de autenticação).

## Arquivo do Pipeline

`.github/workflows/ci-cd.yml` na raiz do repositório.

### Trigger

```yaml
on:
  pull_request:
    branches: [main]
    paths-ignore:
      - '**.md'
      - 'docs/**'
      - '.gitignore'
  push:
    branches: [main]
    paths-ignore:
      - '**.md'
      - 'docs/**'
      - '.gitignore'
  workflow_dispatch:  # permite disparar manual pela UI
```

- `pull_request`: roda `test-backend` + `test-frontend` (sem `deploy`). Configurar branch protection em `main` exigindo esses jobs como required checks — assim PR com teste vermelho não consegue ser merged.
- `push: main`: roda tudo (testes + deploy).
- `workflow_dispatch` é útil pra forçar um redeploy sem precisar de commit.

## Comportamento esperado

- **PR aberto/atualizado para `main`** → roda testes + builds; sem deploy. Se falhar, branch protection impede merge.
- **Push na `main` com testes + builds passando** → deploy automático (ou com aprovação, se configurado)
- **Push na `main` com qualquer teste ou build falhando** → pipeline para, deploy **não** acontece, versão atual no Dokploy continua servindo
- **Webhook do Dokploy retorna erro HTTP** → job `deploy` falha (graças ao `curl -f`), notificação pelo GitHub Actions
- **Webhook responde 200 mas build/migration falha no Dokploy** → passo de polling não vê o novo commit SHA em `/health` dentro do timeout, job `deploy` falha; com rolling update configurado, versão anterior continua servindo
- **Migration falha no Dokploy** → container do backend não sobe; Dokploy mantém o anterior se configurado com health check + rolling update (verificar no painel)
- **Mudanças só em `*.md` ou `docs/`** → pipeline não roda

## Riscos conhecidos e mitigações

| Risco | Mitigação |
|---|---|
| Migration destrutiva quebra prod (CI usa banco zerado, não pega `DROP COLUMN` em coluna com dados) | Mitigação parcial: tests no CI rodam `migrate deploy` no banco efêmero — pega erro de sintaxe. Para destrutivas, regra de processo: PR com label `db-migration` exige revisão extra; opcionalmente rodar `prisma migrate diff --from-url $PROD_READONLY` num step de pré-deploy para diff manual. |
| Frontend novo aponta pra backend antigo (ou vice-versa) durante deploy | Deploy sequencial backend → frontend + polling do `/health` validando o commit SHA. Janela ainda existe (segundos durante o swap do frontend), mas o backend já está confirmado novo. |
| Deploy quebrado derruba prod (sem rollback automático) | Configurar **rolling update + health check** no Dokploy para cada app — versão anterior continua servindo até a nova passar no health check. Verificar antes do primeiro deploy real. |
| Webhook 200 ≠ deploy ok (Dokploy responde antes do build terminar) | Polling em `/health` compara `commit` retornado com `github.sha`. Timeout de 5 min; falha do job se não bater. |
| Dois pushes seguidos em `main` disparam deploys concorrentes | `concurrency: { group: deploy-${{ github.ref }}, cancel-in-progress: false }` serializa os deploys. |
| Tests CI lentos por `fileParallelism: false` no vitest | Aceitar por enquanto. Se virar gargalo, revisar config do vitest separadamente. |
| Token do webhook vazar em log | `curl -s` evita imprimir a URL em modo verbose. Nunca usar `set -x` no step de deploy. |
| `NEXT_PUBLIC_API_BASE_URL` ausente no Dokploy | Pré-condição documentada na seção de variáveis. Primeiro deploy precisa do app já configurado. |

## Checklist de pré-implementação

- [ ] Confirmar Build Type = Dockerfile em ambos os apps no Dokploy
- [ ] Remover `backend/nixpacks.toml` do repo
- [ ] Criar Environment `production` no GitHub e popular secrets/variáveis
- [ ] Verificar que `NEXT_PUBLIC_API_BASE_URL` está configurado no app frontend do Dokploy
- [ ] Verificar que todas as env vars do backend estão configuradas no Dokploy
- [ ] Confirmar que health endpoint do backend (`/health`) existe e responde 200 (já existe em `backend/test/health.integration.test.ts`)
- [ ] **Estender `/health` para retornar `commit: process.env.GIT_COMMIT_SHA`** e injetar `GIT_COMMIT_SHA` como build arg no `Dockerfile.prod` + configurar no Dokploy
- [ ] **Configurar health check + rolling update no Dokploy** para ambos os apps (rollback automático em deploy quebrado)
- [ ] **Configurar branch protection em `main`** exigindo `test-backend` e `test-frontend` como required checks em PR
- [ ] Decidir: aprovação manual no deploy (Required reviewers) ou automático?
- [ ] Decidir: rodar `npm run lint` no frontend como step extra? (opcional)
