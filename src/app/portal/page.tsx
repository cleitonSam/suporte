import Link from 'next/link';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  TICKET_STATUS_COLOR,
  TICKET_STATUS_LABEL,
  PRIORITY_COLOR,
  PRIORITY_LABEL,
  formatRelative,
} from '@/lib/utils';
import type { TicketStatus } from '@prisma/client';

interface PageProps {
  searchParams: { status?: string };
}

export default async function PortalHome({ searchParams }: PageProps) {
  const session = await auth();
  const user = session?.user as any;

  const activeFilter = searchParams.status ?? 'open';

  const statusMap: Record<string, TicketStatus[]> = {
    open: ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_CLIENT', 'REOPENED'],
    resolved: ['RESOLVED', 'CLOSED'],
    all: [],
  };

  const statusFilter = statusMap[activeFilter] ?? statusMap.open;

  const tickets = await db.ticket.findMany({
    where: {
      clientId: user.clientId,
      deletedAt: null,
      ...(statusFilter.length > 0 && { status: { in: statusFilter } }),
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true,
      ticketNumber: true,
      title: true,
      status: true,
      priority: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const tabs = [
    { key: 'open', label: 'Em aberto' },
    { key: 'resolved', label: 'Resolvidos / Fechados' },
    { key: 'all', label: 'Todos' },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Meus chamados</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Olá, {user?.name}. Acompanhe aqui todos os seus pedidos de atendimento.
          </p>
        </div>
        <Link
          href="/portal/novo"
          className="rounded-md bg-fluxo-500 px-4 py-2 text-sm font-medium text-white hover:bg-fluxo-600"
        >
          + Novo chamado
        </Link>
      </div>

      {/* Filtro de status */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/portal?status=${t.key}`}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeFilter === t.key
                ? 'border-b-2 border-fluxo-500 text-fluxo-600'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tickets.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-600 dark:bg-slate-800">
          <p className="text-slate-600 dark:text-slate-400">
            {activeFilter === 'open'
              ? 'Nenhum chamado em aberto.'
              : activeFilter === 'resolved'
              ? 'Nenhum chamado resolvido ainda.'
              : 'Você ainda não abriu nenhum chamado.'}
          </p>
          {activeFilter !== 'resolved' && (
            <Link
              href="/portal/novo"
              className="mt-4 inline-block rounded-md bg-fluxo-500 px-4 py-2 text-sm font-medium text-white hover:bg-fluxo-600"
            >
              Abrir novo chamado
            </Link>
          )}
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <table className="min-w-[700px] divide-y divide-slate-200 text-sm dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-800/80">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Número</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Título</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Status</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Prioridade</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Última atualização</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {tickets.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">
                    {t.ticketNumber}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/portal/chamado/${t.id}`}
                      className="font-medium text-slate-900 hover:text-fluxo-500 dark:text-slate-100"
                    >
                      {t.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        TICKET_STATUS_COLOR[t.status]
                      }`}
                    >
                      {TICKET_STATUS_LABEL[t.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        PRIORITY_COLOR[t.priority]
                      }`}
                    >
                      {PRIORITY_LABEL[t.priority]}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500 dark:text-slate-400">
                    {formatRelative(t.updatedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
