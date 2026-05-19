import Link from 'next/link';
import { Plus, Pencil, Zap, AlertOctagon, Clock, Activity } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatRelative } from '@/lib/utils';
import { StatusDot } from '@/components/ui/status-dot';
import { DeleteAutomationButton, ToggleAutomationButton } from './automation-actions';

export default async function AutomationsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50/60 p-6 text-sm text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30">
        <strong>Acesso negado.</strong> Apenas administradores podem ver automações.
      </div>
    );
  }

  const rules = await db.automationRule.findMany({
    where: { deletedAt: null },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
  });

  const triggerLabels: Record<string, string> = {
    'ticket.created': 'Chamado criado',
    'ticket.status_changed': 'Status alterado',
    'ticket.sla_warning': 'Aviso de SLA',
    'cron.hourly': 'A cada hora',
  };

  const activeCount = rules.filter((r) => r.isActive).length;
  const totalRuns = rules.reduce((sum, r) => sum + r.runCount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="micro-label-accent">Engine · automação</p>
          <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white">
            Automações
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            <span className="font-mono-tech">{activeCount}</span> ativa{activeCount === 1 ? '' : 's'} de{' '}
            <span className="font-mono-tech">{rules.length}</span> regra{rules.length === 1 ? '' : 's'} ·{' '}
            <span className="font-mono-tech">{totalRuns}</span> execuçõe{totalRuns === 1 ? 'm' : 's'} acumulada{totalRuns === 1 ? '' : 's'}
          </p>
        </div>
        <Link
          href="/admin/automacoes/nova"
          className="inline-flex items-center gap-1.5 rounded-md bg-fluxo-500 px-4 py-2 text-sm font-semibold text-white shadow-fluxo transition hover:bg-fluxo-600"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nova regra
        </Link>
      </div>

      {rules.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-600 dark:bg-slate-800">
          <Zap className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
          <p className="mt-3 text-sm text-slate-500">Nenhuma regra de automação criada ainda.</p>
          <Link
            href="/admin/automacoes/nova"
            className="mt-3 inline-block text-sm font-medium text-fluxo-600 hover:underline dark:text-cyan-400"
          >
            Criar primeira regra →
          </Link>
        </div>
      ) : (
        <ul role="list" className="space-y-3">
          {rules.map((rule) => (
            <li
              key={rule.id}
              className="group relative overflow-hidden rounded-lg border border-slate-200 bg-white shadow-elevate transition-all hover:shadow-elevate-lg dark:border-slate-700 dark:bg-slate-800"
            >
              <span
                aria-hidden="true"
                className={`absolute inset-y-0 left-0 w-1 ${
                  rule.isActive ? 'bg-emerald-400' : 'bg-slate-300 dark:bg-slate-600'
                }`}
              />
              <div className="flex flex-col gap-4 p-5 pl-6 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <Zap
                      className={`h-4 w-4 ${rule.isActive ? 'text-emerald-500' : 'text-slate-400'}`}
                      aria-hidden="true"
                    />
                    <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                      {rule.name}
                    </h3>
                    <StatusDot tone={rule.isActive ? 'emerald' : 'slate'}>
                      {rule.isActive ? 'Ativa' : 'Inativa'}
                    </StatusDot>
                  </div>

                  {rule.description && (
                    <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">{rule.description}</p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1.5">
                      <AlertOctagon className="h-3 w-3 text-slate-400" aria-hidden="true" />
                      <span className="micro-label">Trigger</span>
                      <span className="font-mono-tech text-slate-700 dark:text-slate-200">
                        {triggerLabels[rule.trigger] ?? rule.trigger}
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Activity className="h-3 w-3 text-slate-400" aria-hidden="true" />
                      <span className="micro-label">Execuções</span>
                      <span className="font-mono-tech text-slate-700 dark:text-slate-200">{rule.runCount}</span>
                    </span>
                    {rule.lastRunAt && (
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-3 w-3 text-slate-400" aria-hidden="true" />
                        <span className="micro-label">Última</span>
                        <span className="font-mono-tech text-slate-700 dark:text-slate-200">
                          {formatRelative(rule.lastRunAt)}
                        </span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
                  <Link
                    href={`/admin/automacoes/${rule.id}/editar`}
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    Editar
                  </Link>

                  <ToggleAutomationButton ruleId={rule.id} isActive={rule.isActive} />

                  <DeleteAutomationButton ruleId={rule.id} ruleName={rule.name} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
