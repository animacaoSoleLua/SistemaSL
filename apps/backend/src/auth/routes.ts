import { FastifyInstance } from "fastify";
import {
  consumeResetToken,
  createResetToken,
  getUserByEmail,
  updateUserPassword,
} from "./store.js";
import { verifyPassword } from "./password.js";
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

    const user = await getUserByEmail(email);
    if (!user) {
      return reply.status(401).send({
        error: "invalid_credentials",
        message: "Email ou senha invalidos",
      });
    }

    const passwordCheck = verifyPassword(password, user.passwordHash);
    if (!passwordCheck.valid) {
      return reply.status(401).send({
        error: "invalid_credentials",
        message: "Email ou senha invalidos",
      });
    }

    if (passwordCheck.needsRehash) {
      await updateUserPassword(user.id, password);
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

    const user = await getUserByEmail(email);
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

    await updateUserPassword(userId, password);

    return reply.status(200).send({
      data: {
        message: "Senha atualizada",
      },
    });
  });
}
