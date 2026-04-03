import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import {
  AgendaEventData,
  createUserAgendaEvent,
  deleteUserEvent,
  listUserEvents,
  updateUserAgendaEvent,
} from "../lib/googleCalendar.js";
import type { UserTokens } from "../lib/googleCalendar.js";

const AgendaEventSchema = z.object({
  title: z.string().min(1, "Título obrigatório"),
  start: z.string().min(1, "Data de início obrigatória"),
  end: z.string().min(1, "Data de fim obrigatória"),
  description: z.string().optional(),
  attendees: z.array(z.string().email("E-mail inválido")).optional(),
});

async function getUserTokens(userId: string): Promise<UserTokens | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      googleAccessToken: true,
      googleRefreshToken: true,
      googleTokenExpiry: true,
    },
  });
  if (!user?.googleAccessToken || !user?.googleRefreshToken) {
    return null;
  }
  return {
    accessToken: user.googleAccessToken,
    refreshToken: user.googleRefreshToken,
    tokenExpiry: user.googleTokenExpiry,
  };
}

export async function agendaRoutes(app: FastifyInstance) {
  // GET /api/v1/agenda/events?timeMin=&timeMax=
  app.get("/api/v1/agenda/events", async (request, reply) => {
    const query = request.query as { timeMin?: string; timeMax?: string };
    const timeMin = query.timeMin ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const timeMax = query.timeMax ?? new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();

    const tokens = await getUserTokens(request.user!.id);
    if (!tokens) {
      return reply.send({ data: [] });
    }

    try {
      const events = await listUserEvents(tokens, timeMin, timeMax);
      return reply.send({ data: events });
    } catch {
      return reply.send({ data: [] });
    }
  });

  // POST /api/v1/agenda/events
  app.post("/api/v1/agenda/events", async (request, reply) => {
    const parsed = AgendaEventSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: "validation_error",
        message: parsed.error.issues[0].message,
      });
    }

    const tokens = await getUserTokens(request.user!.id);
    if (!tokens) {
      return reply.status(422).send({
        error: "google_not_connected",
        message: "Conecte sua conta Google no Perfil para gerenciar eventos.",
      });
    }

    const data: AgendaEventData = parsed.data;
    try {
      const eventId = await createUserAgendaEvent(tokens, data);
      return reply.status(201).send({ data: { id: eventId } });
    } catch {
      return reply.status(502).send({
        error: "calendar_error",
        message: "Erro ao criar evento no Google Calendar. Tente novamente.",
      });
    }
  });

  // PATCH /api/v1/agenda/events/:id
  app.patch("/api/v1/agenda/events/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = AgendaEventSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: "validation_error",
        message: parsed.error.issues[0].message,
      });
    }

    const tokens = await getUserTokens(request.user!.id);
    if (!tokens) {
      return reply.status(422).send({
        error: "google_not_connected",
        message: "Conecte sua conta Google no Perfil para gerenciar eventos.",
      });
    }

    const data: AgendaEventData = parsed.data;
    try {
      await updateUserAgendaEvent(tokens, id, data);
      return reply.status(200).send({ data: { id } });
    } catch {
      return reply.status(502).send({
        error: "calendar_error",
        message: "Erro ao atualizar evento no Google Calendar. Tente novamente.",
      });
    }
  });

  // DELETE /api/v1/agenda/events/:id
  app.delete("/api/v1/agenda/events/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    const tokens = await getUserTokens(request.user!.id);
    if (!tokens) {
      return reply.status(422).send({
        error: "google_not_connected",
        message: "Conecte sua conta Google no Perfil para gerenciar eventos.",
      });
    }

    try {
      await deleteUserEvent(tokens, id);
      return reply.status(204).send();
    } catch {
      return reply.status(502).send({
        error: "calendar_error",
        message: "Erro ao deletar evento no Google Calendar. Tente novamente.",
      });
    }
  });
}
