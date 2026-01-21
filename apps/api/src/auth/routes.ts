import { FastifyInstance } from "fastify";
import {
  consumeResetToken,
  createResetToken,
  getUserByEmail,
  updateUserPassword,
} from "./store.js";
import { createAccessToken } from "./token.js";

interface LoginBody {
  email?: string;
  password?: string;
}

interface ForgotPasswordBody {
  email?: string;
}

interface ResetPasswordBody {
  token?: string;
  password?: string;
}

export async function authRoutes(app: FastifyInstance) {
  app.post("/login", async (request, reply) => {
    const { email, password } = request.body as LoginBody;

    if (!email || !password) {
      return reply.status(400).send({
        error: "invalid_request",
        message: "Email e senha sao obrigatorios",
      });
    }

    const user = getUserByEmail(email);
    if (!user || user.password !== password) {
      return reply.status(401).send({
        error: "invalid_credentials",
        message: "Email ou senha invalidos",
      });
    }

    const accessToken = createAccessToken(user);
    return reply.status(200).send({
      data: {
        access_token: accessToken,
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
        },
      },
    });
  });

  app.post("/forgot-password", async (request, reply) => {
    const { email } = request.body as ForgotPasswordBody;

    if (!email) {
      return reply.status(400).send({
        error: "invalid_request",
        message: "Email e obrigatorio",
      });
    }

    const user = getUserByEmail(email);
    if (user) {
      createResetToken(user.id);
    }

    return reply.status(200).send({
      data: {
        message: "Email enviado",
      },
    });
  });

  app.post("/reset-password", async (request, reply) => {
    const { token, password } = request.body as ResetPasswordBody;

    if (!token || !password) {
      return reply.status(400).send({
        error: "invalid_request",
        message: "Token e senha sao obrigatorios",
      });
    }

    const userId = consumeResetToken(token);
    if (!userId) {
      return reply.status(400).send({
        error: "invalid_token",
        message: "Token invalido",
      });
    }

    updateUserPassword(userId, password);

    return reply.status(200).send({
      data: {
        message: "Senha atualizada",
      },
    });
  });
}
