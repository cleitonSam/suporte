import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

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

  const dateFilter: any = {};
  const filters: string[] = [];
  if (from) { dateFilter.gte = new Date(from + 'T00:00:00'); filters.push(`A partir de ${fmtDate(from)}`); }
  if (to) { dateFilter.lte = new Date(to + 'T23:59:59'); filters.push(`Até ${fmtDate(to)}`); }

  const agents = await db.user.findMany({
    where: { userType: 'AGENT', deletedAt: null },
    select: { id: true, name: true, email: true, isActive: true },
    orderBy: { name: 'asc' },
  });

  const perAgent = await Promise.all(
    agents.map(async (a) => {
      const ticketWhere: any = { assignedToId: a.id, deletedAt: null };
      if (Object.keys(dateFilter).length > 0) ticketWhere.createdAt = dateFilter;

      const tickets = await db.ticket.findMany({
        where: ticketWhere,
        select: { status: true, createdAt: true, resolvedAt: true, firstResponseAt: true },
      });

      const atribuidos = tickets.length;
      const resolvidos = tickets.filter(t => t.status === 'RESOLVED').length;
      const fechados = tickets.filter(t => t.status === 'CLOSED').length;
      const emAndamento = tickets.filter(t => ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_CLIENT', 'REOPENED'].includes(t.status)).length;

      const resolvedT = tickets.filter(t => t.resolvedAt);
      const avgResH = resolvedT.length > 0
        ? resolvedT.reduce((acc, t) => acc + (t.resolvedAt!.getTime() - t.createdAt.getTime()), 0) / resolvedT.length / 3600000
        : 0;

      const firstR = tickets.filter(t => t.firstResponseAt);
      const avgFirstH = firstR.length > 0
        ? firstR.reduce((acc, t) => acc + (t.firstResponseAt!.getTime() - t.createdAt.getTime()), 0) / firstR.length / 3600000
        : 0;

      return { name: a.name, isActive: a.isActive, atribuidos, resolvidos, fechados, emAndamento, avgResH, avgFirstH };
    })
  );

  const totalWhere: any = { deletedAt: null };
  if (Object.keys(dateFilter).length > 0) totalWhere.createdAt = dateFilter;

  const [totalNoPeriodo, totalResolvidos, totalFechados, totalSemAtrib] = await Promise.all([
    db.ticket.count({ where: totalWhere }),
    db.ticket.count({ where: { ...totalWhere, status: 'RESOLVED' } }),
    db.ticket.count({ where: { ...totalWhere, status: 'CLOSED' } }),
    db.ticket.count({ where: { ...totalWhere, assignedToId: null } }),
  ]);

  const kpis = [
    { label: 'Total no Período', value: totalNoPeriodo },
    { label: 'Resolvidos', value: totalResolvidos },
    { label: 'Fechados', value: totalFechados },
    { label: 'Sem Atribuição', value: totalSemAtrib },
  ];

  const rows = perAgent.map(a => [
    a.name,
    a.isActive ? 'Sim' : 'Não',
    String(a.atribuidos),
    String(a.emAndamento),
    String(a.resolvidos),
    String(a.fechados),
    a.avgFirstH > 0 ? a.avgFirstH.toFixed(1) : '—',
    a.avgResH > 0 ? a.avgResH.toFixed(1) : '—',
  ]);

  return NextResponse.json({
    reportType: 'desempenho',
    title: 'Desempenho da Equipe',
    generatedAt: new Date().toISOString(),
    filters,
    kpis,
    columns: ['Agente', 'Ativo', 'Atribuídos', 'Em Andam.', 'Resolvidos', 'Fechados', '1ª Resp (h)', 'Resol. Médio (h)'],
    rows,
  });
}
