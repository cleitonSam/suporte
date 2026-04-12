# Automation Engine - Fluxo Suporte

Complete automation rules engine for the Fluxo helpdesk application. Automate ticket actions based on conditions and triggers.

## Files Created

### Core Engine
- **`src/lib/automation-engine.ts`** — Core evaluation and execution engine
  - `evaluateConditions(conditions, ctx)` — Evaluates rule conditions against ticket context
  - `executeActions(actions, ticketId, ctx)` — Executes rule actions
  - `runAutomations(trigger, ticketId)` — Main entry point for running automations on a ticket

### API Endpoint
- **`src/app/api/cron/automations/route.ts`** — Cron job for hourly automation rules
  - Protected by `CRON_SECRET` environment variable
  - Finds all active "cron.hourly" rules
  - Discovers tickets matching conditions and executes actions

### Server Actions
- **`src/server/actions/automations.ts`** — CRUD operations (admin-only)
  - `createAutomationAction(formData)` — Create new rule
  - `updateAutomationAction(formData)` — Update existing rule
  - `deleteAutomationAction(formData)` — Hard delete rule
  - `toggleAutomationAction(formData)` — Enable/disable rule

### UI Pages
- **`src/app/admin/automacoes/page.tsx`** — List all rules with status indicators
- **`src/app/admin/automacoes/nova/page.tsx`** — Create new rule with reference guide
- **`src/app/admin/automacoes/nova/automation-form.tsx`** — Reusable form component
- **`src/app/admin/automacoes/[id]/editar/page.tsx`** — Edit existing rule
- **`src/app/admin/automacoes/automation-actions.tsx`** — Client components for toggle/delete

## Ticket Context

The engine evaluates rules against a complete ticket context:

```typescript
interface TicketContext {
  id: string;
  ticketNumber: string;
  status: string;
  priority: string;
  assignedToId: string | null;
  queueId: string | null;
  clientId: string;
  createdAt: Date;
  updatedAt: Date;
  slaBreached: boolean;
  hoursOpen: number;           // Calculated from createdAt
  hoursWithoutResponse: number; // Calculated from last agent response
}
```

## Supported Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `eq` | Equal | `{field: "status", op: "eq", value: "OPEN"}` |
| `neq` | Not equal | `{field: "status", op: "neq", value: "CLOSED"}` |
| `gt` | Greater than | `{field: "hoursOpen", op: "gt", value: 24}` |
| `lt` | Less than | `{field: "hoursOpen", op: "lt", value: 1}` |
| `gte` | Greater or equal | `{field: "hoursOpen", op: "gte", value: 2}` |
| `lte` | Less or equal | `{field: "hoursOpen", op: "lte", value: 8}` |
| `in` | In array | `{field: "priority", op: "in", value: ["HIGH", "URGENT"]}` |
| `contains` | String contains | `{field: "status", op: "contains", value: "ING"}` |

## Supported Fields

- `status` — Ticket status (NEW, OPEN, IN_PROGRESS, WAITING_CLIENT, RESOLVED, CLOSED, REOPENED)
- `priority` — Priority level (LOW, MEDIUM, HIGH, URGENT)
- `assignedToId` — Agent ID
- `queueId` — Queue ID
- `slaBreached` — Boolean
- `hoursOpen` — Hours since creation
- `hoursWithoutResponse` — Hours without agent response

## Supported Actions

| Type | Description | Value/Data |
|------|-------------|-----------|
| `change_status` | Change ticket status | `value: "IN_PROGRESS"` |
| `change_priority` | Change priority | `value: "URGENT"` |
| `assign_to` | Assign to agent | `value: "agent-id"` |
| `move_queue` | Move to queue | `value: "queue-id"` |
| `notify_agent` | Notify assigned agent | `data: {message: "text"}` |
| `notify_admin` | Notify all admins | `data: {message: "text"}` |
| `add_internal_note` | Add internal note | `data: {message: "text"}` |

## Triggers

Rules can be triggered by:

- `ticket.created` — When a new ticket is opened
- `ticket.status_changed` — When ticket status changes
- `ticket.sla_warning` — When SLA warning threshold is crossed
- `cron.hourly` — Every hour via cron job

To integrate triggers into the ticket service:

```typescript
import { runAutomations } from '@/lib/automation-engine';

// After creating a ticket
await runAutomations('ticket.created', ticketId);

// After changing status
await runAutomations('ticket.status_changed', ticketId);
```

## Examples

### Example 1: Escalate old unresponded tickets

```json
{
  "name": "Escalar chamados antigos sem resposta",
  "trigger": "cron.hourly",
  "conditions": [
    {"field": "status", "op": "eq", "value": "OPEN"},
    {"field": "hoursWithoutResponse", "op": "gte", "value": 4}
  ],
  "actions": [
    {"type": "change_priority", "value": "URGENT"},
    {
      "type": "notify_admin",
      "data": {"message": "Chamado aberto há 4+ horas sem resposta de agente"}
    }
  ]
}
```

### Example 2: Auto-close resolved tickets after SLA breach

```json
{
  "name": "Marcar resolvidos em risco como urgente",
  "trigger": "ticket.status_changed",
  "conditions": [
    {"field": "status", "op": "eq", "value": "RESOLVED"},
    {"field": "slaBreached", "op": "eq", "value": true}
  ],
  "actions": [
    {"type": "change_priority", "value": "HIGH"},
    {
      "type": "notify_agent",
      "data": {"message": "Este chamado foi resolvido após SLA ser estourado"}
    }
  ]
}
```

### Example 3: Auto-assign new critical tickets to queue

```json
{
  "name": "Redirecionar chamados urgentes para fila crítica",
  "trigger": "ticket.created",
  "conditions": [
    {"field": "priority", "op": "eq", "value": "URGENT"}
  ],
  "actions": [
    {"type": "move_queue", "value": "queue-critica-id"},
    {
      "type": "add_internal_note",
      "data": {"message": "Chamado urgente movido para fila crítica automaticamente"}
    }
  ]
}
```

## Database Schema

Rules are stored in the `AutomationRule` table:

```prisma
model AutomationRule {
  id          String   @id @default(cuid())
  name        String
  description String?
  trigger     String   // ticket.created, ticket.status_changed, etc.
  conditions  Json     @default("[]")
  actions     Json     @default("[]")
  isActive    Boolean  @default(true)
  sortOrder   Int      @default(0)  // Execution order
  runCount    Int      @default(0)  // Audit trail
  lastRunAt   DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([trigger, isActive])
}
```

## Integration Points

### 1. After Ticket Creation
In `src/server/services/ticket-service.ts`:

```typescript
import { runAutomations } from '@/lib/automation-engine';

export async function createTicket(...) {
  const ticket = await db.ticket.create({...});
  await runAutomations('ticket.created', ticket.id);
  return ticket;
}
```

### 2. After Status Change
In your ticket update handler:

```typescript
await db.ticket.update({where: {id}, data: {status}});
await runAutomations('ticket.status_changed', ticketId);
```

### 3. Scheduled Hourly Check
The cron endpoint already handles this:

```bash
# Schedule with your platform's cron job (e.g., GitHub Actions, Vercel Cron, etc.)
curl https://yourapp.com/api/cron/automations \
  -H "x-cron-secret: $CRON_SECRET"
```

## Error Handling

The engine gracefully handles errors:

- Invalid JSON in conditions/actions is logged and rule is skipped
- Failed actions are logged individually without stopping other actions
- Database errors are caught and logged
- Non-existent agent IDs in assign_to are silently ignored
- SLA_BREACHED field updates respect current state

## Performance Considerations

1. **Condition Filtering**: Database queries pre-filter tickets by status, priority, and SLA when running cron jobs to avoid evaluating every ticket

2. **Rule Ordering**: Rules execute in `sortOrder` sequence. Critical escalations should have lower sort orders

3. **Limits**: Cron job processes up to 500 tickets per rule to prevent timeouts

4. **Indexes**: Database has indexes on `trigger` + `isActive` for fast rule lookups

## Monitoring & Debugging

Check rule execution:

```typescript
const rules = await db.automationRule.findMany({
  where: {isActive: true},
  select: {name, trigger, runCount, lastRunAt}
});
```

View logs:

```bash
LOG_LEVEL=debug node server.js | npx pino-pretty
```

Look for `[automation-engine]` and `[cron:automations]` log entries.

## Admin Interface

Navigate to `/admin/automacoes` to:

- View all active and inactive rules
- Create new automation rules
- Edit existing rules
- Enable/disable rules
- Delete rules
- See rule execution statistics (run count, last run time)

Rules use Fluxo brand colors and styling consistent with the rest of the admin dashboard.
