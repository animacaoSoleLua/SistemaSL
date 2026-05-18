# CI/CD GitHub Actions + Dokploy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a CI/CD pipeline via GitHub Actions that tests and builds backend + frontend on every PR and on every push to `main`, and on a successful push to `main` triggers a sequential Dokploy deploy (backend → health-check by commit SHA → frontend), with automatic rollback via Dokploy rolling update.

**Architecture:** Three workflow jobs (`test-backend`, `test-frontend`, `deploy`). Tests run on both `pull_request` and `push: main`; deploy only runs on `push: main`. The deploy job posts to two Dokploy webhooks sequentially and polls the backend `/health` endpoint comparing the response's `commit` field with `github.sha` — this is required because the Dokploy webhook returns HTTP 200 immediately, before the build/migration finishes. The `/health` endpoint is extended to expose the build's commit SHA, which is injected into the backend container as a Docker build arg.

**Tech Stack:**
- GitHub Actions (workflow YAML)
- Node 20, npm, Vitest (backend), Jest + Next.js (frontend)
- PostgreSQL 18 service container (CI)
- Dokploy (VPS deploy via webhook), Docker (Dockerfile builds)
- Backend: Fastify + Prisma + TypeScript
- Frontend: Next.js 14

**Spec:** `docs/superpowers/specs/2026-04-30-cicd-github-actions-dokploy-design.md`

---

## File Structure

**Files to create:**
- `.github/workflows/ci-cd.yml` — single workflow with `test-backend`, `test-frontend`, `deploy` jobs

**Files to modify:**
- `backend/src/routes/health.ts` — return `{ status, commit }` instead of `{ status }`
- `backend/test/health.integration.test.ts` — update assertion to include `commit`
- `backend/Dockerfile.prod` — accept `GIT_COMMIT_SHA` build arg, expose as env var
- `.gitignore` — no change expected (sanity check only)

**Files to delete:**
- `backend/nixpacks.toml` — eliminates ambiguity (spec decision: standardize on Dockerfile)

**Out-of-repo configuration (documented, NOT done by this plan):**
- GitHub Environment `production` (secrets `DOKPLOY_BACKEND_WEBHOOK`, `DOKPLOY_FRONTEND_WEBHOOK`; variable `BACKEND_HEALTH_URL`)
- Dokploy app config: Build Type = Dockerfile for both apps; env vars for backend; `NEXT_PUBLIC_API_BASE_URL` build arg for frontend; `GIT_COMMIT_SHA` build arg for backend (Dokploy exposes the puxado commit); rolling update + health check enabled on both apps
- Branch protection on `main` requiring `test-backend` and `test-frontend` as required checks

---

### Task 1: Extend `/health` endpoint to return commit SHA

**Files:**
- Modify: `backend/src/routes/health.ts`
- Test: `backend/test/health.integration.test.ts`

- [ ] **Step 1: Update the integration test to expect the new shape**

Replace the assertion in `backend/test/health.integration.test.ts`:

```typescript
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildServer } from "../src/app.js";

describe("GET /health (integration)", () => {
  const app = buildServer();

  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns ok with commit field", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.status).toBe("ok");
    expect(typeof body.commit).toBe("string");
  });

  it("uses GIT_COMMIT_SHA env var when set", async () => {
    const original = process.env.GIT_COMMIT_SHA;
    process.env.GIT_COMMIT_SHA = "abc123def456";

    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.json().commit).toBe("abc123def456");

    if (original === undefined) {
      delete process.env.GIT_COMMIT_SHA;
    } else {
      process.env.GIT_COMMIT_SHA = original;
    }
  });

  it("falls back to 'unknown' when GIT_COMMIT_SHA is unset", async () => {
    const original = process.env.GIT_COMMIT_SHA;
    delete process.env.GIT_COMMIT_SHA;

    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.json().commit).toBe("unknown");

    if (original !== undefined) {
      process.env.GIT_COMMIT_SHA = original;
    }
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && npx vitest run test/health.integration.test.ts`
Expected: FAIL — the current handler returns `{ status: "ok" }` with no `commit`.

- [ ] **Step 3: Update the route handler**

Replace `backend/src/routes/health.ts` with:

```typescript
import type { FastifyInstance } from "fastify";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async () => ({
    status: "ok",
    commit: process.env.GIT_COMMIT_SHA ?? "unknown",
  }));
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd backend && npx vitest run test/health.integration.test.ts`
Expected: PASS — all three tests green.

- [ ] **Step 5: Run the full backend test suite to confirm no regressions**

Run: `cd backend && npx vitest run`
Expected: PASS — all backend tests green.

- [ ] **Step 6: Commit**

```bash
git add backend/src/routes/health.ts backend/test/health.integration.test.ts
git commit -m "feat(health): expose build commit SHA on /health endpoint

Required by CI/CD deploy step: GitHub Actions polls /health and
compares the commit field against github.sha to confirm the new
build is live before proceeding with the frontend deploy."
```

---

### Task 2: Inject `GIT_COMMIT_SHA` build arg into backend Dockerfile

**Files:**
- Modify: `backend/Dockerfile.prod`

- [ ] **Step 1: Update `Dockerfile.prod` to accept and expose the build arg**

Replace `backend/Dockerfile.prod` with:

```dockerfile
FROM node:20-bullseye-slim

WORKDIR /backend

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
COPY tsconfig.build.json tsconfig.json ./
COPY src ./src

RUN npx prisma generate
RUN npm run build

ARG GIT_COMMIT_SHA=unknown
ENV GIT_COMMIT_SHA=$GIT_COMMIT_SHA

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3001

COPY entrypoint.sh ./
COPY migrate-uploads-to-r2.mjs ./
RUN chmod +x entrypoint.sh

EXPOSE 3001

CMD ["./entrypoint.sh"]
```

- [ ] **Step 2: Verify the Dockerfile builds locally with a fake SHA**

Run: `cd backend && docker build -f Dockerfile.prod --build-arg GIT_COMMIT_SHA=test123 -t sl-backend-test .`
Expected: Build succeeds. (If Docker isn't available locally, skip and verify in CI; note in the commit message that local verification was skipped.)

- [ ] **Step 3: (If Docker available) Verify the env var is set in the resulting image**

Run: `docker run --rm sl-backend-test sh -c 'echo $GIT_COMMIT_SHA'`
Expected: prints `test123`.

- [ ] **Step 4: Commit**

```bash
git add backend/Dockerfile.prod
git commit -m "build(backend): accept GIT_COMMIT_SHA as docker build arg

Dokploy will pass the commit SHA it pulled from git so that the
running container can expose it via /health for CI deploy verification."
```

---

### Task 3: Remove obsolete `backend/nixpacks.toml`

**Files:**
- Delete: `backend/nixpacks.toml`

- [ ] **Step 1: Confirm the file is not referenced anywhere**

Run: `grep -rn "nixpacks" --include="*.{json,yml,yaml,toml,md,sh,ts,js}" .`
Expected: only matches inside the spec/plan docs and possibly the file itself. No reference from `docker-compose.yml`, `Dockerfile*`, `package.json`, or `entrypoint.sh`.

If anything else references it, STOP and investigate before deleting.

- [ ] **Step 2: Delete the file**

Run: `git rm backend/nixpacks.toml`
Expected: file removed from index and working tree.

- [ ] **Step 3: Commit**

```bash
git commit -m "chore(backend): remove nixpacks.toml in favor of Dockerfile.prod

The Dockerfile path is the supported build (entrypoint.sh runs the
prisma migrations). Keeping nixpacks.toml around made it ambiguous
which builder Dokploy would pick on first deploy."
```

---

### Task 4: Create the GitHub Actions workflow file with the `test-backend` job

**Files:**
- Create: `.github/workflows/ci-cd.yml`

- [ ] **Step 1: Create the workflow with triggers and the `test-backend` job**

Create `.github/workflows/ci-cd.yml` with the following content:

```yaml
name: CI/CD

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
  workflow_dispatch:

jobs:
  test-backend:
    name: Test backend
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./backend
    env:
      DATABASE_URL: postgresql://slr:slrAdmin@localhost:5432/slr_test
      JWT_SECRET: test-secret-0123456789abcdef0123456789abcdef
      R2_ENDPOINT: https://test.r2.cloudflarestorage.com
      R2_ACCESS_KEY_ID: test-access-key
      R2_SECRET_ACCESS_KEY: test-secret-key
      R2_BUCKET_NAME: test-bucket
      NODE_ENV: test
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
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Generate Prisma client
        run: npx prisma generate

      - name: Apply migrations to ephemeral Postgres
        run: npx prisma migrate deploy

      - name: Run tests
        run: npx vitest run

      - name: Build
        run: npm run build
```

- [ ] **Step 2: Validate the YAML syntax locally**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci-cd.yml'))"`
Expected: no output (valid YAML).

If `python3` isn't available, use any other validator (e.g. `npx yaml-lint .github/workflows/ci-cd.yml`).

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci-cd.yml
git commit -m "ci: add test-backend job to CI workflow

Runs vitest and tsc build against an ephemeral Postgres 18 service
container on every PR to main and every push to main."
```

---

### Task 5: Add the `test-frontend` job to the workflow

**Files:**
- Modify: `.github/workflows/ci-cd.yml`

- [ ] **Step 1: Append the `test-frontend` job under `jobs:`**

Add this job after `test-backend` in `.github/workflows/ci-cd.yml`:

```yaml
  test-frontend:
    name: Test frontend
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./frontend
    env:
      NEXT_PUBLIC_API_BASE_URL: http://localhost:3001
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Build
        run: npm run build
```

- [ ] **Step 2: Validate the YAML syntax**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci-cd.yml'))"`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci-cd.yml
git commit -m "ci: add test-frontend job to CI workflow

Runs jest and next build with a dummy NEXT_PUBLIC_API_BASE_URL on
every PR to main and every push to main."
```

---

### Task 6: Add the `deploy` job to the workflow

**Files:**
- Modify: `.github/workflows/ci-cd.yml`

- [ ] **Step 1: Append the `deploy` job under `jobs:`**

Add this job after `test-frontend` in `.github/workflows/ci-cd.yml`:

```yaml
  deploy:
    name: Deploy to Dokploy
    needs: [test-backend, test-frontend]
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    concurrency:
      group: deploy-${{ github.ref }}
      cancel-in-progress: false
    steps:
      - name: Trigger backend deploy webhook
        run: curl -fsS -X POST "$DOKPLOY_BACKEND_WEBHOOK"
        env:
          DOKPLOY_BACKEND_WEBHOOK: ${{ secrets.DOKPLOY_BACKEND_WEBHOOK }}

      - name: Wait for backend to report new commit on /health
        env:
          BACKEND_HEALTH_URL: ${{ vars.BACKEND_HEALTH_URL }}
          EXPECTED_SHA: ${{ github.sha }}
        run: |
          set -eu
          deadline=$(( $(date +%s) + 300 ))
          while [ "$(date +%s)" -lt "$deadline" ]; do
            body=$(curl -fsS "$BACKEND_HEALTH_URL" || true)
            commit=$(printf '%s' "$body" | sed -n 's/.*"commit":"\([^"]*\)".*/\1/p')
            if [ -n "$commit" ] && [ "$commit" = "$EXPECTED_SHA" ]; then
              echo "Backend is live at commit $commit"
              exit 0
            fi
            echo "Backend not ready yet (got commit='$commit', expected '$EXPECTED_SHA'); retrying in 5s"
            sleep 5
          done
          echo "Timed out waiting for backend to report commit $EXPECTED_SHA on /health"
          exit 1

      - name: Trigger frontend deploy webhook
        run: curl -fsS -X POST "$DOKPLOY_FRONTEND_WEBHOOK"
        env:
          DOKPLOY_FRONTEND_WEBHOOK: ${{ secrets.DOKPLOY_FRONTEND_WEBHOOK }}
```

- [ ] **Step 2: Validate the YAML syntax**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci-cd.yml'))"`
Expected: no output.

- [ ] **Step 3: Sanity-check the polling logic locally with a fake response**

Run:
```bash
printf '{"status":"ok","commit":"abc123def456"}' | sed -n 's/.*"commit":"\([^"]*\)".*/\1/p'
```
Expected: prints `abc123def456`.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci-cd.yml
git commit -m "ci: add deploy job that triggers Dokploy webhooks sequentially

Backend webhook fires first, then the job polls /health until the
reported commit matches github.sha (5min timeout), then fires the
frontend webhook. Concurrency group serialises overlapping pushes."
```

---

### Task 7: Document the out-of-repo configuration in the spec checklist

**Files:**
- Modify: `docs/superpowers/specs/2026-04-30-cicd-github-actions-dokploy-design.md` (only the checklist section, mark items the code has now made possible)

> The configuration of Dokploy, GitHub Environment, and branch protection are operator actions, not code changes. This task only ensures the spec's checklist accurately reflects what still needs to be done by hand.

- [ ] **Step 1: Re-read the checklist section in the spec**

Open `docs/superpowers/specs/2026-04-30-cicd-github-actions-dokploy-design.md` and locate the "Checklist de pré-implementação" section.

- [ ] **Step 2: Verify each checklist item is still required**

The following items remain operator actions (do NOT mark them done):
- Confirmar Build Type = Dockerfile no Dokploy
- Criar Environment `production` no GitHub e popular secrets/variáveis
- Verificar `NEXT_PUBLIC_API_BASE_URL` no Dokploy
- Verificar env vars do backend no Dokploy
- Configurar health check + rolling update no Dokploy
- Configurar `GIT_COMMIT_SHA` como build arg no Dokploy (preencher com a variável de commit do Dokploy)
- Configurar branch protection em `main`
- Decidir: aprovação manual no deploy?
- Decidir: rodar `npm run lint` no frontend?

The following items have been completed by this plan:
- ~~Remover `backend/nixpacks.toml` do repo~~ (Task 3)
- ~~Estender `/health` para retornar `commit`~~ (Task 1)
- ~~Injetar `GIT_COMMIT_SHA` como build arg no `Dockerfile.prod`~~ (Task 2)

- [ ] **Step 3: Mark the completed items in the spec**

In `docs/superpowers/specs/2026-04-30-cicd-github-actions-dokploy-design.md`, change `- [ ]` to `- [x]` for the three items completed above. Leave the others as `- [ ]`.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-04-30-cicd-github-actions-dokploy-design.md
git commit -m "docs(ci-cd): mark in-repo prerequisites as done in spec checklist

Remaining checklist items are operator actions (Dokploy panel,
GitHub Environment, branch protection) — left unchecked."
```

---

### Task 8: End-to-end verification on a PR

> **This task is a manual smoke test against the live GitHub Actions runner. Do not skip — it is the only way to catch workflow YAML errors that aren't syntactic.**

**Files:** none (operates against GitHub UI).

- [ ] **Step 1: Push the implementation branch and open a PR**

Push the current branch and open a pull request targeting `main` (via `gh pr create` or the GitHub UI). The PR description should reference the spec.

- [ ] **Step 2: Confirm the `test-backend` and `test-frontend` jobs run on the PR**

In the PR's "Checks" tab, verify both jobs start automatically. Verify the `deploy` job is **not** listed (it is gated by `if: github.event_name == 'push'`).

Expected: both check runs end green; no deploy job present.

- [ ] **Step 3: If the PR's checks fail, fix forward**

If a job fails, read the run log, fix in a new commit, and push again. Do not merge until both jobs are green.

- [ ] **Step 4: Configure branch protection BEFORE merging**

In the GitHub repo: Settings → Branches → Branch protection rules → add rule for `main`:
- Require status checks to pass before merging
- Required checks: `Test backend`, `Test frontend`
- (Optional) Require pull request reviews

- [ ] **Step 5: Configure the `production` Environment BEFORE merging**

In the GitHub repo: Settings → Environments → New environment → `production`. Add:
- Secret `DOKPLOY_BACKEND_WEBHOOK` (copy from Dokploy app → General → Deploy → Webhook URL)
- Secret `DOKPLOY_FRONTEND_WEBHOOK` (same, from the frontend app)
- Variable `BACKEND_HEALTH_URL` (e.g. `https://api.example.com.br/health`)
- (Optional) Required reviewers for manual approval

- [ ] **Step 6: Configure the Dokploy apps BEFORE merging**

For the backend app in Dokploy:
- Build Type: Dockerfile (pointing to `backend/Dockerfile.prod`)
- Build args: `GIT_COMMIT_SHA` = `${{commit_sha}}` (use the variable Dokploy exposes for the currently checked-out commit; consult the Dokploy panel for the exact syntax)
- Environment: all backend env vars listed in the spec
- Health check: `/health` returns 200; enable rolling update / zero-downtime
- Webhook: confirm the URL copied into `DOKPLOY_BACKEND_WEBHOOK` is correct

For the frontend app in Dokploy:
- Build Type: Dockerfile (pointing to `frontend/Dockerfile`)
- Build args: `NEXT_PUBLIC_API_BASE_URL` set to the public backend URL
- Health check: enable rolling update / zero-downtime
- Webhook: confirm the URL copied into `DOKPLOY_FRONTEND_WEBHOOK` is correct

- [ ] **Step 7: Merge the PR**

Merge via the GitHub UI (squash or merge — match the team's convention).

- [ ] **Step 8: Confirm the `deploy` job runs on `main`**

In the repo's Actions tab, find the workflow run triggered by the merge commit. Confirm:
- `test-backend` and `test-frontend` both pass
- `deploy` runs
- "Trigger backend deploy webhook" step succeeds (HTTP 2xx from Dokploy)
- "Wait for backend to report new commit on /health" step succeeds within 5 min — log should show the merge commit SHA matched
- "Trigger frontend deploy webhook" step succeeds

If the polling step times out, the most likely causes are: (a) `GIT_COMMIT_SHA` build arg not wired up in Dokploy, (b) backend container failed to start (check Dokploy logs), (c) `BACKEND_HEALTH_URL` wrong, (d) health check on Dokploy not configured so traffic still on old container. Fix and retry via `workflow_dispatch`.

- [ ] **Step 9: Smoke test the deployed application**

Hit `BACKEND_HEALTH_URL` directly and confirm the `commit` field matches the merge commit SHA. Open the frontend in a browser and verify a basic flow (login + dashboard).

- [ ] **Step 10: Document the completed deploy**

No additional commit required. Note in the PR or team channel that CI/CD is live as of `<merge commit SHA>`.

---

## Notes for the implementer

- **Order matters between Task 1 and Task 2.** The Dockerfile change in Task 2 is harmless on its own (sets an env var that's currently unread). The `/health` change in Task 1 reads the env var and falls back to `"unknown"`, so it's also safe on its own. Either order works, but doing Task 1 first keeps the test suite as the source of truth.
- **Do NOT** add `--no-verify` to any commit. If a pre-commit hook fails, fix the underlying issue.
- **Do NOT** commit the actual webhook URLs to the repo — they belong in the GitHub Environment secrets.
- The polling step uses `sed` rather than `jq` to avoid needing an extra install step; if the runner image already has `jq` (it does, as of ubuntu-latest in 2026-05), prefer:
  ```bash
  commit=$(curl -fsS "$BACKEND_HEALTH_URL" | jq -r '.commit')
  ```
  If switching to `jq`, replace the `sed` line in Task 6 Step 1 accordingly and re-validate the YAML.
- `npx vitest run` (without `--coverage`) is intentional — the spec accepts losing the coverage gate in CI in exchange for faster runs. Local `npm test` continues to produce coverage.
