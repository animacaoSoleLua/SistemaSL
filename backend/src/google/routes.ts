/* GOOGLE_CALENDAR_DISABLED_START
/*
 * Rotas OAuth do Google Calendar
 *
 * GET  /api/v1/auth/google          — inicia fluxo OAuth (redireciona para Google)
 * GET  /api/v1/auth/google/callback — recebe code, salva tokens, redireciona frontend
 * DELETE /api/v1/auth/google        — desconecta conta Google do usuário logado
 */

import { FastifyInstance } from "fastify";
import { prisma } from "../db/prisma.js";
import {
  exchangeCodeForTokens,
  fetchGoogleUserInfo,
  generateAuthUrl,
  isGoogleCalendarConfigured,
} from "../lib/googleCalendar.js";
import { verifyAccessToken } from "../auth/token.js";

const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:3000";

/** Resolve o userId a partir do cookie ou header Authorization (authGuard pula /api/v1/auth/*) 
function resolveUserId(request: { cookies?: Record<string, string | undefined>; headers: Record<string, string | string[] | undefined> }): string | null {
  const cookieToken = request.cookies?.["auth_token"];
  const header = request.headers["authorization"];
  const raw = typeof header === "string" ? header : undefined;
  const token = cookieToken ?? (raw?.startsWith("Bearer ") ? raw.slice(7) : undefined);
  if (!token) return null;
  const payload = verifyAccessToken(token);
  return payload?.sub ?? null;
}

export async function googleRoutes(app: FastifyInstance) {
  // GET /api/v1/auth/google — retorna a URL OAuth para o frontend redirecionar
  // (authGuard pula /api/v1/auth/*, então verificamos o token manualmente)
  app.get("/api/v1/auth/google", async (request, reply) => {
    const userId = resolveUserId(request as never);
    if (!userId) {
      return reply.status(401).send({ error: "unauthorized", message: "Token ausente" });
    }

    if (!isGoogleCalendarConfigured()) {
      return reply.status(503).send({
        error: "not_configured",
        message: "Integração com Google Calendar não configurada",
      });
    }

    const state = Buffer.from(JSON.stringify({ userId, ts: Date.now() })).toString("base64url");
    const authUrl = generateAuthUrl();
    const urlWithState = `${authUrl}&state=${encodeURIComponent(state)}`;

    return reply.send({ url: urlWithState });
  });

  // GET /api/v1/auth/google/callback — callback do Google
  app.get("/api/v1/auth/google/callback", async (request, reply) => {
    const query = request.query as { code?: string; state?: string; error?: string };

    if (query.error) {
      return reply.redirect(`${FRONTEND_URL}/perfil?google=error&reason=${encodeURIComponent(query.error)}`);
    }

    if (!query.code || !query.state) {
      return reply.redirect(`${FRONTEND_URL}/perfil?google=error&reason=invalid_response`);
    }

    let userId: string;
    try {
      const decoded = JSON.parse(Buffer.from(query.state, "base64url").toString());
      userId = decoded.userId;
      if (!userId) throw new Error("missing userId");
      // Valida que o estado não tem mais de 10 minutos
      if (Date.now() - decoded.ts > 10 * 60 * 1000) throw new Error("state_expired");
    } catch {
      return reply.redirect(`${FRONTEND_URL}/perfil?google=error&reason=invalid_state`);
    }

    try {
      const tokens = await exchangeCodeForTokens(query.code);
      const userInfo = await fetchGoogleUserInfo(tokens.accessToken).catch(() => ({ email: null, userId: null }));

      await prisma.user.update({
        where: { id: userId },
        data: {
          googleAccessToken: tokens.accessToken,
          googleRefreshToken: tokens.refreshToken,
          googleTokenExpiry: tokens.expiry,
          googleEmail: userInfo.email,
          googleUserId: userInfo.userId,
          googleLastSync: new Date(),
        },
      });

      return reply.redirect(`${FRONTEND_URL}/perfil?google=connected`);
    } catch {
      return reply.redirect(`${FRONTEND_URL}/perfil?google=error&reason=token_exchange`);
    }
  });

  // DELETE /api/v1/auth/google — desconecta conta Google
  app.delete("/api/v1/auth/google", async (request, reply) => {
    const userId = resolveUserId(request as never);
    if (!userId) {
      return reply.status(401).send({ error: "unauthorized", message: "Token ausente" });
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        googleAccessToken: null,
        googleRefreshToken: null,
        googleTokenExpiry: null,
        googleEmail: null,
        googleUserId: null,
        googleLastSync: null,
      },
    });

    return reply.status(204).send();
  });
}
