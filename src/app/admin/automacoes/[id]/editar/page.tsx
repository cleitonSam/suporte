import { redirect, notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { updateAutomationAction } from '@/server/actions/automations';
import { AutomationForm } from '../../nova/automation-form';

export default async function EditarAutomacaoPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/');
  }

  const rule = await db.automationRule.findUnique({
    where: { id: params.id },
  });

  if (!rule) {
    notFound();
  }

  const formattedData = {
    ...rule,
    conditions: JSON.stringify(rule.conditions, null, 2),
    actions: JSON.stringify(rule.actions, null, 2),
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Editar Regra: {rule.name}</h1>
        <p className="mt-1 text-sm text-slate-600">
          Modifique a configuração desta regra de automação.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <form
          action={async (formData) => {
            formData.append('id', params.id);
            return updateAutomationAction(formData);
          }}
          className="space-y-6"
        >
          {/* Nome */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-900">
              Nome da regra
            </label>
            <input
              type="text"
              id="name"
              name="name"
              defaultValue={rule.name}
              placeholder="Ex: Escalar chamados antigos"
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder-slate-400 focus:border-fluxo-500 focus:outline-none"
              required
            />
          </div>

          {/* Descrição */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-slate-900">
              Descrição (opcional)
            </label>
            <textarea
              id="description"
              name="description"
              defaultValue={rule.description || ''}
              placeholder="Descreva o propósito desta regra..."
              rows={3}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder-slate-400 focus:border-fluxo-500 focus:outline-none"
            />
          </div>

          {/* Trigger */}
          <div>
            <label htmlFor="trigger" className="block text-sm font-medium text-slate-900">
              Quando disparar
            </label>
            <select
              id="trigger"
              name="trigger"
              defaultValue={rule.trigger}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-fluxo-500 focus:outline-none"
              required
            >
              <option value="ticket.created">Chamado criado</option>
              <option value="ticket.status_changed">Status alterado</option>
              <option value="ticket.sla_warning">Aviso de SLA</option>
              <option value="cron.hourly">A cada hora (cron)</option>
            </select>
          </div>

          {/* Condições */}
          <div>
            <label className="block text-sm font-medium text-slate-900">
              Condições (JSON)
            </label>
            <p className="mt-1 text-xs text-slate-600">
              Deixe vazio para aplicar a todos. Use JSON array com objetos {'{field, op, value}'}.
            </p>
            <textarea
              name="conditions"
              defaultValue={formattedData.conditions}
              placeholder='[{"field":"status","op":"eq","value":"OPEN"}]'
              rows={4}
              className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono placeholder-slate-400 focus:border-fluxo-500 focus:outline-none"
            />
          </div>

          {/* Ações */}
          <div>
            <label className="block text-sm font-medium text-slate-900">
              Ações (JSON)
            </label>
            <p className="mt-1 text-xs text-slate-600">
              Use JSON array com objetos {'{type, value?, data?}'}.
            </p>
            <textarea
              name="actions"
              defaultValue={formattedData.actions}
              placeholder='[{"type":"change_status","value":"IN_PROGRESS"}]'
              rows={4}
              className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono placeholder-slate-400 focus:border-fluxo-500 focus:outline-none"
            />
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-fluxo-600 px-4 py-2 text-sm font-medium text-white hover:bg-fluxo-700"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Salvar alterações
            </button>

            <a
              href="/admin/automacoes"
              className="inline-flex items-center gap-2 rounded-lg bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-300"
            >
              Cancelar
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
