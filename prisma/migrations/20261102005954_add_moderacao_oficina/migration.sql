-- CreateEnum
CREATE TYPE "FlagOrigem" AS ENUM ('DENUNCIA', 'AUTOMATICA');

-- CreateEnum
CREATE TYPE "FlagStatus" AS ENUM ('PENDENTE', 'RESOLVIDA');

-- CreateEnum
CREATE TYPE "FlagResultado" AS ENUM ('MANTIDO', 'RESTAURADO', 'EXCLUIDO');

-- CreateEnum
CREATE TYPE "MotivoDenuncia" AS ENUM ('XINGAMENTO', 'ASSEDIO', 'AMEACA', 'ODIO', 'SPAM', 'INADEQUADO', 'OUTRO');

-- CreateEnum
CREATE TYPE "FlagConteudoTipo" AS ENUM ('POST', 'COMMENT');

-- CreateEnum
CREATE TYPE "ToyStatus" AS ENUM ('PENDENTE', 'APROVADO', 'REJEITADO', 'CORRECAO_SOLICITADA');

-- CreateEnum
CREATE TYPE "ToyDificuldade" AS ENUM ('FACIL', 'INTERMEDIARIO', 'AVANCADO');

-- AlterTable
ALTER TABLE "comment" ADD COLUMN     "oculto" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ocultoEm" TIMESTAMP(3),
ADD COLUMN     "ocultoMotivo" TEXT;

-- AlterTable
ALTER TABLE "post" ADD COLUMN     "oculto" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ocultoEm" TIMESTAMP(3),
ADD COLUMN     "ocultoMotivo" TEXT;

-- CreateTable
CREATE TABLE "content_flag" (
    "id" TEXT NOT NULL,
    "tipo" "FlagConteudoTipo" NOT NULL,
    "contentId" TEXT NOT NULL,
    "origem" "FlagOrigem" NOT NULL,
    "motivo" "MotivoDenuncia",
    "classificacao" TEXT,
    "detalhes" TEXT,
    "reporterId" TEXT,
    "status" "FlagStatus" NOT NULL DEFAULT 'PENDENTE',
    "resultado" "FlagResultado",
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_flag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moderation_action" (
    "id" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "tipo" "FlagConteudoTipo" NOT NULL,
    "contentId" TEXT NOT NULL,
    "adminId" TEXT,
    "nota" TEXT,
    "conteudoResumo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moderation_action_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workshop_toy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "image" TEXT,
    "description" TEXT NOT NULL,
    "materials" TEXT[],
    "tools" TEXT[],
    "steps" TEXT[],
    "timeLabel" TEXT NOT NULL,
    "difficulty" "ToyDificuldade" NOT NULL,
    "minAge" INTEGER NOT NULL,
    "players" INTEGER,
    "benefits" TEXT[],
    "alternatives" TEXT[],
    "safety" TEXT NOT NULL,
    "supervision" BOOLEAN NOT NULL DEFAULT true,
    "status" "ToyStatus" NOT NULL DEFAULT 'PENDENTE',
    "rejectionReason" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "authorId" TEXT NOT NULL,

    CONSTRAINT "workshop_toy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "content_flag_status_createdAt_idx" ON "content_flag"("status", "createdAt");

-- CreateIndex
CREATE INDEX "content_flag_tipo_contentId_idx" ON "content_flag"("tipo", "contentId");

-- CreateIndex
CREATE UNIQUE INDEX "content_flag_tipo_contentId_origem_reporterId_key" ON "content_flag"("tipo", "contentId", "origem", "reporterId");

-- CreateIndex
CREATE INDEX "moderation_action_acao_createdAt_idx" ON "moderation_action"("acao", "createdAt");

-- CreateIndex
CREATE INDEX "moderation_action_tipo_contentId_idx" ON "moderation_action"("tipo", "contentId");

-- CreateIndex
CREATE INDEX "workshop_toy_status_createdAt_idx" ON "workshop_toy"("status", "createdAt");

-- CreateIndex
CREATE INDEX "workshop_toy_authorId_idx" ON "workshop_toy"("authorId");

-- AddForeignKey
ALTER TABLE "content_flag" ADD CONSTRAINT "content_flag_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_flag" ADD CONSTRAINT "content_flag_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_action" ADD CONSTRAINT "moderation_action_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workshop_toy" ADD CONSTRAINT "workshop_toy_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
