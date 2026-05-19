import Link from 'next/link';
import {
  AlertOctagon,
  ArrowRight,
  Ticket as TicketIcon,
  Search,
  UserCircle,
  Filter,
} from 'lucide-react';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { listTickets } from '@/server/services/ticket-service';
import { SlaBadge } from '@/components/sla-badge';
import {
  TICKET_STATUS_COLOR,
  TICKET_STATUS_LABEL,
  PRIORITY_COLOR,
  PRIORITY_LABEL,
  formatRelative,
} from '@/lib/utils';
import type { TicketPriority, TicketStatus } from '@prisma/client';

const PRIORITY_ACCENT: Record<TicketPriority, string> = {
  LOW: 'bg-slate-300 dark:bg-slate-600',
  MEDIUM: 'bg-fluxo-400',
  HIGH: 'bg-orange-400',
  URGENT: 'bg-rose-500',
};

interface PageProps {
  searchParams: {
    q?: string;
    status?: string;
    clientId?: string;
    queueId?: string;
    sla?: string;
    page?: string;
    quick?: string;
  };
}

function buildQs(curr: Record<string, string | undefined>, override: Record<string, string | null>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...curr, ...override })) {
    if (v) params.set(k, v);
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export default async function ChamadosListPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) return null;

  const page = Math.max(1, Number(searchParams.page ?? '1') || 1);
  const sla =
    searchParams.sla === 'breached' || searchParams.sla === 'warning'
      ? (searchParams.sla as 'breached' | 'warning')
      : undefined;

  const quickFilter = searchParams.quick;
  let assignedToId: string | undefined;
  let statusBucket: TicketStatus[] | undefined;
  let onlyOpen = false;

  if (quickFilter === 'mine') {
    assignedToId = session.user.id;
    onlyOpen = true;
  } else if (quickFilter === 'unassigned') {
    onlyOpen = true;
  }

  const status =
    statusBucket ??
    (searchParams.status ? [searchParams.status as TicketStatus] : undefined);

  const [clients, queues, result, statusCounts, breachedCount, warningCount, unassignedCount, mineCount] =
    await Promise.all([
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
        status,
        sla,
        page,
        assignedToId,
        onlyOpen,
        unassignedOnly: quickFilter === 'unassigned',
      }),
      db.ticket.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        _count: { id: true },
      }),
      db.ticket.count({
        where: {
          deletedAt: null,
          slaBreached: true,
          status: { in: ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_CLIENT', 'REOPENED'] },
        },
      }),
      db.ticket.count({
        where: {
          deletedAt: null,
          status: { in: ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_CLIENT', 'REOPENED'] },
          resolutionDueAt: {
            gt: new Date(),
            lte: new Date(Date.now() + 60 * 60 * 1000),
          },
          slaBreached: false,
        },
      }),
      db.ticket.count({
        where: {
          deletedAt: null,
          assignedToId: null,
          status: { in: ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_CLIENT', 'REOPENED'] },
        },
      }),
      db.ticket.count({
        where: {
          deletedAt: null,
          assignedToId: session.user.id,
          status: { in: ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_CLIENT', 'REOPENED'] },
        },
      }),
    ]);

  const statusMap: Record<string, number> = {
    NEW: 0,
    OPEN: 0,
    IN_PROGRESS: 0,
    WAITING_CLIENT: 0,
    RESOLVED: 0,
    CLOSED: 0,
    REOPENED: 0,
  };
  for (const s of statusCounts) statusMap[s.status] = s._count.id;
  const openTotal =
    statusMap.NEW + statusMap.OPEN + statusMap.IN_PROGRESS + statusMap.WAITING_CLIENT + statusMap.REOPENED;

  const statusChips: Array<{ key: TicketStatus | ''; label: string; count: number; tone: string }> = [
    { key: '',              label: 'Todos',          count: result.total, tone: '' },
    { key: 'NEW',           label: 'Novos',          count: statusMap.NEW, tone: 'bg-fluxo-100 text-fluxo-700 border-fluxo-200' },
    { key: 'OPEN',          label: 'Abertos',        count: statusMap.OPEN, tone: 'bg-sky-100 text-sky-800 border-sky-200' },
    { key: 'IN_PROGRESS',   label: 'Em andamento',   count: statusMap.IN_PROGRESS, tone: 'bg-amber-100 text-amber-800 border-amber-200' },
    { key: 'WAITING_CLIENT',label: 'Ag. cliente',    count: statusMap.WAITING_CLIENT, tone: 'bg-purple-100 text-purple-800 border-purple-200' },
    { key: 'RESOLVED',      label: 'Resolvidos',     count: statusMap.RESOLVED, tone: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    { key: 'CLOSED',        label: 'Fechados',       count: statusMap.CLOSED, tone: 'bg-zinc-100 text-zinc-700 border-zinc-200' },
  ];

  const quickFilters: Array<{ key: string; label: string; count: number; icon: React.ReactNode; tone: string }> = [
    {
      key: 'mine',
      label: 'Atribuídos a mim',
      count: mineCount,
      icon: <UserCircle className="h-3.5 w-3.5" aria-hidden="true" />,
      tone: 'bg-fluxo-500 text-white border-fluxo-500 shadow-fluxo',
    },
    {
      key: 'unassigned',
      label: 'Sem atendente',
      count: unassignedCount,
      icon: <Filter className="h-3.5 w-3.5" aria-hidden="true" />,
      tone: 'bg-slate-700 text-white border-slate-700',
    },
  ];

  const hasFilters = Boolean(
    searchParams.q ||
      searchParams.status ||
      searchParams.clientId ||
      searchParams.queueId ||
      searchParams.sla ||
      searchParams.quick,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fluxo-600 dark:text-cyan-400">
            Fila de atendimento
          </p>
          <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white">Chamados</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {result.total} resultado{result.total === 1 ? '' : 's'} ·{' '}
            <strong className="text-slate-900 dark:text-white">{openTotal}</strong> ativo
            {openTotal === 1 ? '' : 's'} no total
          </p>
        </div>
        <Link
          href="/admin/chamados/novo"
          className="inline-flex items-center gap-1.5 rounded-md bg-fluxo-500 px-4 py-2 text-sm font-semibold text-white shadow-fluxo transition hover:bg-fluxo-600"
        >
          <TicketIcon className="h-4 w-4" aria-hidden="true" />
          Abrir chamado
        </Link>
      </div>

      {/* Alerta SLA */}
      {(breachedCount > 0 || warningCount > 0) && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-rose-200 bg-rose-50/60 p-4 dark:border-rose-900/60 dark:bg-rose-950/30">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-500/20 text-rose-700 ring-1 ring-inset ring-rose-500/30">
            <AlertOctagon className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="flex-1 text-sm text-rose-800 dark:text-rose-200">
            {breachedCount > 0 && (
              <>
                <strong>{breachedCount}</strong> chamado{breachedCount === 1 ? '' : 's'} com SLA{' '}
                <strong>estourado</strong>
              </>
            )}
            {breachedCount > 0 && warningCount > 0 && ' · '}
            {warningCount > 0 && (
              <>
                <strong>{warningCount}</strong> vence{warningCount === 1 ? '' : 'm'} em menos de 1h
              </>
            )}
          </div>
          {breachedCount > 0 && (
            <Link
              href="/admin/chamados?sla=breached"
              className="inline-flex shrink-0 items-center gap-1 rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-rose-700"
            >
              Ver estourados
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          )}
        </div>
      )}

      {/* Quick filters */}
      <div className="flex flex-wrap items-center gap-2">
        {quickFilters.map((f) => {
          const active = searchParams.quick === f.key;
          return (
            <Link
              key={f.key}
              href={`/admin/chamados${buildQs(searchParams, { quick: active ? null : f.key, page: null })}`}
              className={
                active
                  ? `inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1 text-sm font-semibold ${f.tone}`
                  : 'inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1 text-sm font-medium text-slate-700 transition-colors hover:border-fluxo-300 hover:text-fluxo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }
            >
              {f.icon}
              {f.label}
              <span
                className={
                  active
                    ? 'inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-white/20 px-1.5 text-[10px] font-bold tabular-nums'
                    : 'inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-slate-100 px-1.5 text-[10px] font-bold tabular-nums text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                }
              >
                {f.count}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Status chips */}
      <div className="flex flex-wrap items-center gap-2">
        {statusChips.map((c) => {
          const active = (searchParams.status ?? '') === c.key;
          return (
            <Link
              key={c.key || 'all'}
              href={`/admin/chamados${buildQs(searchParams, { status: c.key || null, page: null })}`}
              className={
                active
                  ? 'inline-flex items-center gap-2 rounded-full bg-fluxo-500 px-3.5 py-1 text-sm font-semibold text-white shadow-fluxo'
                  : 'inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1 text-sm font-medium text-slate-700 transition-colors hover:border-fluxo-300 hover:text-fluxo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }
            >
              {c.label}
              <span
                className={
                  active
                    ? 'inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-white/20 px-1.5 text-[10px] font-bold tabular-nums'
                    : 'inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-slate-100 px-1.5 text-[10px] font-bold tabular-nums text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                }
              >
                {c.count}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Filtros avançados */}
      <form
        method="GET"
        className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4 dark:border-slate-700 dark:bg-slate-800"
      >
        {searchParams.status && <input type="hidden" name="status" value={searchParams.status} />}
        {searchParams.quick && <input type="hidden" name="quick" value={searchParams.quick} />}
        <div className="lg:col-span-2">
          <label htmlFor="tk-q" className="block text-xs font-medium text-slate-600 dark:text-slate-400">
            Buscar
          </label>
          <div className="relative mt-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            />
            <input
              id="tk-q"
              type="text"
              name="q"
              defaultValue={searchParams.q}
              placeholder="Título, descrição ou número (CH-...)"
              className="block w-full rounded-md border border-slate-300 px-3 py-2 pl-8 text-sm shadow-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
            />
          </div>
        </div>
        <div>
          <label htmlFor="tk-client" className="block text-xs font-medium text-slate-600 dark:text-slate-400">
            Cliente
          </label>
          <select
            id="tk-client"
            name="clientId"
            defaultValue={searchParams.clientId ?? ''}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
          >
            <option value="">Todos</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="tk-queue" className="block text-xs font-medium text-slate-600 dark:text-slate-400">
            Fila
          </label>
          <select
            id="tk-queue"
            name="queueId"
            defaultValue={searchParams.queueId ?? ''}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
          >
            <option value="">Todas</option>
            {queues.map((q) => (
              <option key={q.id} value={q.id}>{q.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="tk-sla" className="block text-xs font-medium text-slate-600 dark:text-slate-400">
            SLA
          </label>
          <select
            id="tk-sla"
            name="sla"
            defaultValue={searchParams.sla ?? ''}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
          >
            <option value="">Todos</option>
            <option value="warning">Vencendo (&lt;1h)</option>
            <option value="breached">Estourados</option>
          </select>
        </div>
        <div className="col-span-full flex flex-wrap items-center justify-end gap-2">
          {hasFilters && (
            <Link
              href="/admin/chamados"
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Limpar tudo
            </Link>
          )}
          <button
            type="submit"
            className="rounded-md bg-fluxo-500 px-4 py-1.5 text-sm font-semibold text-white shadow-fluxo hover:bg-fluxo-600"
          >
            Filtrar
          </button>
        </div>
      </form>

      {/* Lista */}
      {result.items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm dark:border-slate-600 dark:bg-slate-800">
          <TicketIcon className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
          <p className="mt-3 text-sm text-slate-500">
            Nenhum chamado encontrado com esses filtros.
          </p>
          {hasFilters && (
            <Link
              href="/admin/chamados"
              className="mt-3 inline-block text-sm font-medium text-fluxo-600 hover:underline"
            >
              Limpar filtros
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Card grid no mobile */}
          <ul role="list" className="grid grid-cols-1 gap-3 md:hidden">
            {result.items.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/admin/chamados/${t.id}`}
                  className="relative block overflow-hidden rounded-xl border border-slate-200 bg-white p-4 pl-5 shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
                >
                  <span
                    aria-hidden="true"
                    className={`absolute inset-y-0 left-0 w-1 ${PRIORITY_ACCENT[t.priority]}`}
                  />
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono text-[10px] text-slate-500">{t.ticketNumber}</p>
                      <p className="mt-0.5 line-clamp-2 font-medium text-slate-900 dark:text-slate-100">
                        {t.title}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {t.client.name}
                      </p>
                    </div>
                    <SlaBadge ticket={t} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px]">
                    <span className={`rounded-full px-2 py-0.5 font-semibold ${TICKET_STATUS_COLOR[t.status]}`}>
                      {TICKET_STATUS_LABEL[t.status]}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 font-medium ${PRIORITY_COLOR[t.priority]}`}>
                      {PRIORITY_LABEL[t.priority]}
                    </span>
                    <span className="ml-auto text-slate-500">{formatRelative(t.createdAt)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {/* Tabela no desktop */}
          <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800 md:block">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
                <thead className="bg-slate-50/60 dark:bg-slate-800/60">
                  <tr>
                    <th scope="col" className="w-1 p-0" aria-hidden="true" />
                    <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Chamado</th>
                    <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Cliente</th>
                    <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Fila</th>
                    <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Status</th>
                    <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Prioridade</th>
                    <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">SLA</th>
                    <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Atendente</th>
                    <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Aberto</th>
                    <th scope="col" className="px-4 py-3" aria-hidden="true" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {result.items.map((t) => (
                    <tr
                      key={t.id}
                      className="group transition-colors hover:bg-fluxo-50/40 dark:hover:bg-slate-700/40"
                    >
                      <td className="p-0">
                        <span
                          aria-hidden="true"
                          className={`block h-full w-1 ${PRIORITY_ACCENT[t.priority]}`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                            {t.ticketNumber}
                          </span>
                          <Link
                            href={`/admin/chamados/${t.id}`}
                            className="line-clamp-1 font-medium text-slate-900 transition-colors hover:text-fluxo-600 dark:text-slate-100 dark:hover:text-cyan-400"
                          >
                            {t.title}
                          </Link>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{t.client.name}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{t.queue?.name ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${TICKET_STATUS_COLOR[t.status]}`}>
                          {TICKET_STATUS_LABEL[t.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${PRIORITY_COLOR[t.priority]}`}>
                          {PRIORITY_LABEL[t.priority]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <SlaBadge ticket={t} />
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                        {t.assignedTo?.name ?? <span className="text-slate-400">—</span>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                        {formatRelative(t.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/chamados/${t.id}`}
                          aria-label={`Ver detalhes do chamado ${t.ticketNumber}`}
                          className="inline-flex items-center gap-0.5 text-xs font-medium text-fluxo-600 opacity-0 transition-opacity group-hover:opacity-100 dark:text-cyan-400"
                        >
                          Detalhes
                          <ArrowRight className="h-3 w-3" aria-hidden="true" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Paginação */}
      {result.total > result.pageSize && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500 dark:text-slate-400">
            Mostrando {(page - 1) * result.pageSize + 1}–
            {Math.min(page * result.pageSize, result.total)} de {result.total}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/admin/chamados${buildQs(searchParams, { page: String(page - 1) })}`}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
              >
                ← Anterior
              </Link>
            )}
            {page * result.pageSize < result.total && (
              <Link
                href={`/admin/chamados${buildQs(searchParams, { page: String(page + 1) })}`}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
              >
                Próxima →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
