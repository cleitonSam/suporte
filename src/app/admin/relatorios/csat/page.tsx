import type { Metadata } from 'next';
import Link from 'next/link';
import { Smile, TrendingUp, Award, MessageSquare, Star } from 'lucide-react';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { CSAT_EMOJIS, CSAT_LABELS } from '@/lib/csat';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { formatRelative } from '@/lib/utils';
import { CsatTrendChart } from './csat-trend-chart';

export const metadata: Metadata = {
  title: 'CSAT · Relatórios',
  description: 'Pesquisa de satisfação dos clientes',
};

export const revalidate = 300;

interface PageProps {
  searchParams: { period?: string };
}

const PERIOD_OPTIONS = [
  { key: '7', label: '7 dias' },
  { key: '30', label: '30 dias' },
  { key: '90', label: '90 dias' },
  { key: 'all', label: 'Tudo' },
];

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default async function CsatDashboardPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user || session.user.userType !== 'AGENT') return null;

  const period = searchParams.period ?? '30';
  const days = period === 'all' ? null : parseInt(period, 10) || 30;
  const fromDate = days ? daysAgo(days) : null;
  const priorFromDate = days ? daysAgo(days * 2) : null;
  const priorToDate = days ? daysAgo(days) : null;

  const baseWhere = {
    rating: { gt: 0 },
    ...(fromDate && { answeredAt: { gte: fromDate } }),
  };

  const priorWhere =
    days && priorFromDate && priorToDate
      ? { rating: { gt: 0 }, answeredAt: { gte: priorFromDate, lt: priorToDate } }
      : null;

  const [surveys, priorSurveys, ratingsByDay, topAgents, recentComments] = await Promise.all([
    db.csatSurvey.findMany({
      where: baseWhere,
      select: { rating: true, answeredAt: true },
    }),
    priorWhere
      ? db.csatSurvey.findMany({
          where: priorWhere,
          select: { rating: true },
        })
      : Promise.resolve([]),
    db.csatSurvey.findMany({
      where: {
        rating: { gt: 0 },
        ...(fromDate && { answeredAt: { gte: fromDate } }),
      },
      select: { rating: true, answeredAt: true },
      orderBy: { answeredAt: 'asc' },
    }),
    db.csatSurvey.groupBy({
      by: ['agentId'],
      where: baseWhere,
      _avg: { rating: true },
      _count: { rating: true },
      orderBy: { _avg: { rating: 'desc' } },
      take: 5,
    }),
    db.csatSurvey.findMany({
      where: {
        ...baseWhere,
        comment: { not: null },
      },
      include: {
        ticket: {
          select: { id: true, ticketNumber: true, title: true, client: { select: { name: true } } },
        },
      },
      orderBy: { answeredAt: 'desc' },
      take: 8,
    }),
  ]);

  const total = surveys.length;
  const avgRating = total > 0 ? surveys.reduce((s, r) => s + r.rating, 0) / total : 0;
  const priorAvg =
    priorSurveys.length > 0
      ? priorSurveys.reduce((s, r) => s + r.rating, 0) / priorSurveys.length
      : 0;

  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const s of surveys) distribution[s.rating]++;

  const promoters = distribution[4] + distribution[5];
  const detractors = distribution[1] + distribution[2];
  const neutrals = distribution[3];
  const nps =
    total > 0 ? Math.round((promoters / total) * 100 - (detractors / total) * 100) : 0;

  const agentIds = topAgents.map((a) => a.agentId).filter(Boolean) as string[];
  const agents = await db.user.findMany({
    where: { id: { in: agentIds } },
    select: { id: true, name: true },
  });
  const agentMap = Object.fromEntries(agents.map((a) => [a.id, a.name]));

  const trendBuckets = (() => {
    if (!fromDate) return [];
    const bucketDays = Math.min(days ?? 30, 90);
    const map = new Map<string, { sum: number; n: number }>();
    for (let i = bucketDays - 1; i >= 0; i--) {
      const d = daysAgo(i);
      map.set(d.toISOString().slice(0, 10), { sum: 0, n: 0 });
    }
    for (const r of ratingsByDay) {
      if (!r.answeredAt) continue;
      const key = r.answeredAt.toISOString().slice(0, 10);
      const bucket = map.get(key);
      if (!bucket) continue;
      bucket.sum += r.rating;
      bucket.n++;
    }
    return Array.from(map.entries()).map(([date, { sum, n }]) => ({
      date: new Date(date).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' }),
      avg: n === 0 ? null : Number((sum / n).toFixed(2)),
      count: n,
    }));
  })();

  const formatDelta = (curr: number, prior: number) => {
    if (prior === 0) return null;
    const diff = curr - prior;
    if (Math.abs(diff) < 0.01) return { direction: 'flat' as const, label: 'estável', pct: 0 };
    const pct = Math.round((diff / prior) * 100);
    return {
      direction: (diff > 0 ? 'up' : 'down') as 'up' | 'down',
      label: `${diff > 0 ? '+' : ''}${diff.toFixed(2)}`,
      pct: Math.abs(pct),
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="micro-label-accent">Satisfação · CSAT</p>
          <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white">
            Pesquisa de satisfação
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            <span className="font-mono-tech">{total}</span> resposta{total === 1 ? '' : 's'} no período ·
            NPS <span className={`font-mono-tech font-bold ${nps >= 50 ? 'text-emerald-600' : nps >= 0 ? 'text-amber-600' : 'text-rose-600'}`}>{nps > 0 ? '+' : ''}{nps}</span>
          </p>
        </div>
        <Link
          href="/admin/relatorios"
          className="text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400"
        >
          ← Todos os relatórios
        </Link>
      </div>

      {/* Period segmented */}
      <div className="-mx-1 overflow-x-auto px-1">
        <div className="inline-flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-1 shadow-elevate dark:border-slate-700 dark:bg-slate-800">
          {PERIOD_OPTIONS.map((p) => {
            const isActive = period === p.key;
            return (
              <Link
                key={p.key}
                href={`/admin/relatorios/csat?period=${p.key}`}
                className={
                  isActive
                    ? 'rounded-md bg-fluxo-500 px-3 py-1.5 text-xs font-semibold text-white shadow-fluxo'
                    : 'rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700/60'
                }
              >
                {p.label}
              </Link>
            );
          })}
        </div>
      </div>

      {total === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-600 dark:bg-slate-800">
          <Smile className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
          <p className="mt-3 text-sm text-slate-500">
            Nenhuma resposta de CSAT no período selecionado.
          </p>
          <p className="mt-1 text-xs text-slate-400">
            As pesquisas são enviadas automaticamente após chamados serem resolvidos.
          </p>
        </div>
      ) : (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="CSAT médio"
              value={avgRating.toFixed(2)}
              suffix="/5"
              description={`${total} resposta${total === 1 ? '' : 's'}`}
              icon={<Star className="h-4 w-4" aria-hidden="true" />}
              tone="purple"
              delta={priorAvg > 0 ? formatDelta(avgRating, priorAvg) ?? undefined : undefined}
            />
            <KpiCard
              label="NPS"
              value={nps > 0 ? `+${nps}` : String(nps)}
              description={`${promoters} promotores · ${detractors} detratores`}
              icon={<TrendingUp className="h-4 w-4" aria-hidden="true" />}
              tone={nps >= 50 ? 'emerald' : nps >= 0 ? 'amber' : 'rose'}
            />
            <KpiCard
              label="Promotores"
              value={total > 0 ? `${Math.round((promoters / total) * 100)}` : '0'}
              suffix="%"
              description={`${promoters} de ${total} (notas 4-5)`}
              icon={<Smile className="h-4 w-4" aria-hidden="true" />}
              tone="emerald"
            />
            <KpiCard
              label="Detratores"
              value={total > 0 ? `${Math.round((detractors / total) * 100)}` : '0'}
              suffix="%"
              description={`${detractors} de ${total} (notas 1-2)`}
              icon={<MessageSquare className="h-4 w-4" aria-hidden="true" />}
              tone="rose"
              invertDelta
            />
          </div>

          {/* Distribution + trend */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Distribuição */}
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-elevate dark:border-slate-700 dark:bg-slate-800">
              <div className="border-b border-slate-200 px-5 py-3 dark:border-slate-700">
                <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-slate-900 dark:text-white">
                  <Star className="h-3.5 w-3.5 text-purple-500" aria-hidden="true" />
                  Distribuição
                </h2>
              </div>
              <div className="space-y-2 p-5">
                {[5, 4, 3, 2, 1].map((rating) => {
                  const count = distribution[rating];
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  const tone =
                    rating >= 4
                      ? 'bg-emerald-500'
                      : rating === 3
                        ? 'bg-amber-500'
                        : 'bg-rose-500';
                  return (
                    <div key={rating} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5">
                          <span aria-hidden="true" className="text-base">
                            {CSAT_EMOJIS[rating]}
                          </span>
                          <span className="font-medium text-slate-700 dark:text-slate-200">
                            {CSAT_LABELS[rating]}
                          </span>
                        </span>
                        <span className="font-mono-tech text-slate-600 dark:text-slate-300">
                          <strong>{count}</strong> · {pct}%
                        </span>
                      </div>
                      <div
                        role="progressbar"
                        aria-valuenow={count}
                        aria-valuemin={0}
                        aria-valuemax={total}
                        aria-label={`${CSAT_LABELS[rating]}: ${count} de ${total}`}
                        className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700"
                      >
                        <div
                          className={`h-full rounded-full ${tone} transition-all`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tendência */}
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-elevate dark:border-slate-700 dark:bg-slate-800 lg:col-span-2">
              <div className="border-b border-slate-200 px-5 py-3 dark:border-slate-700">
                <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-slate-900 dark:text-white">
                  <TrendingUp className="h-3.5 w-3.5 text-fluxo-500" aria-hidden="true" />
                  Tendência
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Média diária de rating no período
                </p>
              </div>
              <div className="p-5">
                <CsatTrendChart data={trendBuckets} />
              </div>
            </div>
          </div>

          {/* Top agents + comments */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-elevate dark:border-slate-700 dark:bg-slate-800">
              <div className="border-b border-slate-200 px-5 py-3 dark:border-slate-700">
                <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-slate-900 dark:text-white">
                  <Award className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
                  Top atendentes
                </h2>
              </div>
              {topAgents.length === 0 ? (
                <p className="p-5 text-xs text-slate-500">Sem dados de agentes ainda.</p>
              ) : (
                <ol className="space-y-3 p-5">
                  {topAgents.map((a, i) => {
                    const name = a.agentId ? agentMap[a.agentId] : null;
                    if (!name) return null;
                    const avg = a._avg.rating ?? 0;
                    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
                    const pct = (avg / 5) * 100;
                    return (
                      <li key={a.agentId} className="space-y-1">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="flex min-w-0 items-center gap-2">
                            <span
                              aria-hidden="true"
                              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-fluxo-500/10 text-[10px] font-bold text-fluxo-600 ring-1 ring-inset ring-fluxo-500/20"
                            >
                              {medal ?? name.slice(0, 1).toUpperCase()}
                            </span>
                            <span className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                              {name}
                            </span>
                          </span>
                          <span className="flex items-center gap-2">
                            <span className="font-mono-tech text-xs text-slate-500">
                              {a._count.rating} resp.
                            </span>
                            <span className="font-mono-tech text-sm font-bold text-slate-900 dark:text-white">
                              {avg.toFixed(2)}
                            </span>
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                          <div
                            className="h-full rounded-full bg-fluxo-gradient"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-elevate dark:border-slate-700 dark:bg-slate-800">
              <div className="border-b border-slate-200 px-5 py-3 dark:border-slate-700">
                <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-slate-900 dark:text-white">
                  <MessageSquare className="h-3.5 w-3.5 text-fluxo-500" aria-hidden="true" />
                  Comentários recentes
                </h2>
              </div>
              {recentComments.length === 0 ? (
                <p className="p-5 text-xs text-slate-500">Nenhum comentário ainda.</p>
              ) : (
                <ul role="list" className="divide-y divide-slate-100 dark:divide-slate-700">
                  {recentComments.map((c) => (
                    <li key={c.id} className="px-5 py-3">
                      <div className="flex items-start gap-3">
                        <span
                          aria-hidden="true"
                          className="mt-0.5 text-lg leading-none"
                          title={CSAT_LABELS[c.rating]}
                        >
                          {CSAT_EMOJIS[c.rating]}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/admin/chamados/${c.ticket.id}`}
                              className="font-mono-tech text-[10px] text-fluxo-600 hover:underline dark:text-cyan-400"
                            >
                              {c.ticket.ticketNumber}
                            </Link>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {c.ticket.client.name}
                            </span>
                          </div>
                          <p className="mt-1 line-clamp-2 text-xs text-slate-700 dark:text-slate-200">
                            &ldquo;{c.comment}&rdquo;
                          </p>
                          <p className="mt-1 font-mono-tech text-[10px] text-slate-400">
                            {formatRelative(c.answeredAt)}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
