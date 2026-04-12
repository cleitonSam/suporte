import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

// Fecha automaticamente chamados RESOLVED por mais de N dias (default: 3).
// Protegido por token simples via header x-cron-secret OU query ?secret=...
// Agendar via Vercel Cron ou similar.

const DEFAULT_DAYS = Number(process.env.AUTO_CLOSE_DAYS ?? 3);

async function handle(req: Request) {
  const url = new URL(req.url);
  const secret = process.env.CRON_SECRET;
  const provided =
    req.headers.get('x-cron-secret') ?? url.searchParams.get('secret') ?? null;

  if (!secret || provided !== secret) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const days = Number(url.searchParams.get('days') ?? DEFAULT_DAYS);
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const victims = await db.ticket.findMany({
    where: {
      status: 'RESOLVED',
      resolvedAt: { lte: cutoff },
      deletedAt: null,
    },
    select: { id: true, ticketNumber: true },
    take: 500,
  });

  if (victims.length === 0) {
    return NextResponse.json({ ok: true, closed: 0, cutoff: cutoff.toISOString() });
  }

  const ids = victims.map((v) => v.id);

  const [updated] = await db.$transaction([
    db.ticket.updateMany({
      where: { id: { in: ids } },
      data: { status: 'CLOSED', closedAt: new Date() },
    }),
    db.ticketEvent.createMany({
      data: victims.map((v) => ({
        ticketId: v.id,
        authorId: null,
        type: 'STATUS_CHANGED',
        oldValue: 'RESOLVED',
        newValue: 'CLOSED',
      })),
    }),
  ]);

  logger.info({ closed: updated.count, days, cutoff }, '[cron:auto-close] fechados');

  return NextResponse.json({
    ok: true,
    closed: updated.count,
    cutoff: cutoff.toISOString(),
    days,
  });
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}
