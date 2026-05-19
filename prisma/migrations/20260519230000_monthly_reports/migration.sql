-- MonthlyReport: relatorio mensal auto-enviado pro cliente
CREATE TABLE "MonthlyReport" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentTo" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'sent',
    "metrics" JSONB NOT NULL,
    "triggeredBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonthlyReport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MonthlyReport_clientId_year_month_key"
  ON "MonthlyReport"("clientId", "year", "month");

CREATE INDEX "MonthlyReport_sentAt_idx" ON "MonthlyReport"("sentAt");

ALTER TABLE "MonthlyReport"
  ADD CONSTRAINT "MonthlyReport_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
