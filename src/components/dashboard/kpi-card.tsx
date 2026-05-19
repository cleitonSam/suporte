'use client';

import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';

export type KpiTone = 'fluxo' | 'cyan' | 'emerald' | 'amber' | 'rose' | 'purple';

const toneStyles: Record<
  KpiTone,
  { iconBg: string; iconText: string; spark: string; ring: string }
> = {
  fluxo:   { iconBg: 'bg-fluxo-500/10',   iconText: 'text-fluxo-600',   spark: '#0066FF', ring: 'ring-fluxo-500/20' },
  cyan:    { iconBg: 'bg-cyan-500/10',    iconText: 'text-cyan-600',    spark: '#00C2CB', ring: 'ring-cyan-500/20' },
  emerald: { iconBg: 'bg-emerald-500/10', iconText: 'text-emerald-600', spark: '#10B981', ring: 'ring-emerald-500/20' },
  amber:   { iconBg: 'bg-amber-500/10',   iconText: 'text-amber-600',   spark: '#F59E0B', ring: 'ring-amber-500/20' },
  rose:    { iconBg: 'bg-rose-500/10',    iconText: 'text-rose-600',    spark: '#EF4444', ring: 'ring-rose-500/20' },
  purple:  { iconBg: 'bg-purple-500/10',  iconText: 'text-purple-600',  spark: '#A855F7', ring: 'ring-purple-500/20' },
};

interface Props {
  label: string;
  value: string | number;
  suffix?: string;
  description: string;
  icon: React.ReactNode;
  tone?: KpiTone;
  delta?: { pct: number; direction: 'up' | 'down' | 'flat'; label: string };
  /** Quando true, queda é boa (ex: tempo de resposta menor é melhor). */
  invertDelta?: boolean;
  sparkline?: { v: number }[];
}

export function KpiCard({
  label,
  value,
  suffix,
  description,
  icon,
  tone = 'fluxo',
  delta,
  invertDelta = false,
  sparkline,
}: Props) {
  const t = toneStyles[tone];

  const isPositive =
    delta &&
    delta.direction !== 'flat' &&
    ((delta.direction === 'up' && !invertDelta) || (delta.direction === 'down' && invertDelta));
  const deltaColor =
    !delta || delta.direction === 'flat'
      ? 'text-slate-500 bg-slate-500/10'
      : isPositive
        ? 'text-emerald-600 bg-emerald-500/10'
        : 'text-rose-600 bg-rose-500/10';
  const DeltaIcon =
    !delta || delta.direction === 'flat'
      ? Minus
      : delta.direction === 'up'
        ? ArrowUpRight
        : ArrowDownRight;

  return (
    <div className="group relative overflow-hidden rounded-lg border border-slate-200 bg-white p-5 shadow-elevate transition-all hover:-translate-y-0.5 hover:shadow-elevate-lg dark:border-slate-700 dark:bg-slate-800">
      {/* Accent line top — micro detalhe técnico */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background: `linear-gradient(to right, transparent, ${t.spark}80, transparent)`,
        }}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="micro-label">{label}</p>
          <p className="mt-2 font-display text-3xl font-bold leading-none text-slate-900 dark:text-white">
            {value}
            {suffix && (
              <span className="ml-0.5 font-mono-tech text-base font-medium text-slate-400 dark:text-slate-500">
                {suffix}
              </span>
            )}
          </p>
        </div>
        <div
          aria-hidden="true"
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ring-1 ring-inset ${t.iconBg} ${t.iconText} ${t.ring}`}
        >
          {icon}
        </div>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          {delta && (
            <span
              className={`inline-flex items-center gap-1 rounded font-mono-tech text-[10px] font-semibold uppercase tracking-tech px-1.5 py-0.5 ${deltaColor}`}
            >
              <DeltaIcon className="h-3 w-3" aria-hidden="true" />
              {delta.label}
            </span>
          )}
          <p className="mt-1.5 truncate text-xs text-slate-500 dark:text-slate-400">{description}</p>
        </div>

        {sparkline && sparkline.length > 1 && (
          <div className="h-10 w-20 shrink-0 opacity-80 transition-opacity group-hover:opacity-100">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkline} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
                <defs>
                  <linearGradient id={`spark-${tone}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={t.spark} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={t.spark} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke={t.spark}
                  strokeWidth={1.5}
                  fill={`url(#spark-${tone})`}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
