import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import Link from 'next/link';
import {
  Activity,
  AlertOctagon,
  ArrowRight,
  CheckCircle2,
  Clock,
  Gauge,
  Smile,
  Sparkles,
  Timer,
  TriangleAlert,
} from 'lucide-react';
import {
  TICKET_STATUS_COLOR,
  TICKET_STATUS_LABEL,
  TICKET_EVENT_LABEL,
  formatRelative,
  formatDuration,
  formatDelta,
} from '@/lib/utils';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { ActivityIcon } from '@/components/dashboard/activity-icon';
import DashboardCharts from './dashboard-charts';

export const revalidate = 300;

const DAYS_WINDOW = 30;
const SPARKLINE_DAYS = 14;

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function getDashboardData() {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const periodStart = daysAgo(DAYS_WINDOW);
  const priorPeriodStart = daysAgo(DAYS_WINDOW * 2);
  const sparklineStart = daysAgo(SPARKLINE_DAYS);

  const [
    openCount,
    inProgressCount,
    waitingClientCount,
    slaBreachedActiveCount,
    totalTickets,
    period,
    priorPeriod,
    ticketsByStatusRaw,
    ticketsByPriority,
    topAgents,
    recentEvents,
    csatCurrent,
    csatPrior,
    dailyCreatedRaw,
  ] = await Promise.all([
    db.ticket.count({
      where: { deletedAt: null, status: { in: ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_CLIENT', 'REOPENED'] } },
    }),
    db.ticket.count({ where: { deletedAt: null, status: 'IN_PROGRESS' } }),
    db.ticket.count({ where: { deletedAt: null, status: 'WAITING_CLIENT' } }),
    db.ticket.count({
      where: {
        deletedAt: null,
        slaBreached: true,
        status: { in: ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_CLIENT', 'REOPENED'] },
      },
    }),
    db.ticket.count({ where: { deletedAt: null } }),
    db.ticket.findMany({
      where: { deletedAt: null, createdAt: { gte: periodStart } },
      select: { firstResponseAt: true, resolvedAt: true, createdAt: true, slaBreached: true },
    }),
    db.ticket.findMany({
      where: {
        deletedAt: null,
        createdAt: { gte: priorPeriodStart, lt: periodStart },
      },
      select: { firstResponseAt: true, resolvedAt: true, createdAt: true, slaBreached: true },
    }),
    db.ticket.groupBy({
      by: ['status'],
      where: { deletedAt: null },
      _count: { id: true },
    }),
    db.ticket.groupBy({
      by: ['priority'],
      where: { deletedAt: null },
      _count: { id: true },
    }),
    db.ticket.groupBy({
      by: ['assignedToId'],
      where: {
        deletedAt: null,
        status: { in: ['RESOLVED', 'CLOSED'] },
        resolvedAt: { gte: periodStart },
        assignedToId: { not: null },
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    }),
    db.ticketEvent.findMany({
      where: { ticket: { deletedAt: null } },
      include: {
        ticket: { select: { id: true, ticketNumber: true, title: true } },
        author: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 12,
    }),
    db.csatSurvey.findMany({
      where: { answeredAt: { gte: periodStart } },
      select: { rating: true },
    }),
    db.csatSurvey.findMany({
      where: { answeredAt: { gte: priorPeriodStart, lt: periodStart } },
      select: { rating: true },
    }),
    db.ticket.findMany({
      where: { deletedAt: null, createdAt: { gte: sparklineStart } },
      select: { createdAt: true, firstResponseAt: true, resolvedAt: true },
    }),
  ]);

  function avgMinutes<T extends { firstResponseAt: Date | null; createdAt: Date }>(
    arr: T[],
    field: 'firstResponseAt' | 'resolvedAt',
  ) {
    const withField = arr.filter((t) => (t as any)[field]) as Array<T & { createdAt: Date }>;
    if (withField.length === 0) return 0;
    const total = withField.reduce(
      (sum, t) => sum + ((t as any)[field].getTime() - t.createdAt.getTime()) / 60000,
      0,
    );
    return Math.round(total / withField.length);
  }

  const avgFirstResponseMinutes = avgMinutes(period as any, 'firstResponseAt');
  const avgFirstResponsePrior = avgMinutes(priorPeriod as any, 'firstResponseAt');
  const avgResolutionMinutes = avgMinutes(period as any, 'resolvedAt');
  const avgResolutionPrior = avgMinutes(priorPeriod as any, 'resolvedAt');

  function slaCompliance(arr: { slaBreached: boolean }[]) {
    if (arr.length === 0) return 100;
    const breached = arr.filter((t) => t.slaBreached).length;
    return Math.round(((arr.length - breached) / arr.length) * 100);
  }

  const slaCompliancePeriod = slaCompliance(period);
  const slaCompliancePrior = slaCompliance(priorPeriod);

  const csatAvg = (arr: { rating: number }[]) =>
    arr.length === 0 ? 0 : Number((arr.reduce((s, r) => s + r.rating, 0) / arr.length).toFixed(1));
  const csatPeriod = csatAvg(csatCurrent);
  const csatPriorAvg = csatAvg(csatPrior);

  const openVolumePeriod = period.length;
  const openVolumePrior = priorPeriod.length;

  function buildDailyCreated(): { date: string; count: number }[] {
    const buckets = new Map<string, number>();
    for (let i = SPARKLINE_DAYS - 1; i >= 0; i--) {
      const d = daysAgo(i);
      buckets.set(d.toISOString().slice(0, 10), 0);
    }
    for (const t of dailyCreatedRaw) {
      const key = new Date(t.createdAt).toISOString().slice(0, 10);
      if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
    return Array.from(buckets.entries()).map(([date, count]) => ({
      date: new Date(date).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' }),
      count,
    }));
  }
  const sparkCreated = buildDailyCreated();
  const sparkValues = sparkCreated.map((d) => ({ v: d.count }));

  function dailyAvgMinutes(field: 'firstResponseAt' | 'resolvedAt') {
    const buckets = new Map<string, { sum: number; n: number }>();
    for (let i = SPARKLINE_DAYS - 1; i >= 0; i--) {
      buckets.set(daysAgo(i).toISOString().slice(0, 10), { sum: 0, n: 0 });
    }
    for (const t of dailyCreatedRaw) {
      const fieldVal = (t as any)[field] as Date | null;
      if (!fieldVal) continue;
      const key = new Date(t.createdAt).toISOString().slice(0, 10);
      const bucket = buckets.get(key);
      if (!bucket) continue;
      bucket.sum += (fieldVal.getTime() - t.createdAt.getTime()) / 60000;
      bucket.n += 1;
    }
    return Array.from(buckets.values()).map(({ sum, n }) => ({ v: n === 0 ? 0 : sum / n }));
  }

  const dailyCreatedForChart = buildDailyCreated().slice(SPARKLINE_DAYS - 14);

  const agentIds = topAgents.map((a) => a.assignedToId).filter(Boolean) as string[];
  const agentNames = await db.user.findMany({
    where: { id: { in: agentIds } },
    select: { id: true, name: true },
  });
  const agentNameMap = Object.fromEntries(agentNames.map((a) => [a.id, a.name]));

  const dailyTickets: { date: string; count: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const date = daysAgo(i);
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    const count = dailyCreatedRaw.filter((t) => t.createdAt >= date && t.createdAt < next).length;
    dailyTickets.push({
      date: date.toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' }),
      count,
    });
  }

  const statusCounts = ticketsByStatusRaw.map((s) => ({
    status: s.status,
    count: s._count.id,
    label: TICKET_STATUS_LABEL[s.status] ?? s.status,
  }));

  const priorityCounts = ticketsByPriority.map((p) => ({
    priority: p.priority,
    count: p._count.id,
    label: p.priority,
  }));

  const topAgentsFormatted = topAgents
    .filter((a) => a.assignedToId && agentNameMap[a.assignedToId])
    .map((a) => ({ name: agentNameMap[a.assignedToId!], count: a._count.id }));

  return {
    snapshot: {
      openCount,
      inProgressCount,
      waitingClientCount,
      slaBreachedActiveCount,
      totalTickets,
      generatedAt: now,
    },
    kpis: {
      openVolume: { curr: openVolumePeriod, prior: openVolumePrior, spark: sparkValues },
      firstResponse: {
        curr: avgFirstResponseMinutes,
        prior: avgFirstResponsePrior,
        spark: dailyAvgMinutes('firstResponseAt'),
      },
      resolution: {
        curr: avgResolutionMinutes,
        prior: avgResolutionPrior,
        spark: dailyAvgMinutes('resolvedAt'),
      },
      sla: { curr: slaCompliancePeriod, prior: slaCompliancePrior },
      csat: { curr: csatPeriod, prior: csatPriorAvg, sampleSize: csatCurrent.length },
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

  const { snapshot, kpis, charts, recentEvents } = await getDashboardData();

  const operationHeadline = (() => {
    if (snapshot.slaBreachedActiveCount > 0) {
      return {
        tone: 'rose' as const,
        Icon: AlertOctagon,
        title: `${snapshot.slaBreachedActiveCount} chamado${snapshot.slaBreachedActiveCount > 1 ? 's' : ''} com SLA estourado`,
        body: 'Precisam de atenção agora — abra a fila para priorizar.',
        cta: { href: '/admin/chamados?sla=breached', label: 'Ver na fila' },
      };
    }
    if (snapshot.openCount === 0) {
      return {
        tone: 'emerald' as const,
        Icon: CheckCircle2,
        title: 'Operação em dia',
        body: 'Nenhum chamado ativo no momento. Bom para revisar processos ou base de conhecimento.',
        cta: { href: '/admin/conhecimento', label: 'Abrir base de conhecimento' },
      };
    }
    return {
      tone: 'fluxo' as const,
      Icon: Sparkles,
      title: `${snapshot.openCount} chamado${snapshot.openCount > 1 ? 's' : ''} ativo${snapshot.openCount > 1 ? 's' : ''}`,
      body: `${snapshot.inProgressCount} em andamento · ${snapshot.waitingClientCount} aguardando cliente`,
      cta: { href: '/admin/fila', label: 'Ir para minha fila' },
    };
  })();

  const headlineToneClass = {
    rose: 'from-rose-500/20 via-rose-500/5 to-transparent ring-rose-500/30',
    emerald: 'from-emerald-500/20 via-emerald-500/5 to-transparent ring-emerald-500/30',
    fluxo: 'from-fluxo-500/25 via-fluxo-500/5 to-transparent ring-fluxo-500/30',
  }[operationHeadline.tone];

  const headlineIconClass = {
    rose: 'bg-rose-500/20 text-rose-600 ring-rose-500/30',
    emerald: 'bg-emerald-500/20 text-emerald-600 ring-emerald-500/30',
    fluxo: 'bg-fluxo-gradient text-white shadow-fluxo',
  }[operationHeadline.tone];

  const HeadlineIcon = operationHeadline.Icon;

  const lastUpdatedLabel = snapshot.generatedAt.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="space-y-8">
      {/* Header com timestamp */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fluxo-600 dark:text-cyan-400">
            Operação · {DAYS_WINDOW} dias
          </p>
          <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Visão narrativa da operação de suporte Fluxo, comparando com o período anterior.
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/60 px-3 py-1 text-xs text-slate-500 backdrop-blur dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
          <Clock className="h-3 w-3" aria-hidden="true" />
          Atualizado às {lastUpdatedLabel}
        </div>
      </div>

      {/* Headline / Estado da operação */}
      <section
        aria-labelledby="operation-headline"
        className={`relative overflow-hidden rounded-2xl bg-gradient-to-br p-6 ring-1 ring-inset sm:p-8 ${headlineToneClass} bg-white dark:bg-slate-800`}
      >
        <div className="relative flex flex-wrap items-start gap-5">
          <div
            aria-hidden="true"
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ${headlineIconClass}`}
          >
            <HeadlineIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2
              id="operation-headline"
              className="font-display text-xl font-bold text-slate-900 dark:text-white sm:text-2xl"
            >
              {operationHeadline.title}
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {operationHeadline.body}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
              <StatPill label="Em aberto" value={snapshot.openCount} />
              <StatPill label="Em andamento" value={snapshot.inProgressCount} />
              <StatPill label="Aguardando cliente" value={snapshot.waitingClientCount} />
              <StatPill
                label="SLA estourado"
                value={snapshot.slaBreachedActiveCount}
                tone={snapshot.slaBreachedActiveCount > 0 ? 'rose' : 'slate'}
              />
            </div>
          </div>
          <Link
            href={operationHeadline.cta.href}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-fluxo-500 px-3.5 py-2 text-sm font-semibold text-white shadow-fluxo transition hover:bg-fluxo-600"
          >
            {operationHeadline.cta.label}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* KPI Strip */}
      <section aria-labelledby="kpi-heading" className="space-y-3">
        <h2 id="kpi-heading" className="sr-only">
          Indicadores principais
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <KpiCard
            label="Volume (30d)"
            value={kpis.openVolume.curr}
            description="Chamados abertos no período"
            icon={<Activity className="h-4 w-4" aria-hidden="true" />}
            tone="fluxo"
            delta={formatDelta(kpis.openVolume.curr, kpis.openVolume.prior)}
            sparkline={kpis.openVolume.spark}
          />
          <KpiCard
            label="1ª resposta"
            value={formatDuration(kpis.firstResponse.curr)}
            description="Tempo médio até primeira resposta"
            icon={<Timer className="h-4 w-4" aria-hidden="true" />}
            tone="cyan"
            delta={formatDelta(kpis.firstResponse.curr, kpis.firstResponse.prior)}
            invertDelta
            sparkline={kpis.firstResponse.spark}
          />
          <KpiCard
            label="Resolução"
            value={formatDuration(kpis.resolution.curr)}
            description="Tempo médio até resolução"
            icon={<CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
            tone="emerald"
            delta={formatDelta(kpis.resolution.curr, kpis.resolution.prior)}
            invertDelta
            sparkline={kpis.resolution.spark}
          />
          <KpiCard
            label="SLA cumprido"
            value={kpis.sla.curr}
            suffix="%"
            description="Taxa de SLA respeitado no período"
            icon={<Gauge className="h-4 w-4" aria-hidden="true" />}
            tone={kpis.sla.curr >= 95 ? 'emerald' : kpis.sla.curr >= 80 ? 'amber' : 'rose'}
            delta={formatDelta(kpis.sla.curr, kpis.sla.prior)}
          />
          <KpiCard
            label="CSAT"
            value={kpis.csat.curr.toFixed(1)}
            suffix="/5"
            description={
              kpis.csat.sampleSize > 0
                ? `${kpis.csat.sampleSize} resposta${kpis.csat.sampleSize > 1 ? 's' : ''} no período`
                : 'Sem respostas no período'
            }
            icon={<Smile className="h-4 w-4" aria-hidden="true" />}
            tone="purple"
            delta={formatDelta(kpis.csat.curr, kpis.csat.prior)}
          />
        </div>
      </section>

      {/* Charts */}
      <section aria-labelledby="charts-heading" className="space-y-3">
        <h2
          id="charts-heading"
          className="font-display text-sm font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400"
        >
          Distribuição
        </h2>
        <DashboardCharts
          dailyTickets={charts.dailyTickets}
          statusCounts={charts.statusCounts}
          priorityCounts={charts.priorityCounts}
          topAgents={charts.topAgents}
        />
      </section>

      {/* Activity feed */}
      <section aria-labelledby="activity-heading">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-fluxo-500" aria-hidden="true" />
              <h2
                id="activity-heading"
                className="font-display text-sm font-semibold text-slate-900 dark:text-white"
              >
                Atividade recente
              </h2>
            </div>
            <Link
              href="/admin/chamados"
              className="inline-flex items-center gap-1 text-xs font-medium text-fluxo-600 hover:text-fluxo-700 dark:text-cyan-400 dark:hover:text-cyan-300"
            >
              Ver todos os chamados
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </div>
          {recentEvents.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <TriangleAlert className="mx-auto h-6 w-6 text-slate-300" aria-hidden="true" />
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Sem atividade recente.
              </p>
            </div>
          ) : (
            <ul role="list" className="divide-y divide-slate-100 dark:divide-slate-700">
              {recentEvents.map((event) => {
                const label = TICKET_EVENT_LABEL[event.type] ?? event.type;
                return (
                  <li key={event.id} className="flex items-start gap-3 px-5 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/40">
                    <ActivityIcon type={event.type} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <Link
                          href={`/admin/chamados/${event.ticketId}`}
                          className="font-mono text-xs text-fluxo-600 hover:underline dark:text-cyan-400"
                        >
                          {event.ticket.ticketNumber}
                        </Link>
                        <span className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                          {event.ticket.title}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-medium">{label}</span>
                        {event.author && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{event.author.name}</span>
                          </>
                        )}
                        {event.newValue && event.type === 'STATUS_CHANGED' && (
                          <span
                            className={`ml-1 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                              TICKET_STATUS_COLOR[event.newValue] ?? 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {TICKET_STATUS_LABEL[event.newValue] ?? event.newValue}
                          </span>
                        )}
                      </div>
                    </div>
                    <time
                      dateTime={event.createdAt.toISOString()}
                      className="shrink-0 text-xs text-slate-400"
                    >
                      {formatRelative(event.createdAt)}
                    </time>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function StatPill({
  label,
  value,
  tone = 'slate',
}: {
  label: string;
  value: number;
  tone?: 'slate' | 'rose';
}) {
  const toneClass =
    tone === 'rose'
      ? 'bg-rose-500/10 text-rose-700 ring-rose-500/20 dark:text-rose-300'
      : 'bg-slate-500/10 text-slate-700 ring-slate-500/20 dark:text-slate-200';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset ${toneClass}`}
    >
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="font-semibold">{value}</span>
    </span>
  );
}
