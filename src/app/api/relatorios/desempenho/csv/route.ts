import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { toCsv, csvResponse } from '@/lib/csv';

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

  const dateFilter: any = {};
  if (from || to) {
    dateFilter.createdAt = {};
    if (from) dateFilter.createdAt.gte = new Date(from + 'T00:00:00');
    if (to) dateFilter.createdAt.lte = new Date(to + 'T23:59:59');
  }

  // Buscar agentes com contagens
  const agents = await db.user.findMany({
    where: { userType: 'AGENT', isActive: true, deletedAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      assignedTickets: {
        where: { deletedAt: null, ...dateFilter },
        select: {
          id: true,
          status: true,
          slaBreached: true,
          firstResponseAt: true,
          firstResponseDueAt: true,
          resolvedAt: true,
          createdAt: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  const headers = [
    'Agente',
    'Email',
    'Atribuídos',
    'Resolvidos',
    'SLA estourado',
    'Tempo médio 1ª resposta (min)',
    'Tempo médio resolução (min)',
  ];

  const rows = agents.map((a) => {
    const total = a.assignedTickets.length;
    const resolved = a.assignedTickets.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED').length;
    const breached = a.assignedTickets.filter((t) => t.slaBreached).length;

    // Tempo médio de primeira resposta
    const firstResponseTimes = a.assignedTickets
      .filter((t) => t.firstResponseAt && t.createdAt)
      .map((t) => (t.firstResponseAt!.getTime() - t.createdAt.getTime()) / 60000);
    const avgFirstResponse =
      firstResponseTimes.length > 0
        ? Math.round(firstResponseTimes.reduce((s, v) => s + v, 0) / firstResponseTimes.length)
        : 0;

    // Tempo médio de resolução
    const resolutionTimes = a.assignedTickets
      .filter((t) => t.resolvedAt && t.createdAt)
      .map((t) => (t.resolvedAt!.getTime() - t.createdAt.getTime()) / 60000);
    const avgResolution =
      resolutionTimes.length > 0
        ? Math.round(resolutionTimes.reduce((s, v) => s + v, 0) / resolutionTimes.length)
        : 0;

    return [
      a.name,
      a.email,
      String(total),
      String(resolved),
      String(breached),
      String(avgFirstResponse),
      String(avgResolution),
    ];
  });

  const csv = toCsv(headers, rows);
  return csvResponse(csv, `desempenho_${new Date().toISOString().slice(0, 10)}.csv`);
}
