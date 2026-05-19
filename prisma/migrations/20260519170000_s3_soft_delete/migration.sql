-- S3: soft-delete em ResponseTemplate / KbArticle / AutomationRule
-- Todas as colunas adicionadas sao nullable (existing rows ficam NULL = nao-deletado).
-- Indices em deletedAt aceleram queries que filtram `deletedAt: null`.

-- AlterTable
ALTER TABLE "AutomationRule" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "KbArticle" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ResponseTemplate" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "AutomationRule_deletedAt_idx" ON "AutomationRule"("deletedAt");

-- CreateIndex
CREATE INDEX "KbArticle_deletedAt_idx" ON "KbArticle"("deletedAt");

-- CreateIndex
CREATE INDEX "ResponseTemplate_deletedAt_idx" ON "ResponseTemplate"("deletedAt");
