# Migração de Uploads para Cloudflare R2

## Visão Geral

Atualmente todos os arquivos (imagens, vídeos, fotos de perfil, áudios) são salvos no disco do servidor em `./uploads`. Esta migração move esses arquivos para o Cloudflare R2 (object storage), liberando espaço no servidor e tornando os arquivos mais resilientes.

**Antes:** arquivo salvo em disco → URL `/uploads/relatorios/foto.jpg`
**Depois:** arquivo enviado ao R2 → URL `https://pub-xxx.r2.dev/relatorios/foto.jpg`

---

## Variáveis de Ambiente a Adicionar no Dokploy

```env
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=seu_access_key_id
R2_SECRET_ACCESS_KEY=seu_secret_access_key
R2_BUCKET_NAME=sistemaSL-uploads
R2_PUBLIC_URL=https://pub-xxx.r2.dev
```

---

## Dependência a Instalar

```bash
npm install @aws-sdk/client-s3
```

O R2 é compatível com a API do S3, então usa o mesmo SDK.

---

## Arquivos que Precisam ser Alterados

### 1. `backend/src/index.ts`
**O que mudar:** Adicionar validação das novas variáveis de ambiente do R2 no schema Zod.

```typescript
// Adicionar ao schema de env:
R2_ENDPOINT: z.string().url(),
R2_ACCESS_KEY_ID: z.string().min(1),
R2_SECRET_ACCESS_KEY: z.string().min(1),
R2_BUCKET_NAME: z.string().min(1),
R2_PUBLIC_URL: z.string().url(),
```

---

### 2. `backend/src/lib/r2.ts` *(arquivo novo)*
**O que criar:** Cliente R2 reutilizável e funções de upload/delete.

```typescript
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";

export const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

// Envia arquivo para o R2, retorna URL pública
export async function uploadToR2(options: {
  stream: NodeJS.ReadableStream;
  key: string;          // caminho no bucket, ex: "relatorios/uuid/foto.jpg"
  contentType: string;
  maxSize: number;
}): Promise<{ url: string; sizeBytes: number }> { ... }

// Remove arquivo do R2
export async function deleteFromR2(url: string): Promise<void> { ... }
```

---

### 3. `backend/src/app.ts`
**O que remover:**
- Registro do `fastifyStatic` para a pasta `uploads` (linhas 182-185)
- Função `ensureUploadsWritable` (linhas 28-38)
- Criação do diretório `uploads` (linhas 163-167)
- Chamada `await ensureUploadsWritable(uploadsRoot)` (linha 171)

**O que adicionar:**
- Inicialização do cliente R2 no startup

---

### 4. `backend/src/relatorios/routes.ts`
**O que mudar:**
- Remover `uploadsRoot` e a função `saveUploadToDisk` local
- Remover `resolveStoragePathFromPublicUrl`
- Substituir o bloco de save para disco pela chamada `uploadToR2()`
- Substituir `safeUnlink(storagePath)` por `deleteFromR2(url)`
- A URL salva no banco passa de `/uploads/relatorios/...` para `https://pub-xxx.r2.dev/relatorios/...`

**Trecho principal afetado (linha ~1034):**
```typescript
// Antes:
const storagePath = join(uploadsRoot, relativePath);
sizeBytes = await saveUploadToDisk({ stream, targetPath: storagePath, maxSize });
const url = `/uploads/${publicPath}`;

// Depois:
const { url, sizeBytes } = await uploadToR2({ stream, key: publicPath, contentType, maxSize });
```

---

### 5. `backend/src/membros/routes.ts`
**O que mudar:**
- Remover `uploadsRoot`, `saveUploadToDisk` local e `deletePhotoFromDisk`
- Substituir upload de foto de perfil por `uploadToR2()`
- Substituir delete de foto antiga por `deleteFromR2(url)`

**Trechos afetados:**
- Linha ~762: save da foto nova
- Linha ~784: delete da foto antiga
- Linha ~792: geração da URL

---

### 6. `backend/src/feedbacks/routes.ts`
**O que mudar:**
- Remover `uploadsRoot`
- Substituir o stream inline de áudio por chamada ao `uploadToR2()`
- Substituir delete de áudio por `deleteFromR2(url)`

**Trecho afetado:**
- Linha ~122: criação do diretório e save do áudio
- Linha ~179: geração da URL do áudio
- Linha ~354: delete do diretório de feedback

---

### 7. `backend/src/relatorios/cleanup.ts`
**O que mudar:**
- Remover `uploadsRoot` e `resolveStoragePath`
- Substituir `safeUnlink(storagePath)` por `deleteFromR2(media.url)` nas funções `purgeOldMedia` e `purgeOldReports`

---

## Script de Migração dos Arquivos Existentes

Arquivo: `backend/migrate-uploads-to-r2.mjs`

Este script deve ser rodado **uma única vez** no servidor via SSH, **antes** de fazer o deploy do novo código.

**O que ele fará:**
1. Conectar ao banco PostgreSQL
2. Listar todas as URLs de mídia em `ReportMedia`, `User.photoUrl` e `ClientFeedback.audioUrl`
3. Para cada arquivo com URL `/uploads/...`:
   - Ler o arquivo do disco
   - Enviar para o R2
   - Atualizar a URL no banco para `https://pub-xxx.r2.dev/...`
4. Logar progresso e erros

**Ordem de execução segura:**
```
1. Rodar migrate-uploads-to-r2.mjs no servidor (arquivos antigos vão pro R2)
2. Fazer deploy do novo código (novos uploads já vão pro R2)
3. Verificar se tudo está funcionando
4. Remover a pasta ./uploads do servidor (opcional, depois de confirmar)
```

---

## O que NÃO muda

- Banco de dados PostgreSQL — continua onde está
- Estrutura das tabelas e campos — só as URLs mudam de formato
- Lógica de negócio dos relatórios — só a camada de I/O de arquivo muda
- Frontend — continua recebendo URLs de mídia normalmente

---

## Riscos e Cuidados

| Risco | Mitigação |
|-------|-----------|
| Deploy novo antes de migrar arquivos antigos | Sempre rodar o script de migração ANTES do deploy |
| Credenciais R2 erradas no Dokploy | Testar conexão localmente antes de fazer deploy |
| Arquivos grandes travando o script de migração | Script processa um por vez com log de progresso |
| Bucket R2 sem acesso público | Verificar configuração de Public Access no painel Cloudflare |
