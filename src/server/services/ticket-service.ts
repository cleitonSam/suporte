import { db } from '@/lib/db';
import { nextTicketNumber } from '@/lib/utils';
import { computeSlaDeadlines } from '@/lib/sla';
import type { Prisma, TicketPriority, TicketStatus } from '@prisma/client';

/**
 * Gera próximo número humano do chamado usando a tabela `TicketSequence`
 * dentro de uma transação para evitar corrida.
 */
export async function allocateTicketNumber(tx: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getFullYear();

  const seq = await tx.ticketSequence.upsert({
    where: { year },
    create: { year, lastValue: 1 },
    update: { lastValue: { increment: 1 } },
  });

  return nextTicketNumber(year, seq.lastValue - 1); // -1 porque upsert já incrementou / create começa em 1
}

interface CreateTicketParams {
  clientId: string;
  openedById: string;
  title: string;
  description: string;
  priority?: TicketPriority;
  categoryId?: string | null;
  equipmentId?: string | null;
  queueId?: string | null;
}

export async function createTicket(params: CreateTicketParams) {
  return db.$transaction(async (tx) => {
    const ticketNumber = await allocateTicketNumber(tx);

    // Fila padrão "Geral" se não informada
    let queueId = params.queueId;
    if (!queueId) {
      const defaultQueue = await tx.queue.findFirst({
        where: { name: 'Geral', isActive: true },
      });
      queueId = defaultQueue?.id ?? null;
    }

    const priority = params.priority ?? 'MEDIUM';
    const sla = computeSlaDeadlines(priority);

    const ticket = await tx.ticket.create({
      data: {
        ticketNumber,
        clientId: params.clientId,
        openedById: params.openedById,
        title: params.title,
        description: params.description,
        priority,
        categoryId: params.categoryId ?? null,
        equipmentId: params.equipmentId ?? null,
        queueId,
        status: 'NEW',
        firstResponseDueAt: sla.firstResponseDueAt,
        resolutionDueAt: sla.resolutionDueAt,
      },
    });

    await tx.ticketEvent.create({
      data: {
        ticketId: ticket.id,
        authorId: params.openedById,
        type: 'CREATED',
        newValue: ticket.status,
      },
    });

    return ticket;
  });
}

/**
 * Puxa o próximo chamado da fila para o agente.
 * Usa FOR UPDATE SKIP LOCKED para evitar concorrência.
 */
export async function pullNextFromQueue(queueId: string, agentId: string) {
  return db.$transaction(async (tx) => {
    const [row] = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Ticket"
      WHERE "queueId" = ${queueId}
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
      LIMIT 1
    `;

    if (!row) return null;

    const updated = await tx.ticket.update({
      where: { id: row.id },
      data: {
        assignedToId: agentId,
        assignedAt: new Date(),
        status: 'IN_PROGRESS',
        firstResponseAt: new Date(),
      },
    });

    await tx.ticketEvent.create({
      data: {
        ticketId: updated.id,
        authorId: agentId,
        type: 'ASSIGNED',
        newValue: agentId,
      },
    });

    return updated;
  });
}

interface ListTicketsFilter {
  clientId?: string;
  status?: TicketStatus[];
  assignedToId?: string;
  queueId?: string;
  search?: string;
  /** 'breached' = SLA vencido (ativos), 'warning' = vencendo em até 1h */
  sla?: 'breached' | 'warning';
  page?: number;
  pageSize?: number;
}

const ACTIVE_STATUSES: TicketStatus[] = [
  'NEW',
  'OPEN',
  'IN_PROGRESS',
  'WAITING_CLIENT',
  'REOPENED',
];

export async function listTickets(filter: ListTicketsFilter = {}) {
  const page = filter.page ?? 1;
  const pageSize = filter.pageSize ?? 20;
  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

  const where: Prisma.TicketWhereInput = {
    deletedAt: null,
    ...(filter.clientId && { clientId: filter.clientId }),
    ...(filter.status && filter.status.length > 0 && { status: { in: filter.status } }),
    ...(filter.assignedToId && { assignedToId: filter.assignedToId }),
    ...(filter.queueId && { queueId: filter.queueId }),
    ...(filter.search && {
      OR: [
        { title: { contains: filter.search, mode: 'insensitive' } },
        { description: { contains: filter.search, mode: 'insensitive' } },
        { ticketNumber: { contains: filter.search, mode: 'insensitive' } },
      ],
    }),
    ...(filter.sla === 'breached' && {
      slaBreached: true,
      status: { in: ACTIVE_STATUSES },
    }),
    ...(filter.sla === 'warning' && {
      slaBreached: false,
      status: { in: ACTIVE_STATUSES },
      resolutionDueAt: { gte: now, lte: oneHourLater },
    }),
  };

  const [total, items] = await Promise.all([
    db.ticket.count({ where }),
    db.ticket.findMany({
      where,
      include: {
        client: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
        queue: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, color: true } },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return { items, total, page, pageSize };
}
