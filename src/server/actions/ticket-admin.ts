'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { createTicket } from '@/server/services/ticket-service';
import type { TicketStatus, TicketPriority } from '@prisma/client';
import { sendTicketResolvedEmail } from '@/lib/email';
import { audit } from '@/lib/audit';
import { notify } from '@/lib/notifications';
import { logger } from '@/lib/logger';
import { triggerCsatIfNeeded } from '@/lib/csat-trigger';
import { runAutomations } from '@/lib/automation-engine';
import { notifyTicketStatusChange } from '@/lib/whatsapp';

export async function updateTicketStatusAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error('Não autenticado');
  const user = session.user;
  if (user.userType !== 'AGENT') throw new Error('Sem permissão');

  const ticketId = formData.get('ticketId') as string;
  const status = formData.get('status') as TicketStatus;

  const ticket = await db.ticket.findUnique({
    where: { id: ticketId },
    include: {
      openedBy: { select: { id: true, email: true, name: true } },
      client: { select: { name: true, phone: true } },
    },
  });
  if (!ticket) return;

  await db.$transaction([
    db.ticket.update({
      where: { id: ticketId },
      data: {
        status,
        ...(status === 'RESOLVED' && !ticket.resolvedAt && { resolvedAt: new Date() }),
        ...(status === 'CLOSED' && !ticket.closedAt && { closedAt: new Date() }),
      },
    }),
    db.ticketEvent.create({
      data: {
        ticketId,
        authorId: user.id,
        type: 'STATUS_CHANGED',
        oldValue: ticket.status,
        newValue: status,
      },
    }),
  ]);

  // Notificação WhatsApp para o cliente
  if (ticket.client?.phone) {
    notifyTicketStatusChange({
      clientPhone: ticket.client.phone,
      clientName: ticket.openedBy?.name ?? ticket.client.name ?? '',
      ticketNumber: ticket.ticketNumber,
      ticketId,
      oldStatus: ticket.status,
      newStatus: status,
    }).catch((err) => logger.error({ err }, '[updateTicketStatus] WhatsApp falhou'));
  }

  await audit({
    action: 'ticket.status_change',
    actorId: user.id,
    entity: 'Ticket',
    entityId: ticketId,
    metadata: { from: ticket.status, to: status, ticketNumber: ticket.ticketNumber },
  });

  // Notificação in-app para o autor
  if (ticket.openedBy?.id) {
    await notify({
      userId: ticket.openedBy.id,
      type: 'TICKET_STATUS_CHANGED',
      title: `${ticket.ticketNumber}: ${status}`,
      body: ticket.title,
      linkUrl: `/portal/chamado/${ticketId}`,
    });
  }

  // Notificar o cliente quando o chamado for marcado como resolvido
  if (status === 'RESOLVED' && ticket.openedBy?.email) {
    await sendTicketResolvedEmail({
      to: ticket.openedBy.email,
      clientName: ticket.openedBy.name ?? ticket.client?.name ?? '',
      ticketNumber: ticket.ticketNumber,
      ticketId,
      ticketTitle: ticket.title,
    }).catch((err) => logger.error({ err }, '[updateTicketStatus] email falhou'));

    // Disparar pesquisa de satisfação
    triggerCsatIfNeeded(ticketId).catch((err) =>
      logger.error({ err }, '[updateTicketStatus] CSAT trigger falhou'),
    );
  }

  // Executar automações
  runAutomations('ticket.status_changed', ticketId).catch((err) =>
    logger.error({ err }, '[updateTicketStatus] automações falharam'),
  );

  revalidatePath(`/admin/chamados/${ticketId}`);
  revalidatePath('/admin/chamados');
  revalidatePath('/admin');
}

export async function changePriorityAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error('Não autenticado');
  const user = session.user;
  if (user.userType !== 'AGENT') throw new Error('Sem permissão');

  const ticketId = formData.get('ticketId') as string;
  const priority = formData.get('priority') as TicketPriority;

  const ticket = await db.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) return;

  await db.$transaction([
    db.ticket.update({ where: { id: ticketId }, data: { priority } }),
    db.ticketEvent.create({
      data: {
        ticketId,
        authorId: user.id,
        type: 'PRIORITY_CHANGED',
        oldValue: ticket.priority,
        newValue: priority,
      },
    }),
  ]);

  await audit({
    action: 'ticket.update',
    actorId: user.id,
    entity: 'Ticket',
    entityId: ticketId,
    metadata: { field: 'priority', from: ticket.priority, to: priority },
  });

  revalidatePath(`/admin/chamados/${ticketId}`);
}

export async function reopenTicketAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error('Não autenticado');
  const user = session.user;

  const ticketId = formData.get('ticketId') as string;

  const ticket = await db.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) return;

  // Cliente só pode reabrir chamados do seu próprio cliente
  if (user.userType === 'CLIENT_CONTACT' && ticket.clientId !== user.clientId) {
    throw new Error('Sem permissão');
  }

  await db.$transaction([
    db.ticket.update({
      where: { id: ticketId },
      data: { status: 'REOPENED', resolvedAt: null, closedAt: null },
    }),
    db.ticketEvent.create({
      data: {
        ticketId,
        authorId: user.id,
        type: 'REOPENED',
        oldValue: ticket.status,
        newValue: 'REOPENED',
      },
    }),
  ]);

  await audit({
    action: 'ticket.reopen',
    actorId: user.id,
    entity: 'Ticket',
    entityId: ticketId,
    metadata: { fromStatus: ticket.status },
  });

  revalidatePath(`/admin/chamados/${ticketId}`);
  revalidatePath(`/portal/chamado/${ticketId}`);
}

export async function assignTicketAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error('Não autenticado');
  const user = session.user;
  if (user.userType !== 'AGENT') throw new Error('Sem permissão');

  const ticketId = formData.get('ticketId') as string;
  const assignedToId = (formData.get('assignedToId') as string) || null;

  const ticket = await db.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) return;

  await db.$transaction([
    db.ticket.update({
      where: { id: ticketId },
      data: {
        assignedToId,
        assignedAt: assignedToId ? new Date() : null,
        status: assignedToId && ticket.status === 'NEW' ? 'IN_PROGRESS' : ticket.status,
        firstResponseAt:
          assignedToId && !ticket.firstResponseAt ? new Date() : ticket.firstResponseAt,
      },
    }),
    db.ticketEvent.create({
      data: {
        ticketId,
        authorId: user.id,
        type: 'ASSIGNED',
        oldValue: ticket.assignedToId ?? 'ninguém',
        newValue: assignedToId ?? 'ninguém',
      },
    }),
  ]);

  await audit({
    action: 'ticket.assign',
    actorId: user.id,
    entity: 'Ticket',
    entityId: ticketId,
    metadata: { from: ticket.assignedToId, to: assignedToId },
  });

  if (assignedToId && assignedToId !== user.id) {
    await notify({
      userId: assignedToId,
      type: 'TICKET_ASSIGNED',
      title: `Atribuído a você: ${ticket.ticketNumber}`,
      body: ticket.title,
      linkUrl: `/admin/chamados/${ticketId}`,
    });
  }

  revalidatePath(`/admin/chamados/${ticketId}`);
  revalidatePath('/admin/chamados');
  revalidatePath('/admin/fila');
}

// ── Ações rápidas ───────────────────────────────────────

export async function resolveTicketAction(formData: FormData) {
  const session = await auth();
  if (!session?.user || session.user.userType !== 'AGENT') throw new Error('Sem permissão');

  const ticketId = formData.get('ticketId') as string;
  const ticket = await db.ticket.findUnique({
    where: { id: ticketId },
    include: { openedBy: { select: { id: true, email: true, name: true } }, client: { select: { name: true, phone: true } } },
  });
  if (!ticket) return;

  await db.$transaction([
    db.ticket.update({
      where: { id: ticketId },
      data: { status: 'RESOLVED', resolvedAt: ticket.resolvedAt ?? new Date() },
    }),
    db.ticketEvent.create({
      data: { ticketId, authorId: session.user.id, type: 'STATUS_CHANGED', oldValue: ticket.status, newValue: 'RESOLVED' },
    }),
  ]);

  await audit({
    action: 'ticket.status_change',
    actorId: session.user.id,
    entity: 'Ticket',
    entityId: ticketId,
    metadata: { from: ticket.status, to: 'RESOLVED', ticketNumber: ticket.ticketNumber },
  });

  // WhatsApp notification
  if (ticket.client?.phone) {
    notifyTicketStatusChange({
      clientPhone: ticket.client.phone,
      clientName: ticket.openedBy?.name ?? ticket.client.name ?? '',
      ticketNumber: ticket.ticketNumber,
      ticketId,
      oldStatus: ticket.status,
      newStatus: 'RESOLVED',
    }).catch((err) => logger.error({ err }, '[resolveTicket] WhatsApp falhou'));
  }

  if (ticket.openedBy?.id) {
    await notify({
      userId: ticket.openedBy.id,
      type: 'TICKET_STATUS_CHANGED',
      title: `${ticket.ticketNumber}: Resolvido`,
      body: ticket.title,
      linkUrl: `/portal/chamado/${ticketId}`,
    });
  }

  if (ticket.openedBy?.email) {
    await sendTicketResolvedEmail({
      to: ticket.openedBy.email,
      clientName: ticket.openedBy.name ?? ticket.client?.name ?? '',
      ticketNumber: ticket.ticketNumber,
      ticketId,
      ticketTitle: ticket.title,
    }).catch((err) => logger.error({ err }, '[resolveTicket] email falhou'));
  }

  // Disparar pesquisa de satisfação CSAT
  triggerCsatIfNeeded(ticketId).catch((err) =>
    logger.error({ err }, '[resolveTicket] CSAT trigger falhou'),
  );

  // Executar automações
  runAutomations('ticket.status_changed', ticketId).catch((err) =>
    logger.error({ err }, '[resolveTicket] automações falharam'),
  );

  revalidatePath(`/admin/chamados/${ticketId}`);
  revalidatePath('/admin/chamados');
  revalidatePath('/admin/fila');
  revalidatePath('/admin');
}

export async function closeTicketAction(formData: FormData) {
  const session = await auth();
  if (!session?.user || session.user.userType !== 'AGENT') throw new Error('Sem permissão');

  const ticketId = formData.get('ticketId') as string;
  const ticket = await db.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) return;

  await db.$transaction([
    db.ticket.update({
      where: { id: ticketId },
      data: { status: 'CLOSED', closedAt: ticket.closedAt ?? new Date(), resolvedAt: ticket.resolvedAt ?? new Date() },
    }),
    db.ticketEvent.create({
      data: { ticketId, authorId: session.user.id, type: 'CLOSED', oldValue: ticket.status, newValue: 'CLOSED' },
    }),
  ]);

  await audit({
    action: 'ticket.status_change',
    actorId: session.user.id,
    entity: 'Ticket',
    entityId: ticketId,
    metadata: { from: ticket.status, to: 'CLOSED', ticketNumber: ticket.ticketNumber },
  });

  revalidatePath(`/admin/chamados/${ticketId}`);
  revalidatePath('/admin/chamados');
  revalidatePath('/admin/fila');
  revalidatePath('/admin');
}

export async function moveQueueAction(formData: FormData) {
  const session = await auth();
  if (!session?.user || session.user.userType !== 'AGENT') throw new Error('Sem permissão');

  const ticketId = formData.get('ticketId') as string;
  const queueId = (formData.get('queueId') as string) || null;
  const ticket = await db.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) return;

  await db.ticket.update({ where: { id: ticketId }, data: { queueId } });

  await audit({
    action: 'ticket.update',
    actorId: session.user.id,
    entity: 'Ticket',
    entityId: ticketId,
    metadata: { field: 'queue', from: ticket.queueId, to: queueId },
  });

  revalidatePath(`/admin/chamados/${ticketId}`);
  revalidatePath('/admin/fila');
}

export async function editTicketAction(formData: FormData) {
  const session = await auth();
  if (!session?.user || session.user.userType !== 'AGENT') throw new Error('Sem permissão');

  const ticketId = formData.get('ticketId') as string;
  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const categoryId = (formData.get('categoryId') as string) || null;
  const equipmentId = (formData.get('equipmentId') as string) || null;

  if (!title?.trim() || !description?.trim()) return;

  const ticket = await db.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) return;

  await db.ticket.update({
    where: { id: ticketId },
    data: {
      title: title.trim(),
      description: description.trim(),
      categoryId,
      equipmentId,
    },
  });

  await audit({
    action: 'ticket.update',
    actorId: session.user.id,
    entity: 'Ticket',
    entityId: ticketId,
    metadata: {
      field: 'details',
      titleChanged: title.trim() !== ticket.title,
      descriptionChanged: description.trim() !== ticket.description,
    },
  });

  revalidatePath(`/admin/chamados/${ticketId}`);
  revalidatePath('/admin/chamados');
}

export async function createTicketByAgentAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error('Não autenticado');
  const user = session.user;
  if (user.userType !== 'AGENT') throw new Error('Sem permissão');

  const clientId = formData.get('clientId') as string;
  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const priority = (formData.get('priority') as TicketPriority) ?? 'MEDIUM';
  const categoryId = (formData.get('categoryId') as string) || null;
  const queueId = (formData.get('queueId') as string) || null;
  const assignedToId = (formData.get('assignedToId') as string) || null;

  if (!clientId || !title || !description) {
    redirect('/admin/chamados/novo?error=validation');
  }

  const ticket = await createTicket({
    clientId,
    openedById: user.id,
    title,
    description,
    priority,
    categoryId,
    queueId,
  });

  // Se foi atribuído diretamente
  if (assignedToId) {
    await db.ticket.update({
      where: { id: ticket.id },
      data: {
        assignedToId,
        assignedAt: new Date(),
        status: 'IN_PROGRESS',
        firstResponseAt: new Date(),
      },
    });
    await db.ticketEvent.create({
      data: { ticketId: ticket.id, authorId: user.id, type: 'ASSIGNED', newValue: assignedToId },
    });

    if (assignedToId !== user.id) {
      await notify({
        userId: assignedToId,
        type: 'TICKET_ASSIGNED',
        title: `Atribuído a você: ${ticket.ticketNumber}`,
        body: ticket.title,
        linkUrl: `/admin/chamados/${ticket.id}`,
      });
    }
  }

  await audit({
    action: 'ticket.create',
    actorId: user.id,
    entity: 'Ticket',
    entityId: ticket.id,
    metadata: {
      via: 'agent',
      ticketNumber: ticket.ticketNumber,
      clientId,
      priority,
      assignedToId,
    },
  });

  // Executar automações de criação
  runAutomations('ticket.created', ticket.id).catch((err) =>
    logger.error({ err }, '[createTicketByAgent] automações falharam'),
  );

  revalidatePath('/admin/chamados');
  revalidatePath('/admin');
  redirect(`/admin/chamados/${ticket.id}`);
}
