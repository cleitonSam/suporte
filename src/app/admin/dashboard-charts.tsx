'use client';

import { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Trophy, TrendingUp, Layers, Flame } from 'lucide-react';

interface DashboardChartsProps {
  dailyTickets: { date: string; count: number }[];
  statusCounts: { status: string; count: number; label: string }[];
  priorityCounts: { priority: string; count: number; label: string }[];
  topAgents: { name: string; count: number }[];
}

const FLUXO_COLORS = {
  primary: '#0066FF',
  cyan: '#00C2CB',
  darkBlue: '#0052CC',
};

const STATUS_COLORS: Record<string, string> = {
  NEW: '#0066FF',
  OPEN: '#06B6D4',
  IN_PROGRESS: '#F59E0B',
  WAITING_CLIENT: '#A855F7',
  RESOLVED: '#10B981',
  CLOSED: '#64748B',
  REOPENED: '#EF4444',
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: '#94A3B8',
  MEDIUM: '#0066FF',
  HIGH: '#F97316',
  URGENT: '#DC2626',
};

const PRIORITY_LABEL: Record<string, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
  URGENT: 'Urgente',
};

function useIsDark() {
  const [dark, setDark] = useState(true);
  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
    const obs = new MutationObserver(() => {
      setDark(document.documentElement.classList.contains('dark'));
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

function ChartCard({
  icon,
  title,
  subtitle,
  children,
  className = '',
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800 ${className}`}
    >
      <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-3 dark:border-slate-700">
        <span
          aria-hidden="true"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-fluxo-500/10 text-fluxo-600 ring-1 ring-inset ring-fluxo-500/20"
        >
          {icon}
        </span>
        <div>
          <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
            {title}
          </h3>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Empty() {
  return (
    <div className="flex h-[260px] items-center justify-center text-xs text-slate-400">
      Sem dados ainda.
    </div>
  );
}

export default function DashboardCharts({
  dailyTickets,
  statusCounts,
  priorityCounts,
  topAgents,
}: DashboardChartsProps) {
  const isDark = useIsDark();

  const gridColor = isDark ? '#1e293b' : '#E2E8F0';
  const axisColor = isDark ? '#64748b' : '#94A3B8';
  const tooltipStyle = {
    backgroundColor: isDark ? '#0f172a' : '#FFFFFF',
    border: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`,
    borderRadius: '8px',
    boxShadow: isDark
      ? '0 10px 30px -10px rgba(0,0,0,0.6)'
      : '0 10px 30px -10px rgba(15,23,42,0.12)',
    color: isDark ? '#e2e8f0' : '#0F172A',
    padding: '8px 12px',
    fontSize: '12px',
  };

  const total = statusCounts.reduce((s, c) => s + c.count, 0);
  const totalPriority = priorityCounts.reduce((s, c) => s + c.count, 0);

  const peakDay = dailyTickets.reduce(
    (max, d) => (d.count > max.count ? d : max),
    dailyTickets[0] ?? { date: '', count: 0 },
  );

  const sortedAgents = [...topAgents].sort((a, b) => b.count - a.count);
  const agentMax = sortedAgents[0]?.count ?? 1;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* Volume trend — full width-ish */}
      <ChartCard
        icon={<TrendingUp className="h-4 w-4" />}
        title="Volume de chamados"
        subtitle={
          peakDay && peakDay.count > 0
            ? `Pico em ${peakDay.date}: ${peakDay.count} aberturas`
            : 'Últimos 30 dias'
        }
        className="lg:col-span-2"
      >
        {dailyTickets.length === 0 ? (
          <Empty />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={dailyTickets} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="volumeFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={FLUXO_COLORS.primary} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={FLUXO_COLORS.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                stroke={axisColor}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                interval={'preserveStartEnd'}
              />
              <YAxis stroke={axisColor} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value) => [`${value} chamado${(value as number) === 1 ? '' : 's'}`, '']}
                separator=""
                cursor={{ stroke: FLUXO_COLORS.primary, strokeOpacity: 0.2 }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke={FLUXO_COLORS.primary}
                strokeWidth={2}
                fill="url(#volumeFill)"
                dot={false}
                activeDot={{ r: 5, fill: FLUXO_COLORS.primary, stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* Priority — donut */}
      <ChartCard
        icon={<Flame className="h-4 w-4" />}
        title="Prioridade"
        subtitle={totalPriority > 0 ? `${totalPriority} chamados no total` : 'Distribuição atual'}
      >
        {priorityCounts.length === 0 ? (
          <Empty />
        ) : (
          <div className="flex items-center justify-between gap-4">
            <div className="relative h-[180px] w-[180px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={priorityCounts}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="count"
                    isAnimationActive={false}
                  >
                    {priorityCounts.map((entry) => (
                      <Cell
                        key={entry.priority}
                        fill={PRIORITY_COLORS[entry.priority] ?? FLUXO_COLORS.primary}
                        stroke="transparent"
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value, _name, entry) => {
                      const p = (entry?.payload as { priority?: string })?.priority ?? '';
                      return [`${value} (${PRIORITY_LABEL[p] ?? p})`, ''];
                    }}
                    separator=""
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                  {totalPriority}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  total
                </span>
              </div>
            </div>
            <ul className="flex-1 space-y-1.5 text-xs">
              {priorityCounts.map((p) => (
                <li key={p.priority} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: PRIORITY_COLORS[p.priority] ?? FLUXO_COLORS.primary }}
                    />
                    <span className="text-slate-700 dark:text-slate-200">
                      {PRIORITY_LABEL[p.priority] ?? p.priority}
                    </span>
                  </span>
                  <span className="font-semibold tabular-nums text-slate-900 dark:text-white">
                    {p.count}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </ChartCard>

      {/* Status breakdown — bar chart */}
      <ChartCard
        icon={<Layers className="h-4 w-4" />}
        title="Por status"
        subtitle={total > 0 ? `${total} chamados em todas as etapas` : 'Distribuição atual'}
        className="lg:col-span-2"
      >
        {statusCounts.length === 0 ? (
          <Empty />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={statusCounts}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
              barCategoryGap={8}
            >
              <CartesianGrid stroke={gridColor} strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" stroke={axisColor} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis
                dataKey="label"
                type="category"
                stroke={axisColor}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={120}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value) => [`${value} chamado${(value as number) === 1 ? '' : 's'}`, '']}
                separator=""
                cursor={{ fill: 'rgba(0, 102, 255, 0.05)' }}
              />
              <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                {statusCounts.map((entry) => (
                  <Cell
                    key={entry.status}
                    fill={STATUS_COLORS[entry.status] ?? FLUXO_COLORS.primary}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* Top agents leaderboard */}
      <ChartCard
        icon={<Trophy className="h-4 w-4" />}
        title="Top atendentes"
        subtitle="Chamados resolvidos no período"
      >
        {sortedAgents.length === 0 ? (
          <Empty />
        ) : (
          <ol className="space-y-3">
            {sortedAgents.slice(0, 5).map((a, i) => {
              const pct = Math.max(8, Math.round((a.count / agentMax) * 100));
              const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
              const initials = a.name
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map((n) => n[0])
                .join('')
                .toUpperCase();
              return (
                <li key={a.name} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-fluxo-500/10 text-[11px] font-bold text-fluxo-600 ring-1 ring-inset ring-fluxo-500/20"
                      >
                        {medal ?? initials}
                      </span>
                      <span className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                        {a.name}
                      </span>
                    </span>
                    <span className="font-semibold tabular-nums text-slate-900 dark:text-white">
                      {a.count}
                    </span>
                  </div>
                  <div
                    className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700"
                    role="progressbar"
                    aria-valuenow={a.count}
                    aria-valuemin={0}
                    aria-valuemax={agentMax}
                    aria-label={`${a.name}: ${a.count} chamados resolvidos`}
                  >
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
      </ChartCard>
    </div>
  );
}
