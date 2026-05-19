'use client';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from 'recharts';

interface Point {
  date: string;
  label: string;
  slaPct: number | null;
  volume: number;
}

export function SlaTrendChart({ data }: { data: Point[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.08} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10 }}
          stroke="currentColor"
          opacity={0.5}
          interval={4}
        />
        <YAxis
          domain={[0, 100]}
          tickFormatter={(v) => `${v}%`}
          tick={{ fontSize: 10 }}
          stroke="currentColor"
          opacity={0.5}
          width={40}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgb(15, 23, 42)',
            border: '1px solid rgba(148, 163, 184, 0.3)',
            borderRadius: 6,
            color: '#fff',
            fontSize: 12,
          }}
          formatter={(value, name) => {
            if (value === null || value === undefined) return ['Sem dados', String(name)];
            if (name === 'slaPct') return [`${value}%`, 'SLA OK'];
            return [String(value), String(name)];
          }}
          labelFormatter={(label) => `Dia ${label}`}
        />
        <ReferenceLine
          y={95}
          stroke="#10b981"
          strokeDasharray="4 4"
          strokeWidth={1}
          opacity={0.6}
        />
        <Line
          type="monotone"
          dataKey="slaPct"
          stroke="#0066FF"
          strokeWidth={2}
          dot={{ r: 2.5, fill: '#0066FF' }}
          activeDot={{ r: 4 }}
          connectNulls
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
