import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import Link from 'next/link';
import {
  TICKET_STATUS_COLOR,
  TICKET_STATUS_LABEL,
  PRIORITY_COLOR,
  PRIORITY_LABEL,
  formatRelative,
} from '@/lib/utils';
import DashboardCharts from './dashboard-charts';

export const revalidate = 300; // 5 minutes

async function getDashboardData() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    openCount,
    inProgressCount,
    waitingClientCount,
    closedCount,
    totalTickets,
    allTicketsForKpis,
    ticketsByStatusRaw,
    ticketsByPriority,
    topAgents,
    recentEvents,
    csatRatings,
  ] = await Promise.all([
    // KPI 1: Open tickets
    db.ticket.count({
      where: { deletedAt: null, status: { in: ['NEW', 'OPEN', 'IN_PROGRESS'] } },
    }),

    // KPI: In Progress
    db.ticket.count({
      where: { deletedAt: null, status: 'IN_PROGRESS' },
    }),

    // KPI: Waiting client
    db.ticket.count({
      where: { deletedAt: null, status: 'WAITING_CLIENT' },
    }),

    // Closed count
    db.ticket.count({
      where: { deletedAt: null, status: { in: ['RESOLVED', 'CLOSED'] } },
    }),

    // Total
    db.ticket.count({
      where: { deletedAt: null },
    }),

    // All tickets for metrics calculation
    db.ticket.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        firstResponseAt: true,
        resolvedAt: true,
        createdAt: true,
        slaBreached: true,
        status: true,
      },
    }),

    // Group by status for chart
    db.ticket.groupBy({
      by: ['status'],
      where: { deletedAt: null },
      _count: { id: true },
    }),

    // Group by priority
    db.ticket.groupBy({
      by: ['priority'],
      where: { deletedAt: null },
      _count: { id: true },
    }),

    // Top agents this month
    db.ticket.groupBy({
      by: ['assignedToId'],
      where: {
        deletedAt: null,
        status: { in: ['RESOLVED', 'CLOSED'] },
        resolvedAt: { gte: thirtyDaysAgo },
        assignedToId: { not: null },
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    }),

    // Recent events (last 10)
    db.ticketEvent.findMany({
      where: { ticket: { deletedAt: null } },
      include: {
        ticket: { select: { id: true, ticketNumber: true, title: true } },
        author: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),

    // CSAT ratings
    db.csatSurvey.findMany({
      where: { answeredAt: { gte: thirtyDaysAgo } },
      select: { rating: true },
    }),
  ]);

  // Calculate KPI 1: Average First Response Time
  const ticketsWithFirstResponse = allTicketsForKpis.filter((t) => t.firstResponseAt);
  let avgFirstResponseMinutes = 0;
  if (ticketsWithFirstResponse.length > 0) {
    const totalMs = ticketsWithFirstResponse.reduce((sum, t) => {
      const diff = (t.firstResponseAt!.getTime() - t.createdAt.getTime()) / 1000 / 60; // minutes
      return sum + diff;
    }, 0);
    avgFirstResponseMinutes = Math.round(totalMs / ticketsWithFirstResponse.length);
  }

  // Calculate KPI 2: Average Resolution Time
  const ticketsResolved = allTicketsForKpis.filter((t) => t.resolvedAt);
  let avgResolutionMinutes = 0;
  if (ticketsResolved.length > 0) {
    const totalMs = ticketsResolved.reduce((sum, t) => {
      const diff = (t.resolvedAt!.getTime() - t.createdAt.getTime()) / 1000 / 60; // minutes
      return sum + diff;
    }, 0);
    avgResolutionMinutes = Math.round(totalMs / ticketsResolved.length);
  }

  // Calculate KPI 3: SLA Compliance Rate
  const slaComplianceRate =
    totalTickets > 0 ? Math.round(((totalTickets - allTicketsForKpis.filter((t) => t.slaBreached).length) / totalTickets) * 100) : 100;

  // Calculate KPI 4: CSAT Average
  const csatAverage =
    csatRatings.length > 0 ? (csatRatings.reduce((sum, r) => sum + r.rating, 0) / csatRatings.length).toFixed(1) : '0';

  // Get agent names for top agents chart
  const agentIds = topAgents.map((a) => a.assignedToId).filter(Boolean) as string[];
  const agentNames = await db.user.findMany({
    where: { id: { in: agentIds } },
    select: { id: true, name: true },
  });
  const agentNameMap = Object.fromEntries(agentNames.map((a) => [a.id, a.name]));

  // Get daily ticket counts for chart (last 30 days)
  const dailyTickets: { date: string; count: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    const count = await db.ticket.count({
      where: {
        deletedAt: null,
        createdAt: { gte: date, lt: nextDate },
      },
    });

    dailyTickets.push({
      date: date.toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' }),
      count,
    });
  }

  // Format ticket counts by status
  const statusCounts = ticketsByStatusRaw.map((s) => ({
    status: s.status,
    count: s._count.id,
    label: TICKET_STATUS_LABEL[s.status],
  }));

  // Format priority counts
  const priorityCounts = ticketsByPriority.map((p) => ({
    priority: p.priority,
    count: p._count.id,
    label: PRIORITY_LABEL[p.priority],
  }));

  // Format top agents
  const topAgentsFormatted = topAgents
    .filter((a) => a.assignedToId && agentNameMap[a.assignedToId])
    .map((a) => ({
      name: agentNameMap[a.assignedToId!],
      count: a._count.id,
    }))
    .slice(0, 5);

  return {
    kpis: {
      openCount,
      avgFirstResponseMinutes,
      avgResolutionMinutes,
      slaComplianceRate,
      csatAverage,
    },
    charts: {
      dailyTickets,
      statusCounts,
      priorityCounts,
      topAgents: topAgentsFormatted,
    },
    recentEvents,
  };
}

export default async function AdminDashboard() {
  const session = await auth();
  if (!session?.user) return null;

  const { kpis, charts, recentEvents } = await getDashboardData();

  const formatTime = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
    return `${Math.floor(minutes / 1440)}d`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Visão geral em tempo real da operação de suporte Fluxo.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* Card 1: Open Tickets */}
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-600">
                Chamados Abertos
              </p>
              <p className="mt-3 text-3xl font-bold text-slate-900">{kpis.openCount}</p>
            </div>
            <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-500/20">
              <svg
                className="h-5 w-5 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <p className="mt-4 text-xs text-slate-500">Aguardando atendimento</p>
        </div>

        {/* Card 2: Avg First Response */}
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-600">
                Primeira Resposta
              </p>
              <p className="mt-3 text-3xl font-bold text-slate-900">
                {formatTime(kpis.avgFirstResponseMinutes)}
              </p>
            </div>
            <div className="rounded-full bg-cyan-100 p-2 dark:bg-cyan-500/20">
              <svg
                className="h-5 w-5 text-cyan-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <p className="mt-4 text-xs text-slate-500">Tempo médio</p>
        </div>

        {/* Card 3: Avg Resolution */}
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-600">
                Resolução
              </p>
              <p className="mt-3 text-3xl font-bold text-slate-900">
                {formatTime(kpis.avgResolutionMinutes)}
              </p>
            </div>
            <div className="rounded-full bg-emerald-100 p-2 dark:bg-emerald-500/20">
              <svg
                className="h-5 w-5 text-emerald-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <p className="mt-4 text-xs text-slate-500">Tempo médio</p>
        </div>

        {/* Card 4: SLA Compliance */}
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-600">
                SLA Cumprido
              </p>
              <p className="mt-3 text-3xl font-bold text-slate-900">
                {kpis.slaComplianceRate}%
              </p>
            </div>
            <div className="rounded-full bg-orange-100 p-2 dark:bg-orange-500/20">
              <svg
                className="h-5 w-5 text-orange-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
          </div>
          <p className="mt-4 text-xs text-slate-500">Taxa de cumprimento</p>
        </div>

        {/* Card 5: CSAT */}
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-600">
                CSAT Médio
              </p>
              <p className="mt-3 text-3xl font-bold text-slate-900">
                {kpis.csatAverage}
                <span className="text-lg text-slate-500">/5</span>
              </p>
            </div>
            <div className="rounded-full bg-purple-100 p-2 dark:bg-purple-500/20">
              <svg
                className="h-5 w-5 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <p className="mt-4 text-xs text-slate-500">Satisfação dos clientes</p>
        </div>
      </div>

      {/* Charts Section */}
      <DashboardCharts
        dailyTickets={charts.dailyTickets}
        statusCounts={charts.statusCounts}
        priorityCounts={charts.priorityCounts}
        topAgents={charts.topAgents}
      />

      {/* Recent Activity */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Atividade Recente</h2>
            <Link
              href="/admin/chamados"
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-fluxo-400 dark:hover:text-fluxo-300"
            >
              Ver todos →
            </Link>
          </div>
        </div>

        <div className="divide-y divide-slate-200 dark:divide-slate-700">
          {recentEvents.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
              Nenhuma atividade recente
            </div>
          ) : (
            recentEvents.map((event) => (
              <div key={event.id} className="px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/chamados/${event.ticketId}`}
                        className="font-medium text-blue-600 hover:text-blue-700 dark:text-fluxo-400 dark:hover:text-fluxo-300"
                      >
                        {event.ticket.ticketNumber}
                      </Link>
                      <span className="text-sm text-slate-600">
                        {event.ticket.title}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                      <span className="text-xs font-medium uppercase text-slate-500">
                        {event.type}
                      </span>
                      {event.author && (
                        <>
                          <span>•</span>
                          <span>{event.author.name}</span>
                        </>
                      )}
                      <span>•</span>
                      <span>{formatRelative(event.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
