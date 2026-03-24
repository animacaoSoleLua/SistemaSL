/**
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
  generateAuthUrl,
  isGoogleCalendarConfigured,
} from "../lib/googleCalendar.js";

const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:3000";

export async function googleRoutes(app: FastifyInstance) {
  // GET /api/v1/auth/google — inicia OAuth, precisa estar logado
  app.get("/api/v1/auth/google", async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({ error: "unauthorized", message: "Token ausente" });
    }

    if (!isGoogleCalendarConfigured()) {
      return reply.status(503).send({
        error: "not_configured",
        message: "Integração com Google Calendar não configurada",
      });
    }

    // Estado = userId codificado em base64 (sistema interno, sem dados sensíveis na URL)
    const state = Buffer.from(JSON.stringify({ userId: request.user.id, ts: Date.now() })).toString("base64url");

    const authUrl = generateAuthUrl();
    // Adiciona state na URL (generateAuthUrl() não inclui state, fazemos manualmente)
    const urlWithState = `${authUrl}&state=${encodeURIComponent(state)}`;

    return reply.redirect(urlWithState);
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

      await prisma.user.update({
        where: { id: userId },
        data: {
          googleAccessToken: tokens.accessToken,
          googleRefreshToken: tokens.refreshToken,
          googleTokenExpiry: tokens.expiry,
        },
      });

      return reply.redirect(`${FRONTEND_URL}/perfil?google=connected`);
    } catch {
      return reply.redirect(`${FRONTEND_URL}/perfil?google=error&reason=token_exchange`);
    }
  });

  // DELETE /api/v1/auth/google — desconecta conta Google
  app.delete("/api/v1/auth/google", async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({ error: "unauthorized", message: "Token ausente" });
    }

    await prisma.user.update({
      where: { id: request.user.id },
      data: {
        googleAccessToken: null,
        googleRefreshToken: null,
        googleTokenExpiry: null,
      },
    });

    return reply.status(204).send();
  });
}
