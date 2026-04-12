import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { createAutomationAction } from '@/server/actions/automations';
import { AutomationForm } from './automation-form';

export default async function NovaAutomacaoPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/');
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Nova Regra de Automação</h1>
        <p className="mt-1 text-sm text-slate-600">
          Crie uma nova regra para automatizar ações em chamados.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <AutomationForm action={createAutomationAction} />
      </div>

      <div className="mt-8 space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-6">
        <h3 className="font-semibold text-slate-900">Referência de Operadores e Campos</h3>

        <div>
          <h4 className="text-sm font-medium text-slate-700">Campos disponíveis:</h4>
          <ul className="mt-2 space-y-1 text-sm text-slate-600">
            <li>
              <code className="rounded bg-slate-200 px-2 py-0.5">status</code> — Status do
              chamado (NEW, OPEN, IN_PROGRESS, WAITING_CLIENT, RESOLVED, CLOSED, REOPENED)
            </li>
            <li>
              <code className="rounded bg-slate-200 px-2 py-0.5">priority</code> — Prioridade
              (LOW, MEDIUM, HIGH, URGENT)
            </li>
            <li>
              <code className="rounded bg-slate-200 px-2 py-0.5">assignedToId</code> — ID do
              agente atribuído
            </li>
            <li>
              <code className="rounded bg-slate-200 px-2 py-0.5">queueId</code> — ID da fila
            </li>
            <li>
              <code className="rounded bg-slate-200 px-2 py-0.5">slaBreached</code> — Se SLA
              foi estourado (true/false)
            </li>
            <li>
              <code className="rounded bg-slate-200 px-2 py-0.5">hoursOpen</code> — Horas desde
              criação
            </li>
            <li>
              <code className="rounded bg-slate-200 px-2 py-0.5">hoursWithoutResponse</code> —
              Horas sem resposta de agente
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-medium text-slate-700">Operadores:</h4>
          <ul className="mt-2 space-y-1 text-sm text-slate-600">
            <li>
              <code className="rounded bg-slate-200 px-2 py-0.5">eq</code> — Igual
            </li>
            <li>
              <code className="rounded bg-slate-200 px-2 py-0.5">neq</code> — Não igual
            </li>
            <li>
              <code className="rounded bg-slate-200 px-2 py-0.5">gt</code> — Maior que
            </li>
            <li>
              <code className="rounded bg-slate-200 px-2 py-0.5">lt</code> — Menor que
            </li>
            <li>
              <code className="rounded bg-slate-200 px-2 py-0.5">gte</code> — Maior ou igual
            </li>
            <li>
              <code className="rounded bg-slate-200 px-2 py-0.5">lte</code> — Menor ou igual
            </li>
            <li>
              <code className="rounded bg-slate-200 px-2 py-0.5">in</code> — Contém em lista
              (valor: array JSON)
            </li>
            <li>
              <code className="rounded bg-slate-200 px-2 py-0.5">contains</code> — Contém texto
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-medium text-slate-700">Tipos de ações:</h4>
          <ul className="mt-2 space-y-1 text-sm text-slate-600">
            <li>
              <code className="rounded bg-slate-200 px-2 py-0.5">change_status</code> — Altera
              status
            </li>
            <li>
              <code className="rounded bg-slate-200 px-2 py-0.5">change_priority</code> — Altera
              prioridade
            </li>
            <li>
              <code className="rounded bg-slate-200 px-2 py-0.5">assign_to</code> — Atribui a
              agente
            </li>
            <li>
              <code className="rounded bg-slate-200 px-2 py-0.5">move_queue</code> — Move para
              fila
            </li>
            <li>
              <code className="rounded bg-slate-200 px-2 py-0.5">notify_agent</code> — Notifica
              agente atribuído
            </li>
            <li>
              <code className="rounded bg-slate-200 px-2 py-0.5">notify_admin</code> — Notifica
              todos os admins
            </li>
            <li>
              <code className="rounded bg-slate-200 px-2 py-0.5">add_internal_note</code> —
              Adiciona nota interna
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-medium text-slate-700">Exemplo de condição:</h4>
          <pre className="mt-2 overflow-x-auto rounded bg-slate-100 p-3 text-xs">
            {JSON.stringify(
              [
                { field: 'status', op: 'eq', value: 'OPEN' },
                { field: 'hoursOpen', op: 'gte', value: 2 },
              ],
              null,
              2,
            )}
          </pre>
        </div>

        <div>
          <h4 className="text-sm font-medium text-slate-700">Exemplo de ações:</h4>
          <pre className="mt-2 overflow-x-auto rounded bg-slate-100 p-3 text-xs">
            {JSON.stringify(
              [
                { type: 'change_priority', value: 'HIGH' },
                {
                  type: 'notify_admin',
                  data: { message: 'Chamado aberto há mais de 2 horas' },
                },
              ],
              null,
              2,
            )}
          </pre>
        </div>
      </div>
    </div>
  );
}
