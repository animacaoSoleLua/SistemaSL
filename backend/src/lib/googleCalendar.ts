/*
 * Serviço do Google Calendar
 *
 * Dois fluxos:
 * 1. Calendário da organização (Service Account) — eventos dos cursos
 * 2. Calendário pessoal do membro (OAuth 2.0) — evento após inscrição
 *
 * Todos os erros são logados mas NÃO bloqueiam a operação principal.
 *
 */

import { google } from "googleapis";

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface CourseEventData {
  title: string;
  description?: string | null;
  location?: string | null;
  courseDate: Date; // usado como início e fim do evento (1h de duração)
}

export interface UserTokens {
  accessToken: string;
  refreshToken: string;
  tokenExpiry: Date | null;
}

export interface RefreshedTokens {
  accessToken: string;
  tokenExpiry: Date | null;
}

// ── Config ─────────────────────────────────────────────────────────────────────

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "";
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI ?? "";
const GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID ?? "primary";
const GOOGLE_SERVICE_ACCOUNT_JSON = process.env.GOOGLE_SERVICE_ACCOUNT_JSON ?? "";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeEndTime(start: Date): Date {
  const end = new Date(start);
  end.setHours(end.getHours() + 1);
  return end;
}

function toRfc3339(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`
  );
}

function buildEventBody(data: CourseEventData) {
  const start = data.courseDate;
  const end = makeEndTime(start);
  return {
    summary: data.title,
    description: data.description ?? undefined,
    location: data.location ?? undefined,
    start: { dateTime: toRfc3339(start), timeZone: "America/Sao_Paulo" },
    end: { dateTime: toRfc3339(end), timeZone: "America/Sao_Paulo" },
  };
}

// ── OAuth2 client (para membros) ───────────────────────────────────────────────

export function getOAuthClient() {
  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );
}

export function generateAuthUrl(): string {
  const client = getOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent", // force refresh token
  });
}

export async function exchangeCodeForTokens(
  code: string
): Promise<{ accessToken: string; refreshToken: string; expiry: Date | null }> {
  const client = getOAuthClient();
  const { tokens } = await client.getToken(code);
  return {
    accessToken: tokens.access_token ?? "",
    refreshToken: tokens.refresh_token ?? "",
    expiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
  };
}

export async function fetchGoogleUserInfo(
  accessToken: string
): Promise<{ email: string | null; userId: string | null }> {
  const client = getOAuthClient();
  client.setCredentials({ access_token: accessToken });
  const oauth2 = google.oauth2({ version: "v2", auth: client });
  const { data } = await oauth2.userinfo.get();
  return {
    email: data.email ?? null,
    userId: data.id ?? null,
  };
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<RefreshedTokens> {
  const client = getOAuthClient();
  client.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await client.refreshAccessToken();
  return {
    accessToken: credentials.access_token ?? "",
    tokenExpiry: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
  };
}

// ── Service Account (calendário da organização) ───────────────────────────────

function getServiceAccountCalendar() {
  if (!GOOGLE_SERVICE_ACCOUNT_JSON) return null;
  try {
    const credentials = JSON.parse(GOOGLE_SERVICE_ACCOUNT_JSON);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: SCOPES,
    });
    return google.calendar({ version: "v3", auth });
  } catch {
    return null;
  }
}

export async function createOrgEvent(data: CourseEventData): Promise<string | null> {
  const calendar = getServiceAccountCalendar();
  if (!calendar) return null;
  const event = await calendar.events.insert({
    calendarId: GOOGLE_CALENDAR_ID,
    requestBody: buildEventBody(data),
  });
  return event.data.id ?? null;
}

export async function updateOrgEvent(
  eventId: string,
  data: CourseEventData
): Promise<void> {
  const calendar = getServiceAccountCalendar();
  if (!calendar) return;
  await calendar.events.update({
    calendarId: GOOGLE_CALENDAR_ID,
    eventId,
    requestBody: buildEventBody(data),
  });
}

export async function deleteOrgEvent(eventId: string): Promise<void> {
  const calendar = getServiceAccountCalendar();
  if (!calendar) return;
  await calendar.events.delete({
    calendarId: GOOGLE_CALENDAR_ID,
    eventId,
  });
}

// ── OAuth (calendário pessoal do membro) ──────────────────────────────────────

async function getUserCalendar(tokens: UserTokens) {
  const client = getOAuthClient();

  // Renova token se expirado ou próximo de expirar (5 min de margem)
  const now = Date.now();
  const expiry = tokens.tokenExpiry?.getTime() ?? 0;
  const accessToken =
    expiry - now < 5 * 60 * 1000
      ? (await refreshAccessToken(tokens.refreshToken)).accessToken
      : tokens.accessToken;

  client.setCredentials({
    access_token: accessToken,
    refresh_token: tokens.refreshToken,
  });
  return google.calendar({ version: "v3", auth: client });
}

export async function createUserEvent(
  tokens: UserTokens,
  data: CourseEventData
): Promise<string | null> {
  const calendar = await getUserCalendar(tokens);
  const event = await calendar.events.insert({
    calendarId: "primary",
    requestBody: buildEventBody(data),
  });
  return event.data.id ?? null;
}

export async function deleteUserEvent(
  tokens: UserTokens,
  eventId: string
): Promise<void> {
  const calendar = await getUserCalendar(tokens);
  await calendar.events.delete({
    calendarId: "primary",
    eventId,
  });
}

// ── Verificação de configuração ────────────────────────────────────────────────

export function isGoogleCalendarConfigured(): boolean {
  return !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_REDIRECT_URI);
}

export function isServiceAccountConfigured(): boolean {
  return !!GOOGLE_SERVICE_ACCOUNT_JSON;
}
