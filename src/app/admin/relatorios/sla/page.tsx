import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ShieldCheck,
  AlertOctagon,
  Clock,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { SlaTrendChart } from './sla-trend-chart';

export const metadata: Metadata = {
  title: 'SLA · Relatórios',
  description: 'Dashboard de cumprimento de SLA por cliente, agente e período',
};

export const revalidate = 120;

function daysAgo(n: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export default async function SlaDashboardPage() {
  const session = await auth();
  if (!session?.user) return null;

  const monthStart = startOfMonth();
  const thirtyDaysAgo = daysAgo(30);
  const now = new Date();

  // ─── Resolvidos no mês ───
  const resolvedThisMonth = await db.ticket.findMany({
    where: {
      deletedAt: null,
      resolvedAt: { gte: monthStart },
    },
    select: {
      id: true,
      clientId: true,
      assignedToId: true,
      createdAt: true,
      resolvedAt: true,
      resolutionDueAt: true,
    },
  });

  let onTime = 0;
  let breached = 0;
  for (const t of resolvedThisMonth) {
    if (!t.resolvedAt) continue;
    if (t.resolutionDueAt) {
      if (t.resolvedAt <= t.resolutionDueAt) onTime++;
      else breached++;
    } else {
      onTime++;
    }
  }
  const total = onTime + breached;
  const slaPct = total === 0 ? 100 : Math.round((onTime / total) * 100);

  // ─── Em risco AGORA (chamados abertos com SLA estourado ou em warning) ───
  const openTickets = await db.ticket.findMany({
    where: {
      deletedAt: null,
      status: { in: ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_CLIENT', 'REOPENED'] },
      resolutionDueAt: { not: null },
    },
    select: {
      id: true,
      clientId: true,
      assignedToId: true,
      resolutionDueAt: true,
      createdAt: true,
    },
  });

  let breachedNow = 0;
  let warningNow = 0;
  for (const t of openTickets) {
    if (!t.resolutionDueAt) continue;
    const remainMs = t.resolutionDueAt.getTime() - now.getTime();
    if (remainMs <= 0) breachedNow++;
    else if (remainMs <= 2 * 60 * 60 * 1000) warningNow++; // < 2h
  }

  // ─── Tendência 30 dias (% SLA por dia) ───
  const last30 = await db.ticket.findMany({
    where: {
      deletedAt: null,
      resolvedAt: { gte: thirtyDaysAgo },
    },
    select: { resolvedAt: true, resolutionDueAt: true },
  });

  const buckets = new Map<string, { onTime: number; breached: number }>();
  for (let i = 30; i >= 0; i--) {
    const d = daysAgo(i);
    const key = d.toISOString().slice(0, 10);
    buckets.set(key, { onTime: 0, breached: 0 });
  }
  for (const t of last30) {
    if (!t.resolvedAt) continue;
    const key = t.resolvedAt.toISOString().slice(0, 10);
    const b = buckets.get(key);
    if (!b) continue;
    if (t.resolutionDueAt) {
      if (t.resolvedAt <= t.resolutionDueAt) b.onTime++;
      else b.breached++;
    } else {
      b.onTime++;
    }
  }

  const trend = Array.from(buckets.entries()).map(([date, b]) => {
    const t = b.onTime + b.breached;
    return {
      date,
      label: date.slice(8, 10) + '/' + date.slice(5, 7),
      slaPct: t === 0 ? null : Math.round((b.onTime / t) * 100),
      volume: t,
    };
  });

  // ─── Tabela por cliente ───
  const clientStats = new Map<string, { onTime: number; breached: number }>();
  for (const t of resolvedThisMonth) {
    if (!t.resolvedAt) continue;
    const k = t.clientId;
    if (!clientStats.has(k)) clientStats.set(k, { onTime: 0, breached: 0 });
    const s = clientStats.get(k)!;
    if (t.resolutionDueAt && t.resolvedAt > t.resolutionDueAt) s.breached++;
    else s.onTime++;
  }
  const clientIds = Array.from(clientStats.keys());
  const clients = clientIds.length
    ? await db.client.findMany({
        where: { id: { in: clientIds } },
        select: { id: true, name: true },
      })
    : [];
  const clientMap = new Map(clients.map((c) => [c.id, c.name]));
  const clientRows = Array.from(clientStats.entries())
    .map(([id, s]) => {
      const t = s.onTime + s.breached;
      return {
        id,
        name: clientMap.get(id) ?? '(removido)',
        total: t,
        onTime: s.onTime,
        breached: s.breached,
        pct: t === 0 ? 0 : Math.round((s.onTime / t) * 100),
      };
    })
    .filter((r) => r.total > 0)
    .sort((a, b) => a.pct - b.pct);

  // ─── Tabela por agente ───
  const agentStats = new Map<string, { onTime: number; breached: number }>();
  for (const t of resolvedThisMonth) {
    if (!t.resolvedAt || !t.assignedToId) continue;
    const k = t.assignedToId;
    if (!agentStats.has(k)) agentStats.set(k, { onTime: 0, breached: 0 });
    const s = agentStats.get(k)!;
    if (t.resolutionDueAt && t.resolvedAt > t.resolutionDueAt) s.breached++;
    else s.onTime++;
  }
  const agentIds = Array.from(agentStats.keys());
  const agents = agentIds.length
    ? await db.user.findMany({
        where: { id: { in: agentIds } },
        select: { id: true, name: true },
      })
    : [];
  const agentMap = new Map(agents.map((a) => [a.id, a.name]));
  const agentRows = Array.from(agentStats.entries())
    .map(([id, s]) => {
      const t = s.onTime + s.breached;
      return {
        id,
        name: agentMap.get(id) ?? '(removido)',
        total: t,
        onTime: s.onTime,
        breached: s.breached,
        pct: t === 0 ? 0 : Math.round((s.onTime / t) * 100),
      };
    })
    .filter((r) => r.total > 0)
    .sort((a, b) => b.pct - a.pct);

  function badgePct(pct: number) {
    if (pct >= 95) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400';
    if (pct >= 80) return 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400';
    return 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400';
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
        <Link href="/admin/relatorios" className="inline-flex items-center gap-1 hover:text-fluxo-500">
          Relatórios
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-slate-500">SLA</span>
      </div>

      {/* Header */}
      <div>
        <p className="micro-label-accent">Cumprimento de prazo</p>
        <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white">SLA</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Performance de SLA do mês corrente + risco operacional agora.
        </p>
      </div>

      {/* KPIs */}
      <section aria-labelledby="kpis-heading" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <h2 id="kpis-heading" className="sr-only">Indicadores principais</h2>
        <KpiCard
          icon={<TrendingUp className="h-4 w-4" aria-hidden="true" />}
          label="Resolvidos no mês"
          value={total}
          description="Total no período corrente"
          tone="fluxo"
        />
        <KpiCard
          icon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />}
          label="SLA em dia"
          value={`${slaPct}%`}
          description={`${onTime} OK / ${breached} fora`}
          tone={slaPct >= 95 ? 'emerald' : slaPct >= 80 ? 'amber' : 'rose'}
        />
        <KpiCard
          icon={<AlertOctagon className="h-4 w-4" aria-hidden="true" />}
          label="Estourado agora"
          value={breachedNow}
          description="Chamados abertos com SLA vencido"
          tone={breachedNow > 0 ? 'rose' : 'emerald'}
        />
        <KpiCard
          icon={<Clock className="h-4 w-4" aria-hidden="true" />}
          label="Em risco (< 2h)"
          value={warningNow}
          description="Restando menos de 2h"
          tone={warningNow > 0 ? 'amber' : 'emerald'}
        />
      </section>

      {/* Alerta */}
      {(breachedNow > 0 || warningNow > 0) && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-rose-200 bg-rose-50/60 p-4 dark:border-rose-900/60 dark:bg-rose-950/30">
          <AlertOctagon className="h-4 w-4 text-rose-600" aria-hidden="true" />
          <p className="flex-1 text-sm text-rose-800 dark:text-rose-200">
            {breachedNow > 0 && (
              <>
                <strong>{breachedNow}</strong> chamado{breachedNow === 1 ? '' : 's'} com SLA estourado
              </>
            )}
            {breachedNow > 0 && warningNow > 0 && ' · '}
            {warningNow > 0 && (
              <>
                <strong>{warningNow}</strong> com menos de 2h restantes
              </>
            )}
          </p>
          <Link
            href={`/admin/chamados?sla=${breachedNow > 0 ? 'breached' : 'warning'}`}
            className="inline-flex items-center gap-1 rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-rose-700"
          >
            Ver chamados
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        </div>
      )}

      {/* Tendência 30 dias */}
      <section
        aria-labelledby="trend-heading"
        className="rounded-lg border border-slate-200 bg-white p-5 shadow-elevate dark:border-slate-700 dark:bg-slate-800"
      >
        <h2 id="trend-heading" className="font-display text-base font-semibold text-slate-900 dark:text-white">
          Tendência de SLA · últimos 30 dias
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Cada ponto = % de chamados resolvidos dentro do prazo no dia. Dias sem resolução ficam em branco.
        </p>
        <div className="mt-4 h-72">
          <SlaTrendChart data={trend} />
        </div>
      </section>

      {/* Tabelas */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Por cliente */}
        <section
          aria-labelledby="by-client-heading"
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-elevate dark:border-slate-700 dark:bg-slate-800"
        >
          <h2 id="by-client-heading" className="font-display text-sm font-semibold text-slate-900 dark:text-white">
            Por cliente (pior primeiro)
          </h2>
          {clientRows.length === 0 ? (
            <p className="mt-3 text-xs text-slate-500">Sem dados de SLA no período.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b border-slate-200 text-left text-[10px] uppercase tracking-wide text-slate-500 dark:border-slate-700">
                  <tr>
                    <th scope="col" className="py-2 font-medium">Cliente</th>
                    <th scope="col" className="py-2 text-right font-medium">Total</th>
                    <th scope="col" className="py-2 text-right font-medium">SLA OK</th>
                    <th scope="col" className="py-2 text-right font-medium">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {clientRows.slice(0, 10).map((r) => (
                    <tr key={r.id}>
                      <td className="py-2">
                        <Link href={`/admin/clientes/${r.id}`} className="text-slate-700 hover:text-fluxo-600 dark:text-slate-200">
                          {r.name}
                        </Link>
                      </td>
                      <td className="py-2 text-right font-mono-tech text-slate-600 dark:text-slate-400">{r.total}</td>
                      <td className="py-2 text-right font-mono-tech text-slate-600 dark:text-slate-400">{r.onTime}</td>
                      <td className="py-2 text-right">
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${badgePct(r.pct)}`}>
                          {r.pct}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Por agente */}
        <section
          aria-labelledby="by-agent-heading"
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-elevate dark:border-slate-700 dark:bg-slate-800"
        >
          <h2 id="by-agent-heading" className="font-display text-sm font-semibold text-slate-900 dark:text-white">
            Por agente (melhor primeiro)
          </h2>
          {agentRows.length === 0 ? (
            <p className="mt-3 text-xs text-slate-500">Sem dados de agente atribuído no período.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b border-slate-200 text-left text-[10px] uppercase tracking-wide text-slate-500 dark:border-slate-700">
                  <tr>
                    <th scope="col" className="py-2 font-medium">Agente</th>
                    <th scope="col" className="py-2 text-right font-medium">Total</th>
                    <th scope="col" className="py-2 text-right font-medium">SLA OK</th>
                    <th scope="col" className="py-2 text-right font-medium">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {agentRows.slice(0, 10).map((r) => (
                    <tr key={r.id}>
                      <td className="py-2 text-slate-700 dark:text-slate-200">{r.name}</td>
                      <td className="py-2 text-right font-mono-tech text-slate-600 dark:text-slate-400">{r.total}</td>
                      <td className="py-2 text-right font-mono-tech text-slate-600 dark:text-slate-400">{r.onTime}</td>
                      <td className="py-2 text-right">
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${badgePct(r.pct)}`}>
                          {r.pct}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
