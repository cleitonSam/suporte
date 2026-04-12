'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { createTicketSchema, replyTicketSchema } from '@/lib/validators/ticket';
import { createTicket, pullNextFromQueue } from '@/server/services/ticket-service';
import {
  sendTicketCreatedEmail,
  sendNewReplyToClientEmail,
  sendClientReplyToAgentEmail,
} from '@/lib/email';
import { audit } from '@/lib/audit';
import { rateLimit, RATE_POLICIES } from '@/lib/rate-limit';
import { notify } from '@/lib/notifications';
import { logger } from '@/lib/logger';
import { notifyNewReply, notifyTicketCreated } from '@/lib/whatsapp';

export async function createTicketAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error('Não autenticado');
  const user = session.user;

  // Rate limit — por usuário
  const rl = rateLimit(`ticket:create:${user.id}`, RATE_POLICIES.createTicket);
  if (!rl.allowed) {
    await audit({
      action: 'rate_limit.hit',
      actorId: user.id,
      metadata: { scope: 'ticket_create' },
    });
    return { error: { form: ['Muitas aberturas em sequência. Aguarde alguns minutos.'] } };
  }

  const parsed = createTicketSchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description'),
    priority: formData.get('priority') ?? 'MEDIUM',
    categoryId: formData.get('categoryId') || null,
    equipmentId: formData.get('equipmentId') || null,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  // Descobrir clientId: para CLIENT_CONTACT vem do próprio user;
  // para AGENT abrindo em nome (futuro), viria de um campo no form.
  const clientId: string | null = user.clientId ?? null;

  if (!clientId) {
    return { error: { form: ['Usuário sem cliente vinculado'] } };
  }

  const ticket = await createTicket({
    clientId,
    openedById: user.id,
    title: parsed.data.title,
    description: parsed.data.description,
    priority: parsed.data.priority,
    categoryId: parsed.data.categoryId,
    equipmentId: parsed.data.equipmentId,
  });

  await audit({
    action: 'ticket.create',
    actorId: user.id,
    entity: 'Ticket',
    entityId: ticket.id,
    metadata: { ticketNumber: ticket.ticketNumber, priority: ticket.priority, clientId },
  });

  // Notificar em-app todos os agentes ativos — fila nova
  try {
    const agents = await db.user.findMany({
      where: { userType: 'AGENT', isActive: true, deletedAt: null },
      select: { id: true },
    });
    await Promise.all(
      agents.map((a) =>
        notify({
          userId: a.id,
          type: 'TICKET_CREATED',
          title: `Novo chamado: ${ticket.ticketNumber}`,
          body: ticket.title,
          linkUrl: `/admin/chamados/${ticket.id}`,
        })
      )
    );
  } catch (err) {
    logger.warn({ err }, '[createTicketAction] falha ao notificar agentes');
  }

  // Notificar o contato que abriu o chamado por email
  if (user.email) {
    await sendTicketCreatedEmail({
      to: user.email,
      name: user.name ?? '',
      ticketNumber: ticket.ticketNumber,
      ticketId: ticket.id,
      title: ticket.title,
      priority: ticket.priority,
    }).catch((err) => logger.error({ err }, '[createTicketAction] email falhou'));
  }

  // WhatsApp — confirmar abertura para o cliente
  const client = await db.client.findUnique({
    where: { id: clientId },
    select: { phone: true, name: true },
  });
  if (client?.phone) {
    notifyTicketCreated({
      clientPhone: client.phone,
      clientName: user.name ?? client.name ?? '',
      ticketNumber: ticket.ticketNumber,
      ticketId: ticket.id,
      ticketTitle: ticket.title,
    }).catch((err) => logger.error({ err }, '[createTicketAction] WhatsApp falhou'));
  }

  revalidatePath('/portal');
  revalidatePath('/admin/chamados');
  redirect(`/portal/chamado/${ticket.id}`);
}

export async function replyTicketAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error('Não autenticado');
  const user = session.user;

  const rl = rateLimit(`ticket:reply:${user.id}`, RATE_POLICIES.reply);
  if (!rl.allowed) {
    await audit({
      action: 'rate_limit.hit',
      actorId: user.id,
      metadata: { scope: 'ticket_reply' },
    });
    return { error: { form: ['Muitas respostas em sequência. Aguarde um momento.'] } };
  }

  const parsed = replyTicketSchema.safeParse({
    ticketId: formData.get('ticketId'),
    body: formData.get('body'),
    isInternal: formData.get('isInternal') === 'true',
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  // Clientes não podem criar notas internas
  const isInternal = user.userType === 'AGENT' ? parsed.data.isInternal : false;

  // Buscar dados do ticket para notificações (antes de criar a mensagem)
  const ticket = await db.ticket.findUnique({
    where: { id: parsed.data.ticketId },
    select: {
      id: true,
      ticketNumber: true,
      title: true,
      status: true,
      firstResponseAt: true,
      assignedToId: true,
      assignedTo: { select: { id: true, email: true, name: true } },
      openedBy: { select: { id: true, email: true, name: true } },
      client: { select: { name: true, phone: true } },
    },
  });
  if (!ticket) return { error: { form: ['Chamado não encontrado'] } };

  await db.ticketMessage.create({
    data: {
      ticketId: parsed.data.ticketId,
      authorId: user.id,
      body: parsed.data.body,
      isInternal,
    },
  });

  // Marcar firstResponseAt quando o primeiro agente responde
  if (user.userType === 'AGENT' && !ticket.firstResponseAt && !isInternal) {
    await db.ticket.update({
      where: { id: ticket.id },
      data: { firstResponseAt: new Date() },
    });
  }

  // Se o cliente respondeu, ticket volta de WAITING_CLIENT para IN_PROGRESS
  if (user.userType === 'CLIENT_CONTACT') {
    await db.ticket.updateMany({
      where: { id: parsed.data.ticketId, status: 'WAITING_CLIENT' },
      data: { status: 'IN_PROGRESS' },
    });
  }

  await audit({
    action: 'ticket.reply',
    actorId: user.id,
    entity: 'Ticket',
    entityId: ticket.id,
    metadata: { isInternal, ticketNumber: ticket.ticketNumber },
  });

  // Enviar notificações de resposta (apenas mensagens públicas)
  if (!isInternal) {
    const preview = parsed.data.body;

    if (user.userType === 'AGENT') {
      // Agente respondeu → avisar o contato que abriu o chamado
      if (ticket.openedBy?.id) {
        await notify({
          userId: ticket.openedBy.id,
          type: 'TICKET_REPLIED',
          title: `Nova resposta em ${ticket.ticketNumber}`,
          body: preview.slice(0, 160),
          linkUrl: `/portal/chamado/${ticket.id}`,
        });
      }
      if (ticket.openedBy?.email) {
        await sendNewReplyToClientEmail({
          to: ticket.openedBy.email,
          clientName: ticket.openedBy.name ?? '',
          ticketNumber: ticket.ticketNumber,
          ticketId: parsed.data.ticketId,
          ticketTitle: ticket.title,
          agentName: user.name ?? 'Equipe Fluxo',
          messagePreview: preview,
        }).catch((err) => logger.error({ err }, '[replyTicketAction] email falhou'));
      }
      // WhatsApp — avisar cliente que tem nova resposta
      if (ticket.client?.phone) {
        notifyNewReply({
          clientPhone: ticket.client.phone,
          clientName: ticket.openedBy?.name ?? ticket.client.name ?? '',
          ticketNumber: ticket.ticketNumber,
          ticketId: ticket.id,
          agentName: user.name ?? 'Equipe Fluxo',
        }).catch((err) => logger.error({ err }, '[replyTicketAction] WhatsApp falhou'));
      }
    } else {
      // Cliente respondeu → avisar o agente atribuído
      if (ticket.assignedTo?.id) {
        await notify({
          userId: ticket.assignedTo.id,
          type: 'TICKET_REPLIED',
          title: `${ticket.client?.name ?? 'Cliente'} respondeu`,
          body: `${ticket.ticketNumber} — ${preview.slice(0, 140)}`,
          linkUrl: `/admin/chamados/${ticket.id}`,
        });
      }
      if (ticket.assignedTo?.email) {
        await sendClientReplyToAgentEmail({
          to: ticket.assignedTo.email,
          agentName: ticket.assignedTo.name ?? '',
          clientName: ticket.client?.name ?? user.name ?? '',
          ticketNumber: ticket.ticketNumber,
          ticketId: parsed.data.ticketId,
          ticketTitle: ticket.title,
          messagePreview: preview,
        }).catch((err) => logger.error({ err }, '[replyTicketAction] email falhou'));
      }
    }
  }

  revalidatePath(`/portal/chamado/${parsed.data.ticketId}`);
  revalidatePath(`/admin/chamados/${parsed.data.ticketId}`);
  return { ok: true };
}

export async function pullNextAction(queueId: string) {
  const session = await auth();
  if (!session?.user) throw new Error('Não autenticado');
  const user = session.user;
  if (user.userType !== 'AGENT') throw new Error('Apenas agentes');

  const ticket = await pullNextFromQueue(queueId, user.id);
  if (!ticket) return { empty: true };

  await audit({
    action: 'ticket.assign',
    actorId: user.id,
    entity: 'Ticket',
    entityId: ticket.id,
    metadata: { via: 'pull_queue', queueId },
  });

  revalidatePath('/admin/fila');
  redirect(`/admin/chamados/${ticket.id}`);
}
