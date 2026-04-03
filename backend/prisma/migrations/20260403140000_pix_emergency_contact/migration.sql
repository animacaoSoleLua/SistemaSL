-- AlterTable: adiciona campos de pix e contato de emergencia na tabela de usuários
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "pix" VARCHAR(255);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emergency_contact_name" VARCHAR(100);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emergency_contact_phone" VARCHAR(40);
