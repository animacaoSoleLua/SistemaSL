# Plano: Tornar o bucket R2 privado (fotos de crianças)

## Contexto

Atualmente o bucket R2 está configurado com acesso público (`pub-xxx.r2.dev`), o que significa que qualquer pessoa com a URL consegue acessar as fotos dos relatórios — que contêm imagens de crianças. Isso viola a LGPD e boas práticas de proteção de dados.

**Objetivo:** Tornar o bucket completamente privado. URLs de visualização serão geradas sob demanda pelo backend (presigned URLs), válidas por tempo limitado e só entregues a usuários autenticados.

---

## Visão Geral da Mudança

| Antes | Depois |
|-------|--------|
| URL pública permanente salva no banco | Chave (`key`) salva no banco |
| Qualquer um acessa `pub-xxx.r2.dev/foto.jpg` | Só usuários autenticados recebem URL temporária via backend |
| Bucket com domínio público habilitado | Bucket 100% privado, sem domínio público |
| URLs de download já eram presigned | URLs de visualização também passam a ser presigned |

---

## PASSO 1 — Cloudflare Dashboard (fazer primeiro, antes do código)

> **Atenção:** Este passo torna as URLs públicas atuais inacessíveis. Faça em conjunto com o deploy do código novo.

1. Acesse [dash.cloudflare.com](https://dash.cloudflare.com) → **R2** → selecione o bucket `sistemasl-uploads`
2. Vá em **Settings** → **Public Access**
3. Clique em **Disable** no domínio `pub-4711023485b646efa2969b8839c750aa.r2.dev`
4. Confirme a desativação
5. Verifique que nenhum **Custom Domain** está configurado (se tiver, remova também)
6. O bucket continua acessível via API com as credenciais (`R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY`) — só o acesso público direto é bloqueado

---

## PASSO 2 — Banco de Dados (migração)

### O que muda
Atualmente as colunas `url` armazenam a URL completa (`https://pub-xxx.r2.dev/relatorios/uuid/foto.jpg`). Vamos migrar para armazenar apenas a **chave** (`relatorios/uuid/foto.jpg`), que é independente de domínio.

### Arquivos afetados no schema
- `ReportMedia.url` — chave do arquivo de mídia do relatório
- `User.photoUrl` — chave da foto de perfil do membro
- `ClientFeedback.audioUrl` — chave do áudio de feedback

### Gerar a migration

```bash
cd backend
npx prisma migrate dev --name r2_store_key_instead_of_url
```

### Conteúdo da migration SQL

A migration deve converter as URLs existentes em chaves, removendo o prefixo do domínio público:

```sql
-- Remove o prefixo da URL pública de todas as mídias de relatório
UPDATE "report_media"
SET "url" = REPLACE("url", 'https://pub-4711023485b646efa2969b8839c750aa.r2.dev/', '')
WHERE "url" LIKE 'https://pub-4711023485b646efa2969b8839c750aa.r2.dev/%';

-- Remove o prefixo da foto de perfil dos usuários
UPDATE "users"
SET "photo_url" = REPLACE("photo_url", 'https://pub-4711023485b646efa2969b8839c750aa.r2.dev/', '')
WHERE "photo_url" LIKE 'https://pub-4711023485b646efa2969b8839c750aa.r2.dev/%';

-- Remove o prefixo do áudio dos feedbacks
UPDATE "client_feedbacks"
SET "audio_url" = REPLACE("audio_url", 'https://pub-4711023485b646efa2969b8839c750aa.r2.dev/', '')
WHERE "audio_url" LIKE 'https://pub-4711023485b646efa2969b8839c750aa.r2.dev/%';
```

> Renomeie o campo no schema Prisma de `url` para `key` nas models afetadas (opcional, mas mais claro). Se renomear, ajuste todos os `select` e `map`.

---

## PASSO 3 — Backend: `src/lib/r2.ts`

### 3.1 — Mudar `uploadToR2` para retornar `key` em vez de `url`

```typescript
// Antes:
return { url: `${process.env.R2_PUBLIC_URL}/${options.key}`, sizeBytes };

// Depois:
return { key: options.key, sizeBytes };
```

### 3.2 — Adicionar `getPresignedViewUrl` (para visualização inline)

```typescript
export async function getPresignedViewUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
  });
  return getSignedUrl(r2, command, { expiresIn: 3600 }); // 1 hora
}
```

### 3.3 — Atualizar `getPresignedDownloadUrl` para receber `key` direto

```typescript
// Antes: recebia a URL completa e extraía a key
export async function getPresignedDownloadUrl(url: string, filename: string): Promise<string | null>

// Depois: recebe a key diretamente
export async function getPresignedDownloadUrl(key: string, filename: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    ResponseContentDisposition: `attachment; filename="${filename}"`,
  });
  return getSignedUrl(r2, command, { expiresIn: 60 });
}
```

### 3.4 — Atualizar `deleteFromR2` para receber `key` direto

```typescript
// Antes: recebia URL e extraía a key
export async function deleteFromR2(url: string): Promise<void>

// Depois: recebe a key diretamente
export async function deleteFromR2(key: string): Promise<void> {
  try {
    await r2.send(new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
    }));
  } catch {
    // ignorar erros de delete (já deletado, etc.)
  }
}
```

### 3.5 — Remover `R2_PUBLIC_URL` da validação de env (já não é mais necessária)

Em `src/index.ts`, remover a linha:
```typescript
R2_PUBLIC_URL: z.string().url(),
```

---

## PASSO 4 — Backend: `src/relatorios/routes.ts`

### 4.1 — Upload de mídia (POST `/api/v1/relatorios/:id/media`)

```typescript
// Antes:
const { url, sizeBytes } = await uploadToR2({ ... });
const media = await addMediaToReport(report.id, { type: mediaType, url, ... });

// Depois:
const { key, sizeBytes } = await uploadToR2({ ... });
const media = await addMediaToReport(report.id, { type: mediaType, url: key, ... });
// Resposta: não retornar a key diretamente — gerar presigned URL para o cliente
const viewUrl = await getPresignedViewUrl(key);
return reply.status(201).send({ data: { ...media, url: viewUrl } });
```

### 4.2 — GET de relatório individual (GET `/api/v1/relatorios/:id`)

Ao montar a resposta com `media`, substituir a key pela presigned URL:

```typescript
media: await Promise.all(report.media.map(async (media) => ({
  id: media.id,
  url: await getPresignedViewUrl(media.url), // media.url é a key
  media_type: media.type,
  topic: media.topic,
  size_bytes: media.sizeBytes,
}))),
```

### 4.3 — GET de lista de relatórios (GET `/api/v1/relatorios`)

Mesma lógica: gerar presigned URLs para todas as mídias ao montar a resposta.

### 4.4 — Download de mídia (GET `/api/v1/relatorios/:id/media/:mediaId/download`)

```typescript
// Antes:
const presignedUrl = await getPresignedDownloadUrl(media.url, filename);

// Depois:
const filename = media.url.split("/").pop() ?? mediaId; // media.url é a key
const presignedUrl = await getPresignedDownloadUrl(media.url, filename);
```

### 4.5 — Delete de mídia e delete de relatório

```typescript
// Antes:
await deleteFromR2(media.url); // passava URL completa

// Depois:
await deleteFromR2(media.url); // media.url agora é a key — sem mudança de interface após passo 3.4
```

---

## PASSO 5 — Backend: `src/membros/routes.ts`

### 5.1 — Upload de foto de perfil

```typescript
// Antes:
const { url } = await uploadToR2({ ... });
// salvava url no banco

// Depois:
const { key } = await uploadToR2({ ... });
// salva key no banco
// ao retornar a resposta, gerar presigned URL:
const viewUrl = await getPresignedViewUrl(key);
return reply.send({ data: { ...member, photo_url: viewUrl } });
```

### 5.2 — GET de membro / lista de membros

Ao retornar dados de membros com `photo_url`, substituir a key pela presigned URL:

```typescript
photo_url: member.photoUrl ? await getPresignedViewUrl(member.photoUrl) : null,
```

> **Atenção:** A lista de membros pode retornar muitos registros. Usar `Promise.all` para gerar as presigned URLs em paralelo.

### 5.3 — Delete de foto antiga

```typescript
// Antes:
await deleteFromR2(currentPhotoUrl); // era URL completa

// Depois:
await deleteFromR2(currentPhotoKey); // agora é a key
```

---

## PASSO 6 — Backend: `src/feedbacks/routes.ts`

### 6.1 — Upload de áudio

```typescript
// Antes:
const { url } = await uploadToR2({ ... });

// Depois:
const { key } = await uploadToR2({ ... });
// salva key no banco
```

### 6.2 — DELETE de feedback com áudio

```typescript
// Antes:
await deleteFromR2(feedback.audioUrl); // era URL completa

// Depois:
await deleteFromR2(feedback.audioUrl); // agora é key — sem mudança de interface
```

> Feedbacks de áudio normalmente não são exibidos como imagem no frontend, mas se houver endpoint que retorna a URL do áudio para reprodução, aplicar `getPresignedViewUrl` da mesma forma.

---

## PASSO 7 — Backend: `src/relatorios/cleanup.ts`

```typescript
// Antes:
await deleteFromR2(media.url); // era URL completa

// Depois:
await deleteFromR2(media.url); // agora é key — sem mudança de interface após passo 3.4
```

Sem outras mudanças necessárias.

---

## PASSO 8 — Frontend

### 8.1 — O que NÃO muda

O frontend continua recebendo um campo `url` nas respostas do backend — só que agora é uma presigned URL temporária (válida por 1 hora) em vez de uma URL pública permanente. A maior parte do código do frontend não precisa mudar.

### 8.2 — `lib/api.ts` — `resolveApiAssetUrl`

Esta função atualmente adiciona o `API_ORIGIN` quando a URL começa com `/`. Como as novas URLs serão sempre `https://...` (presigned), a função continua funcionando sem mudanças.

Porém, verificar se existe algum lugar que ainda compare com `/uploads/` ou com o domínio público — remover essas referências.

### 8.3 — `app/novo-relatorio/page.tsx` — Preview de mídia existente

A linha que abre a preview diretamente:
```typescript
onClick={() => handlePreviewUrl(media.url)}
```

Continua funcionando pois `media.url` agora é uma presigned URL válida por 1 hora. Sem mudança necessária.

### 8.4 — `app/relatorios/page.tsx` — Lightbox de imagens

```typescript
const assetUrl = resolveApiAssetUrl(item.url);
```

Continua funcionando — `item.url` agora é presigned. Sem mudança.

### 8.5 — `app/usuarios/page.tsx` e `app/perfil/page.tsx` — Foto de perfil

```typescript
src={resolveApiAssetUrl(user.photo_url)}
```

Continua funcionando — `photo_url` agora é presigned. Sem mudança.

### 8.6 — `app/components/SidebarNav.tsx` — Foto na sidebar

Idem — sem mudança.

### 8.7 — Atenção: expiração das presigned URLs

As presigned URLs expiram em **1 hora**. Se o usuário deixar a página aberta por mais de 1 hora e tentar visualizar uma imagem, ela vai falhar (erro 403). Para mitigar:

- **Curto prazo:** aceitar o comportamento — o usuário pode recarregar a página
- **Longo prazo (opcional):** adicionar lógica de refresh automático ao expirar (fora do escopo deste plano)

---

## PASSO 9 — Variáveis de Ambiente

### Remover do `.env` e do Dokploy:
```
R2_PUBLIC_URL  ← não é mais necessária
```

### Manter:
```
R2_ENDPOINT
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME
```

---

## PASSO 10 — Testes

### 10.1 — Atualizar mock em `test/relatorios-media.integration.test.ts`

O mock de `uploadToR2` atualmente retorna `{ url, sizeBytes }`. Mudar para `{ key, sizeBytes }`:

```typescript
vi.mock("../src/lib/r2.js", () => ({
  uploadToR2: vi.fn(
    async ({ stream, key, maxSize }) => {
      // ... lógica de coleta do stream ...
      return { key, sizeBytes }; // retorna key, não url
    }
  ),
  deleteFromR2: vi.fn(async () => {}),
  getPresignedViewUrl: vi.fn(async (key: string) => `https://presigned.example.com/${key}?sig=test`),
  getPresignedDownloadUrl: vi.fn(async (key: string, filename: string) => `https://presigned.example.com/${key}?download=${filename}`),
}));
```

### 10.2 — Atualizar assertions nos testes de mídia

```typescript
// Antes:
expect(body.data.url).toContain(`${process.env.R2_PUBLIC_URL}/relatorios/${report.id}/`);

// Depois:
expect(body.data.url).toContain("presigned.example.com/relatorios/");
expect(body.data.url).toContain(report.id);
```

### 10.3 — Atualizar mock em `test/membros.integration.test.ts`

Se existirem testes de upload de foto, aplicar o mesmo padrão: mock de `uploadToR2` retornando `key` e mock de `getPresignedViewUrl`.

### 10.4 — Novos testes a escrever

Adicionar em `test/relatorios-media.integration.test.ts`:

```typescript
it("retorna presigned URL ao buscar relatório com mídia", async () => {
  // 1. criar relatório e fazer upload de mídia
  // 2. buscar o relatório via GET /api/v1/relatorios/:id
  // 3. verificar que media[0].url contém "presigned.example.com" (mock)
  //    e NÃO contém o domínio público do R2
});

it("retorna presigned URL para download", async () => {
  // 1. criar relatório e mídia
  // 2. chamar GET /api/v1/relatorios/:id/media/:mediaId/download
  // 3. verificar que o campo url da resposta é presigned
});

it("URL retornada na criação de mídia é presigned, não pública", async () => {
  // upload de mídia e verificar que a url na resposta é presigned
  // e que NÃO começa com R2_PUBLIC_URL
});
```

### 10.5 — Rodar os testes

```bash
cd backend
npm test
```

---

## Ordem de Execução Segura

```
1. Implementar todas as mudanças de código (passos 3–9)
2. Rodar testes: npm test
3. Fazer deploy da nova versão do backend
4. Rodar a migration do banco no servidor (prisma migrate deploy)
5. APENAS ENTÃO: desabilitar o domínio público no Cloudflare (passo 1)
   - Se feito antes do deploy, URLs antigas quebram sem substituto
6. Verificar que imagens carregam corretamente na aplicação
7. Verificar nos DevTools do browser que as URLs de imagem contêm "?X-Amz-Signature=" 
   (confirma que são presigned, não públicas)
```

---

## Checklist Final

- [ ] Cloudflare: domínio público desabilitado no bucket
- [ ] `r2.ts`: `uploadToR2` retorna `key`
- [ ] `r2.ts`: `getPresignedViewUrl` implementada (1h)
- [ ] `r2.ts`: `getPresignedDownloadUrl` recebe `key` direto
- [ ] `r2.ts`: `deleteFromR2` recebe `key` direto
- [ ] `relatorios/routes.ts`: GETs retornam presigned URLs para mídia
- [ ] `relatorios/routes.ts`: POST de upload salva `key` no banco
- [ ] `membros/routes.ts`: GETs retornam presigned URLs para fotos
- [ ] `membros/routes.ts`: upload de foto salva `key` no banco
- [ ] `feedbacks/routes.ts`: upload de áudio salva `key` no banco
- [ ] `cleanup.ts`: usa `key` em `deleteFromR2`
- [ ] Migration SQL executada no banco de produção
- [ ] `R2_PUBLIC_URL` removida das env vars
- [ ] Testes atualizados e passando
- [ ] Verificado no browser que URLs são presigned (contêm `X-Amz-Signature`)
- [ ] Verificado que acesso direto ao domínio público retorna 403/404
