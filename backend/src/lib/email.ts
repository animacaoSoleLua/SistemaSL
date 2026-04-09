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

  const to = members.map((m) => m.email);
  const subject = `Novo curso disponível: ${course.title}`;

  const dateStr = course.courseDate.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Novo curso disponível: ${course.title}</h2>
      <p><strong>Data:</strong> ${dateStr}</p>
      <p><strong>Local:</strong> ${course.location ?? "A definir"}</p>
      <p><strong>Instrutor:</strong> ${course.instructorName}</p>
      ${course.description ? `<p><strong>Descrição:</strong> ${course.description}</p>` : ""}
      ${course.capacity !== null ? `<p><strong>Vagas disponíveis:</strong> ${course.capacity}</p>` : ""}
    </div>
  `;

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

  await sendEmail(to, subject, html, text);
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

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Inscrição confirmada!</h2>
      <p>Olá, <strong>${memberName}</strong>! Sua inscrição foi confirmada.</p>
      <p><strong>Curso:</strong> ${course.title}</p>
      <p><strong>Data:</strong> ${dateStr}</p>
      <p><strong>Local:</strong> ${course.location ?? "A definir"}</p>
      <p><strong>Instrutor:</strong> ${course.instructorName}</p>
    </div>
  `;

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
  warningCount: number
): Promise<void> {
  const subject = "Você recebeu uma advertência";
  const memberName = [member.name, member.lastName].filter(Boolean).join(" ");
  const dateStr = warning.warningDate.toLocaleDateString("pt-BR");
  const ordinalCount = ordinal(warningCount);

  const suspensionNotice =
    warningCount < 3
      ? `Esta é sua ${ordinalCount} advertência no último mês. Ao atingir 3, você será suspenso.`
      : `Esta é sua ${ordinalCount} advertência no último mês.`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Você recebeu uma advertência</h2>
      <p>Olá, <strong>${memberName}</strong>.</p>
      <p><strong>Motivo:</strong> ${warning.reason}</p>
      <p><strong>Data:</strong> ${dateStr}</p>
      <p>${suspensionNotice}</p>
    </div>
  `;

  const text = [
    "Você recebeu uma advertência.",
    `Olá, ${memberName}.`,
    `Motivo: ${warning.reason}`,
    `Data: ${dateStr}`,
    suspensionNotice,
  ].join("\n");

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

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Você foi suspenso</h2>
      <p>Olá, <strong>${memberName}</strong>.</p>
      <p><strong>Motivo:</strong> ${suspension.reason} — Você acumulou 3 advertências no período de 1 mês.</p>
      <p><strong>Início da suspensão:</strong> ${startStr}</p>
      <p><strong>Fim da suspensão:</strong> ${endStr}</p>
    </div>
  `;

  const text = [
    "Você foi suspenso.",
    `Olá, ${memberName}.`,
    `Motivo: ${suspension.reason} — Você acumulou 3 advertências no período de 1 mês.`,
    `Início da suspensão: ${startStr}`,
    `Fim da suspensão: ${endStr}`,
  ].join("\n");

  await sendEmail([member.email], subject, html, text);
}
