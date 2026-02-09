const RESEND_API_URL = "https://api.resend.com/emails";

function requireEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`missing_env_${name}`);
  }
  return value;
}

export async function sendPasswordResetEmail(input: {
  email: string;
  token: string;
  expiresAt: Date;
}): Promise<void> {
  const apiKey = requireEnv(process.env.RESEND_API_KEY, "RESEND_API_KEY");
  const from = requireEnv(process.env.RESEND_FROM, "RESEND_FROM");
  const subject =
    process.env.RESEND_SUBJECT ?? "Token de redefinição de senha";

  const expiresInMinutes = Math.max(
    1,
    Math.round((input.expiresAt.getTime() - Date.now()) / 60000)
  );

  const text = [
    "Voce solicitou a redefinicao de senha.",
    "",
    `Token: ${input.token}`,
    `Valido por ${expiresInMinutes} minutos.`,
    "",
    "Se voce nao solicitou, ignore este email.",
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <p>Voce solicitou a redefinicao de senha.</p>
      <p><strong>Token:</strong> ${input.token}</p>
      <p>Valido por ${expiresInMinutes} minutos.</p>
      <p>Se voce nao solicitou, ignore este email.</p>
    </div>
  `;

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.email],
      subject,
      text,
      html,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `resend_failed_${response.status}${errorText ? `_${errorText}` : ""}`
    );
  }
}
