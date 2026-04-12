import { db } from './db';
import { logger, child } from './logger';
import { notify } from './notifications';

export interface TicketContext {
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
  hoursOpen: number;
  hoursWithoutResponse: number;
}

interface Condition {
  field: string;
  op: string;
  value: any;
}

interface Action {
  type: string;
  value?: string;
  data?: Record<string, any>;
}

/**
 * Avalia uma condição individual contra o contexto do chamado
 */
function evaluateCondition(condition: Condition, ctx: TicketContext): boolean {
  const { field, op, value } = condition;
  const fieldValue = (ctx as any)[field];

  switch (op) {
    case 'eq':
      return fieldValue === value;
    case 'neq':
      return fieldValue !== value;
    case 'gt':
      return fieldValue > value;
    case 'lt':
      return fieldValue < value;
    case 'gte':
      return fieldValue >= value;
    case 'lte':
      return fieldValue <= value;
    case 'in':
      return Array.isArray(value) && value.includes(fieldValue);
    case 'contains':
      return String(fieldValue).includes(String(value));
    default:
      logger.warn({ field, op }, '[automation-engine] operador desconhecido');
      return false;
  }
}

/**
 * Avalia uma lista de condições (AND lógico)
 */
export function evaluateConditions(conditions: any[], ctx: TicketContext): boolean {
  if (!Array.isArray(conditions) || conditions.length === 0) {
    return true; // sem condições = sempre passa
  }

  return conditions.every((cond) => evaluateCondition(cond, ctx));
}

/**
 * Executa uma ação individual
 */
async function executeAction(action: Action, ticketId: string, ctx: TicketContext) {
  const log = child({ ticketId, action: action.type });

  try {
    switch (action.type) {
      case 'change_status': {
        const newStatus = action.value;
        await db.ticket.update({
          where: { id: ticketId },
          data: { status: newStatus },
        });
        await db.ticketEvent.create({
          data: {
            ticketId,
            type: 'STATUS_CHANGED',
            oldValue: ctx.status,
            newValue: newStatus,
          },
        });
        log.info('[automation-engine] status alterado');
        break;
      }

      case 'change_priority': {
        const newPriority = action.value;
        await db.ticket.update({
          where: { id: ticketId },
          data: { priority: newPriority },
        });
        await db.ticketEvent.create({
          data: {
            ticketId,
            type: 'PRIORITY_CHANGED',
            oldValue: ctx.priority,
            newValue: newPriority,
          },
        });
        log.info('[automation-engine] prioridade alterada');
        break;
      }

      case 'assign_to': {
        const agentId = action.value;
        await db.ticket.update({
          where: { id: ticketId },
          data: { assignedToId: agentId, assignedAt: new Date() },
        });
        await db.ticketEvent.create({
          data: {
            ticketId,
            type: 'ASSIGNED',
            newValue: agentId,
            authorId: null,
          },
        });
        log.info('[automation-engine] atribuído ao agente');
        break;
      }

      case 'move_queue': {
        const queueId = action.value;
        await db.ticket.update({
          where: { id: ticketId },
          data: { queueId },
        });
        log.info('[automation-engine] movido para fila');
        break;
      }

      case 'notify_agent': {
        if (ctx.assignedToId) {
          await notify({
            userId: ctx.assignedToId,
            type: 'GENERIC',
            title: `Regra de automação: ${ctx.ticketNumber}`,
            body: action.data?.message || 'Uma regra de automação foi executada neste chamado.',
            linkUrl: `/admin/chamados/${ticketId}`,
          });
        }
        log.info('[automation-engine] notificação ao agente enviada');
        break;
      }

      case 'notify_admin': {
        // Busca todos os usuários com role ADMIN
        const admins = await db.user.findMany({
          where: { role: 'ADMIN', isActive: true },
          select: { id: true },
        });

        await Promise.all(
          admins.map((admin) =>
            notify({
              userId: admin.id,
              type: 'GENERIC',
              title: `Regra de automação: ${ctx.ticketNumber}`,
              body: action.data?.message || 'Uma regra de automação foi executada neste chamado.',
              linkUrl: `/admin/chamados/${ticketId}`,
            }),
          ),
        );
        log.info('[automation-engine] notificação aos admins enviada');
        break;
      }

      case 'add_internal_note': {
        const noteBody = action.data?.message || 'Nota interna adicionada por automação';
        // Usar ID de sistema ou um agente neutro (NULL)
        await db.ticketMessage.create({
          data: {
            ticketId,
            authorId: null as any, // será tratado como sistema
            body: noteBody,
            isInternal: true,
          },
        });
        log.info('[automation-engine] nota interna adicionada');
        break;
      }

      default:
        log.warn('[automation-engine] tipo de ação desconhecido');
    }
  } catch (err) {
    log.error({ err }, '[automation-engine] erro ao executar ação');
  }
}

/**
 * Executa uma lista de ações
 */
export async function executeActions(actions: any[], ticketId: string, ctx: TicketContext) {
  if (!Array.isArray(actions)) {
    return;
  }

  for (const action of actions) {
    await executeAction(action, ticketId, ctx);
  }
}

/**
 * Calcula horas desde a criação do chamado
 */
function calculateHoursOpen(ticket: { createdAt: Date }): number {
  const now = new Date();
  const diffMs = now.getTime() - ticket.createdAt.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60));
}

/**
 * Calcula horas desde a última resposta de um agente
 */
async function calculateHoursWithoutResponse(ticketId: string): Promise<number> {
  const lastMessage = await db.ticketMessage.findFirst({
    where: {
      ticketId,
      isInternal: false,
      author: { userType: 'AGENT' },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!lastMessage) {
    // Nenhuma resposta ainda — usar tempo desde criação
    const ticket = await db.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) return 0;
    return calculateHoursOpen(ticket);
  }

  const now = new Date();
  const diffMs = now.getTime() - lastMessage.createdAt.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60));
}

/**
 * Executa as regras de automação para um trigger específico num chamado
 */
export async function runAutomations(trigger: string, ticketId: string) {
  const log = child({ trigger, ticketId });

  try {
    // Buscar o ticket
    const ticket = await db.ticket.findUnique({
      where: { id: ticketId },
      select: {
        id: true,
        ticketNumber: true,
        status: true,
        priority: true,
        assignedToId: true,
        queueId: true,
        clientId: true,
        createdAt: true,
        updatedAt: true,
        slaBreached: true,
      },
    });

    if (!ticket) {
      log.warn('[automation-engine] chamado não encontrado');
      return;
    }

    // Montar contexto
    const hoursOpen = calculateHoursOpen(ticket);
    const hoursWithoutResponse = await calculateHoursWithoutResponse(ticketId);

    const ctx: TicketContext = {
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      status: ticket.status,
      priority: ticket.priority,
      assignedToId: ticket.assignedToId,
      queueId: ticket.queueId,
      clientId: ticket.clientId,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      slaBreached: ticket.slaBreached,
      hoursOpen,
      hoursWithoutResponse,
    };

    // Buscar regras ativas para este trigger
    const rules = await db.automationRule.findMany({
      where: { trigger, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    log.debug({ ruleCount: rules.length }, '[automation-engine] regras carregadas');

    // Executar cada regra
    for (const rule of rules) {
      const conditions = typeof rule.conditions === 'string'
        ? JSON.parse(rule.conditions || '[]')
        : Array.isArray(rule.conditions) ? rule.conditions : [];

      const actions = typeof rule.actions === 'string'
        ? JSON.parse(rule.actions || '[]')
        : Array.isArray(rule.actions) ? rule.actions : [];

      // Avaliar condições
      if (!evaluateConditions(conditions, ctx)) {
        log.debug({ ruleId: rule.id }, '[automation-engine] regra não passou nas condições');
        continue;
      }

      log.info({ ruleId: rule.id, ruleName: rule.name }, '[automation-engine] executando regra');

      // Executar ações
      await executeActions(actions, ticketId, ctx);

      // Atualizar contadores da regra
      await db.automationRule.update({
        where: { id: rule.id },
        data: {
          runCount: { increment: 1 },
          lastRunAt: new Date(),
        },
      });
    }
  } catch (err) {
    log.error({ err }, '[automation-engine] erro ao executar automações');
  }
}
