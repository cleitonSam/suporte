-- AlterTable: adiciona inboundToken pro email-to-ticket
ALTER TABLE "Client" ADD COLUMN "inboundToken" TEXT;

-- Backfill: gera token random de 12 chars pra cada cliente existente
-- (PG built-in: 9 bytes random hex = 18 chars, depois substring pra 12)
UPDATE "Client"
SET "inboundToken" = SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 12)
WHERE "inboundToken" IS NULL;

-- CreateIndex: unique constraint
CREATE UNIQUE INDEX "Client_inboundToken_key" ON "Client"("inboundToken");
