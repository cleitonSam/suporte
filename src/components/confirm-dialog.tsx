'use client';

import { useState, type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { AlertTriangle, X } from 'lucide-react';
import { SubmitButton } from '@/components/submit-button';

interface Props {
  /** Botão/elemento que abre o dialog. Será wrap em Dialog.Trigger asChild. */
  children: ReactNode;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Quando true, usa cor de risco no botão de confirmar. */
  destructive?: boolean;
  /** Server action que recebe o FormData ao confirmar. */
  action: (formData: FormData) => void | Promise<void>;
  /** Campos hidden a embutir no form (ex: { id: '123' }). */
  hiddenFields?: Record<string, string | number>;
}

export function ConfirmDialog({
  children,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive = false,
  action,
  hiddenFields = {},
}: Props) {
  const [open, setOpen] = useState(false);

  const confirmClass = destructive
    ? 'inline-flex items-center justify-center gap-2 rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50'
    : '';

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
          <div className="flex items-start gap-3">
            {destructive && (
              <span
                aria-hidden="true"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-500/10 text-rose-600 ring-1 ring-inset ring-rose-500/20"
              >
                <AlertTriangle className="h-4 w-4" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <Dialog.Title className="font-display text-base font-semibold text-slate-900 dark:text-white">
                {title}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {description}
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="Fechar"
              className="shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <form action={action} className="mt-5 flex items-center justify-end gap-2">
            {Object.entries(hiddenFields).map(([k, v]) => (
              <input key={k} type="hidden" name={k} value={String(v)} />
            ))}
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                {cancelLabel}
              </button>
            </Dialog.Close>
            <SubmitButton className={confirmClass} pendingText="Confirmando...">
              {confirmLabel}
            </SubmitButton>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
