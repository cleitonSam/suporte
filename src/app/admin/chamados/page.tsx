import Link from 'next/link';
import { db } from '@/lib/db';
import { listTickets } from '@/server/services/ticket-service';
import { SlaBadge } from '@/components/sla-badge';
import {
  TICKET_STATUS_COLOR,
  TICKET_STATUS_LABEL,
  PRIORITY_COLOR,
  PRIORITY_LABEL,
  formatRelative,
} from '@/lib/utils';
import type { TicketStatus } from '@prisma/client';

interface PageProps {
  searchParams: {
    q?: string;
    status?: string;
    clientId?: string;
    queueId?: string;
    sla?: string;
    page?: string;
  };
}

export default async function ChamadosListPage({ searchParams }: PageProps) {
  const page = Number(searchParams.page ?? '1');
  const sla =
    searchParams.sla === 'breached' || searchParams.sla === 'warning'
      ? (searchParams.sla as 'breached' | 'warning')
      : undefined;

  const [clients, queues, result] = await Promise.all([
    db.client.findMany({
      where: { deletedAt: null, status: 'ACTIVE' },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    db.queue.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
    listTickets({
      search: searchParams.q,
      clientId: searchParams.clientId,
      queueId: searchParams.queueId,
      status: searchParams.status ? [searchParams.status as TicketStatus] : undefined,
      sla,
      page,
    }),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Chamados</h1>
          <p className="mt-1 text-sm text-slate-500">{result.total} resultado(s)</p>
        </div>
        <Link
          href="/admin/chamados/novo"
          className="rounded-md bg-fluxo-500 px-4 py-2 text-sm font-medium text-white hover:bg-fluxo-600"
        >
          + Abrir chamado
        </Link>
      </div>

      <form method="GET" className="mt-4 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-slate-600">Buscar</label>
          <input
            type="text"
            name="q"
            defaultValue={searchParams.q}
            placeholder="Título, descrição ou número"
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Status</label>
          <select
            name="status"
            defaultValue={searchParams.status ?? ''}
            className="mt-1 block rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
          >
            <option value="">Todos</option>
            <option value="NEW">Novos</option>
            <option value="OPEN">Abertos</option>
            <option value="IN_PROGRESS">Em andamento</option>
            <option value="WAITING_CLIENT">Aguardando cliente</option>
            <option value="RESOLVED">Resolvidos</option>
            <option value="CLOSED">Fechados</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Cliente</label>
          <select
            name="clientId"
            defaultValue={searchParams.clientId ?? ''}
            className="mt-1 block rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
          >
            <option value="">Todos</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Fila</label>
          <select
            name="queueId"
            defaultValue={searchParams.queueId ?? ''}
            className="mt-1 block rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
          >
            <option value="">Todas</option>
            {queues.map((q) => (
              <option key={q.id} value={q.id}>
                {q.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">SLA</label>
          <select
            name="sla"
            defaultValue={searchParams.sla ?? ''}
            className="mt-1 block rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
          >
            <option value="">Todos</option>
            <option value="warning">Vencendo (&lt;1h)</option>
            <option value="breached">Estourados</option>
          </select>
        </div>
        <button
          type="submit"
          className="rounded-md bg-fluxo-500 px-4 py-2 text-sm font-medium text-white hover:bg-fluxo-600"
        >
          Filtrar
        </button>
      </form>

      <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-[700px] divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-slate-600">Número</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600">Título</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600">Cliente</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600">Fila</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600">Status</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600">Prioridade</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600">SLA</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600">Atendente</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600">Aberto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {result.items.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                  Nenhum chamado encontrado.
                </td>
              </tr>
            )}
            {result.items.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50">
                <td className="whitespace-nowrap px-4 py-2 font-mono text-xs text-slate-500">
                  {t.ticketNumber}
                </td>
                <td className="px-4 py-2">
                  <Link
                    href={`/admin/chamados/${t.id}`}
                    className="font-medium text-slate-900 hover:text-fluxo-500"
                  >
                    {t.title}
                  </Link>
                </td>
                <td className="px-4 py-2 text-slate-700">{t.client.name}</td>
                <td className="px-4 py-2 text-slate-700">{t.queue?.name ?? '—'}</td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      TICKET_STATUS_COLOR[t.status]
                    }`}
                  >
                    {TICKET_STATUS_LABEL[t.status]}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      PRIORITY_COLOR[t.priority]
                    }`}
                  >
                    {PRIORITY_LABEL[t.priority]}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <SlaBadge ticket={t} />
                </td>
                <td className="px-4 py-2 text-slate-700">
                  {t.assignedTo?.name ?? <span className="text-slate-400">—</span>}
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-slate-500">
                  {formatRelative(t.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {result.total > result.pageSize && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-slate-500">
            Mostrando {(page - 1) * result.pageSize + 1}–
            {Math.min(page * result.pageSize, result.total)} de {result.total}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/admin/chamados?${new URLSearchParams({
                  ...(searchParams.q ? { q: searchParams.q } : {}),
                  ...(searchParams.status ? { status: searchParams.status } : {}),
                  ...(searchParams.clientId ? { clientId: searchParams.clientId } : {}),
                  ...(searchParams.queueId ? { queueId: searchParams.queueId } : {}),
                  ...(searchParams.sla ? { sla: searchParams.sla } : {}),
                  page: String(page - 1),
                })}`}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
              >
                ← Anterior
              </Link>
            )}
            {page * result.pageSize < result.total && (
              <Link
                href={`/admin/chamados?${new URLSearchParams({
                  ...(searchParams.q ? { q: searchParams.q } : {}),
                  ...(searchParams.status ? { status: searchParams.status } : {}),
                  ...(searchParams.clientId ? { clientId: searchParams.clientId } : {}),
                  ...(searchParams.queueId ? { queueId: searchParams.queueId } : {}),
                  ...(searchParams.sla ? { sla: searchParams.sla } : {}),
                  page: String(page + 1),
                })}`}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
              >
                Próximo →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
