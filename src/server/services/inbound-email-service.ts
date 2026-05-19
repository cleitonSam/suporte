import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { audit } from '@/lib/audit';
import { extractEmailAddress, extractInboundToken } from '@/lib/inbound-token';
import { createTicket } from '@/server/services/ticket-service';

export interface InboundEmailPayload {
  from: string;
  to: string;
  subject?: string | null;
  text?: string | null;
  html?: string | null;
  messageId?: string | null;
}

export type InboundResult =
  | { ok: true; ticketId: string; ticketNumber: string }
  | { ok: false; reason: 'unknown_token' | 'unknown_sender' | 'invalid_payload' | 'no_subject' };

const MAX_SUBJECT = 200;
const MAX_BODY = 20_000;

function htmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function processInboundEmail(payload: InboundEmailPayload): Promise<InboundResult> {
  if (!payload.from || !payload.to) {
    return { ok: false, reason: 'invalid_payload' };
  }

  const token = extractInboundToken(payload.to);
  const fromEmail = extractEmailAddress(payload.from);

  if (!token) {
    logger.warn({ to: payload.to }, '[inbound] token nao encontrado no destinatário');
    return { ok: false, reason: 'unknown_token' };
  }
  if (!fromEmail) {
    logger.warn({ from: payload.from }, '[inbound] from invalido');
    return { ok: false, reason: 'invalid_payload' };
  }

  const client = await db.client.findFirst({
    where: { inboundToken: token, deletedAt: null },
    select: { id: true, name: true, status: true },
  });

  if (!client) {
    logger.warn({ token }, '[inbound] cliente nao encontrado para token');
    return { ok: false, reason: 'unknown_token' };
  }

  if (client.status !== 'ACTIVE') {
    logger.warn({ clientId: client.id, status: client.status }, '[inbound] cliente nao ativo');
    return { ok: false, reason: 'unknown_token' };
  }

  const contact = await db.user.findFirst({
    where: {
      email: fromEmail,
      clientId: client.id,
      userType: 'CLIENT_CONTACT',
      deletedAt: null,
      isActive: true,
    },
    select: { id: true, name: true },
  });

  if (!contact) {
    logger.warn(
      { clientId: client.id, fromEmail },
      '[inbound] remetente nao cadastrado como contato do cliente'
    );
    return { ok: false, reason: 'unknown_sender' };
  }

  const subjectRaw = (payload.subject ?? '').trim().slice(0, MAX_SUBJECT);
  const subject = subjectRaw.length > 0 ? subjectRaw : '(sem assunto)';
  const bodyRaw =
    payload.text?.trim() || (payload.html ? htmlToText(payload.html) : '') || '(email sem conteúdo)';
  const description = bodyRaw.slice(0, MAX_BODY);

  const ticket = await createTicket({
    clientId: client.id,
    openedById: contact.id,
    title: subject,
    description,
    priority: 'MEDIUM',
  });

  await audit({
    action: 'ticket.create',
    actorId: contact.id,
    entity: 'Ticket',
    entityId: ticket.id,
    metadata: {
      source: 'inbound_email',
      ticketNumber: ticket.ticketNumber,
      clientId: client.id,
      fromEmail,
      messageId: payload.messageId ?? null,
    },
  });

  logger.info(
    { ticketId: ticket.id, ticketNumber: ticket.ticketNumber, clientId: client.id, contactId: contact.id },
    '[inbound] ticket criado via email'
  );

  return { ok: true, ticketId: ticket.id, ticketNumber: ticket.ticketNumber };
}
