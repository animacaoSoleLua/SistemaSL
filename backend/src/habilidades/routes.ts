import { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireRole } from "../auth/guard.js";
import { getUserById } from "../auth/store.js";
import {
  addMemberSkill,
  createSkill,
  deleteSkill,
  getSkillById,
  listSkills,
  removeMemberSkill,
  updateMemberSkill,
  updateSkill,
} from "./store.js";
import { getPresignedViewUrl } from "../lib/r2.js";

const CreateSkillSchema = z.object({
  name: z.string().min(1, "Nome obrigatorio").max(100, "Nome muito longo"),
  description: z.string().max(2000, "Descricao muito longa").optional(),
});

const UpdateSkillSchema = z.object({
  name: z.string().min(1, "Nome obrigatorio").max(100, "Nome muito longo").optional(),
  description: z.string().max(2000, "Descricao muito longa").nullable().optional(),
});

const AddMemberSkillSchema = z.object({
  member_id: z.string().uuid("Membro invalido"),
  rating: z.number().int().min(1, "Nota minima e 1").max(10, "Nota maxima e 10"),
});

const UpdateMemberSkillSchema = z.object({
  rating: z.number().int().min(1, "Nota minima e 1").max(10, "Nota maxima e 10"),
});

export async function habilidadesRoutes(app: FastifyInstance) {
  app.get(
    "/api/v1/habilidades",
    { preHandler: requireRole(["admin"]) },
    async (_request, reply) => {
      const skills = await listSkills();
      const result = await Promise.all(
        skills.map(async (skill) => ({
          id: skill.id,
          name: skill.name,
          description: skill.description,
          members: await Promise.all(
            skill.members.map(async (m) => ({
              member_id: m.memberId,
              name: m.memberName,
              last_name: m.memberLastName,
              photo_url: m.photoUrl ? await getPresignedViewUrl(m.photoUrl) : null,
              rating: m.rating,
            }))
          ),
        }))
      );
      return reply.status(200).send(result);
    }
  );

  app.post(
    "/api/v1/habilidades",
    { preHandler: requireRole(["admin"]) },
    async (request, reply) => {
      const parsed = CreateSkillSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "invalid_request",
          message: parsed.error.errors[0].message,
        });
      }
      try {
        const skill = await createSkill({
          name: parsed.data.name,
          description: parsed.data.description,
        });
        return reply.status(201).send({ data: skill });
      } catch (err: unknown) {
        const prismaErr = err as { code?: string };
        if (prismaErr.code === "P2002") {
          return reply.status(409).send({
            error: "conflict",
            message: "Já existe uma habilidade com esse nome",
          });
        }
        throw err;
      }
    }
  );

  app.put(
    "/api/v1/habilidades/:id",
    { preHandler: requireRole(["admin"]) },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsed = UpdateSkillSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "invalid_request",
          message: parsed.error.errors[0].message,
        });
      }
      try {
        const skill = await updateSkill(id, parsed.data);
        if (!skill) {
          return reply.status(404).send({ error: "not_found", message: "Habilidade nao encontrada" });
        }
        return reply.status(200).send({ data: skill });
      } catch (err: unknown) {
        const prismaErr = err as { code?: string };
        if (prismaErr.code === "P2002") {
          return reply.status(409).send({
            error: "conflict",
            message: "Já existe uma habilidade com esse nome",
          });
        }
        throw err;
      }
    }
  );

  app.delete(
    "/api/v1/habilidades/:id",
    { preHandler: requireRole(["admin"]) },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const deleted = await deleteSkill(id);
      if (!deleted) {
        return reply.status(404).send({ error: "not_found", message: "Habilidade nao encontrada" });
      }
      return reply.status(204).send();
    }
  );

  app.post(
    "/api/v1/habilidades/:id/membros",
    { preHandler: requireRole(["admin"]) },
    async (request, reply) => {
      const { id: skillId } = request.params as { id: string };
      const parsed = AddMemberSkillSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "invalid_request",
          message: parsed.error.errors[0].message,
        });
      }

      const skill = await getSkillById(skillId);
      if (!skill) {
        return reply.status(404).send({ error: "not_found", message: "Habilidade nao encontrada" });
      }

      const member = await getUserById(parsed.data.member_id);
      if (!member) {
        return reply.status(404).send({ error: "not_found", message: "Membro nao encontrado" });
      }

      try {
        const ms = await addMemberSkill({
          memberId: parsed.data.member_id,
          skillId,
          rating: parsed.data.rating,
        });
        return reply.status(201).send({ data: ms });
      } catch (err: unknown) {
        const prismaErr = err as { code?: string };
        if (prismaErr.code === "P2002") {
          return reply.status(409).send({
            error: "conflict",
            message: "Esse membro já possui essa habilidade",
          });
        }
        throw err;
      }
    }
  );

  app.put(
    "/api/v1/habilidades/:id/membros/:memberId",
    { preHandler: requireRole(["admin"]) },
    async (request, reply) => {
      const { id: skillId, memberId } = request.params as { id: string; memberId: string };
      const parsed = UpdateMemberSkillSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "invalid_request",
          message: parsed.error.errors[0].message,
        });
      }
      const ms = await updateMemberSkill(skillId, memberId, parsed.data.rating);
      if (!ms) {
        return reply.status(404).send({ error: "not_found", message: "Vínculo não encontrado" });
      }
      return reply.status(200).send({ data: ms });
    }
  );

  app.delete(
    "/api/v1/habilidades/:id/membros/:memberId",
    { preHandler: requireRole(["admin"]) },
    async (request, reply) => {
      const { id: skillId, memberId } = request.params as { id: string; memberId: string };
      const removed = await removeMemberSkill(skillId, memberId);
      if (!removed) {
        return reply.status(404).send({ error: "not_found", message: "Vínculo não encontrado" });
      }
      return reply.status(204).send();
    }
  );
}
