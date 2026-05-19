import Link from 'next/link';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Hourglass,
  Inbox,
  LifeBuoy,
  Plus,
  Sparkles,
  Timer,
} from 'lucide-react';
import {
  TICKET_STATUS_COLOR,
  TICKET_STATUS_LABEL,
  PRIORITY_COLOR,
  PRIORITY_LABEL,
  formatRelative,
} from '@/lib/utils';
import type { TicketPriority, TicketStatus } from '@prisma/client';

interface PageProps {
  searchParams: { status?: string };
}

const STATUS_BUCKETS: Record<'open' | 'resolved' | 'all', TicketStatus[]> = {
  open: ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_CLIENT', 'REOPENED'],
  resolved: ['RESOLVED', 'CLOSED'],
  all: [],
};

const PRIORITY_ACCENT: Record<TicketPriority, string> = {
  LOW: 'bg-slate-300',
  MEDIUM: 'bg-fluxo-400',
  HIGH: 'bg-orange-400',
  URGENT: 'bg-rose-500',
};

export default async function PortalHome({ searchParams }: PageProps) {
  const session = await auth();
  const user = session?.user;
  if (!user) return null;

  const clientId = user.clientId;

  const activeFilter = (searchParams.status as keyof typeof STATUS_BUCKETS) ?? 'open';
  const statusFilter = STATUS_BUCKETS[activeFilter] ?? STATUS_BUCKETS.open;

  const baseWhere = { clientId: clientId ?? undefined, deletedAt: null } as const;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [tickets, openCount, inProgressCount, resolvedRecent, allCount, client] = await Promise.all([
    db.ticket.findMany({
      where: {
        ...baseWhere,
        ...(statusFilter.length > 0 && { status: { in: statusFilter } }),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        ticketNumber: true,
        title: true,
        status: true,
        priority: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    db.ticket.count({
      where: { ...baseWhere, status: { in: STATUS_BUCKETS.open } },
    }),
    db.ticket.count({ where: { ...baseWhere, status: 'IN_PROGRESS' } }),
    db.ticket.count({
      where: {
        ...baseWhere,
        status: { in: ['RESOLVED', 'CLOSED'] },
        resolvedAt: { gte: thirtyDaysAgo },
      },
    }),
    db.ticket.count({ where: baseWhere }),
    clientId
      ? db.client.findUnique({ where: { id: clientId }, select: { name: true } })
      : Promise.resolve(null),
  ]);

  const firstName = user.name?.split(' ')[0] ?? '';
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  })();

  const tabs: { key: keyof typeof STATUS_BUCKETS; label: string; count: number }[] = [
    { key: 'open', label: 'Em aberto', count: openCount },
    { key: 'resolved', label: 'Resolvidos', count: resolvedRecent },
    { key: 'all', label: 'Todos', count: allCount },
  ];

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section
        aria-labelledby="portal-hero"
        className="relative overflow-hidden rounded-2xl bg-fluxo-gradient-dark p-6 text-white shadow-fluxo-lg sm:p-8"
      >
        <div aria-hidden="true" className="absolute -right-16 -top-16 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
        <div aria-hidden="true" className="absolute -bottom-20 -left-10 h-72 w-72 rounded-full bg-fluxo-500/30 blur-3xl" />

        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0 flex-1">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300">
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              {client?.name ?? 'Portal de suporte'}
            </p>
            <h1 id="portal-hero" className="mt-3 font-display text-2xl font-bold sm:text-3xl">
              {greeting}, {firstName || 'tudo certo'}.
            </h1>
            <p className="mt-1 max-w-xl text-sm text-slate-300">
              Aqui você acompanha o atendimento técnico da Fluxo em tempo real.{' '}
              {openCount === 0
                ? 'Nenhum chamado em aberto no momento.'
                : `Você tem ${openCount} chamado${openCount > 1 ? 's' : ''} em aberto.`}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <HeroStat icon={<Inbox className="h-3.5 w-3.5" />} label="Em aberto" value={openCount} />
              <HeroStat icon={<Hourglass className="h-3.5 w-3.5" />} label="Em andamento" value={inProgressCount} />
              <HeroStat icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Resolvidos (30d)" value={resolvedRecent} />
            </div>
          </div>

          <Link
            href="/portal/novo"
            className="group inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-fluxo-700 shadow-lg transition-transform hover:scale-[1.02]"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Abrir novo chamado
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* Chip tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((t) => {
          const isActive = activeFilter === t.key;
          return (
            <Link
              key={t.key}
              href={`/portal?status=${t.key}`}
              className={
                isActive
                  ? 'inline-flex items-center gap-2 rounded-full bg-fluxo-500 px-4 py-1.5 text-sm font-semibold text-white shadow-fluxo'
                  : 'inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:border-fluxo-300 hover:text-fluxo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-fluxo-500/50 dark:hover:text-fluxo-300'
              }
            >
              {t.label}
              <span
                className={
                  isActive
                    ? 'inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-white/20 px-1.5 text-[10px] font-bold tabular-nums'
                    : 'inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-slate-100 px-1.5 text-[10px] font-bold tabular-nums text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                }
              >
                {t.count}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Listagem */}
      {tickets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm dark:border-slate-600 dark:bg-slate-800">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-fluxo-500/10 text-fluxo-600 ring-1 ring-inset ring-fluxo-500/20">
            <LifeBuoy className="h-5 w-5" aria-hidden="true" />
          </div>
          <h2 className="mt-4 font-display text-lg font-semibold text-slate-900 dark:text-white">
            {activeFilter === 'open'
              ? 'Nenhum chamado em aberto'
              : activeFilter === 'resolved'
                ? 'Nenhum chamado resolvido ainda'
                : 'Você ainda não abriu nenhum chamado'}
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {activeFilter === 'open'
              ? 'Tudo certo por aqui. Se precisar, abra um novo chamado.'
              : activeFilter === 'resolved'
                ? 'Quando um chamado for finalizado, ele aparecerá aqui.'
                : 'Comece abrindo seu primeiro pedido de suporte.'}
          </p>
          {activeFilter !== 'resolved' && (
            <Link
              href="/portal/novo"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-fluxo-500 px-4 py-2 text-sm font-semibold text-white shadow-fluxo transition hover:bg-fluxo-600"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Abrir novo chamado
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Card grid no mobile */}
          <ul role="list" className="grid grid-cols-1 gap-3 md:hidden">
            {tickets.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/portal/chamado/${t.id}`}
                  className="relative block overflow-hidden rounded-xl border border-slate-200 bg-white p-4 pl-5 shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
                >
                  <span
                    aria-hidden="true"
                    className={`absolute inset-y-0 left-0 w-1 ${PRIORITY_ACCENT[t.priority]}`}
                  />
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                        {t.ticketNumber}
                      </p>
                      <p className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">
                        {t.title}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${TICKET_STATUS_COLOR[t.status]}`}
                    >
                      {TICKET_STATUS_LABEL[t.status]}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${PRIORITY_COLOR[t.priority]}`}
                    >
                      {PRIORITY_LABEL[t.priority]}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Timer className="h-3 w-3" aria-hidden="true" />
                      {formatRelative(t.updatedAt)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {/* Tabela no desktop */}
          <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800 md:block">
            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
              <thead className="bg-slate-50/60 dark:bg-slate-800/60">
                <tr>
                  <th scope="col" className="w-1 p-0" aria-hidden="true" />
                  <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Chamado
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Prioridade
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Última atualização
                  </th>
                  <th scope="col" className="px-4 py-3" aria-hidden="true" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {tickets.map((t) => (
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
                          href={`/portal/chamado/${t.id}`}
                          className="line-clamp-1 font-medium text-slate-900 transition-colors hover:text-fluxo-600 dark:text-slate-100 dark:hover:text-cyan-400"
                        >
                          {t.title}
                        </Link>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${TICKET_STATUS_COLOR[t.status]}`}
                      >
                        {TICKET_STATUS_LABEL[t.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${PRIORITY_COLOR[t.priority]}`}
                      >
                        {PRIORITY_LABEL[t.priority]}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                      {formatRelative(t.updatedAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/portal/chamado/${t.id}`}
                        className="inline-flex items-center gap-0.5 text-xs font-medium text-fluxo-600 opacity-0 transition-opacity group-hover:opacity-100 dark:text-cyan-400"
                        aria-label={`Ver detalhes do chamado ${t.ticketNumber}`}
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
        </>
      )}
    </div>
  );
}

function HeroStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs ring-1 ring-inset ring-white/15 backdrop-blur">
      <span aria-hidden="true" className="text-cyan-300">
        {icon}
      </span>
      <span className="text-slate-200">{label}</span>
      <span className="font-bold text-white tabular-nums">{value}</span>
    </span>
  );
}
