import Link from 'next/link';
import {
  AlertOctagon,
  ArrowRight,
  Ticket as TicketIcon,
  Search,
  UserCircle,
  Inbox,
  MessageSquare,
} from 'lucide-react';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { listTickets } from '@/server/services/ticket-service';
import { bulkUpdateTicketsAction } from '@/server/actions/ticket-admin';
import { SlaBadge } from '@/components/sla-badge';
import { TicketStatusDot, PriorityDot } from '@/components/ui/status-dot';
import { BulkActionsBar, SelectAllCheckbox } from '@/components/bulk-actions-bar';
import { SavedFiltersMenu } from '@/components/saved-filters-menu';
import { formatRelative } from '@/lib/utils';
import type { TicketPriority, TicketStatus } from '@prisma/client';

const BULK_FORM_ID = 'tickets-bulk-form';

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
  let onlyOpen = false;

  if (quickFilter === 'mine') {
    assignedToId = session.user.id;
    onlyOpen = true;
  } else if (quickFilter === 'unassigned') {
    onlyOpen = true;
  }

  const status = searchParams.status ? [searchParams.status as TicketStatus] : undefined;

  const [clients, queues, agents, savedFilters, result, statusCounts, breachedCount, warningCount, unassignedCount, mineCount] =
    await Promise.all([
      db.client.findMany({
        where: { deletedAt: null, status: 'ACTIVE' },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      db.queue.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
      db.user.findMany({
        where: { userType: 'AGENT', isActive: true, deletedAt: null },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      db.savedFilter.findMany({
        where: {
          scope: 'ticket',
          OR: [{ userId: session.user.id }, { isShared: true }],
        },
        select: { id: true, name: true, queryString: true, isShared: true, userId: true },
        orderBy: [{ isShared: 'asc' }, { name: 'asc' }],
      }),
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

  const segments: Array<{ key: TicketStatus | ''; label: string; count: number }> = [
    { key: '',              label: 'Todos',       count: result.total },
    { key: 'NEW',           label: 'Novos',       count: statusMap.NEW },
    { key: 'OPEN',          label: 'Abertos',     count: statusMap.OPEN },
    { key: 'IN_PROGRESS',   label: 'Andamento',   count: statusMap.IN_PROGRESS },
    { key: 'WAITING_CLIENT',label: 'Aguardando',  count: statusMap.WAITING_CLIENT },
    { key: 'RESOLVED',      label: 'Resolvidos',  count: statusMap.RESOLVED },
    { key: 'CLOSED',        label: 'Fechados',    count: statusMap.CLOSED },
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
          <p className="micro-label-accent">Fila de atendimento</p>
          <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white">Chamados</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            <span className="font-mono-tech">{result.total}</span> resultado{result.total === 1 ? '' : 's'} ·{' '}
            <strong className="font-mono-tech text-slate-900 dark:text-white">{openTotal}</strong> ativo
            {openTotal === 1 ? '' : 's'} no total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SavedFiltersMenu
            scope="ticket"
            mine={savedFilters.filter((f) => f.userId === session.user!.id)}
            shared={savedFilters.filter((f) => f.isShared && f.userId !== session.user!.id)}
            currentUserId={session.user.id}
          />
          <Link
            href="/admin/chamados/novo/wa"
            className="inline-flex items-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-700/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
            title="Criar chamado a partir do WhatsApp"
          >
            <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
            Do WhatsApp
          </Link>
          <Link
            href="/admin/chamados/novo"
            className="inline-flex items-center gap-1.5 rounded-md bg-fluxo-500 px-4 py-2 text-sm font-semibold text-white shadow-fluxo transition hover:bg-fluxo-600"
          >
            <TicketIcon className="h-4 w-4" aria-hidden="true" />
            Abrir chamado
          </Link>
        </div>
      </div>

      {/* Alerta SLA */}
      {(breachedCount > 0 || warningCount > 0) && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-rose-200 bg-rose-50/60 p-4 dark:border-rose-900/60 dark:bg-rose-950/30">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-rose-500/20 text-rose-700 ring-1 ring-inset ring-rose-500/30">
            <AlertOctagon className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="flex-1 text-sm text-rose-800 dark:text-rose-200">
            {breachedCount > 0 && (
              <>
                <strong className="font-mono-tech">{breachedCount}</strong> chamado{breachedCount === 1 ? '' : 's'} com SLA{' '}
                <strong>estourado</strong>
              </>
            )}
            {breachedCount > 0 && warningCount > 0 && ' · '}
            {warningCount > 0 && (
              <>
                <strong className="font-mono-tech">{warningCount}</strong> vence{warningCount === 1 ? '' : 'm'} em menos de 1h
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

      {/* Toolbar: quick filters + segmented status + search inline */}
      <div className="space-y-3">
        {/* Quick filters compactos */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="micro-label hidden sm:inline-flex pr-1">Visão</span>
          <QuickFilter
            href={`/admin/chamados${buildQs(searchParams, {
              quick: searchParams.quick === 'mine' ? null : 'mine',
              page: null,
            })}`}
            active={searchParams.quick === 'mine'}
            count={mineCount}
            tone="fluxo"
            icon={<UserCircle className="h-3.5 w-3.5" aria-hidden="true" />}
          >
            Atribuídos a mim
          </QuickFilter>
          <QuickFilter
            href={`/admin/chamados${buildQs(searchParams, {
              quick: searchParams.quick === 'unassigned' ? null : 'unassigned',
              page: null,
            })}`}
            active={searchParams.quick === 'unassigned'}
            count={unassignedCount}
            tone="slate"
            icon={<Inbox className="h-3.5 w-3.5" aria-hidden="true" />}
          >
            Sem atendente
          </QuickFilter>
        </div>

        {/* Segmented control de status — single row, scroll horizontal */}
        <div className="-mx-1 overflow-x-auto px-1">
          <div className="inline-flex min-w-full items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-1 shadow-elevate dark:border-slate-700 dark:bg-slate-800 sm:min-w-0">
            {segments.map((s) => {
              const isActive = (searchParams.status ?? '') === s.key;
              return (
                <Link
                  key={s.key || 'all'}
                  href={`/admin/chamados${buildQs(searchParams, { status: s.key || null, page: null })}`}
                  className={
                    isActive
                      ? 'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md bg-fluxo-500 px-3 py-1.5 text-xs font-semibold text-white shadow-fluxo'
                      : 'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700/60 dark:hover:text-white'
                  }
                >
                  {s.label}
                  <span
                    className={
                      isActive
                        ? 'font-mono-tech text-[10px] font-bold text-white/80'
                        : 'font-mono-tech text-[10px] font-semibold text-slate-400 dark:text-slate-500'
                    }
                  >
                    {s.count}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filtros avançados */}
      <form
        method="GET"
        className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-elevate sm:grid-cols-2 lg:grid-cols-4 dark:border-slate-700 dark:bg-slate-800"
      >
        {searchParams.status && <input type="hidden" name="status" value={searchParams.status} />}
        {searchParams.quick && <input type="hidden" name="quick" value={searchParams.quick} />}
        <div className="lg:col-span-2">
          <label htmlFor="tk-q" className="micro-label">
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
              className="block w-full rounded-md border border-slate-300 px-3 py-2 pl-8 text-sm shadow-elevate focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
            />
          </div>
        </div>
        <div>
          <label htmlFor="tk-client" className="micro-label">
            Cliente
          </label>
          <select
            id="tk-client"
            name="clientId"
            defaultValue={searchParams.clientId ?? ''}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-elevate"
          >
            <option value="">Todos</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="tk-queue" className="micro-label">
            Fila
          </label>
          <select
            id="tk-queue"
            name="queueId"
            defaultValue={searchParams.queueId ?? ''}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-elevate"
          >
            <option value="">Todas</option>
            {queues.map((q) => (
              <option key={q.id} value={q.id}>{q.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="tk-sla" className="micro-label">
            SLA
          </label>
          <select
            id="tk-sla"
            name="sla"
            defaultValue={searchParams.sla ?? ''}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-elevate"
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
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
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
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center shadow-elevate dark:border-slate-600 dark:bg-slate-800">
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
                  className="relative block overflow-hidden rounded-lg border border-slate-200 bg-white p-4 pl-5 shadow-elevate transition hover:shadow-elevate-lg dark:border-slate-700 dark:bg-slate-800"
                >
                  <span
                    aria-hidden="true"
                    className={`absolute inset-y-0 left-0 w-1 ${PRIORITY_ACCENT[t.priority]}`}
                  />
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono-tech text-[10px] text-slate-500">{t.ticketNumber}</p>
                      <p className="mt-0.5 line-clamp-2 font-medium text-slate-900 dark:text-slate-100">
                        {t.title}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {t.client.name}
                      </p>
                    </div>
                    <SlaBadge ticket={t} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                    <TicketStatusDot status={t.status} />
                    <PriorityDot priority={t.priority} />
                    <span className="ml-auto font-mono-tech text-[10px] text-slate-500">
                      {formatRelative(t.createdAt)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {/* Tabela no desktop — wrapped em form pra bulk actions */}
          <form
            id={BULK_FORM_ID}
            action={bulkUpdateTicketsAction}
            className="hidden overflow-hidden rounded-lg border border-slate-200 bg-white shadow-elevate dark:border-slate-700 dark:bg-slate-800 md:block"
          >
            <input type="hidden" name="op" defaultValue="" />
            <input type="hidden" name="value" defaultValue="" />
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
                <thead className="bg-slate-50/60 dark:bg-slate-800/60">
                  <tr>
                    <th scope="col" className="w-1 p-0" aria-hidden="true" />
                    <th scope="col" className="px-3 py-3 text-left">
                      <SelectAllCheckbox formId={BULK_FORM_ID} />
                    </th>
                    <th scope="col" className="px-4 py-3 text-left micro-label">Chamado</th>
                    <th scope="col" className="px-4 py-3 text-left micro-label">Cliente</th>
                    <th scope="col" className="px-4 py-3 text-left micro-label">Fila</th>
                    <th scope="col" className="px-4 py-3 text-left micro-label">Status</th>
                    <th scope="col" className="px-4 py-3 text-left micro-label">Prioridade</th>
                    <th scope="col" className="px-4 py-3 text-left micro-label">SLA</th>
                    <th scope="col" className="px-4 py-3 text-left micro-label">Atendente</th>
                    <th scope="col" className="px-4 py-3 text-left micro-label">Aberto</th>
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
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          name="ticketIds"
                          value={t.id}
                          aria-label={`Selecionar ${t.ticketNumber}`}
                          className="h-4 w-4 cursor-pointer rounded border-slate-300 text-fluxo-500 focus:ring-fluxo-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-mono-tech text-[10px] text-slate-500 dark:text-slate-400">
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
                        <TicketStatusDot status={t.status} />
                      </td>
                      <td className="px-4 py-3">
                        <PriorityDot priority={t.priority} />
                      </td>
                      <td className="px-4 py-3">
                        <SlaBadge ticket={t} />
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                        {t.assignedTo?.name ?? <span className="text-slate-400">—</span>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono-tech text-[11px] text-slate-500">
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
          </form>

          {/* Bulk actions bar (cliente) */}
          <BulkActionsBar formId={BULK_FORM_ID} agents={agents} queues={queues} />
        </>
      )}

      {/* Paginação */}
      {result.total > result.pageSize && (
        <div className="flex items-center justify-between text-sm">
          <span className="font-mono-tech text-slate-500 dark:text-slate-400">
            {(page - 1) * result.pageSize + 1}–{Math.min(page * result.pageSize, result.total)} / {result.total}
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
            {page < Math.ceil(result.total / result.pageSize) && (
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

function QuickFilter({
  href,
  active,
  count,
  tone,
  icon,
  children,
}: {
  href: string;
  active: boolean;
  count: number;
  tone: 'fluxo' | 'slate';
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const activeClass =
    tone === 'fluxo'
      ? 'bg-fluxo-500 text-white border-fluxo-500 shadow-fluxo'
      : 'bg-slate-800 text-white border-slate-800 dark:bg-slate-200 dark:text-slate-900 dark:border-slate-200';

  return (
    <Link
      href={href}
      className={
        active
          ? `inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${activeClass}`
          : 'inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition-colors hover:border-fluxo-300 hover:text-fluxo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
      }
    >
      {icon}
      {children}
      <span
        className={
          active
            ? 'font-mono-tech text-[10px] font-bold text-white/80'
            : 'font-mono-tech text-[10px] font-semibold text-slate-400 dark:text-slate-500'
        }
      >
        {count}
      </span>
    </Link>
  );
}
