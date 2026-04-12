import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import type { ClientStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Ativo', SUSPENDED: 'Suspenso', INACTIVE: 'Inativo',
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

  const where: any = { deletedAt: null };
  const filters: string[] = [];
  const periodFilter: any = {};

  if (from) { periodFilter.gte = new Date(from + 'T00:00:00'); filters.push(`Chamados a partir de ${fmtDate(from)}`); }
  if (to) { periodFilter.lte = new Date(to + 'T23:59:59'); filters.push(`Chamados até ${fmtDate(to)}`); }
  if (status) { where.status = status as ClientStatus; filters.push(`Status: ${STATUS_LABEL[status] ?? status}`); }

  const clients = await db.client.findMany({
    where,
    include: {
      _count: {
        select: {
          users: { where: { deletedAt: null, userType: 'CLIENT_CONTACT' } },
          tickets: { where: { deletedAt: null } },
        },
      },
    },
    orderBy: { name: 'asc' },
    take: 1000,
  });

  const clientsWithMetrics = await Promise.all(
    clients.map(async (c) => {
      const ticketWhere: any = { clientId: c.id, deletedAt: null };
      if (Object.keys(periodFilter).length > 0) ticketWhere.createdAt = periodFilter;
      const [noPeriodo, abertos] = await Promise.all([
        db.ticket.count({ where: ticketWhere }),
        db.ticket.count({
          where: { clientId: c.id, deletedAt: null, status: { in: ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_CLIENT', 'REOPENED'] } },
        }),
      ]);
      return { ...c, noPeriodo, abertos };
    })
  );

  const kpis = [
    { label: 'Clientes', value: clientsWithMetrics.length },
    { label: 'Ativos', value: clientsWithMetrics.filter(c => c.status === 'ACTIVE').length },
    { label: 'Suspensos', value: clientsWithMetrics.filter(c => c.status === 'SUSPENDED').length },
    { label: 'Inativos', value: clientsWithMetrics.filter(c => c.status === 'INACTIVE').length },
    { label: 'Contatos', value: clientsWithMetrics.reduce((a, c) => a + c._count.users, 0) },
    { label: 'Total Chamados', value: clientsWithMetrics.reduce((a, c) => a + c._count.tickets, 0) },
    { label: 'Abertos Agora', value: clientsWithMetrics.reduce((a, c) => a + c.abertos, 0) },
    { label: 'No Período', value: clientsWithMetrics.reduce((a, c) => a + c.noPeriodo, 0) },
  ];

  const rows = clientsWithMetrics.map(c => [
    c.name,
    c.cnpj ?? '—',
    STATUS_LABEL[c.status] ?? c.status,
    String(c._count.users),
    String(c._count.tickets),
    String(c.abertos),
    String(c.noPeriodo),
  ]);

  return NextResponse.json({
    reportType: 'clientes',
    title: 'Carteira de Clientes',
    generatedAt: new Date().toISOString(),
    filters,
    kpis,
    columns: ['Cliente', 'CNPJ', 'Status', 'Contatos', 'Total', 'Abertos', 'Período'],
    rows,
  });
}
