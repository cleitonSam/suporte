'use client';

import { useTransition } from 'react';
import { CheckCircle2, Circle, Trash2 } from 'lucide-react';
import { deleteAutomationAction, toggleAutomationAction } from '@/server/actions/automations';
import { ConfirmDialog } from '@/components/confirm-dialog';

export function ToggleAutomationButton({
  ruleId,
  isActive,
}: {
  ruleId: string;
  isActive: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append('id', ruleId);
      await toggleAutomationAction(formData);
    });
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={`inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium ${
        isActive
          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
      } disabled:opacity-50`}
    >
      {isActive ? (
        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Circle className="h-4 w-4" aria-hidden="true" />
      )}
      {isActive ? 'Ativa' : 'Inativa'}
    </button>
  );
}

export function DeleteAutomationButton({
  ruleId,
  ruleName,
}: {
  ruleId: string;
  ruleName: string;
}) {
  return (
    <ConfirmDialog
      title="Deletar regra de automação"
      description={
        <>
          Esta ação não pode ser desfeita. A regra <strong>&quot;{ruleName}&quot;</strong> será
          removida permanentemente.
        </>
      }
      confirmLabel="Deletar"
      destructive
      action={deleteAutomationAction}
      hiddenFields={{ id: ruleId }}
    >
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded-md bg-red-100 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-200"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        Deletar
      </button>
    </ConfirmDialog>
  );
}
