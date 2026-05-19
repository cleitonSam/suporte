import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Activity,
  AlertOctagon,
  Building2,
  Smile,
  Gauge,
  TrendingDown,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { KpiCard } from '@/components/dashboard/kpi-card';

export const metadata: Metadata = {
  title: 'Saúde dos clientes · Relatórios',
  description: 'Health score baseado em CSAT, SLA, volume e reabertura',
};

export const revalidate = 300;

type Health = 'green' | 'yellow' | 'red';

interface ClientHealth {
  id: string;
  name: string;
  status: string;
  // Sinais
  ticketsLast30: number;
  ticketsActive: number;
  csatAvg: number | null;
  csatCount: number;
  slaCompliancePct: number;
  reopenedPct: number;
  lastTicketAt: Date | null;
  // Score final
  health: Health;
  reasons: string[];
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function classify(c: ClientHealth): { health: Health; reasons: string[] } {
  const reasons: string[] = [];
  let red = 0;
  let yellow = 0;

  // CSAT
  if (c.csatCount >= 2) {
    if (c.csatAvg !== null && c.csatAvg < 3.5) {
      red++;
      reasons.push(`CSAT baixo: ${c.csatAvg.toFixed(1)}`);
    } else if (c.csatAvg !== null && c.csatAvg < 4.2) {
      yellow++;
      reasons.push(`CSAT médio: ${c.csatAvg.toFixed(1)}`);
    }
  }

  // SLA compliance
  if (c.slaCompliancePct < 80) {
    red++;
    reasons.push(`SLA: ${c.slaCompliancePct}% (crítico)`);
  } else if (c.slaCompliancePct < 95) {
    yellow++;
    reasons.push(`SLA: ${c.slaCompliancePct}% (atenção)`);
  }

  // Reabertura
  if (c.reopenedPct > 15) {
    red++;
    reasons.push(`Reabertura ${c.reopenedPct}%`);
  } else if (c.reopenedPct > 5) {
    yellow++;
    reasons.push(`Reabertura ${c.reopenedPct}%`);
  }

  // Engagement (sumiu)
  const daysSinceLast =
    c.lastTicketAt && Math.floor((Date.now() - c.lastTicketAt.getTime()) / 86_400_000);
  if (c.ticketsLast30 === 0 && daysSinceLast !== null && daysSinceLast > 60) {
    yellow++;
    reasons.push('Sem chamados há 60+ dias');
  }

  const health: Health = red >= 1 ? 'red' : yellow >= 1 ? 'yellow' : 'green';
  return { health, reasons };
}

export default async function HealthScorePage() {
  const session = await auth();
  if (!session?.user || session.user.userType !== 'AGENT') return null;

  const thirtyDaysAgo = daysAgo(30);

  const clients = await db.client.findMany({
    where: { deletedAt: null, status: { not: 'INACTIVE' } },
    select: {
      id: true,
      name: true,
      status: true,
      _count: {
        select: {
          tickets: {
            where: { deletedAt: null, status: { in: ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_CLIENT', 'REOPENED'] } },
          },
        },
      },
      tickets: {
        where: { deletedAt: null, createdAt: { gte: thirtyDaysAgo } },
        select: {
          id: true,
          slaBreached: true,
          reopenedCount: true,
          createdAt: true,
          status: true,
          csatSurveys: {
            where: { rating: { gt: 0 } },
            select: { rating: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  const results: ClientHealth[] = clients.map((c) => {
    const ticketsLast30 = c.tickets.length;
    const breached = c.tickets.filter((t) => t.slaBreached).length;
    const slaCompliancePct =
      ticketsLast30 > 0 ? Math.round(((ticketsLast30 - breached) / ticketsLast30) * 100) : 100;
    const reopened = c.tickets.filter((t) => t.reopenedCount > 0).length;
    const reopenedPct =
      ticketsLast30 > 0 ? Math.round((reopened / ticketsLast30) * 100) : 0;

    const ratings = c.tickets.flatMap((t) => t.csatSurveys.map((s) => s.rating));
    const csatCount = ratings.length;
    const csatAvg =
      csatCount > 0 ? ratings.reduce((s, r) => s + r, 0) / csatCount : null;

    const lastTicketAt = c.tickets[0]?.createdAt ?? null;

    const base: Omit<ClientHealth, 'health' | 'reasons'> = {
      id: c.id,
      name: c.name,
      status: c.status,
      ticketsLast30,
      ticketsActive: c._count.tickets,
      csatAvg,
      csatCount,
      slaCompliancePct,
      reopenedPct,
      lastTicketAt,
    };
    const { health, reasons } = classify(base as ClientHealth);
    return { ...base, health, reasons };
  });

  // Ordena: vermelhos > amarelos > verdes; dentro de cada, mais ativos primeiro
  const order: Record<Health, number> = { red: 0, yellow: 1, green: 2 };
  results.sort((a, b) => {
    if (order[a.health] !== order[b.health]) return order[a.health] - order[b.health];
    return b.ticketsActive - a.ticketsActive;
  });

  const totals = {
    red: results.filter((r) => r.health === 'red').length,
    yellow: results.filter((r) => r.health === 'yellow').length,
    green: results.filter((r) => r.health === 'green').length,
    total: results.length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="micro-label-accent">Saúde · carteira</p>
          <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white">
            Health Score
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            <span className="font-mono-tech">{totals.total}</span> clientes ativos · score baseado em CSAT, SLA, reabertura e engajamento dos últimos 30 dias.
          </p>
        </div>
        <Link
          href="/admin/relatorios"
          className="text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400"
        >
          ← Todos os relatórios
        </Link>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="🟢 Saudáveis"
          value={totals.green}
          description={`${Math.round((totals.green / Math.max(1, totals.total)) * 100)}% da carteira`}
          icon={<Smile className="h-4 w-4" aria-hidden="true" />}
          tone="emerald"
        />
        <KpiCard
          label="🟡 Atenção"
          value={totals.yellow}
          description={totals.yellow > 0 ? 'Monitorar de perto' : 'Tudo certo'}
          icon={<Gauge className="h-4 w-4" aria-hidden="true" />}
          tone="amber"
        />
        <KpiCard
          label="🔴 Em risco"
          value={totals.red}
          description={totals.red > 0 ? 'Ação imediata' : 'Sem riscos críticos'}
          icon={<AlertOctagon className="h-4 w-4" aria-hidden="true" />}
          tone="rose"
        />
      </div>

      {/* Alert se há vermelhos */}
      {totals.red > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-rose-200 bg-rose-50/60 p-4 dark:border-rose-900/60 dark:bg-rose-950/30">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-rose-500/20 text-rose-700 ring-1 ring-inset ring-rose-500/30">
            <AlertOctagon className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="flex-1 text-sm text-rose-800 dark:text-rose-200">
            <strong className="font-mono-tech">{totals.red}</strong> cliente
            {totals.red === 1 ? '' : 's'} em <strong>risco</strong> precisa
            {totals.red === 1 ? '' : 'm'} de atenção imediata. Recomendação:
            ligar nas próximas 24h, marcar QBR.
          </div>
        </div>
      )}

      {/* Lista de clientes */}
      {results.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-600 dark:bg-slate-800">
          <Building2 className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
          <p className="mt-3 text-sm text-slate-500">Nenhum cliente ativo na carteira.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-elevate dark:border-slate-700 dark:bg-slate-800">
          <ul role="list" className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {results.map((c) => (
              <ClientHealthRow key={c.id} c={c} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ClientHealthRow({ c }: { c: ClientHealth }) {
  const tones = {
    green: { dot: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-300', label: 'Saudável' },
    yellow: { dot: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-300', label: 'Atenção' },
    red: { dot: 'bg-rose-500', text: 'text-rose-700 dark:text-rose-300', label: 'Em risco' },
  };
  const tone = tones[c.health];

  return (
    <li className="group transition-colors hover:bg-fluxo-50/40 dark:hover:bg-slate-700/40">
      <div className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center">
        {/* Header: dot + nome + status */}
        <div className="flex items-center gap-3 md:w-64">
          <span
            aria-hidden="true"
            className={`relative inline-flex h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-inset ring-current/30 ${tone.dot}`}
          >
            {c.health === 'red' && (
              <span
                aria-hidden="true"
                className={`absolute -inset-1 animate-ping rounded-full opacity-50 ${tone.dot}`}
              />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <Link
              href={`/admin/clientes/${c.id}`}
              className="block truncate font-medium text-slate-900 transition-colors hover:text-fluxo-600 dark:text-slate-100 dark:hover:text-cyan-400"
            >
              {c.name}
            </Link>
            <p className={`font-mono-tech text-[10px] uppercase tracking-tech ${tone.text}`}>
              [ {tone.label} ]
            </p>
          </div>
        </div>

        {/* Métricas */}
        <div className="grid flex-1 grid-cols-2 gap-3 text-xs md:grid-cols-4">
          <Metric
            icon={<Activity className="h-3 w-3" />}
            label="Tickets 30d"
            value={String(c.ticketsLast30)}
          />
          <Metric
            icon={<Gauge className="h-3 w-3" />}
            label="SLA"
            value={`${c.slaCompliancePct}%`}
            tone={c.slaCompliancePct < 80 ? 'rose' : c.slaCompliancePct < 95 ? 'amber' : 'emerald'}
          />
          <Metric
            icon={<Smile className="h-3 w-3" />}
            label="CSAT"
            value={c.csatAvg !== null ? c.csatAvg.toFixed(1) : '—'}
            tone={
              c.csatAvg === null
                ? 'slate'
                : c.csatAvg < 3.5
                  ? 'rose'
                  : c.csatAvg < 4.2
                    ? 'amber'
                    : 'emerald'
            }
          />
          <Metric
            icon={<TrendingDown className="h-3 w-3" />}
            label="Reaberto"
            value={`${c.reopenedPct}%`}
            tone={c.reopenedPct > 15 ? 'rose' : c.reopenedPct > 5 ? 'amber' : 'slate'}
          />
        </div>

        {/* Motivos + CTA */}
        <div className="flex items-center gap-3 md:w-72 md:justify-end">
          {c.reasons.length > 0 ? (
            <div className="flex flex-wrap gap-1 text-[10px]">
              {c.reasons.slice(0, 2).map((r, i) => (
                <span
                  key={i}
                  className={`inline-flex items-center rounded font-mono-tech px-1.5 py-0.5 ${
                    c.health === 'red'
                      ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300'
                      : 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
                  }`}
                >
                  {r}
                </span>
              ))}
              {c.reasons.length > 2 && (
                <span className="font-mono-tech text-[10px] text-slate-400">
                  +{c.reasons.length - 2}
                </span>
              )}
            </div>
          ) : (
            <span className="inline-flex items-center gap-1 font-mono-tech text-[10px] text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-3 w-3" aria-hidden="true" />
              Tudo OK
            </span>
          )}
          <Link
            href={`/admin/clientes/${c.id}`}
            aria-label={`Abrir ${c.name}`}
            className="inline-flex items-center gap-0.5 text-xs font-medium text-fluxo-600 opacity-0 transition-opacity group-hover:opacity-100 dark:text-cyan-400"
          >
            Abrir
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </li>
  );
}

function Metric({
  icon,
  label,
  value,
  tone = 'slate',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: 'slate' | 'emerald' | 'amber' | 'rose';
}) {
  const toneText = {
    slate: 'text-slate-700 dark:text-slate-300',
    emerald: 'text-emerald-700 dark:text-emerald-300',
    amber: 'text-amber-700 dark:text-amber-300',
    rose: 'text-rose-700 dark:text-rose-300',
  }[tone];

  return (
    <div>
      <p className="flex items-center gap-1 micro-label">
        <span aria-hidden="true" className="text-slate-400">
          {icon}
        </span>
        {label}
      </p>
      <p className={`mt-0.5 font-mono-tech text-sm font-semibold ${toneText}`}>{value}</p>
    </div>
  );
}
