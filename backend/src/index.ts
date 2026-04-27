import "dotenv/config";
import { z } from "zod";
import { buildServer } from "./app.js";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatória"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET precisa ter ao menos 32 caracteres"),
  PORT: z.string().default("3001"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM: z.string().optional(),
  R2_ENDPOINT: z.string().url(),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET_NAME: z.string().min(1),
});

const envResult = envSchema.safeParse(process.env);
if (!envResult.success) {
  console.error("❌ Variáveis de ambiente inválidas:");
  console.error(envResult.error.issues.map((i) => `  ${i.path}: ${i.message}`).join("\n"));
  process.exit(1);
}

const app = buildServer();
const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? "0.0.0.0";

app
  .listen({ port, host })
  .catch((error) => {
    app.log.error(error);
    process.exit(1);
  });
