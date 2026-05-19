'use client';

import { useEffect, useState } from 'react';
import { CheckSquare, Square, X, UserCircle, Tag, Layers, AlertOctagon } from 'lucide-react';

type Op = 'status' | 'priority' | 'assign' | 'queue';

interface Props {
  formId: string;
  agents: Array<{ id: string; name: string }>;
  queues: Array<{ id: string; name: string }>;
}

/**
 * Floating bar that:
 *  - Reads <input type="checkbox" name="ticketIds" /> from the parent form
 *  - Shows count of selected
 *  - Provides 4 action dropdowns + an "Apply" trigger that submits form
 *  - Includes a "select all visible" button
 *
 * The actual form action is `bulkUpdateTicketsAction` declared on the form
 * in the page. This component just orchestrates the UX.
 */
export function BulkActionsBar({ formId, agents, queues }: Props) {
  const [selectedCount, setSelectedCount] = useState(0);
  const [op, setOp] = useState<Op>('status');
  const [value, setValue] = useState('');

  useEffect(() => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;

    function update() {
      const checks = form!.querySelectorAll<HTMLInputElement>('input[name="ticketIds"]:checked');
      setSelectedCount(checks.length);
    }

    form.addEventListener('change', update);
    update();
    return () => form.removeEventListener('change', update);
  }, [formId]);

  function clearSelection() {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;
    form
      .querySelectorAll<HTMLInputElement>('input[name="ticketIds"]:checked')
      .forEach((c) => (c.checked = false));
    const selectAll = document.getElementById(`${formId}-select-all`) as HTMLInputElement | null;
    if (selectAll) selectAll.checked = false;
    setSelectedCount(0);
  }

  function handleApply(e: React.FormEvent) {
    e.preventDefault();
    if (selectedCount === 0 || !op || !value) return;
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;

    // Set hidden inputs and submit
    const opInput = form.elements.namedItem('op') as HTMLInputElement | null;
    const valueInput = form.elements.namedItem('value') as HTMLInputElement | null;
    if (opInput) opInput.value = op;
    if (valueInput) valueInput.value = value;
    form.requestSubmit();
  }

  if (selectedCount === 0) return null;

  return (
    <div
      role="region"
      aria-label="Ações em lote"
      className="pointer-events-auto fixed inset-x-4 bottom-4 z-40 mx-auto max-w-3xl rounded-lg border border-slate-200 bg-white p-3 shadow-elevate-lg dark:border-slate-700 dark:bg-slate-800 sm:left-auto sm:right-4"
    >
      <form onSubmit={handleApply} className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={clearSelection}
          aria-label="Limpar seleção"
          className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>

        <span className="inline-flex items-center gap-2 text-sm">
          <CheckSquare className="h-4 w-4 text-fluxo-500" aria-hidden="true" />
          <strong className="font-mono-tech text-slate-900 dark:text-white">{selectedCount}</strong>
          <span className="text-slate-600 dark:text-slate-400">
            chamado{selectedCount === 1 ? '' : 's'}
          </span>
        </span>

        <span className="mx-1 h-6 w-px bg-slate-200 dark:bg-slate-700" aria-hidden="true" />

        <label className="sr-only" htmlFor="bulk-op">Operação</label>
        <select
          id="bulk-op"
          value={op}
          onChange={(e) => {
            setOp(e.target.value as Op);
            setValue('');
          }}
          className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
        >
          <option value="status">Mudar status</option>
          <option value="priority">Mudar prioridade</option>
          <option value="assign">Atribuir a</option>
          <option value="queue">Mover pra fila</option>
        </select>

        <label className="sr-only" htmlFor="bulk-value">Valor</label>
        <select
          id="bulk-value"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="min-w-[140px] flex-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
        >
          <option value="">— Selecionar —</option>
          {op === 'status' && (
            <>
              <option value="NEW">Novo</option>
              <option value="OPEN">Aberto</option>
              <option value="IN_PROGRESS">Em andamento</option>
              <option value="WAITING_CLIENT">Aguardando cliente</option>
              <option value="RESOLVED">Resolvido</option>
              <option value="CLOSED">Fechado</option>
              <option value="REOPENED">Reaberto</option>
            </>
          )}
          {op === 'priority' && (
            <>
              <option value="LOW">Baixa</option>
              <option value="MEDIUM">Média</option>
              <option value="HIGH">Alta</option>
              <option value="URGENT">Urgente</option>
            </>
          )}
          {op === 'assign' && (
            <>
              <option value="">— Sem atribuição —</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </>
          )}
          {op === 'queue' && (
            <>
              <option value="">— Sem fila —</option>
              {queues.map((q) => (
                <option key={q.id} value={q.id}>{q.name}</option>
              ))}
            </>
          )}
        </select>

        <button
          type="submit"
          disabled={!value && op !== 'assign' && op !== 'queue'}
          className="inline-flex items-center gap-1.5 rounded-md bg-fluxo-500 px-3 py-1.5 text-xs font-semibold text-white shadow-fluxo transition hover:bg-fluxo-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {op === 'status' && <Tag className="h-3.5 w-3.5" aria-hidden="true" />}
          {op === 'priority' && <AlertOctagon className="h-3.5 w-3.5" aria-hidden="true" />}
          {op === 'assign' && <UserCircle className="h-3.5 w-3.5" aria-hidden="true" />}
          {op === 'queue' && <Layers className="h-3.5 w-3.5" aria-hidden="true" />}
          Aplicar
        </button>
      </form>
    </div>
  );
}

/**
 * Companion for the "select all visible" checkbox in the table header.
 */
export function SelectAllCheckbox({ formId }: { formId: string }) {
  useEffect(() => {
    const form = document.getElementById(formId);
    const headerBox = document.getElementById(`${formId}-select-all`) as HTMLInputElement | null;
    if (!form || !headerBox) return;

    function toggle() {
      const boxes = form!.querySelectorAll<HTMLInputElement>('input[name="ticketIds"]');
      boxes.forEach((b) => (b.checked = headerBox!.checked));
      // Fire change so BulkActionsBar updates
      form!.dispatchEvent(new Event('change', { bubbles: true }));
    }
    headerBox.addEventListener('change', toggle);
    return () => headerBox.removeEventListener('change', toggle);
  }, [formId]);

  return (
    <span className="inline-flex items-center">
      <input
        id={`${formId}-select-all`}
        type="checkbox"
        aria-label="Selecionar todos os chamados visíveis"
        className="h-4 w-4 cursor-pointer rounded border-slate-300 text-fluxo-500 focus:ring-fluxo-500"
      />
    </span>
  );
}
