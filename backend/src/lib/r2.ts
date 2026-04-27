import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Writable } from "node:stream";
import { pipeline } from "node:stream/promises";

export const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function uploadToR2(options: {
  stream: NodeJS.ReadableStream;
  key: string;
  contentType: string;
  maxSize: number;
}): Promise<{ key: string; sizeBytes: number }> {
  const chunks: Buffer[] = [];
  let sizeBytes = 0;

  const collector = new Writable({
    write(chunk, _encoding, callback) {
      sizeBytes += chunk.length;
      if (sizeBytes > options.maxSize) {
        callback(new Error("file_too_large"));
        return;
      }
      chunks.push(Buffer.from(chunk));
      callback();
    },
  });

  await pipeline(options.stream, collector);

  const body = Buffer.concat(chunks);

  await r2.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: options.key,
      Body: body,
      ContentType: options.contentType,
      ContentLength: sizeBytes,
    })
  );

  return { key: options.key, sizeBytes };
}

export async function getPresignedViewUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
  });
  return getSignedUrl(r2, command, { expiresIn: 3600 });
}

export async function getPresignedDownloadUrl(key: string, filename: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    ResponseContentDisposition: `attachment; filename="${filename}"`,
  });
  return getSignedUrl(r2, command, { expiresIn: 60 });
}

export async function deleteFromR2(key: string): Promise<void> {
  try {
    await r2.send(
      new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: key,
      })
    );
  } catch {
    // ignore errors during delete (e.g. already deleted)
  }
}
