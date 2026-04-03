-- AlterTable: adiciona informações do usuário Google na tabela de usuários
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "google_email" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "google_user_id" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "google_last_sync" TIMESTAMP(3);
