import { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  getUserByEmail,
  createUser,
  updateUserPassword,
  type Role,
} from "./store.js";
import {
  consumePasswordResetToken,
  issuePasswordResetToken,
  verifyPasswordResetToken,
} from "./password-reset.js";
import { sendPasswordResetEmail } from "./password-reset-email.js";
import { verifyPassword } from "./password.js";
import { createAccessToken } from "./token.js";
import { auditLog } from "../lib/audit.js";
import { isValidCPF } from "../lib/validators.js";

const MIN_PASSWORD_LENGTH = 8;

function normalizeCpf(value: string): string {
  return value.replace(/\D/g, "");
}

const LoginSchema = z.object({
  email: z.string().min(1, "Email obrigatorio"),
  password: z.string().min(1, "Senha obrigatoria"),
});

const RegisterSchema = z.object({
  name: z.string().min(1, "Nome obrigatorio"),
  last_name: z.string().min(1, "Sobrenome obrigatorio"),
  cpf: z.string().refine(isValidCPF, { message: "CPF invalido" }),
  email: z.string().email("Email invalido"),
  birth_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data de nascimento invalida"),
  region: z.string().min(1, "Regiao invalida"),
  phone: z.string().min(1, "Telefone invalido"),
  role: z.enum(["animador", "recreador"] as const, {
    message: "Papel invalido",
  }),
  password: z.string().min(MIN_PASSWORD_LENGTH, `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres`),
});

const ForgotPasswordSchema = z.object({
  email: z.string().email("Email invalido"),
});

const VerifyTokenSchema = z.object({
  email: z.string().min(1, "Email obrigatorio"),
  token: z.string().min(1, "Token obrigatorio"),
});

const ResetPasswordSchema = z.object({
  email: z.string().min(1, "Email obrigatorio"),
  token: z.string().min(1, "Token obrigatorio"),
  novaSenha: z.string().optional(),
  novaSenhaConfirmacao: z.string().optional(),
  password: z.string().optional(),
  passwordConfirm: z.string().optional(),
});

/**
 * Valida força da senha: mínimo 8 chars, ao menos 1 maiúscula e 1 número.
 * Retorna null se válida, ou mensagem de erro se inválida.
 */
function validatePasswordStrength(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres`;
  }
  if (!/[A-Z]/.test(password)) {
    return "A senha deve conter ao menos uma letra maiúscula";
  }
  if (!/[0-9]/.test(password)) {
    return "A senha deve conter ao menos um número";
  }
  return null;
}

function setAuthCookie(reply: import("fastify").FastifyReply, token: string): void {
  const isProduction = process.env.NODE_ENV === "production";
  reply.setCookie("auth_token", token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "strict" : "lax",
    maxAge: 60 * 60, // 1 hora
    path: "/",
  });
}

function clearAuthCookie(reply: import("fastify").FastifyReply): void {
  reply.clearCookie("auth_token", { path: "/" });
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

const rateLimitAuth = {
  config: {
    rateLimit: {
      max: 10,
      timeWindow: "15 minutes",
      errorResponseBuilder: () => ({
        statusCode: 429,
        error: "too_many_requests",
        message: "Muitas tentativas. Aguarde 15 minutos e tente novamente.",
      }),
    },
  },
} as const;

export async function authRoutes(app: FastifyInstance) {
  app.post("/login", rateLimitAuth, async (request, reply) => {
    const parsed = LoginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: "invalid_request",
        message: parsed.error.issues[0].message,
      });
    }
    const { email, password } = parsed.data;

    const ip = request.ip ?? "unknown";
    const user = await getUserByEmail(email);
    if (!user) {
      auditLog(request.log, "LOGIN_FAILED", "anonymous", { ip, detail: `email: ${email}` });
      return reply.status(401).send({
        error: "invalid_credentials",
        message: "Email ou senha invalidos",
      });
    }

    const passwordCheck = verifyPassword(password, user.passwordHash);
    if (!passwordCheck.valid) {
      auditLog(request.log, "LOGIN_FAILED", user.id, { ip });
      return reply.status(401).send({
        error: "invalid_credentials",
        message: "Email ou senha invalidos",
      });
    }

    if (passwordCheck.needsRehash) {
      await updateUserPassword(user.id, password);
    }

    const accessToken = createAccessToken(user);
    auditLog(request.log, "LOGIN_SUCCESS", user.id, { ip });

    // Definir cookie httpOnly (seguro em produção)
    setAuthCookie(reply, accessToken);

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

  app.post("/register", rateLimitAuth, async (request, reply) => {
    const parsed = RegisterSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: "invalid_request",
        message: parsed.error.issues[0].message,
      });
    }

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
    } = parsed.data;

    const passwordError = validatePasswordStrength(password);
    if (passwordError) {
      return reply.status(400).send({
        error: "invalid_request",
        message: passwordError,
      });
    }

    const parsedBirthDate = parseDate(birth_date);
    if (!parsedBirthDate) {
      return reply.status(400).send({
        error: "invalid_request",
        message: "Data de nascimento invalida",
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

  app.post("/forgot-password", rateLimitAuth, async (request, reply) => {
    const parsed = ForgotPasswordSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: "invalid_request",
        message: parsed.error.issues[0].message,
      });
    }
    const { email } = parsed.data;

    auditLog(request.log, "PASSWORD_RESET_REQUESTED", "anonymous", {
      ip: request.ip ?? "unknown",
      detail: `email: ${email}`,
    });

    const user = await getUserByEmail(email);
    if (!user) {
      // Não revelar se o email existe (previne user enumeration)
      return reply.status(200).send({
        data: { sent: true },
      });
    }

    const issued = await issuePasswordResetToken(email);

    const canSendEmail =
      Boolean(process.env.RESEND_API_KEY) && Boolean(process.env.RESEND_FROM);
    if (!canSendEmail && process.env.NODE_ENV === "production") {
      return reply.status(500).send({
        error: "email_unavailable",
        message: "Envio de email indisponivel",
      });
    }

    if (canSendEmail) {
      try {
        await sendPasswordResetEmail({
          email,
          token: issued.token,
          expiresAt: issued.expiresAt,
        });
      } catch (error) {
        request.log.error({ error }, "resend_failed");
        return reply.status(502).send({
          error: "email_failed",
          message: "Nao foi possivel enviar o email",
        });
      }
    }

    const response: {
      data: {
        sent: boolean;
        debug_token?: string;
      };
    } = { data: { sent: true } };

    if (process.env.NODE_ENV !== "production") {
      response.data.debug_token = issued.token;
    }

    return reply.status(200).send(response);
  });

  app.post("/verify-reset-token", async (request, reply) => {
    const parsed = VerifyTokenSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: "invalid_request",
        message: parsed.error.issues[0].message,
      });
    }
    const { email, token } = parsed.data;

    const valid = await verifyPasswordResetToken(email, token);
    if (!valid) {
      return reply.status(404).send({
        error: "not_found",
        message: "Token invalido ou expirado",
      });
    }

    return reply.status(200).send({ data: { valid: true } });
  });

  app.post("/reset-password", async (request, reply) => {
    const parsedBody = ResetPasswordSchema.safeParse(request.body);
    if (!parsedBody.success) {
      return reply.status(400).send({
        error: "invalid_request",
        message: parsedBody.error.issues[0].message,
      });
    }
    const {
      email,
      token,
      novaSenha,
      novaSenhaConfirmacao,
      password,
      passwordConfirm,
    } = parsedBody.data;

    const newPassword = novaSenha ?? password ?? "";
    const confirmPassword = novaSenhaConfirmacao ?? passwordConfirm ?? "";

    if (!email || !token || !newPassword || !confirmPassword) {
      return reply.status(400).send({
        error: "invalid_request",
        message: "Email, token e nova senha sao obrigatorios",
      });
    }

    const passwordError = validatePasswordStrength(newPassword);
    if (passwordError) {
      return reply.status(400).send({
        error: "invalid_request",
        message: passwordError,
      });
    }

    if (newPassword !== confirmPassword) {
      return reply.status(400).send({
        error: "invalid_request",
        message: "As senhas nao conferem",
      });
    }

    const valid = await verifyPasswordResetToken(email, token);
    if (!valid) {
      return reply.status(404).send({
        error: "not_found",
        message: "Token invalido ou expirado",
      });
    }

    const user = await getUserByEmail(email);
    if (!user) {
      return reply.status(404).send({
        error: "not_found",
        message: "Email nao encontrado",
      });
    }

    await updateUserPassword(user.id, newPassword);
    await consumePasswordResetToken(email, token);

    auditLog(request.log, "PASSWORD_RESET_COMPLETED", user.id, {
      ip: request.ip ?? "unknown",
    });

    return reply.status(200).send({ data: { updated: true } });
  });

  // AUD-S1-01: endpoint de logout limpa o cookie httpOnly
  app.post("/logout", async (_request, reply) => {
    clearAuthCookie(reply);
    return reply.status(200).send({ data: { logged_out: true } });
  });
}
