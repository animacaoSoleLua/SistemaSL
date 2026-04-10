import type { CourseRecord } from "../cursos/store.js";
import type { UserRecord } from "../auth/store.js";
import type { WarningRecord, SuspensionRecord } from "../advertencias/store.js";

const RESEND_API_URL = "https://api.resend.com/emails";

function requireEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`missing_env_${name}`);
  }
  return value;
}

function ordinal(n: number): string {
  if (n === 1) return "1ª";
  if (n === 2) return "2ª";
  if (n === 3) return "3ª";
  return `${n}ª`;
}

export function buildHtml(body: string): string {
  const logoUrl = process.env.LOGO_URL ?? "";
  const logoHeader = logoUrl
    ? `<img src="${logoUrl}" alt="Animação Sol e Lua" style="height: 60px; display: block;" />`
    : `<span style="font-size: 18px; font-weight: bold; color: #ffffff;">Animação Sol e Lua</span>`;
  const logoFooter = logoUrl
    ? `<img src="${logoUrl}" alt="Animação Sol e Lua" style="height: 60px; display: block; margin: 0 auto;" />`
    : `<span style="font-size: 18px; font-weight: bold; color: #6b4f9e;">Animação Sol e Lua</span>`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin: 0; padding: 0; background-color: #f5f0fb; font-family: Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f0fb; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #6b4f9e 0%, #9b6fc0 100%); padding: 28px 40px;">
              ${logoHeader}
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 36px 40px; color: #333333; font-size: 15px; line-height: 1.7;">
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9f6fd; border-top: 1px solid #e8dff5; padding: 24px 40px; text-align: center;">
              <p style="margin: 0 0 12px 0; font-size: 13px; color: #888888;">
                Este é um e-mail automático. Por favor, não responda diretamente.
              </p>
              ${logoFooter}
              <p style="margin: 12px 0 0 0; font-size: 12px; color: #aaaaaa;">
                © ${new Date().getFullYear()} Sol e Lua — Todos os direitos reservados
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendEmail(
  to: string[],
  subject: string,
  html: string,
  text: string
): Promise<void> {
  const apiKey = requireEnv(process.env.RESEND_API_KEY, "RESEND_API_KEY");
  const from = requireEnv(process.env.RESEND_FROM, "RESEND_FROM");

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html, text }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `resend_failed_${response.status}${errorText ? `_${errorText}` : ""}`
    );
  }
}

export async function sendCourseCreatedEmail(
  course: CourseRecord,
  members: UserRecord[]
): Promise<void> {
  if (members.length === 0) return;

  const allEmails = members.map((m) => m.email);
  const subject = `Novo curso disponível: ${course.title}`;

  const dateStr = course.courseDate.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const html = buildHtml(`
    <h2 style="margin: 0 0 20px 0; color: #6b4f9e; font-size: 22px;">Novo curso disponível!</h2>
    <p style="margin: 0 0 20px 0;">Olá! Um novo curso foi adicionado à plataforma. Confira os detalhes abaixo:</p>
    <table cellpadding="0" cellspacing="0" style="width: 100%; background-color: #f9f6fd; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
      <tr><td style="padding: 6px 0;"><strong style="color: #6b4f9e;">Curso:</strong>&nbsp; ${course.title}</td></tr>
      <tr><td style="padding: 6px 0;"><strong style="color: #6b4f9e;">Data:</strong>&nbsp; ${dateStr}</td></tr>
      <tr><td style="padding: 6px 0;"><strong style="color: #6b4f9e;">Local:</strong>&nbsp; ${course.location ?? "A definir"}</td></tr>
      <tr><td style="padding: 6px 0;"><strong style="color: #6b4f9e;">Instrutor:</strong>&nbsp; ${course.instructorName}</td></tr>
      ${course.description ? `<tr><td style="padding: 6px 0;"><strong style="color: #6b4f9e;">Descrição:</strong>&nbsp; ${course.description}</td></tr>` : ""}
      ${course.capacity !== null ? `<tr><td style="padding: 6px 0;"><strong style="color: #6b4f9e;">Vagas disponíveis:</strong>&nbsp; ${course.capacity}</td></tr>` : ""}
    </table>
    <p style="margin: 0; color: #666666; font-size: 14px;">Acesse a plataforma para se inscrever.</p>
  `);

  const text = [
    `Novo curso disponível: ${course.title}`,
    `Data: ${dateStr}`,
    `Local: ${course.location ?? "A definir"}`,
    `Instrutor: ${course.instructorName}`,
    course.description ? `Descrição: ${course.description}` : "",
    course.capacity !== null ? `Vagas disponíveis: ${course.capacity}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const BATCH_SIZE = 50;
  for (let i = 0; i < allEmails.length; i += BATCH_SIZE) {
    await sendEmail(allEmails.slice(i, i + BATCH_SIZE), subject, html, text);
  }
}

export async function sendEnrollmentConfirmationEmail(
  course: CourseRecord,
  member: UserRecord
): Promise<void> {
  const subject = `Inscrição confirmada: ${course.title}`;
  const memberName = [member.name, member.lastName].filter(Boolean).join(" ");

  const dateStr = course.courseDate.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const html = buildHtml(`
    <h2 style="margin: 0 0 20px 0; color: #6b4f9e; font-size: 22px;">Inscrição confirmada!</h2>
    <p style="margin: 0 0 20px 0;">Olá, <strong>${memberName}</strong>! Sua inscrição foi confirmada com sucesso. Veja os detalhes:</p>
    <table cellpadding="0" cellspacing="0" style="width: 100%; background-color: #f9f6fd; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
      <tr><td style="padding: 6px 0;"><strong style="color: #6b4f9e;">Curso:</strong>&nbsp; ${course.title}</td></tr>
      <tr><td style="padding: 6px 0;"><strong style="color: #6b4f9e;">Data:</strong>&nbsp; ${dateStr}</td></tr>
      <tr><td style="padding: 6px 0;"><strong style="color: #6b4f9e;">Local:</strong>&nbsp; ${course.location ?? "A definir"}</td></tr>
      <tr><td style="padding: 6px 0;"><strong style="color: #6b4f9e;">Instrutor:</strong>&nbsp; ${course.instructorName}</td></tr>
    </table>
    <p style="margin: 0; color: #666666; font-size: 14px;">Nos vemos em breve! Qualquer dúvida, entre em contato com a equipe Sol e Lua.</p>
  `);

  const text = [
    `Inscrição confirmada: ${course.title}`,
    `Olá, ${memberName}! Sua inscrição foi confirmada.`,
    `Curso: ${course.title}`,
    `Data: ${dateStr}`,
    `Local: ${course.location ?? "A definir"}`,
    `Instrutor: ${course.instructorName}`,
  ].join("\n");

  await sendEmail([member.email], subject, html, text);
}

export async function sendWarningEmail(
  member: UserRecord,
  warning: WarningRecord,
  warningCount: number,
  issuerName?: string
): Promise<void> {
  const subject = "Você recebeu uma advertência";
  const memberName = [member.name, member.lastName].filter(Boolean).join(" ");
  const dateStr = warning.warningDate.toLocaleDateString("pt-BR");
  const ordinalCount = ordinal(warningCount);

  const suspensionNotice =
    warningCount < 3
      ? `Esta é sua ${ordinalCount} advertência no último mês. Ao atingir 3, você será suspenso.`
      : `Esta é sua ${ordinalCount} advertência no último mês. Você atingiu o limite de 3 advertências e foi suspenso por 1 mês.`;

  const issuerRow = issuerName
    ? `<tr><td style="padding: 6px 0;"><strong style="color: #c0392b;">Registrada por:</strong>&nbsp; ${issuerName}</td></tr>`
    : "";

  const html = buildHtml(`
    <h2 style="margin: 0 0 20px 0; color: #c0392b; font-size: 22px;">Advertência recebida</h2>
    <p style="margin: 0 0 20px 0;">Olá, <strong>${memberName}</strong>. Informamos que você recebeu uma advertência registrada em nosso sistema.</p>
    <table cellpadding="0" cellspacing="0" style="width: 100%; background-color: #fff5f5; border-left: 4px solid #c0392b; border-radius: 4px; padding: 20px; margin-bottom: 20px;">
      <tr><td style="padding: 6px 0;"><strong style="color: #c0392b;">Motivo:</strong>&nbsp; ${warning.reason}</td></tr>
      <tr><td style="padding: 6px 0;"><strong style="color: #c0392b;">Data da ocorrência:</strong>&nbsp; ${dateStr}</td></tr>
      ${issuerRow}
    </table>
    <p style="margin: 0 0 16px 0; padding: 12px 16px; background-color: #fef9e7; border-radius: 6px; font-size: 14px; color: #7d6608;">
      ${suspensionNotice}
    </p>
    <p style="margin: 0; color: #666666; font-size: 14px;">Em caso de dúvidas, entre em contato com a equipe Sol e Lua.</p>
  `);

  const textLines = [
    "Você recebeu uma advertência.",
    `Olá, ${memberName}.`,
    `Motivo: ${warning.reason}`,
    `Data da ocorrência: ${dateStr}`,
    ...(issuerName ? [`Registrada por: ${issuerName}`] : []),
    suspensionNotice,
  ];

  const text = textLines.join("\n");

  await sendEmail([member.email], subject, html, text);
}

export async function sendSuspensionEmail(
  member: UserRecord,
  suspension: SuspensionRecord
): Promise<void> {
  const subject = "Você foi suspenso";
  const memberName = [member.name, member.lastName].filter(Boolean).join(" ");
  const startStr = suspension.startDate.toLocaleDateString("pt-BR");
  const endStr = suspension.endDate.toLocaleDateString("pt-BR");

  const html = buildHtml(`
    <h2 style="margin: 0 0 20px 0; color: #922b21; font-size: 22px;">Suspensão aplicada</h2>
    <p style="margin: 0 0 20px 0;">Olá, <strong>${memberName}</strong>. Informamos que você foi suspenso da Sol e Lua.</p>
    <table cellpadding="0" cellspacing="0" style="width: 100%; background-color: #fdf2f2; border-left: 4px solid #922b21; border-radius: 4px; padding: 20px; margin-bottom: 20px;">
      <tr><td style="padding: 6px 0;"><strong style="color: #922b21;">Motivo:</strong>&nbsp; ${suspension.reason} — Você acumulou 3 advertências no período de 1 mês.</td></tr>
      <tr><td style="padding: 6px 0;"><strong style="color: #922b21;">Início da suspensão:</strong>&nbsp; ${startStr}</td></tr>
      <tr><td style="padding: 6px 0;"><strong style="color: #922b21;">Fim da suspensão:</strong>&nbsp; ${endStr}</td></tr>
    </table>
    <p style="margin: 0; color: #666666; font-size: 14px;">Se acredita que houve um engano, entre em contato com a equipe Sol e Lua para esclarecimentos.</p>
  `);

  const text = [
    "Você foi suspenso.",
    `Olá, ${memberName}.`,
    `Motivo: ${suspension.reason} — Você acumulou 3 advertências no período de 1 mês.`,
    `Início da suspensão: ${startStr}`,
    `Fim da suspensão: ${endStr}`,
  ].join("\n");

  await sendEmail([member.email], subject, html, text);
}
