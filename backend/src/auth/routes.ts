import { FastifyInstance } from "fastify";
import {
  consumeResetToken,
  createResetToken,
  getUserByEmail,
  createUser,
  updateUserPassword,
  type Role,
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

interface RegisterBody {
  name?: string;
  last_name?: string;
  cpf?: string;
  email?: string;
  birth_date?: string;
  region?: string;
  phone?: string;
  role?: Role;
  password?: string;
}

const registerRoles: Role[] = ["animador", "recreador"];

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeCpf(value: string): string {
  return value.replace(/\D/g, "");
}

function isValidCpf(value: string): boolean {
  const digits = normalizeCpf(value);
  return digits.length === 11;
}

function parseDate(value: string | undefined): Date | undefined {
  if (!value) {
    return undefined;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return undefined;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }
  if (parsed.toISOString().slice(0, 10) !== value) {
    return undefined;
  }
  return parsed;
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
          photo_url: user.photoUrl ?? null,
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

  app.post("/register", async (request, reply) => {
    const {
      name,
      last_name,
      cpf,
      email,
      birth_date,
      region,
      phone,
      role,
      password,
    } = request.body as RegisterBody;

    if (
      !name ||
      !last_name ||
      !cpf ||
      !email ||
      !birth_date ||
      !region ||
      !phone ||
      !role ||
      !password
    ) {
      return reply.status(400).send({
        error: "invalid_request",
        message: "Preencha todos os campos obrigatorios",
      });
    }

    if (!isValidEmail(email)) {
      return reply.status(400).send({
        error: "invalid_request",
        message: "Email invalido",
      });
    }

    if (!registerRoles.includes(role)) {
      return reply.status(400).send({
        error: "invalid_request",
        message: "Papel invalido",
      });
    }

    if (!password.trim()) {
      return reply.status(400).send({
        error: "invalid_request",
        message: "Senha invalida",
      });
    }

    const parsedBirthDate = parseDate(birth_date);
    if (!parsedBirthDate) {
      return reply.status(400).send({
        error: "invalid_request",
        message: "Data de nascimento invalida",
      });
    }

    if (!region.trim()) {
      return reply.status(400).send({
        error: "invalid_request",
        message: "Regiao invalida",
      });
    }

    if (!phone.trim()) {
      return reply.status(400).send({
        error: "invalid_request",
        message: "Telefone invalido",
      });
    }

    if (!isValidCpf(cpf)) {
      return reply.status(400).send({
        error: "invalid_request",
        message: "CPF invalido",
      });
    }

    const normalizedCpf = normalizeCpf(cpf);

    const created = await createUser({
      name,
      lastName: last_name,
      email,
      cpf: normalizedCpf,
      birthDate: parsedBirthDate,
      region: region.trim(),
      phone: phone.trim(),
      role,
      password,
    });

    if (!created) {
      return reply.status(409).send({
        error: "email_exists",
        message: "Email ja cadastrado",
      });
    }

    return reply.status(201).send({
      data: {
        id: created.id,
        name: created.name,
        last_name: created.lastName ?? null,
        role: created.role,
      },
    });
  });
}
