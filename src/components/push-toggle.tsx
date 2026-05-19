'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

type State = 'unsupported' | 'loading' | 'denied' | 'enabled' | 'disabled';

export function PushToggle({ compact = false }: { compact?: boolean }) {
  const [state, setState] = useState<State>('loading');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (typeof window === 'undefined') return;

      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        if (!cancelled) setState('unsupported');
        return;
      }

      if (Notification.permission === 'denied') {
        if (!cancelled) setState('denied');
        return;
      }

      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (!cancelled) setState(sub ? 'enabled' : 'disabled');
      } catch {
        if (!cancelled) setState('disabled');
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, []);

  async function enablePush() {
    setBusy(true);
    try {
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        console.warn('[push] VAPID public key not configured');
        setBusy(false);
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState(permission === 'denied' ? 'denied' : 'disabled');
        setBusy(false);
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        // BufferSource cast — TS lib type pode estar mais estrito que o DOM
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as unknown as BufferSource,
      });

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      });

      if (res.ok) {
        setState('enabled');
      } else {
        await sub.unsubscribe();
        setState('disabled');
      }
    } catch (err) {
      console.warn('[push] enable failed:', err);
      setState('disabled');
    } finally {
      setBusy(false);
    }
  }

  async function disablePush() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint }),
        });
      }
      setState('disabled');
    } catch (err) {
      console.warn('[push] disable failed:', err);
    } finally {
      setBusy(false);
    }
  }

  if (state === 'unsupported') return null;
  if (state === 'loading') return null;

  if (compact) {
    const Icon = state === 'enabled' ? Bell : BellOff;
    return (
      <button
        type="button"
        onClick={state === 'enabled' ? disablePush : enablePush}
        disabled={busy || state === 'denied'}
        aria-label={state === 'enabled' ? 'Desativar notificações push' : 'Ativar notificações push'}
        title={state === 'denied' ? 'Permissão negada — habilite nas configurações do navegador' : undefined}
        className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-elevate dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-fluxo-500/10 text-fluxo-600 ring-1 ring-inset ring-fluxo-500/20"
        >
          {state === 'enabled' ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
            Notificações push
          </h3>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {state === 'enabled'
              ? 'Você recebe alertas em tempo real no navegador / app.'
              : state === 'denied'
                ? 'Permissão bloqueada. Libere nas configurações do navegador.'
                : 'Receba alertas de chamados sem precisar abrir email.'}
          </p>
          <div className="mt-3">
            {state === 'enabled' ? (
              <button
                type="button"
                onClick={disablePush}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
              >
                {busy && <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />}
                Desativar
              </button>
            ) : state === 'denied' ? (
              <span className="font-mono-tech text-[10px] uppercase tracking-tech text-rose-600">
                [ bloqueado ]
              </span>
            ) : (
              <button
                type="button"
                onClick={enablePush}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-md bg-fluxo-500 px-3 py-1.5 text-xs font-semibold text-white shadow-fluxo hover:bg-fluxo-600 disabled:opacity-50"
              >
                {busy && <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />}
                Ativar notificações
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
