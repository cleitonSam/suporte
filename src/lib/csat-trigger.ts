import { db } from './db';
import { createCsatSurvey } from './csat';
import { sendCsatEmail } from './email-csat';
import { notifyCsatSurvey } from './whatsapp';
import { logger } from './logger';

/**
 * Trigger CSAT survey if needed
 * - Checks if ticket already has a CSAT survey
 * - If not, creates one and sends email to ticket opener
 * @param ticketId - The ticket ID
 */
export async function triggerCsatIfNeeded(ticketId: string): Promise<void> {
  try {
    // Check if ticket already has a CSAT survey
    const existingSurvey = await db.csatSurvey.findFirst({
      where: { ticketId },
    });

    if (existingSurvey) {
      console.log('[csat-trigger] CSAT survey already exists for ticket:', ticketId);
      return;
    }

    // Get ticket details
    const ticket = await db.ticket.findUnique({
      where: { id: ticketId },
      include: {
        openedBy: {
          select: {
            email: true,
            name: true,
          },
        },
        client: {
          select: {
            phone: true,
            name: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!ticket) {
      console.error('[csat-trigger] Ticket not found:', ticketId);
      return;
    }

    // Cannot send CSAT if no opener email and no client phone
    if (!ticket.openedBy?.email) {
      logger.warn({ ticketId }, '[csat-trigger] Ticket opener has no email');
    }

    const agentId = ticket.assignedToId || ticket.assignedTo?.id;

    // Create CSAT survey
    const token = await createCsatSurvey(ticketId, agentId ?? '');
    console.log('[csat-trigger] Created CSAT survey for ticket:', ticketId, 'token:', token);

    // Build survey URL
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3001';
    const surveyUrl = `${baseUrl}/api/csat/${token}`;

    // Send email (if opener has email)
    if (ticket.openedBy?.email) {
      const emailSent = await sendCsatEmail({
        to: ticket.openedBy.email,
        clientName: ticket.openedBy.name ?? ticket.client?.name ?? '',
        ticketNumber: ticket.ticketNumber,
        ticketTitle: ticket.title,
        surveyUrl,
      });
      if (emailSent) {
        logger.info({ to: ticket.openedBy.email }, '[csat-trigger] email enviado');
      }
    }

    // Send WhatsApp (if client has phone)
    if (ticket.client?.phone) {
      notifyCsatSurvey({
        clientPhone: ticket.client.phone,
        clientName: ticket.openedBy?.name ?? ticket.client.name ?? '',
        ticketNumber: ticket.ticketNumber,
        surveyUrl,
      }).catch((err) => logger.error({ err }, '[csat-trigger] WhatsApp falhou'));
    }
  } catch (error) {
    console.error('[csat-trigger] Error triggering CSAT:', error);
    throw error;
  }
}
