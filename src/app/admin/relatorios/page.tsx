import Link from 'next/link';
import { FileText, TrendingUp, Building2, Smile, ShieldCheck, ArrowRight } from 'lucide-react';
import { db } from '@/lib/db';
import { ReportDownloadButton } from './download-button';

export const dynamic = 'force-dynamic';

export default async function RelatoriosPage() {
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);
  const defaultFrom = thirtyDaysAgo.toISOString().slice(0, 10);
  const defaultTo = today.toISOString().slice(0, 10);

  const clients = await db.client.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="micro-label-accent">Operação · exports</p>
        <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white">Relatórios</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Dashboards interativos e PDFs com identidade Fluxo Digital Tech.
        </p>
      </div>

      {/* Dashboards interativos (rotas internas) */}
      <section aria-labelledby="dashboards-heading" className="space-y-3">
        <h2 id="dashboards-heading" className="micro-label">Dashboards interativos</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Link
            href="/admin/relatorios/csat"
            className="group relative flex items-start gap-4 overflow-hidden rounded-lg border border-slate-200 bg-white p-5 shadow-elevate transition-all hover:-translate-y-0.5 hover:shadow-elevate-lg dark:border-slate-700 dark:bg-slate-800"
          >
            <span
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-500/40 to-transparent"
            />
            <span
              aria-hidden="true"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-purple-500/10 text-purple-600 ring-1 ring-inset ring-purple-500/20"
            >
              <Smile className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                CSAT &amp; NPS
              </h3>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Pesquisas de satisfação, distribuição, top atendentes e comentários.
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </Link>

          <Link
            href="/admin/relatorios/saude"
            className="group relative flex items-start gap-4 overflow-hidden rounded-lg border border-slate-200 bg-white p-5 shadow-elevate transition-all hover:-translate-y-0.5 hover:shadow-elevate-lg dark:border-slate-700 dark:bg-slate-800"
          >
            <span
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent"
            />
            <span
              aria-hidden="true"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 ring-1 ring-inset ring-emerald-500/20"
            >
              <Smile className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                Saúde dos clientes
              </h3>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Health score por cliente: CSAT, SLA, reabertura e engajamento.
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </Link>

          <Link
            href="/admin/configuracoes/auditoria"
            className="group relative flex items-start gap-4 overflow-hidden rounded-lg border border-slate-200 bg-white p-5 shadow-elevate transition-all hover:-translate-y-0.5 hover:shadow-elevate-lg dark:border-slate-700 dark:bg-slate-800"
          >
            <span
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent"
            />
            <span
              aria-hidden="true"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-amber-500/10 text-amber-600 ring-1 ring-inset ring-amber-500/20"
            >
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                Auditoria
              </h3>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Trilha completa de ações no sistema · login, mudanças, exclusões.
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <div>
        <h2 className="micro-label">Exports em PDF</h2>
      </div>

      {/* Relatório 1 — Chamados */}
      <ReportCard
        icon={<TicketIcon />}
        title="Chamados no período"
        description="Lista completa dos chamados com status, prioridade, cliente, responsável e datas. Inclui totalizadores no topo."
      >
        <ReportDownloadButton
          endpoint="/api/relatorios/chamados"
          filename="chamados"
          fields={[
            { name: 'from', label: 'Data inicial', type: 'date', defaultValue: defaultFrom },
            { name: 'to', label: 'Data final', type: 'date', defaultValue: defaultTo },
            {
              name: 'status',
              label: 'Status',
              type: 'select',
              options: [
                { value: '', label: 'Todos' },
                { value: 'NEW', label: 'Novo' },
                { value: 'OPEN', label: 'Aberto' },
                { value: 'IN_PROGRESS', label: 'Em andamento' },
                { value: 'WAITING_CLIENT', label: 'Aguardando cliente' },
                { value: 'RESOLVED', label: 'Resolvido' },
                { value: 'CLOSED', label: 'Fechado' },
                { value: 'REOPENED', label: 'Reaberto' },
              ],
            },
            {
              name: 'priority',
              label: 'Prioridade',
              type: 'select',
              options: [
                { value: '', label: 'Todas' },
                { value: 'LOW', label: 'Baixa' },
                { value: 'MEDIUM', label: 'Média' },
                { value: 'HIGH', label: 'Alta' },
                { value: 'URGENT', label: 'Urgente' },
              ],
            },
            {
              name: 'clientId',
              label: 'Cliente',
              type: 'select',
              options: [
                { value: '', label: 'Todos' },
                ...clients.map((c) => ({ value: c.id, label: c.name })),
              ],
            },
          ]}
        />
      </ReportCard>

      {/* Relatório 2 — Clientes */}
      <ReportCard
        icon={<Building2 className="h-5 w-5" />}
        title="Carteira de clientes"
        description="Lista de clientes ativos com total de chamados, chamados abertos, chamados no período e contatos cadastrados."
      >
        <ReportDownloadButton
          endpoint="/api/relatorios/clientes"
          filename="clientes"
          fields={[
            { name: 'from', label: 'Chamados a partir de', type: 'date', defaultValue: defaultFrom },
            { name: 'to', label: 'Chamados até', type: 'date', defaultValue: defaultTo },
            {
              name: 'status',
              label: 'Status do cliente',
              type: 'select',
              options: [
                { value: '', label: 'Todos' },
                { value: 'ACTIVE', label: 'Ativo' },
                { value: 'SUSPENDED', label: 'Suspenso' },
                { value: 'INACTIVE', label: 'Inativo' },
              ],
            },
          ]}
        />
      </ReportCard>

      {/* Relatório 3 — Desempenho */}
      <ReportCard
        icon={<TrendingUp className="h-5 w-5" />}
        title="Desempenho da equipe"
        description="Produtividade dos agentes: chamados atribuídos, resolvidos, fechados e tempo médio de resolução."
      >
        <ReportDownloadButton
          endpoint="/api/relatorios/desempenho"
          filename="desempenho"
          fields={[
            { name: 'from', label: 'Data inicial', type: 'date', defaultValue: defaultFrom },
            { name: 'to', label: 'Data final', type: 'date', defaultValue: defaultTo },
          ]}
        />
      </ReportCard>
    </div>
  );
}

// ─────────────────────────────────────────────
// Componentes auxiliares
// ─────────────────────────────────────────────
function ReportCard({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-elevate dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-start gap-4 border-b border-slate-200 bg-fluxo-500/[0.04] p-5 dark:border-slate-700 dark:bg-fluxo-500/[0.08]">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-fluxo-gradient text-white shadow-fluxo">
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">{title}</h3>
          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">{description}</p>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function TicketIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
      <path d="M13 5v2" /><path d="M13 17v2" /><path d="M13 11v2" />
    </svg>
  );
}
