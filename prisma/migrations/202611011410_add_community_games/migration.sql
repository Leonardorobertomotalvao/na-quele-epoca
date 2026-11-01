-- ============================================================
-- ETAPA 2 — Comunidade colaborativa
-- Migração: adiciona brincadeiras da comunidade + papel do usuário
--
-- NÃO DESTRUTIVA:
-- - Cria apenas tabela nova ("community_game") e tipo de enum.
-- - Adiciona a coluna "role" em "user" com valor padrão 'USER'
--   (todas as 11 contas existentes continuam USER).
-- - Nenhuma coluna existente é removida ou alterada.
-- ============================================================

-- CreateEnum
CREATE TYPE "CommunityGameStatus" AS ENUM ('PENDENTE', 'APROVADO', 'REJEITADO');

-- CreateEnum (papel do usuário)
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateTable
CREATE TABLE "community_game" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "image" TEXT,
    "desc" TEXT NOT NULL,
    "how" TEXT NOT NULL,
    "materials" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "benefits" TEXT[],
    "minPlayers" INTEGER NOT NULL,
    "minAge" INTEGER NOT NULL,
    "categories" TEXT[],
    "safety" TEXT NOT NULL,
    "supervision" BOOLEAN NOT NULL DEFAULT false,
    "status" "CommunityGameStatus" NOT NULL DEFAULT 'PENDENTE',
    "rejectionReason" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "authorId" TEXT NOT NULL,

    CONSTRAINT "community_game_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "community_game_status_createdAt_idx" ON "community_game"("status", "createdAt");

-- CreateIndex
CREATE INDEX "community_game_authorId_idx" ON "community_game"("authorId");

-- AlterTable
ALTER TABLE "user" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'USER';

-- AddForeignKey
ALTER TABLE "community_game" ADD CONSTRAINT "community_game_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
