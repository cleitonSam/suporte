'use client';

import { useState } from 'react';
import { Mail, Copy, Check } from 'lucide-react';

interface Props {
  address: string;
}

export function InboundAddressCard({ address }: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <div className="mt-6 rounded-lg border border-fluxo-200 bg-fluxo-50/60 p-5 dark:border-fluxo-900/60 dark:bg-fluxo-950/30">
      <div className="flex items-start gap-3">
        <Mail className="mt-0.5 h-5 w-5 shrink-0 text-fluxo-600 dark:text-fluxo-400" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
            Receber chamados por email
          </h3>
          <p className="mt-1 text-xs text-slate-700 dark:text-slate-300">
            Os contatos cadastrados deste cliente podem abrir chamado mandando email pra:
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <code className="rounded border border-slate-300 bg-white px-3 py-1.5 font-mono-tech text-xs text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100">
              {address}
            </code>
            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              aria-label={copied ? 'Endereço copiado' : 'Copiar endereço'}
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
          <ul className="mt-3 space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
            <li>• Só email vindo de <strong>contato cadastrado</strong> vira chamado (anti-spam).</li>
            <li>• Assunto do email = título do chamado. Corpo = descrição. Prioridade default = média.</li>
            <li>• Dica: cliente pode <strong>encaminhar</strong> o email do escritório dele pra esse endereço.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
