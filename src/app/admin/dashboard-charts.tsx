'use client';

import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface DashboardChartsProps {
  dailyTickets: { date: string; count: number }[];
  statusCounts: { status: string; count: number; label: string }[];
  priorityCounts: { priority: string; count: number; label: string }[];
  topAgents: { name: string; count: number }[];
}

const FLUXO_COLORS = {
  primary: '#0066FF',
  cyan: '#00F2FE',
  darkBlue: '#0052CC',
  light: '#E6F2FF',
};

const STATUS_COLORS: Record<string, string> = {
  NEW: '#0066FF',
  OPEN: '#06B6D4',
  IN_PROGRESS: '#F59E0B',
  WAITING_CLIENT: '#A855F7',
  RESOLVED: '#10B981',
  CLOSED: '#6B7280',
  REOPENED: '#EF4444',
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: '#94A3B8',
  MEDIUM: '#0066FF',
  HIGH: '#F97316',
  URGENT: '#DC2626',
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

export default function DashboardCharts({
  dailyTickets,
  statusCounts,
  priorityCounts,
  topAgents,
}: DashboardChartsProps) {
  const isDark = useIsDark();

  const gridColor = isDark ? '#334155' : '#E2E8F0';
  const axisColor = isDark ? '#94a3b8' : '#64748B';
  const tooltipStyle = {
    backgroundColor: isDark ? '#1e293b' : '#FFFFFF',
    border: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`,
    borderRadius: '8px',
    boxShadow: isDark ? '0 1px 3px rgba(0,0,0,0.4)' : '0 1px 3px rgba(0,0,0,0.1)',
    color: isDark ? '#e2e8f0' : '#1E293B',
  };
  const labelColor = isDark ? '#e2e8f0' : '#1E293B';

  const cardClass =
    'rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800';
  const titleClass = 'text-lg font-semibold text-slate-900 dark:text-white';
  const subtitleClass = 'mt-1 text-sm text-slate-600 dark:text-slate-400';
  const emptyClass = 'py-12 text-center text-sm text-slate-500 dark:text-slate-400';

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Line Chart: Daily Ticket Volume */}
      <div className={cardClass}>
        <h3 className={titleClass}>Volume de Chamados (30 dias)</h3>
        <p className={subtitleClass}>Tickets criados por dia nos últimos 30 dias</p>
        <div className="mt-4">
          {dailyTickets.length === 0 ? (
            <div className={emptyClass}>Nenhum dado disponível</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyTickets} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="date" stroke={axisColor} style={{ fontSize: '12px' }} />
                <YAxis stroke={axisColor} style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value) => [value, 'Chamados']}
                  labelStyle={{ color: labelColor }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke={FLUXO_COLORS.primary}
                  strokeWidth={2}
                  dot={{ fill: FLUXO_COLORS.primary, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Bar Chart: Tickets by Status */}
      <div className={cardClass}>
        <h3 className={titleClass}>Chamados por Status</h3>
        <p className={subtitleClass}>Distribuição atual dos tickets por status</p>
        <div className="mt-4">
          {statusCounts.length === 0 ? (
            <div className={emptyClass}>Nenhum dado disponível</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={statusCounts} margin={{ top: 5, right: 30, left: 0, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis
                  dataKey="label"
                  stroke={axisColor}
                  style={{ fontSize: '12px' }}
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis stroke={axisColor} style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value) => [value, 'Quantidade']}
                  labelStyle={{ color: labelColor }}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {statusCounts.map((entry) => (
                    <Cell
                      key={`cell-${entry.status}`}
                      fill={STATUS_COLORS[entry.status] || FLUXO_COLORS.primary}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Pie Chart: Priority Distribution */}
      <div className={cardClass}>
        <h3 className={titleClass}>Distribuição por Prioridade</h3>
        <p className={subtitleClass}>Proporção de tickets por nível de prioridade</p>
        <div className="mt-4">
          {priorityCounts.length === 0 ? (
            <div className={emptyClass}>Nenhum dado disponível</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                <Pie
                  data={priorityCounts}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ label, count }) => `${label}: ${count}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {priorityCounts.map((entry) => (
                    <Cell
                      key={`cell-${entry.priority}`}
                      fill={PRIORITY_COLORS[entry.priority] || FLUXO_COLORS.primary}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value) => [value, 'Quantidade']}
                  labelStyle={{ color: labelColor }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Bar Chart: Top Agents */}
      <div className={cardClass}>
        <h3 className={titleClass}>Top Agents (Este Mês)</h3>
        <p className={subtitleClass}>5 melhores agentes por tickets resolvidos</p>
        <div className="mt-4">
          {topAgents.length === 0 ? (
            <div className={emptyClass}>Nenhum dado disponível</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={topAgents}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 150, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis type="number" stroke={axisColor} style={{ fontSize: '12px' }} />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke={axisColor}
                  style={{ fontSize: '12px' }}
                  width={140}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value) => [value, 'Resolvidos']}
                  labelStyle={{ color: labelColor }}
                />
                <Bar dataKey="count" fill={FLUXO_COLORS.primary} radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
