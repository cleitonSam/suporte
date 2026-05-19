'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { logger } from '@/lib/logger';
import type { TicketStatus, TicketPriority } from '@prisma/client';

type MacroAction =
  | { type: 'status'; value: TicketStatus }
  | { type: 'priority'; value: TicketPriority }
  | { type: 'assign_to'; value: string | null }
  | { type: 'queue'; value: string | null }
  | { type: 'internal_note'; value: string };

const VALID_STATUS = new Set([
  'NEW',
  'OPEN',
  'IN_PROGRESS',
  'WAITING_CLIENT',
  'RESOLVED',
  'CLOSED',
  'REOPENED',
]);
const VALID_PRIORITY = new Set(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);

/**
 * Aplica macro num chamado. A macro pode mudar status, prioridade,
 * atribuicao, fila e/ou criar uma nota interna em uma transacao atomica.
 */
export async function applyMacroAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const user = session.user;
  if (user.userType !== 'AGENT') redirect('/admin?error=forbidden');

  const ticketId = formData.get('ticketId') as string | null;
  const macroId = formData.get('macroId') as string | null;
  const returnTo = (formData.get('returnTo') as string | null) || `/admin/chamados/${ticketId}`;

  if (!ticketId || !macroId) {
    redirect(`${returnTo}?error=validation`);
  }

  const [macro, ticket] = await Promise.all([
    db.ticketMacro.findFirst({
      where: { id: macroId, isActive: true, deletedAt: null },
    }),
    db.ticket.findFirst({
      where: { id: ticketId, deletedAt: null },
      select: { id: true, status: true, priority: true, assignedToId: true, queueId: true, ticketNumber: true },
    }),
  ]);

  if (!macro || !ticket) {
    redirect(`${returnTo}?error=not_found`);
  }

  const actions = (macro.actions as MacroAction[] | null) ?? [];
  if (!Array.isArray(actions) || actions.length === 0) {
    redirect(`${returnTo}?error=validation`);
  }

  const updateData: Record<string, unknown> = {};
  type EventEntry = {
    type: 'STATUS_CHANGED' | 'PRIORITY_CHANGED' | 'ASSIGNED';
    oldValue: string | null;
    newValue: string | null;
  };
  const events: EventEntry[] = [];
  const internalNotes: string[] = [];

  for (const act of actions) {
    if (!act || typeof act !== 'object' || !('type' in act)) continue;
    switch (act.type) {
      case 'status': {
        if (!VALID_STATUS.has(act.value)) continue;
        if (act.value === ticket.status) continue;
        updateData.status = act.value;
        if (act.value === 'RESOLVED') updateData.resolvedAt = new Date();
        if (act.value === 'CLOSED') updateData.closedAt = new Date();
        events.push({ type: 'STATUS_CHANGED', oldValue: ticket.status, newValue: act.value });
        break;
      }
      case 'priority': {
        if (!VALID_PRIORITY.has(act.value)) continue;
        if (act.value === ticket.priority) continue;
        updateData.priority = act.value;
        events.push({ type: 'PRIORITY_CHANGED', oldValue: ticket.priority, newValue: act.value });
        break;
      }
      case 'assign_to': {
        const newAssigned = act.value || null;
        if (newAssigned === ticket.assignedToId) continue;
        updateData.assignedToId = newAssigned;
        events.push({
          type: 'ASSIGNED',
          oldValue: ticket.assignedToId ?? null,
          newValue: newAssigned,
        });
        break;
      }
      case 'queue': {
        const newQueue = act.value || null;
        if (newQueue === ticket.queueId) continue;
        updateData.queueId = newQueue;
        break;
      }
      case 'internal_note': {
        if (typeof act.value !== 'string' || act.value.trim().length === 0) continue;
        internalNotes.push(act.value.trim().slice(0, 4000));
        break;
      }
    }
  }

  if (Object.keys(updateData).length === 0 && events.length === 0 && internalNotes.length === 0) {
    redirect(`${returnTo}?info=macro.aplicada`);
  }

  try {
    await db.$transaction(async (tx) => {
      if (Object.keys(updateData).length > 0) {
        await tx.ticket.update({ where: { id: ticketId }, data: updateData });
      }
      for (const ev of events) {
        await tx.ticketEvent.create({
          data: {
            ticketId,
            authorId: user.id,
            type: ev.type,
            oldValue: ev.oldValue,
            newValue: ev.newValue,
            payload: { macroId: macro.id, macroName: macro.name },
          },
        });
      }
      for (const body of internalNotes) {
        await tx.ticketMessage.create({
          data: {
            ticketId,
            authorId: user.id,
            body,
            isInternal: true,
          },
        });
      }
    });

    await audit({
      action: 'ticket.update',
      actorId: user.id,
      entity: 'Ticket',
      entityId: ticketId,
      metadata: {
        ticketNumber: ticket.ticketNumber,
        macroId: macro.id,
        macroName: macro.name,
        changes: Object.keys(updateData),
      },
    });
  } catch (err) {
    logger.error({ err, ticketId, macroId }, '[applyMacroAction] falhou');
    redirect(`${returnTo}?error=internal_error`);
  }

  revalidatePath(`/admin/chamados/${ticketId}`);
  redirect(`${returnTo}${returnTo.includes('?') ? '&' : '?'}ok=macro.aplicada`);
}
