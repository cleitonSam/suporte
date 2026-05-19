'use client';

import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface Props {
  data: Array<{ date: string; avg: number | null; count: number }>;
}

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

export function CsatTrendChart({ data }: Props) {
  const isDark = useIsDark();
  const gridColor = isDark ? '#1e293b' : '#E2E8F0';
  const axisColor = isDark ? '#64748b' : '#94A3B8';

  if (data.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-xs text-slate-400">
        Sem dados pra plotar.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="csatFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#A855F7" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#A855F7" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="date"
          stroke={axisColor}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[1, 5]}
          ticks={[1, 2, 3, 4, 5]}
          stroke={axisColor}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: isDark ? '#0f172a' : '#FFFFFF',
            border: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`,
            borderRadius: '8px',
            fontSize: '12px',
          }}
          formatter={(value, _name, entry) => {
            const count = (entry?.payload as { count?: number })?.count ?? 0;
            return [
              value === null ? '—' : `${value} · ${count} resp.`,
              '',
            ];
          }}
          separator=""
          cursor={{ stroke: '#A855F7', strokeOpacity: 0.2 }}
        />
        <Area
          type="monotone"
          dataKey="avg"
          stroke="#A855F7"
          strokeWidth={2}
          fill="url(#csatFill)"
          dot={false}
          activeDot={{ r: 5, fill: '#A855F7', stroke: '#fff', strokeWidth: 2 }}
          connectNulls
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
