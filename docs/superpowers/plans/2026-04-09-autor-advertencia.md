# Autor da Advertência Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Exibir o nome de quem deu uma advertência no perfil do membro que a recebeu e no email de notificação.

**Architecture:** Três camadas: (1) o email `sendWarningEmail` recebe um parâmetro opcional `issuerName` e o inclui no corpo; (2) a rota `GET /api/v1/membros/:id` resolve o nome do criador de cada advertência via `getUserById` em paralelo e retorna `created_by_name`; (3) o frontend exibe esse campo na seção "Minhas advertências" do perfil.

**Tech Stack:** TypeScript, Fastify, Prisma, Next.js, Vitest (unit + integration)

---

## Arquivos Modificados

- `backend/src/lib/email.ts` — adiciona parâmetro `issuerName` a `sendWarningEmail`
- `backend/src/advertencias/routes.ts` — passa `request.user!.name` ao chamar `sendWarningEmail`
- `backend/src/membros/routes.ts` — resolve nomes dos criadores e inclui `created_by_name` na resposta
- `backend/test/email.unit.test.ts` — testa novo parâmetro `issuerName`
- `backend/test/advertencias.integration.test.ts` — testa `created_by_name` no perfil
- `frontend/app/perfil/page.tsx` — exibe "Dada por: [nome]" em cada advertência

---

## Task 1: Atualizar `sendWarningEmail` para incluir nome do autor (TDD)

**Files:**
- Modify: `backend/test/email.unit.test.ts`
- Modify: `backend/src/lib/email.ts`

- [ ] **Step 1: Escrever o teste com falha**

Em `backend/test/email.unit.test.ts`, adicionar após o teste existente de `sendWarningEmail` (linha 104):

```typescript
  it("sendWarningEmail inclui nome do autor quando fornecido", async () => {
    await sendWarningEmail(fakeMember, fakeWarning, 1, "Carlos Oliveira");
    expect(mockFetch).toHaveBeenCalledOnce();
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.html).toContain("Carlos Oliveira");
    expect(body.text).toContain("Carlos Oliveira");
  });

  it("sendWarningEmail nao inclui linha de autor quando nao fornecido", async () => {
    await sendWarningEmail(fakeMember, fakeWarning, 1);
    expect(mockFetch).toHaveBeenCalledOnce();
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.html).not.toContain("Registrada por:");
  });
```

- [ ] **Step 2: Rodar o teste e confirmar falha**

```bash
cd backend && npx vitest run test/email.unit.test.ts
```

Esperado: FAIL — `sendWarningEmail` não aceita 4 argumentos ainda.

- [ ] **Step 3: Implementar o parâmetro `issuerName` em `sendWarningEmail`**

Em `backend/src/lib/email.ts`, alterar a assinatura da função (linha 186) e adicionar a linha no template HTML e texto:

```typescript
export async function sendWarningEmail(
  member: UserRecord,
  warning: WarningRecord,
  warningCount: number,
  issuerName?: string
): Promise<void> {
  const subject = "Você recebeu uma advertência";
  const memberName = [member.name, member.lastName].filter(Boolean).join(" ");
  const dateStr = warning.warningDate.toLocaleDateString("pt-BR");
  const ordinalCount = ordinal(warningCount);

  const suspensionNotice =
    warningCount < 3
      ? `Esta é sua ${ordinalCount} advertência no último mês. Ao atingir 3, você será suspenso.`
      : `Esta é sua ${ordinalCount} advertência no último mês. Você atingiu o limite de 3 advertências e foi suspenso por 1 mês.`;

  const issuerRow = issuerName
    ? `<tr><td style="padding: 6px 0;"><strong style="color: #c0392b;">Registrada por:</strong>&nbsp; ${issuerName}</td></tr>`
    : "";

  const html = buildHtml(`
    <h2 style="margin: 0 0 20px 0; color: #c0392b; font-size: 22px;">Advertência recebida</h2>
    <p style="margin: 0 0 20px 0;">Olá, <strong>${memberName}</strong>. Informamos que você recebeu uma advertência registrada em nosso sistema.</p>
    <table cellpadding="0" cellspacing="0" style="width: 100%; background-color: #fff5f5; border-left: 4px solid #c0392b; border-radius: 4px; padding: 20px; margin-bottom: 20px;">
      <tr><td style="padding: 6px 0;"><strong style="color: #c0392b;">Motivo:</strong>&nbsp; ${warning.reason}</td></tr>
      <tr><td style="padding: 6px 0;"><strong style="color: #c0392b;">Data da ocorrência:</strong>&nbsp; ${dateStr}</td></tr>
      ${issuerRow}
    </table>
    <p style="margin: 0 0 16px 0; padding: 12px 16px; background-color: #fef9e7; border-radius: 6px; font-size: 14px; color: #7d6608;">
      ${suspensionNotice}
    </p>
    <p style="margin: 0; color: #666666; font-size: 14px;">Em caso de dúvidas, entre em contato com a equipe Sol e Lua.</p>
  `);

  const textLines = [
    "Você recebeu uma advertência.",
    `Olá, ${memberName}.`,
    `Motivo: ${warning.reason}`,
    `Data da ocorrência: ${dateStr}`,
    ...(issuerName ? [`Registrada por: ${issuerName}`] : []),
    suspensionNotice,
  ];

  const text = textLines.join("\n");

  await sendEmail([member.email], subject, html, text);
}
```

- [ ] **Step 4: Rodar o teste e confirmar sucesso**

```bash
cd backend && npx vitest run test/email.unit.test.ts
```

Esperado: PASS em todos os testes de email.

- [ ] **Step 5: Commit**

```bash
cd backend && git add src/lib/email.ts test/email.unit.test.ts
git commit -m "feat: add issuerName parameter to sendWarningEmail"
```

---

## Task 2: Passar nome do autor ao chamar `sendWarningEmail` na rota

**Files:**
- Modify: `backend/src/advertencias/routes.ts`

- [ ] **Step 1: Atualizar a chamada de `sendWarningEmail` na rota POST**

Em `backend/src/advertencias/routes.ts`, linha 199, adicionar `request.user!.name` como quarto argumento:

```typescript
      countWarningsInWindow(member.id, subMonths(parsedDate, 1), parsedDate).then((warningCount) => {
        sendWarningEmail(member, result.warning, warningCount, request.user!.name).catch((err) =>
          console.error("sendWarningEmail failed", err)
        );
      }).catch((err) => console.error("countWarningsInWindow failed for warning email", err));
```

- [ ] **Step 2: Verificar que os testes de email ainda passam**

```bash
cd backend && npx vitest run test/email.unit.test.ts
```

Esperado: PASS.

- [ ] **Step 3: Commit**

```bash
cd backend && git add src/advertencias/routes.ts
git commit -m "feat: pass issuer name to sendWarningEmail in POST /advertencias"
```

---

## Task 3: Incluir `created_by_name` no endpoint de perfil do membro (TDD)

**Files:**
- Modify: `backend/test/advertencias.integration.test.ts`
- Modify: `backend/src/membros/routes.ts`

- [ ] **Step 1: Escrever o teste com falha**

Em `backend/test/advertencias.integration.test.ts`, dentro do `describe`, adicionar um novo teste ao final (antes do fechamento do `describe`):

```typescript
  it("profile warnings include created_by_name", async () => {
    const loginAdmin = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "arthurssousa2004@gmail.com",
        password: "admin123",
      },
    });
    const adminToken = loginAdmin.json().data.access_token;
    const admin = await getUserByEmail("arthurssousa2004@gmail.com");

    const member = await getUserByEmail("animador@sol-e-lua.com");

    await app.inject({
      method: "POST",
      url: "/api/v1/advertencias",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        member_id: member!.id,
        reason: "Teste de autor",
        warning_date: "2026-02-01",
      },
    });

    const loginMember = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "animador@sol-e-lua.com",
        password: "animador123",
      },
    });
    const memberToken = loginMember.json().data.access_token;

    const profile = await app.inject({
      method: "GET",
      url: `/api/v1/membros/${member!.id}`,
      headers: { authorization: `Bearer ${memberToken}` },
    });

    expect(profile.statusCode).toBe(200);
    const profileData = profile.json().data;
    expect(profileData.warnings).toHaveLength(1);
    const expectedName = [admin!.name, admin!.lastName].filter(Boolean).join(" ");
    expect(profileData.warnings[0].created_by_name).toBe(expectedName);
  });
```

- [ ] **Step 2: Rodar o teste e confirmar falha**

```bash
cd backend && npx vitest run test/advertencias.integration.test.ts -t "profile warnings include created_by_name"
```

Esperado: FAIL — `created_by_name` é `undefined`.

- [ ] **Step 3: Implementar a resolução de nomes em `membros/routes.ts`**

Em `backend/src/membros/routes.ts`, após a linha `const warnings = await listWarningsForMember(member.id);` (linha 441) e antes da linha `const suspension = await getActiveSuspension(member.id);` (linha 450), adicionar:

```typescript
    const uniqueCreatorIds = [...new Set(warnings.map((w) => w.createdBy).filter(Boolean))];
    const creatorRecords = await Promise.all(uniqueCreatorIds.map((id) => getUserById(id)));
    const creatorNameMap = new Map<string, string>(
      creatorRecords
        .filter((u): u is NonNullable<typeof u> => u !== undefined)
        .map((u) => [u.id, [u.name, u.lastName].filter(Boolean).join(" ")])
    );
```

Depois, na linha 514, atualizar o mapeamento de warnings para incluir `created_by_name`:

```typescript
        warnings: warnings.map((warning) => ({
          id: warning.id,
          reason: warning.reason,
          warning_date: formatDate(warning.warningDate),
          created_by: warning.createdBy,
          created_by_name: creatorNameMap.get(warning.createdBy) ?? null,
        })),
```

- [ ] **Step 4: Rodar todos os testes de advertências e membros**

```bash
cd backend && npx vitest run test/advertencias.integration.test.ts test/membros.integration.test.ts
```

Esperado: PASS em todos.

- [ ] **Step 5: Commit**

```bash
cd backend && git add src/membros/routes.ts test/advertencias.integration.test.ts
git commit -m "feat: include created_by_name in member profile warnings"
```

---

## Task 4: Exibir "Dada por" no perfil do membro no frontend

**Files:**
- Modify: `frontend/app/perfil/page.tsx`

- [ ] **Step 1: Adicionar `created_by_name` à interface `WarningItem`**

Em `frontend/app/perfil/page.tsx`, linha 23, atualizar a interface:

```typescript
interface WarningItem {
  id: string;
  reason: string;
  warning_date: string;
  created_by_name?: string | null;
}
```

- [ ] **Step 2: Exibir o nome do autor na lista de advertências**

Em `frontend/app/perfil/page.tsx`, localizar o bloco (por volta da linha 793):

```tsx
                        <li key={warning.id} className="warning-item">
                          <span className="warning-date">
                            {formatDateBR(warning.warning_date)}
                          </span>
                          <span className="warning-desc">{warning.reason}</span>
                        </li>
```

Substituir por:

```tsx
                        <li key={warning.id} className="warning-item">
                          <span className="warning-date">
                            {formatDateBR(warning.warning_date)}
                          </span>
                          <span className="warning-desc">{warning.reason}</span>
                          {warning.created_by_name && (
                            <span className="warning-issuer">
                              Dada por: {warning.created_by_name}
                            </span>
                          )}
                        </li>
```

- [ ] **Step 3: Verificar que o TypeScript compila sem erros**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep -E "error TS|perfil"
```

Esperado: sem erros relacionados a `perfil/page.tsx`.

- [ ] **Step 4: Commit**

```bash
cd frontend && git add app/perfil/page.tsx
git commit -m "feat: show warning issuer name in member profile"
```

---

## Task 5: Verificação final

- [ ] **Step 1: Rodar suite completa de testes do backend**

```bash
cd backend && npx vitest run
```

Esperado: todos os testes PASS.

- [ ] **Step 2: Verificar TypeScript do frontend**

```bash
cd frontend && npx tsc --noEmit
```

Esperado: 0 erros.

- [ ] **Step 3: Commit final se necessário**

Se houver arquivos não commitados:

```bash
git add -A
git commit -m "chore: finalize warning issuer feature"
```
