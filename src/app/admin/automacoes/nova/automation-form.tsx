'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const TRIGGERS = [
  { value: 'ticket.created', label: 'Chamado criado' },
  { value: 'ticket.status_changed', label: 'Status alterado' },
  { value: 'ticket.sla_warning', label: 'Aviso de SLA' },
  { value: 'cron.hourly', label: 'A cada hora (cron)' },
];

const FIELDS = [
  'status',
  'priority',
  'assignedToId',
  'queueId',
  'slaBreached',
  'hoursOpen',
  'hoursWithoutResponse',
];

const OPERATORS = ['eq', 'neq', 'gt', 'lt', 'gte', 'lte', 'in', 'contains'];

const ACTION_TYPES = [
  'change_status',
  'change_priority',
  'assign_to',
  'move_queue',
  'notify_agent',
  'notify_admin',
  'add_internal_note',
];

export function AutomationForm({
  action,
  initialData,
}: {
  action: (formData: FormData) => Promise<any>;
  initialData?: any;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    startTransition(async () => {
      const formData = new FormData(e.currentTarget);
      const result = await action(formData);

      if (result?.error) {
        setErrors(result.error);
      } else if (result?.ok) {
        router.push('/admin/automacoes');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Nome */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-slate-900">
          Nome da regra
        </label>
        <input
          type="text"
          id="name"
          name="name"
          defaultValue={initialData?.name || ''}
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
          defaultValue={initialData?.description || ''}
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
          defaultValue={initialData?.trigger || 'ticket.created'}
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-fluxo-500 focus:outline-none"
          required
        >
          {TRIGGERS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
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
          defaultValue={initialData?.conditions || '[]'}
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
          defaultValue={initialData?.actions || '[]'}
          placeholder='[{"type":"change_status","value":"IN_PROGRESS"}]'
          rows={4}
          className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono placeholder-slate-400 focus:border-fluxo-500 focus:outline-none"
        />
      </div>

      {/* Botões */}
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-fluxo-600 px-4 py-2 text-sm font-medium text-white hover:bg-fluxo-700 disabled:opacity-50"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {isPending ? 'Salvando...' : 'Salvar regra'}
        </button>

        <Link
          href="/admin/automacoes"
          className="inline-flex items-center gap-2 rounded-lg bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-300"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
