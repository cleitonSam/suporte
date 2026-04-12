-- ============================================================
-- Migration V3: Knowledge Base, CSAT Surveys, Automation Rules
-- Rodar no banco PostgreSQL do Fluxo Suporte
-- ============================================================
-- Esta migração adiciona:
-- - CsatSurvey (tabela e índices)
-- - KbCategory (tabela e índices)
-- - KbArticle (tabela e índices)
-- - AutomationRule (tabela e índices)
-- - Equipment.rustdeskId (coluna, já existe no schema)
-- ============================================================

-- 1. Tabela KbCategory
CREATE TABLE IF NOT EXISTS "KbCategory" (
  "id"          TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "slug"        TEXT NOT NULL,
  "description" TEXT,
  "icon"        TEXT,
  "sortOrder"   INTEGER NOT NULL DEFAULT 0,
  "isActive"    BOOLEAN NOT NULL DEFAULT true,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "KbCategory_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "KbCategory_name_key" ON "KbCategory"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "KbCategory_slug_key" ON "KbCategory"("slug");
CREATE INDEX IF NOT EXISTS "KbCategory_isActive_sortOrder_idx" ON "KbCategory"("isActive", "sortOrder");

-- 2. Tabela KbArticle
CREATE TABLE IF NOT EXISTS "KbArticle" (
  "id"          TEXT NOT NULL,
  "categoryId"  TEXT NOT NULL,
  "title"       TEXT NOT NULL,
  "slug"        TEXT NOT NULL,
  "body"        TEXT NOT NULL,
  "excerpt"     TEXT,
  "authorId"    TEXT,
  "isPublished" BOOLEAN NOT NULL DEFAULT false,
  "viewCount"   INTEGER NOT NULL DEFAULT 0,
  "helpfulYes"  INTEGER NOT NULL DEFAULT 0,
  "helpfulNo"   INTEGER NOT NULL DEFAULT 0,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "KbArticle_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "KbArticle_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "KbCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "KbArticle_slug_key" ON "KbArticle"("slug");
CREATE INDEX IF NOT EXISTS "KbArticle_categoryId_isPublished_idx" ON "KbArticle"("categoryId", "isPublished");
CREATE INDEX IF NOT EXISTS "KbArticle_isPublished_viewCount_idx" ON "KbArticle"("isPublished", "viewCount");

-- 3. Tabela CsatSurvey
CREATE TABLE IF NOT EXISTS "CsatSurvey" (
  "id"            TEXT NOT NULL,
  "ticketId"      TEXT NOT NULL,
  "agentId"       TEXT,
  "respondedById" TEXT,
  "rating"        INTEGER NOT NULL,
  "comment"       TEXT,
  "token"         TEXT NOT NULL,
  "answeredAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CsatSurvey_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CsatSurvey_ticketId_fkey"
    FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "CsatSurvey_token_key" ON "CsatSurvey"("token");
CREATE INDEX IF NOT EXISTS "CsatSurvey_ticketId_idx" ON "CsatSurvey"("ticketId");
CREATE INDEX IF NOT EXISTS "CsatSurvey_agentId_idx" ON "CsatSurvey"("agentId");
CREATE INDEX IF NOT EXISTS "CsatSurvey_rating_idx" ON "CsatSurvey"("rating");
CREATE INDEX IF NOT EXISTS "CsatSurvey_answeredAt_idx" ON "CsatSurvey"("answeredAt");

-- 4. Tabela AutomationRule
CREATE TABLE IF NOT EXISTS "AutomationRule" (
  "id"          TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "description" TEXT,
  "trigger"     TEXT NOT NULL,
  "conditions"  JSONB NOT NULL DEFAULT '[]'::jsonb,
  "actions"     JSONB NOT NULL DEFAULT '[]'::jsonb,
  "isActive"    BOOLEAN NOT NULL DEFAULT true,
  "sortOrder"   INTEGER NOT NULL DEFAULT 0,
  "runCount"    INTEGER NOT NULL DEFAULT 0,
  "lastRunAt"   TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AutomationRule_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AutomationRule_trigger_isActive_idx" ON "AutomationRule"("trigger", "isActive");

-- 5. Adicionar coluna rustdeskId em Equipment (se não existir)
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "rustdeskId" TEXT;

-- ============================================================
-- Verificação: estas tabelas devem existir agora
-- ============================================================
-- SELECT
--   (SELECT count(*) FROM "KbCategory") as kb_categories,
--   (SELECT count(*) FROM "KbArticle") as kb_articles,
--   (SELECT count(*) FROM "CsatSurvey") as csat_surveys,
--   (SELECT count(*) FROM "AutomationRule") as automation_rules;
--
-- Exemplo de verificação de coluna rustdeskId:
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'Equipment' AND column_name = 'rustdeskId';
-- ============================================================
