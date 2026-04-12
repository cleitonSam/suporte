'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { Bell, Check, Loader2 } from 'lucide-react';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  linkUrl: string | null;
  readAt: string | null;
  createdAt: string;
}

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.round(diffMs / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  return `${d}d`;
}

interface Props {
  variant?: 'dark' | 'light';
}

export function NotificationsBell({ variant = 'dark' }: Props = {}) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?mode=count', { cache: 'no-store' });
      if (!res.ok) return;
      const json = await res.json();
      setUnread(json.unread ?? 0);
    } catch {}
  }, []);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications?limit=15', { cache: 'no-store' });
      if (!res.ok) return;
      const json = await res.json();
      setItems(json.items ?? []);
      setUnread(json.unread ?? 0);
    } finally {
      setLoading(false);
    }
  }, []);

  // Polling inicial + a cada 45s
  useEffect(() => {
    fetchCount();
    const id = setInterval(fetchCount, 45000);
    return () => clearInterval(id);
  }, [fetchCount]);

  // Fecha ao clicar fora
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  async function handleOpen() {
    const next = !open;
    setOpen(next);
    if (next) await fetchList();
  }

  async function handleMarkRead(id: string) {
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setItems((prev) => prev?.map((i) => (i.id === id ? { ...i, readAt: new Date().toISOString() } : i)) ?? null);
    setUnread((u) => Math.max(0, u - 1));
  }

  async function handleMarkAll() {
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    });
    setItems((prev) => prev?.map((i) => ({ ...i, readAt: new Date().toISOString() })) ?? null);
    setUnread(0);
  }

  const btnClass =
    variant === 'dark'
      ? 'relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-fluxo-700/40 hover:text-white'
      : 'relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 hover:text-fluxo-700';
  const ringClass = variant === 'dark' ? 'ring-fluxo-800' : 'ring-white';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={handleOpen}
        aria-label="Notificações"
        className={btnClass}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span
            className={`absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ${ringClass}`}
          >
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-lg border border-slate-200 bg-white text-slate-900 shadow-2xl dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2 dark:border-slate-700 dark:bg-slate-800/80">
            <span className="text-sm font-semibold">Notificações</span>
            {unread > 0 && (
              <button
                type="button"
                onClick={handleMarkAll}
                className="flex items-center gap-1 text-xs text-fluxo-600 hover:text-fluxo-700"
              >
                <Check className="h-3 w-3" />
                Marcar tudo como lido
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center py-10 text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            )}
            {!loading && items && items.length === 0 && (
              <div className="py-10 text-center text-xs text-slate-500">
                Nenhuma notificação por enquanto.
              </div>
            )}
            {!loading &&
              items?.map((n) => {
                const isUnread = !n.readAt;
                const content = (
                  <div
                    className={`flex gap-3 px-4 py-3 transition-colors ${
                      isUnread ? 'bg-fluxo-50/60 dark:bg-fluxo-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <div
                      className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${
                        isUnread ? 'bg-fluxo-500' : 'bg-transparent'
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-medium text-slate-900">{n.title}</p>
                        <span className="flex-shrink-0 text-[10px] text-slate-400">
                          {formatRelative(n.createdAt)}
                        </span>
                      </div>
                      {n.body && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{n.body}</p>
                      )}
                    </div>
                  </div>
                );
                return n.linkUrl ? (
                  <Link
                    key={n.id}
                    href={n.linkUrl}
                    onClick={() => isUnread && handleMarkRead(n.id)}
                    className="block border-b border-slate-100 last:border-b-0 dark:border-slate-700"
                  >
                    {content}
                  </Link>
                ) : (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => isUnread && handleMarkRead(n.id)}
                    className="block w-full border-b border-slate-100 text-left last:border-b-0 dark:border-slate-700"
                  >
                    {content}
                  </button>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
