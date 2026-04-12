# Modelo de Dados — Sistema de Chamados

> Descrição narrativa do schema. A fonte da verdade é `prisma/schema.prisma`.

## Diagrama lógico

```
              ┌──────────────────┐
              │     Client       │
              │  (empresa)       │
              └─────┬────────────┘
                    │ 1:N
         ┌──────────┼──────────────────┬─────────────────┐
         │          │                  │                 │
    ┌────▼───┐ ┌────▼──────┐  ┌────────▼──────┐ ┌────────▼──────┐
    │ User   │ │  Ticket    │  │  Equipment    │ │   Queue       │
    │ (ctt)  │ │            │  │               │ │               │
    └────────┘ └───┬────────┘  └───────────────┘ └───────┬───────┘
                   │                                      │
                   │ 1:N                                  │ N:M
                   │                                      │
          ┌────────┴────────┐                      ┌──────┴──────┐
          │                 │                      │ QueueMember │
    ┌─────▼──────┐  ┌───────▼────┐                 │   (agente)  │
    │ TicketMsg  │  │ TicketEvent│                 └─────────────┘
    └──────┬─────┘  └────────────┘
           │ 1:N
    ┌──────▼───────┐
    │ TicketAttach │
    └──────────────┘
```

## Relações em uma frase cada

- Um **Client** tem muitos **Users** do tipo `CLIENT_CONTACT`, muitos **Tickets**, muitos **Equipment**.
- Um **Ticket** pertence a exatamente um **Client**, é aberto por um **User** (contato), pode estar atribuído a um **User** (agente), pode estar numa **Queue**, tem muitas **TicketMessages** e muitos **TicketEvents**.
- Uma **Queue** tem muitos **QueueMembers** (agentes) e muitos **Tickets**.
- **Equipment** pertence a um **Client** e pode estar vinculado a muitos **Tickets** (histórico de chamados do equipamento).

## Chaves e índices críticos

| Tabela | Índices |
|---|---|
| `Ticket` | `(clientId, status)`, `(assignedToId, status)`, `(queueId, status, priority, createdAt)` para pull da fila, `ticketNumber UNIQUE` |
| `User` | `email UNIQUE` |
| `Client` | `cnpj UNIQUE` |
| `Equipment` | `(clientId, status)`, `serialNumber UNIQUE (where not null)` |
| `TicketMessage` | `(ticketId, createdAt)` |

## Numeração de chamados

Sequência Postgres `ticket_seq_2026` (uma por ano). Número formatado como `CH-2026-00001` via trigger ou server action no momento do insert. No MVP, usar server action (mais simples e testável).

## Soft-delete

Todas as tabelas de domínio têm `deletedAt DateTime?`. Queries padrão filtram `WHERE deletedAt IS NULL` via Prisma middleware.

## Fila com concorrência

Pseudo-SQL de "pull next":

```sql
BEGIN;
  SELECT id FROM "Ticket"
  WHERE "queueId" = $1
    AND "status" IN ('NEW', 'OPEN')
    AND "assignedToId" IS NULL
    AND "deletedAt" IS NULL
  ORDER BY
    CASE "priority"
      WHEN 'URGENT' THEN 0
      WHEN 'HIGH'   THEN 1
      WHEN 'MEDIUM' THEN 2
      WHEN 'LOW'    THEN 3
    END,
    "createdAt" ASC
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  UPDATE "Ticket"
  SET "assignedToId" = $2, "status" = 'IN_PROGRESS', "updatedAt" = NOW()
  WHERE id = $ticketId;

  INSERT INTO "TicketEvent" (...) VALUES ('ASSIGNED', ...);
COMMIT;
```

`FOR UPDATE SKIP LOCKED` é essencial — dois agentes clicando ao mesmo tempo pegam tickets diferentes em vez de um esperar.

## Migrações e seed

- Migrações via `prisma migrate dev` (local) e `prisma migrate deploy` (prod).
- `prisma/seed.ts` cria:
  - Usuário admin inicial (email/senha vindo de env)
  - Categorias padrão (Hardware, Software, Rede, Email, Acesso, Outro)
  - Categorias de equipamento (CPU, Notebook, Impressora, Switch, Roteador, Servidor, Monitor, Outro)
  - Fila "Geral" com todos os agentes
