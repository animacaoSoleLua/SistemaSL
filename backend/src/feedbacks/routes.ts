import { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { extname } from "node:path";
import { requireRole } from "../auth/guard.js";
import { deleteFromR2, uploadToR2 } from "../lib/r2.js";
import {
  createFeedback,
  deleteFeedback,
  FeedbackType,
  getFeedbackById,
  listFeedbacks,
} from "./store.js";

const MAX_AUDIO_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

const allowedAudioExtensions = [".mp3", ".m4a", ".ogg", ".wav", ".webm", ".aac"];
const allowedAudioMimes: Record<string, string> = {
  "audio/mpeg": ".mp3",
  "audio/mp4": ".m4a",
  "audio/ogg": ".ogg",
  "audio/wav": ".wav",
  "audio/webm": ".webm",
  "audio/aac": ".aac",
  "audio/x-m4a": ".m4a",
};

function parsePositiveInt(val: string | undefined): number | undefined {
  if (!val) return undefined;
  const n = parseInt(val, 10);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

export async function feedbacksRoutes(app: FastifyInstance) {
  // GET /api/v1/feedbacks — listar feedbacks com filtros
  app.get("/api/v1/feedbacks", { preHandler: requireRole(["admin"]) }, async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({ error: "unauthorized", message: "Token ausente" });
    }

    const query = request.query as {
      type?: string;
      member_id?: string;
      member_role?: string;
      page?: string;
      limit?: string;
    };

    if (query.type && query.type !== "positive" && query.type !== "negative") {
      return reply.status(400).send({ error: "invalid_request", message: "Tipo invalido" });
    }

    if (
      query.member_role &&
      query.member_role !== "animador" &&
      query.member_role !== "recreador" &&
      query.member_role !== "admin"
    ) {
      return reply.status(400).send({ error: "invalid_request", message: "Role invalido" });
    }

    const page = parsePositiveInt(query.page) ?? 1;
    const limit = parsePositiveInt(query.limit) ?? 20;

    const result = await listFeedbacks({
      type: query.type as FeedbackType | undefined,
      memberId: query.member_id,
      memberRole: query.member_role,
      page,
      limit,
    });

    return reply.status(200).send({
      data: result.feedbacks.map((f) => ({
        id: f.id,
        type: f.type,
        text: f.text,
        audio_url: f.audioUrl,
        event_date: null,
        created_at: f.createdAt.toISOString(),
        created_by: {
          id: f.creator.id,
          name: f.creator.name,
          last_name: f.creator.lastName,
        },
        members: f.members.map((m) => ({
          id: m.id,
          name: m.name,
          last_name: m.lastName,
          role: m.role,
        })),
      })),
      total: result.total,
      pages: result.pages,
      page,
    });
  });

  // POST /api/v1/feedbacks — criar feedback (JSON ou multipart com áudio)
  app.post("/api/v1/feedbacks", { preHandler: requireRole(["admin"]) }, async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({ error: "unauthorized", message: "Token ausente" });
    }

    const contentType = request.headers["content-type"] ?? "";

    if (contentType.includes("multipart/form-data")) {
      // Upload de áudio
      const parts = request.parts();
      let type: string | undefined;
      let text: string | undefined;
      let memberIds: string[] = [];
      let audioUrl: string | undefined;

      const feedbackId = randomUUID();

      for await (const part of parts) {
        if (part.type === "field") {
          if (part.fieldname === "type") type = part.value as string;
          else if (part.fieldname === "text") text = part.value as string;
          else if (part.fieldname === "member_ids") {
            try {
              memberIds = JSON.parse(part.value as string);
            } catch {
              // ignore malformed
            }
          }
        } else if (part.type === "file" && part.fieldname === "audio") {
          const mimeType = (part.mimetype ?? "").toLowerCase();
          const ext =
            allowedAudioMimes[mimeType] ??
            (allowedAudioExtensions.includes(extname(part.filename ?? "").toLowerCase())
              ? extname(part.filename ?? "").toLowerCase()
              : null);

          if (!ext) {
            await part.file.resume();
            return reply.status(400).send({
              error: "invalid_file",
              message: "Formato de audio invalido. Use mp3, m4a, ogg, wav, webm ou aac.",
            });
          }

          const filename = `${randomUUID()}${ext}`;
          const key = `feedbacks/${feedbackId}/${filename}`;

          try {
            const { url } = await uploadToR2({
              stream: part.file,
              key,
              contentType: mimeType || "audio/mpeg",
              maxSize: MAX_AUDIO_SIZE_BYTES,
            });
            audioUrl = url;
          } catch {
            return reply.status(400).send({
              error: "file_too_large",
              message: "Audio muito grande. Maximo: 20MB.",
            });
          }
        }
      }

      // Validações
      if (!type || (type !== "positive" && type !== "negative")) {
        return reply.status(400).send({
          error: "invalid_request",
          message: "Campo 'type' e obrigatorio (positive ou negative)",
        });
      }

      if (!audioUrl && !text?.trim()) {
        return reply.status(400).send({
          error: "invalid_request",
          message: "Informe o texto ou envie um audio",
        });
      }

      if (!Array.isArray(memberIds) || memberIds.length === 0) {
        return reply.status(400).send({
          error: "invalid_request",
          message: "Selecione pelo menos um membro",
        });
      }

      const feedback = await createFeedback({
        createdBy: request.user.id,
        type: type as FeedbackType,
        text: text?.trim() || undefined,
        audioUrl,
        memberIds,
      });

      return reply.status(201).send({
        data: {
          id: feedback.id,
          type: feedback.type,
          text: feedback.text,
          audio_url: feedback.audioUrl,
          event_date: null,
          created_at: feedback.createdAt.toISOString(),
          members: feedback.members.map((m) => ({
            id: m.id,
            name: m.name,
            last_name: m.lastName,
            role: m.role,
          })),
        },
      });
    } else {
      // JSON — sem áudio
      const body = request.body as {
        type?: string;
        text?: string;
        member_ids?: unknown;
        event_date?: string;
      };

      if (!body.type || (body.type !== "positive" && body.type !== "negative")) {
        return reply.status(400).send({
          error: "invalid_request",
          message: "Campo 'type' e obrigatorio (positive ou negative)",
        });
      }

      if (!body.text?.trim()) {
        return reply.status(400).send({
          error: "invalid_request",
          message: "Informe o texto do feedback",
        });
      }

      if (body.text.trim().length < 3) {
        return reply.status(400).send({
          error: "invalid_request",
          message: "Texto muito curto (minimo 3 caracteres)",
        });
      }

      if (body.text.trim().length > 2000) {
        return reply.status(400).send({
          error: "invalid_request",
          message: "Texto muito longo (maximo 2000 caracteres)",
        });
      }

      if (!Array.isArray(body.member_ids) || body.member_ids.length === 0) {
        return reply.status(400).send({
          error: "invalid_request",
          message: "Selecione pelo menos um membro",
        });
      }

      const memberIds = body.member_ids as string[];

      const feedback = await createFeedback({
        createdBy: request.user.id,
        type: body.type as FeedbackType,
        text: body.text.trim(),
        memberIds,
      });

      return reply.status(201).send({
        data: {
          id: feedback.id,
          type: feedback.type,
          text: feedback.text,
          audio_url: feedback.audioUrl,
          event_date: null,
          created_at: feedback.createdAt.toISOString(),
          members: feedback.members.map((m) => ({
            id: m.id,
            name: m.name,
            last_name: m.lastName,
            role: m.role,
          })),
        },
      });
    }
  });

  // GET /api/v1/feedbacks/:id — detalhes
  app.get("/api/v1/feedbacks/:id", { preHandler: requireRole(["admin"]) }, async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({ error: "unauthorized", message: "Token ausente" });
    }

    const { id } = request.params as { id: string };
    const feedback = await getFeedbackById(id);

    if (!feedback) {
      return reply.status(404).send({ error: "not_found", message: "Feedback nao encontrado" });
    }

    return reply.status(200).send({
      data: {
        id: feedback.id,
        type: feedback.type,
        text: feedback.text,
        audio_url: feedback.audioUrl,
        event_date: null,
        created_at: feedback.createdAt.toISOString(),
        created_by: {
          id: feedback.creator.id,
          name: feedback.creator.name,
          last_name: feedback.creator.lastName,
        },
        members: feedback.members.map((m) => ({
          id: m.id,
          name: m.name,
          last_name: m.lastName,
          role: m.role,
        })),
      },
    });
  });

  // DELETE /api/v1/feedbacks/:id — apenas admin
  app.delete(
    "/api/v1/feedbacks/:id",
    { preHandler: requireRole(["admin"]) },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const feedback = await getFeedbackById(id);

      if (!feedback) {
        return reply.status(404).send({ error: "not_found", message: "Feedback nao encontrado" });
      }

      await deleteFeedback(id);

      if (feedback.audioUrl) {
        await deleteFromR2(feedback.audioUrl);
      }

      return reply.status(204).send();
    }
  );
}
