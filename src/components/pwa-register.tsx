'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: ReadonlyArray<string>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

const DISMISSED_KEY = 'pwa-install-dismissed';
const DISMISS_DAYS = 14;

export function PwaRegister() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  // Registra o service worker
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') return;

    const onLoad = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch((err) => {
          console.warn('[PWA] Service worker registration failed:', err);
        });
    };

    if (document.readyState === 'complete') {
      onLoad();
    } else {
      window.addEventListener('load', onLoad);
      return () => window.removeEventListener('load', onLoad);
    }
  }, []);

  // Captura o evento beforeinstallprompt
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handler = (e: Event) => {
      e.preventDefault();
      const event = e as BeforeInstallPromptEvent;
      setInstallEvent(event);

      // Não mostra se foi dispensado recentemente
      try {
        const dismissedAt = localStorage.getItem(DISMISSED_KEY);
        if (dismissedAt) {
          const daysSince = (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60 * 24);
          if (daysSince < DISMISS_DAYS) return;
        }
      } catch {}

      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  async function handleInstall() {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
    setShowPrompt(false);
  }

  function handleDismiss() {
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch {}
    setShowPrompt(false);
  }

  if (!showPrompt) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="pwa-install-title"
      className="pointer-events-auto fixed inset-x-4 bottom-4 z-50 mx-auto max-w-sm rounded-lg border border-slate-200 bg-white p-4 shadow-elevate-lg dark:border-slate-700 dark:bg-slate-800 sm:left-auto sm:right-4"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-fluxo-gradient text-white shadow-fluxo"
        >
          <Download className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="pwa-install-title" className="font-display text-sm font-semibold text-slate-900 dark:text-white">
            Instalar Fluxo Suporte
          </h2>
          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
            Adicione na tela inicial pra abrir como app, com notificações e modo offline.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={handleInstall}
              className="rounded-md bg-fluxo-500 px-3 py-1.5 text-xs font-semibold text-white shadow-fluxo hover:bg-fluxo-600"
            >
              Instalar agora
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
            >
              Mais tarde
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Fechar"
          className="shrink-0 rounded p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
