import compress from "@fastify/compress";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import Fastify, { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { advertenciasRoutes } from "./advertencias/routes.js";
import { feedbacksRoutes } from "./feedbacks/routes.js";
import { googleRoutes } from "./google/routes.js";
import { authGuard, requireRole } from "./auth/guard.js";
import { authRoutes } from "./auth/routes.js";
import { cursosRoutes } from "./cursos/routes.js";
import { dashboardRoutes } from "./dashboard/routes.js";
import { ensureBaseUsers } from "./db/seed.js";
import { membrosRoutes } from "./membros/routes.js";
import { scheduleCleanup } from "./relatorios/cleanup.js";
import { relatoriosRoutes } from "./relatorios/routes.js";
import { healthRoutes } from "./routes/health.js";

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

async function ensureUploadsWritable(root: string): Promise<void> {
  await mkdir(root, { recursive: true });
  const probe = join(root, `.upload-probe-${randomUUID()}`);
  try {
    await writeFile(probe, "ok");
  } catch (error) {
    throw new Error("uploads_unwritable", { cause: error });
  } finally {
    await unlink(probe).catch(() => {});
  }
}

export function buildServer(): FastifyInstance {
  const isPrettyLogs =
    process.env.LOG_FORMAT === "pretty" || process.env.NODE_ENV !== "production";
  const logLevel = process.env.LOG_LEVEL ?? "info";
  const logger = isPrettyLogs
    ? {
        level: logLevel,
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:dd/mm/yy HH:MM:ss",
            ignore: "pid,hostname",
            singleLine: true,
          },
        },
      }
    : {
        level: logLevel,
        formatters: {
          bindings: () => ({}),
          level: (label: string) => ({ level: label }),
        },
        timestamp: false,
      };

  const app = Fastify({
    logger,
    disableRequestLogging: true,
    ignoreTrailingSlash: true,
    ignoreDuplicateSlashes: true,
    // Necessário para obter o IP real do cliente quando atrás de proxy reverso (nginx/Caddy).
    // Sem isso, request.ip retorna o IP do proxy e todos os usuários compartilham o mesmo bucket de rate limit.
    trustProxy: true,
  });

  app.addHook("onResponse", (req, reply, done) => {
    if (req.method === "OPTIONS") {
      done();
      return;
    }
    const ms = reply.elapsedTime.toFixed(0);
    const status = reply.statusCode;
    const actor = req.user ? `[${req.user.name}]` : "[anon]";
    app.log.info(`${actor} ${req.method} ${req.url} -> ${status} (${ms}ms)`);
    done();
  });

  // Enable CORS for the frontend origin (and allow subdomains of solelua.cloud)
  const envOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",").map((origin) => origin.trim())
    : [];
  const defaultOrigins = [
    "http://localhost:3000",
    "https://solelua.cloud",
    "https://www.solelua.cloud",
  ];
  const allowedOrigins = new Set([...defaultOrigins, ...envOrigins].filter(Boolean));

  // Compressão gzip/deflate para respostas JSON > 1KB
  app.register(compress, {
    global: true,
    threshold: 1024,
    encodings: ["gzip", "deflate"],
  });

  // Security headers
  app.register(helmet, {
    contentSecurityPolicy: false, // gerenciado pelo frontend (Next.js)
    // Arquivos de upload são recursos públicos acessados cross-origin (frontend em porta diferente)
    crossOriginResourcePolicy: { policy: "cross-origin" },
  });

  // Cookie support (necessário para autenticação via httpOnly cookie)
  app.register(cookie);

  // Rate limiting global — sobrescrito por rota em auth
  app.register(rateLimit, {
    global: true,
    max: 200,
    timeWindow: "1 minute",
  });

  app.register(cors, {
    origin: (origin, cb) => {
      if (!origin) {
        cb(null, true);
        return;
      }

      if (allowedOrigins.has(origin)) {
        cb(null, true);
        return;
      }

      try {
        const url = new URL(origin);
        if (url.hostname === "solelua.cloud" || url.hostname.endsWith(".solelua.cloud")) {
          cb(null, true);
          return;
        }
      } catch {
        // Ignore invalid origin values.
      }

      cb(null, false);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  });

  const uploadsRoot = process.env.UPLOADS_DIR
    ? resolve(process.env.UPLOADS_DIR)
    : join(process.cwd(), "uploads");

  try {
    mkdirSync(uploadsRoot, { recursive: true });
  } catch (error) {
    throw new Error("uploads_unwritable", { cause: error });
  }

  app.addHook("preHandler", authGuard);
  app.addHook("onReady", async () => {
    await ensureUploadsWritable(uploadsRoot);
    await ensureBaseUsers();
    scheduleCleanup(app.log);
  });

  app.register(multipart, {
    limits: {
      fileSize: MAX_UPLOAD_BYTES,
      files: 1,
    },
  });
  app.register(fastifyStatic, {
    root: uploadsRoot,
    prefix: "/uploads/",
  });

  app.register(authRoutes, { prefix: "/api/v1/auth" });
  app.register(healthRoutes);
  app.register(membrosRoutes);
  app.register(cursosRoutes);
  app.register(relatoriosRoutes);
  app.register(advertenciasRoutes);
  app.register(feedbacksRoutes);
  app.register(googleRoutes);
  app.register(dashboardRoutes);

  app.get("/api/v1/secure/ping", async () => ({ status: "ok" }));
  app.get(
    "/api/v1/admin/ping",
    { preHandler: requireRole(["admin"]) },
    async () => ({ status: "ok" })
  );

  return app;
}
