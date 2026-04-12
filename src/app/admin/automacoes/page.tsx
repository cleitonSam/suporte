import Link from 'next/link';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatDate, formatRelative } from '@/lib/utils';
import { DeleteAutomationButton, ToggleAutomationButton } from './automation-actions';

export default async function AutomationsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') {
    return <div className="text-sm text-red-600">Acesso negado</div>;
  }

  const rules = await db.automationRule.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
  });

  const triggerLabels: Record<string, string> = {
    'ticket.created': 'Chamado criado',
    'ticket.status_changed': 'Status alterado',
    'ticket.sla_warning': 'Aviso de SLA',
    'cron.hourly': 'A cada hora (cron)',
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Regras de Automação</h1>
          <p className="mt-1 text-sm text-slate-600">
            Configure regras para automatizar ações nos chamados.
          </p>
        </div>
        <Link
          href="/admin/automacoes/nova"
          className="inline-flex items-center gap-2 rounded-lg bg-fluxo-600 px-4 py-2 text-sm font-medium text-white hover:bg-fluxo-700"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nova regra
        </Link>
      </div>

      {rules.length === 0 ? (
        <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
          <p className="text-sm text-slate-600">Nenhuma regra de automação criada ainda.</p>
          <Link
            href="/admin/automacoes/nova"
            className="mt-4 text-sm font-medium text-fluxo-600 hover:text-fluxo-700"
          >
            Criar primeira regra →
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-4">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-slate-900">{rule.name}</h3>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        rule.isActive
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {rule.isActive ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>

                  {rule.description && (
                    <p className="mt-1 text-sm text-slate-600">{rule.description}</p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-4 text-xs">
                    <div>
                      <span className="text-slate-500">Trigger:</span>
                      <span className="ml-2 font-medium text-slate-900">
                        {triggerLabels[rule.trigger] || rule.trigger}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Execuções:</span>
                      <span className="ml-2 font-medium text-slate-900">{rule.runCount}</span>
                    </div>
                    {rule.lastRunAt && (
                      <div>
                        <span className="text-slate-500">Última execução:</span>
                        <span className="ml-2 font-medium text-slate-900">
                          {formatRelative(rule.lastRunAt)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="ml-4 flex items-center gap-2">
                  <Link
                    href={`/admin/automacoes/${rule.id}/editar`}
                    className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                    Editar
                  </Link>

                  <ToggleAutomationButton ruleId={rule.id} isActive={rule.isActive} />

                  <DeleteAutomationButton ruleId={rule.id} ruleName={rule.name} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
