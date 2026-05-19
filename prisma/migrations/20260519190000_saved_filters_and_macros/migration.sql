-- SavedFilter: agente salva conjuntos de filtros recorrentes
-- TicketMacro: combina varias acoes em 1 click

-- CreateTable
CREATE TABLE "SavedFilter" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'ticket',
    "queryString" TEXT NOT NULL,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedFilter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketMacro" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "actions" JSONB NOT NULL DEFAULT '[]',
    "authorId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TicketMacro_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavedFilter_userId_scope_idx" ON "SavedFilter"("userId", "scope");

-- CreateIndex
CREATE INDEX "SavedFilter_isShared_scope_idx" ON "SavedFilter"("isShared", "scope");

-- CreateIndex
CREATE INDEX "TicketMacro_authorId_isActive_idx" ON "TicketMacro"("authorId", "isActive");

-- CreateIndex
CREATE INDEX "TicketMacro_deletedAt_idx" ON "TicketMacro"("deletedAt");

-- AddForeignKey
ALTER TABLE "SavedFilter" ADD CONSTRAINT "SavedFilter_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketMacro" ADD CONSTRAINT "TicketMacro_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed: macros padrao uteis (autorId NULL = globais)
INSERT INTO "TicketMacro" ("id", "name", "description", "icon", "actions", "isActive", "sortOrder", "createdAt", "updatedAt") VALUES
  ('mac_resolve_default', 'Resolver padrão', 'Marca como resolvido sem mensagem adicional. Use quando o cliente confirmou que está OK.', '✓', '[{"type":"status","value":"RESOLVED"}]'::jsonb, true, 0, NOW(), NOW()),
  ('mac_wait_client',     'Aguardar cliente', 'Muda status pra aguardando retorno do cliente.', '⏳', '[{"type":"status","value":"WAITING_CLIENT"}]'::jsonb, true, 1, NOW(), NOW()),
  ('mac_escalate',        'Escalar urgente', 'Eleva prioridade pra URGENTE e marca como em andamento.', '⚡', '[{"type":"priority","value":"URGENT"},{"type":"status","value":"IN_PROGRESS"}]'::jsonb, true, 2, NOW(), NOW()),
  ('mac_close_no_response','Fechar sem retorno', 'Fecha o chamado por falta de resposta do cliente.', '🔒', '[{"type":"status","value":"CLOSED"},{"type":"internal_note","value":"Fechado por falta de retorno do cliente após contato."}]'::jsonb, true, 3, NOW(), NOW());
