import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { toCsv, csvResponse } from '@/lib/csv';
import { TICKET_STATUS_LABEL, PRIORITY_LABEL } from '@/lib/utils';
import type { TicketStatus, TicketPriority } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  if (session.user.role !== 'ADMIN' && session.user.userType !== 'AGENT') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const from = sp.get('from');
  const to = sp.get('to');
  const status = sp.get('status') || '';
  const priority = sp.get('priority') || '';
  const clientId = sp.get('clientId') || '';

  const where: any = { deletedAt: null };
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from + 'T00:00:00');
    if (to) where.createdAt.lte = new Date(to + 'T23:59:59');
  }
  if (status) where.status = status as TicketStatus;
  if (priority) where.priority = priority as TicketPriority;
  if (clientId) where.clientId = clientId;

  const tickets = await db.ticket.findMany({
    where,
    include: {
      client: { select: { name: true } },
      assignedTo: { select: { name: true } },
      openedBy: { select: { name: true } },
      queue: { select: { name: true } },
    },
    orderBy: [{ createdAt: 'desc' }],
    take: 5000,
  });

  const headers = [
    'Número',
    'Título',
    'Cliente',
    'Fila',
    'Status',
    'Prioridade',
    'Responsável',
    'Aberto por',
    'Criado em',
    'SLA estourado',
  ];

  const rows = tickets.map((t) => [
    t.ticketNumber,
    t.title,
    t.client?.name ?? '',
    t.queue?.name ?? '',
    TICKET_STATUS_LABEL[t.status] ?? t.status,
    PRIORITY_LABEL[t.priority] ?? t.priority,
    t.assignedTo?.name ?? '',
    t.openedBy?.name ?? '',
    t.createdAt.toISOString(),
    t.slaBreached ? 'Sim' : 'Não',
  ]);

  const csv = toCsv(headers, rows);
  return csvResponse(csv, `chamados_${new Date().toISOString().slice(0, 10)}.csv`);
}
