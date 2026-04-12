import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import type { TicketStatus, TicketPriority } from '@prisma/client';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, string> = {
  NEW: 'Novo', OPEN: 'Aberto', IN_PROGRESS: 'Em andamento',
  WAITING_CLIENT: 'Aguard. cliente', RESOLVED: 'Resolvido',
  CLOSED: 'Fechado', REOPENED: 'Reaberto',
};
const PRIORITY_LABEL: Record<string, string> = {
  LOW: 'Baixa', MEDIUM: 'Média', HIGH: 'Alta', URGENT: 'Urgente',
};

function fmtDate(d: Date | string | null) {
  if (!d) return '—';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(d));
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== 'ADMIN' && role !== 'AGENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const sp = req.nextUrl.searchParams;
  const from = sp.get('from');
  const to = sp.get('to');
  const status = sp.get('status') || '';
  const priority = sp.get('priority') || '';
  const clientId = sp.get('clientId') || '';

  const where: any = { deletedAt: null };
  const filters: string[] = [];

  if (from || to) {
    where.createdAt = {};
    if (from) { where.createdAt.gte = new Date(from + 'T00:00:00'); filters.push(`A partir de ${fmtDate(from)}`); }
    if (to) { where.createdAt.lte = new Date(to + 'T23:59:59'); filters.push(`Até ${fmtDate(to)}`); }
  }
  if (status) { where.status = status as TicketStatus; filters.push(`Status: ${STATUS_LABEL[status] ?? status}`); }
  if (priority) { where.priority = priority as TicketPriority; filters.push(`Prioridade: ${PRIORITY_LABEL[priority] ?? priority}`); }
  if (clientId) {
    where.clientId = clientId;
    const c = await db.client.findUnique({ where: { id: clientId }, select: { name: true } });
    if (c) filters.push(`Cliente: ${c.name}`);
  }

  const tickets = await db.ticket.findMany({
    where,
    include: {
      client: { select: { name: true } },
      assignedTo: { select: { name: true } },
    },
    orderBy: [{ createdAt: 'desc' }],
    take: 2000,
  });

  const kpis = [
    { label: 'Total', value: tickets.length },
    { label: 'Abertos', value: tickets.filter(t => ['NEW', 'OPEN', 'IN_PROGRESS'].includes(t.status)).length },
    { label: 'Aguard. Cliente', value: tickets.filter(t => t.status === 'WAITING_CLIENT').length },
    { label: 'Resolvidos', value: tickets.filter(t => t.status === 'RESOLVED').length },
    { label: 'Fechados', value: tickets.filter(t => t.status === 'CLOSED').length },
    { label: 'Reabertos', value: tickets.filter(t => t.status === 'REOPENED').length },
    { label: 'Urgentes', value: tickets.filter(t => t.priority === 'URGENT').length },
    { label: 'Alta Prior.', value: tickets.filter(t => t.priority === 'HIGH').length },
  ];

  const rows = tickets.map(t => [
    t.ticketNumber,
    fmtDate(t.createdAt),
    t.client?.name ?? '—',
    t.title.length > 40 ? t.title.slice(0, 40) + '…' : t.title,
    t.assignedTo?.name ?? 'N/A',
    PRIORITY_LABEL[t.priority] ?? t.priority,
    STATUS_LABEL[t.status] ?? t.status,
  ]);

  return NextResponse.json({
    reportType: 'chamados',
    title: 'Relatório de Chamados',
    generatedAt: new Date().toISOString(),
    filters,
    kpis,
    columns: ['Número', 'Aberto em', 'Cliente', 'Assunto', 'Responsável', 'Prioridade', 'Status'],
    rows,
  });
}
