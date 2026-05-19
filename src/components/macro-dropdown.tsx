'use client';

import { useEffect, useRef, useState } from 'react';
import { Zap, ChevronDown } from 'lucide-react';
import { applyMacroAction } from '@/server/actions/macros';

interface Macro {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
}

interface Props {
  ticketId: string;
  macros: Macro[];
  returnTo?: string;
}

export function MacroDropdown({ ticketId, macros, returnTo }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  if (macros.length === 0) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-md border border-fluxo-300/60 bg-fluxo-50 px-3 py-1.5 text-xs font-semibold text-fluxo-700 transition-colors hover:bg-fluxo-100 dark:border-fluxo-700/60 dark:bg-fluxo-950/40 dark:text-fluxo-300 dark:hover:bg-fluxo-900/40"
      >
        <Zap className="h-3.5 w-3.5" aria-hidden="true" />
        Macros
        <span className="font-mono-tech text-[10px] opacity-70">[{macros.length}]</span>
        <ChevronDown className="h-3 w-3" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-9 z-40 w-72 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-elevate-lg dark:border-slate-700 dark:bg-slate-800"
        >
          <p className="border-b border-slate-200 px-3 py-1.5 micro-label dark:border-slate-700">
            Aplicar ação rápida
          </p>
          <div className="max-h-80 overflow-y-auto">
            {macros.map((m) => (
              <form
                key={m.id}
                action={applyMacroAction}
                className="border-t border-slate-100 first:border-t-0 dark:border-slate-700"
              >
                <input type="hidden" name="ticketId" value={ticketId} />
                <input type="hidden" name="macroId" value={m.id} />
                {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
                <button
                  type="submit"
                  className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50"
                  onClick={() => setOpen(false)}
                >
                  {m.icon && (
                    <span aria-hidden="true" className="text-base leading-none mt-0.5">
                      {m.icon}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-slate-800 dark:text-slate-100">
                      {m.name}
                    </span>
                    {m.description && (
                      <span className="block truncate text-[11px] text-slate-500 dark:text-slate-400">
                        {m.description}
                      </span>
                    )}
                  </span>
                </button>
              </form>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
