import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { notify } from '@/lib/notifications';

// Verifica SLAs periodicamente. Marca slaBreached=true para chamados ativos
// com resolutionDueAt no passado e dispara notificação ao responsável.
// Agendar a cada 15 minutos.

async function handle(req: Request) {
  const url = new URL(req.url);
  const secret = process.env.CRON_SECRET;
  const provided = req.headers.get('x-cron-secret') ?? url.searchParams.get('secret');
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const now = new Date();

  // Chamados ativos que estouraram o SLA mas ainda não estão marcados
  const breached = await db.ticket.findMany({
    where: {
      deletedAt: null,
      slaBreached: false,
      resolutionDueAt: { lte: now },
      status: { in: ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_CLIENT', 'REOPENED'] },
    },
    select: {
      id: true,
      ticketNumber: true,
      title: true,
      assignedToId: true,
    },
    take: 200,
  });

  if (breached.length > 0) {
    await db.ticket.updateMany({
      where: { id: { in: breached.map((b) => b.id) } },
      data: { slaBreached: true },
    });

    for (const b of breached) {
      if (b.assignedToId) {
        await notify({
          userId: b.assignedToId,
          type: 'SLA_BREACHED',
          title: `SLA estourado: ${b.ticketNumber}`,
          body: b.title,
          linkUrl: `/admin/chamados/${b.id}`,
        });
      }
    }
    logger.warn({ count: breached.length }, '[cron:sla-check] SLA estourados');
  }

  return NextResponse.json({ ok: true, breached: breached.length });
}

export async function GET(req: Request) {
  return handle(req);
}
export async function POST(req: Request) {
  return handle(req);
}
