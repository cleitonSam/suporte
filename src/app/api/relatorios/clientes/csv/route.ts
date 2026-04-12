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

  const clients = await db.client.findMany({
    where: { deletedAt: null },
    include: {
      _count: { select: { tickets: true, users: true } },
    },
    orderBy: { name: 'asc' },
  });

  const headers = [
    'Nome',
    'Documento',
    'Telefone',
    'Status',
    'Total de chamados',
    'Total de contatos',
    'Criado em',
  ];

  const rows = clients.map((c) => [
    c.name,
    c.cnpj ?? '',
    c.phone ?? '',
    c.status,
    String(c._count.tickets),
    String(c._count.users),
    c.createdAt.toISOString(),
  ]);

  const csv = toCsv(headers, rows);
  return csvResponse(csv, `clientes_${new Date().toISOString().slice(0, 10)}.csv`);
}
