-- ============================================================
-- Migration V2: Novos modelos e campos do audit completo
-- Rodar no banco PostgreSQL do Fluxo Suporte
-- ============================================================

-- 1. Enum NotificationType
DO $$ BEGIN
  CREATE TYPE "NotificationType" AS ENUM (
    'TICKET_ASSIGNED',
    'TICKET_REPLIED',
    'TICKET_STATUS_CHANGED',
    'TICKET_CREATED',
    'SLA_WARNING',
    'SLA_BREACHED',
    'GENERIC'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Tabela PasswordResetToken
CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "purpose"   TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt"    TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PasswordResetToken_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");
CREATE INDEX IF NOT EXISTS "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");

-- 3. Tabela Notification
CREATE TABLE IF NOT EXISTS "Notification" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "type"      "NotificationType" NOT NULL,
  "title"     TEXT NOT NULL,
  "body"      TEXT,
  "linkUrl"   TEXT,
  "readAt"    TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Notification_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");
CREATE INDEX IF NOT EXISTS "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- 4. Tabela ResponseTemplate
CREATE TABLE IF NOT EXISTS "ResponseTemplate" (
  "id"        TEXT NOT NULL,
  "title"     TEXT NOT NULL,
  "body"      TEXT NOT NULL,
  "authorId"  TEXT,
  "isActive"  BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ResponseTemplate_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ResponseTemplate_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ResponseTemplate_authorId_idx" ON "ResponseTemplate"("authorId");
CREATE INDEX IF NOT EXISTS "ResponseTemplate_isActive_idx" ON "ResponseTemplate"("isActive");

-- 5. Tabela AuditLog
CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id"         TEXT NOT NULL,
  "actorId"    TEXT,
  "action"     TEXT NOT NULL,
  "entity"     TEXT,
  "entityId"   TEXT,
  "metadata"   JSONB,
  "ipAddress"  TEXT,
  "userAgent"  TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AuditLog_actorId_fkey"
    FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");
CREATE INDEX IF NOT EXISTS "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- 6. Campos novos na tabela Ticket (SLA + tracking)
ALTER TABLE "Ticket" ADD COLUMN IF NOT EXISTS "firstResponseAt"    TIMESTAMP(3);
ALTER TABLE "Ticket" ADD COLUMN IF NOT EXISTS "resolvedAt"         TIMESTAMP(3);
ALTER TABLE "Ticket" ADD COLUMN IF NOT EXISTS "firstResponseDueAt" TIMESTAMP(3);
ALTER TABLE "Ticket" ADD COLUMN IF NOT EXISTS "resolutionDueAt"    TIMESTAMP(3);
ALTER TABLE "Ticket" ADD COLUMN IF NOT EXISTS "slaBreached"        BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "Ticket_resolutionDueAt_idx" ON "Ticket"("resolutionDueAt");
CREATE INDEX IF NOT EXISTS "Ticket_slaBreached_status_idx" ON "Ticket"("slaBreached", "status");

-- ============================================================
-- Pronto! Verifique com: SELECT count(*) FROM "ResponseTemplate";
-- ============================================================
