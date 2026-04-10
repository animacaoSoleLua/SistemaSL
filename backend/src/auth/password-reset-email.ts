import { sendEmail, buildHtml } from "../lib/email.js";

export async function sendPasswordResetEmail(input: {
  email: string;
  token: string;
  expiresAt: Date;
}): Promise<void> {
  const subject =
    process.env.RESEND_SUBJECT ?? "Redefinição de senha — Sol e Lua";

  const expiresInMinutes = Math.max(
    1,
    Math.round((input.expiresAt.getTime() - Date.now()) / 60000)
  );

  const html = buildHtml(`
    <h2 style="margin: 0 0 20px 0; color: #6b4f9e; font-size: 22px;">Redefinição de senha</h2>
    <p style="margin: 0 0 20px 0;">Recebemos uma solicitação para redefinir a senha da sua conta na plataforma <strong>Animação Sol e Lua</strong>. Use o token abaixo para continuar:</p>
    <div style="text-align: center; margin: 0 0 24px 0;">
      <span style="display: inline-block; font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #6b4f9e; background-color: #f9f6fd; border: 2px dashed #c9b8e8; border-radius: 8px; padding: 14px 28px;">
        ${input.token}
      </span>
    </div>
    <p style="margin: 0 0 16px 0; padding: 12px 16px; background-color: #fef9e7; border-radius: 6px; font-size: 14px; color: #7d6608;">
      Este token é válido por <strong>${expiresInMinutes} minuto${expiresInMinutes !== 1 ? "s" : ""}</strong>.
    </p>
    <p style="margin: 0; color: #666666; font-size: 14px;">Se você não solicitou a redefinição de senha, ignore este e-mail. Sua senha permanece a mesma.</p>
  `);

  const text = [
    "Você solicitou a redefinição de senha.",
    "",
    `Token: ${input.token}`,
    `Válido por ${expiresInMinutes} minuto${expiresInMinutes !== 1 ? "s" : ""}.`,
    "",
    "Se você não solicitou, ignore este e-mail.",
  ].join("\n");

  await sendEmail([input.email], subject, html, text);
}
