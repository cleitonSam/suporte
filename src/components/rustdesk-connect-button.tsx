'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Copy, Download, Monitor } from 'lucide-react';
import { buildDeepLink } from '@/lib/rustdesk';

interface Props {
  rustdeskId: string;
  equipmentName?: string;
  /** Compacto: usado em linhas de tabela. Default: false (botão grande). */
  compact?: boolean;
}

/**
 * Botão de "Conectar via RustDesk" com:
 *  - Deeplink rustdesk://ID que abre o app se instalado
 *  - Botão de copiar ID (fallback se RustDesk não tiver instalado)
 *  - Link discreto pra página de download
 */
export function RustDeskConnectButton({ rustdeskId, equipmentName, compact = false }: Props) {
  const [copied, setCopied] = useState(false);
  const cleanId = rustdeskId.trim();
  const deepLink = buildDeepLink(cleanId);

  async function copyId() {
    try {
      await navigator.clipboard.writeText(cleanId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  if (compact) {
    return (
      <div className="inline-flex items-center gap-1">
        <a
          href={deepLink}
          className="inline-flex items-center gap-1 rounded-md bg-fluxo-500 px-2 py-1 text-[11px] font-semibold text-white shadow-fluxo hover:bg-fluxo-600"
          title={`Conectar via RustDesk · ID ${cleanId}`}
        >
          <Monitor className="h-3 w-3" aria-hidden="true" />
          {cleanId}
        </a>
        <button
          type="button"
          onClick={copyId}
          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700"
          aria-label="Copiar ID RustDesk"
        >
          {copied ? <Check className="h-3 w-3 text-emerald-500" aria-hidden="true" /> : <Copy className="h-3 w-3" aria-hidden="true" />}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-fluxo-200 bg-fluxo-50/60 p-3 dark:border-fluxo-900/60 dark:bg-fluxo-950/30">
      <div className="flex flex-wrap items-center gap-2">
        <a
          href={deepLink}
          className="inline-flex items-center gap-1.5 rounded-md bg-fluxo-500 px-3 py-1.5 text-xs font-semibold text-white shadow-fluxo transition hover:bg-fluxo-600"
        >
          <Monitor className="h-3.5 w-3.5" aria-hidden="true" />
          Conectar via RustDesk
        </a>
        <button
          type="button"
          onClick={copyId}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          aria-label="Copiar ID RustDesk"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-500" aria-hidden="true" />
              Copiado
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" aria-hidden="true" />
              Copiar ID
            </>
          )}
        </button>
        <code className="rounded border border-slate-300 bg-white px-2 py-1 font-mono-tech text-xs text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100">
          {cleanId}
        </code>
      </div>
      <p className="mt-2 text-[10px] text-slate-600 dark:text-slate-400">
        Não tem o RustDesk?{' '}
        <Link
          href="/baixar/rustdesk"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 text-fluxo-600 hover:underline dark:text-cyan-400"
        >
          Baixar
          <Download className="h-2.5 w-2.5" aria-hidden="true" />
        </Link>
        {equipmentName && (
          <>
            {' · '}
            Vai conectar em: <strong>{equipmentName}</strong>
          </>
        )}
      </p>
    </div>
  );
}
