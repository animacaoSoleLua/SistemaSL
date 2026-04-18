#!/usr/bin/env node
/**
 * Script de migração única: move arquivos de ./uploads para o Cloudflare R2
 * e atualiza as URLs no banco de dados.
 *
 * Uso: node migrate-uploads-to-r2.mjs
 *
 * Requer as variáveis de ambiente:
 *   DATABASE_URL, R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
 *   R2_BUCKET_NAME, R2_PUBLIC_URL, UPLOADS_DIR (opcional, default: ./uploads)
 */

import "dotenv/config";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import pg from "pg";

const { Client } = pg;

const uploadsRoot = process.env.UPLOADS_DIR
  ? resolve(process.env.UPLOADS_DIR)
  : resolve("./uploads");

const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const bucketName = process.env.R2_BUCKET_NAME;
const publicUrl = process.env.R2_PUBLIC_URL;

async function uploadFile(localPath, key, contentType) {
  const fileStream = createReadStream(localPath);
  const fileStat = await stat(localPath);
  await r2.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: fileStream,
      ContentType: contentType,
      ContentLength: fileStat.size,
    })
  );
  return `${publicUrl}/${key}`;
}

function guessContentType(url) {
  const ext = url.split(".").pop()?.toLowerCase();
  const map = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    mp4: "video/mp4",
    mov: "video/quicktime",
    webm: "video/webm",
    mp3: "audio/mpeg",
    m4a: "audio/mp4",
    ogg: "audio/ogg",
    wav: "audio/wav",
    aac: "audio/aac",
  };
  return map[ext] ?? "application/octet-stream";
}

async function migrateUrl(db, localUrl) {
  if (!localUrl || !localUrl.startsWith("/uploads/")) {
    return null;
  }

  const relativePath = localUrl.slice("/uploads/".length);
  const localPath = join(uploadsRoot, relativePath);
  const key = relativePath.replace(/\\/g, "/");
  const newUrl = `${publicUrl}/${key}`;

  try {
    await stat(localPath);
  } catch {
    console.warn(`  [SKIP] Arquivo não encontrado: ${localPath}`);
    return null;
  }

  console.log(`  [UPLOAD] ${localPath} → ${key}`);
  await uploadFile(localPath, key, guessContentType(localUrl));
  return newUrl;
}

async function main() {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  console.log("Conectado ao banco de dados.");

  let migrated = 0;
  let skipped = 0;

  // 1. ReportMedia
  console.log("\n[1/3] Migrando mídias de relatórios...");
  const mediaRows = await db.query(
    `SELECT id, url FROM "report_media" WHERE url LIKE '/uploads/%'`
  );
  console.log(`  Encontradas: ${mediaRows.rows.length}`);
  for (const row of mediaRows.rows) {
    const newUrl = await migrateUrl(db, row.url);
    if (newUrl) {
      await db.query(`UPDATE "report_media" SET url = $1 WHERE id = $2`, [newUrl, row.id]);
      migrated++;
    } else {
      skipped++;
    }
  }

  // 2. User.photo_url
  console.log("\n[2/3] Migrando fotos de perfil...");
  const photoRows = await db.query(
    `SELECT id, photo_url FROM "users" WHERE photo_url LIKE '/uploads/%'`
  );
  console.log(`  Encontradas: ${photoRows.rows.length}`);
  for (const row of photoRows.rows) {
    const newUrl = await migrateUrl(db, row.photo_url);
    if (newUrl) {
      await db.query(`UPDATE "users" SET photo_url = $1 WHERE id = $2`, [newUrl, row.id]);
      migrated++;
    } else {
      skipped++;
    }
  }

  // 3. ClientFeedback.audio_url
  console.log("\n[3/3] Migrando áudios de feedbacks...");
  const audioRows = await db.query(
    `SELECT id, audio_url FROM "client_feedbacks" WHERE audio_url LIKE '/uploads/%'`
  );
  console.log(`  Encontradas: ${audioRows.rows.length}`);
  for (const row of audioRows.rows) {
    const newUrl = await migrateUrl(db, row.audio_url);
    if (newUrl) {
      await db.query(`UPDATE "client_feedbacks" SET audio_url = $1 WHERE id = $2`, [newUrl, row.id]);
      migrated++;
    } else {
      skipped++;
    }
  }

  await db.end();

  console.log(`\nMigração concluída: ${migrated} arquivo(s) migrado(s), ${skipped} ignorado(s).`);
}

main().catch((err) => {
  console.error("Erro fatal:", err);
  process.exit(1);
});
