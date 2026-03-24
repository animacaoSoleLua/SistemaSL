-- AlterTable: adiciona tokens OAuth do Google na tabela de usuários
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "google_access_token" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "google_refresh_token" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "google_token_expiry" TIMESTAMP(3);

-- AlterTable: adiciona ID do evento no Google Calendar na tabela de cursos
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "google_calendar_event_id" TEXT;
