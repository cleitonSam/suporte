'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

export function RustDeskConfigCopy({ toml }: { toml: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(toml);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-4 pr-12 font-mono-tech text-[11px] leading-relaxed text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
        {toml}
      </pre>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? 'TOML copiado' : 'Copiar TOML'}
        className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-[10px] font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
      >
        {copied ? (
          <>
            <Check className="h-3 w-3 text-emerald-500" aria-hidden="true" />
            Copiado
          </>
        ) : (
          <>
            <Copy className="h-3 w-3" aria-hidden="true" />
            Copiar
          </>
        )}
      </button>
    </div>
  );
}
