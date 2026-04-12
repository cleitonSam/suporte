'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Ticket, Building2, User, X } from 'lucide-react';
import {
  TICKET_STATUS_LABEL,
  PRIORITY_LABEL,
} from '@/lib/utils';

interface TicketResult {
  id: string;
  ticketNumber: string;
  title: string;
  status: string;
  priority: string;
}

interface ClientResult {
  id: string;
  name: string;
  document: string | null;
}

interface UserResult {
  id: string;
  name: string;
  email: string;
  userType: string;
}

interface SearchResults {
  tickets: TicketResult[];
  clients: ClientResult[];
  users: UserResult[];
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>({ tickets: [], clients: [], users: [] });
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Build flat list of items for keyboard navigation
  const items = buildItems(results);

  // Open/close with Ctrl+K / Cmd+K
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Focus input when opening
  useEffect(() => {
    if (open) {
      setQuery('');
      setResults({ tickets: [], clients: [], users: [] });
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Debounced search
  const search = useCallback(
    (q: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (q.length < 2) {
        setResults({ tickets: [], clients: [], users: [] });
        setLoading(false);
        return;
      }
      setLoading(true);
      debounceRef.current = setTimeout(async () => {
        try {
          const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
          if (res.ok) {
            const data = await res.json();
            setResults(data);
            setSelectedIndex(0);
          }
        } catch {
          // silently ignore
        } finally {
          setLoading(false);
        }
      }, 250);
    },
    [],
  );

  function handleInputChange(val: string) {
    setQuery(val);
    search(val);
  }

  function navigate(href: string) {
    setOpen(false);
    router.push(href);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && items[selectedIndex]) {
      e.preventDefault();
      navigate(items[selectedIndex].href);
    }
  }

  if (!open) return null;

  const hasResults = items.length > 0;
  const showEmpty = query.length >= 2 && !loading && !hasResults;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />

      {/* Palette */}
      <div className="relative w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800">
        {/* Input */}
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 dark:border-slate-700">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar chamados, clientes, usuários..."
            className="flex-1 border-0 bg-transparent py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
          />
          <button onClick={() => setOpen(false)} className="rounded p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results */}
        {(hasResults || showEmpty || loading) && (
          <div className="max-h-80 overflow-y-auto p-2">
            {loading && (
              <p className="px-3 py-4 text-center text-sm text-slate-400">Buscando...</p>
            )}

            {showEmpty && (
              <p className="px-3 py-4 text-center text-sm text-slate-500">
                Nenhum resultado para &ldquo;{query}&rdquo;
              </p>
            )}

            {!loading && results.tickets.length > 0 && (
              <Section label="Chamados">
                {results.tickets.map((t) => {
                  const idx = items.findIndex((i) => i.id === `ticket-${t.id}`);
                  return (
                    <Item
                      key={t.id}
                      icon={<Ticket className="h-4 w-4" />}
                      title={`${t.ticketNumber} — ${t.title}`}
                      subtitle={`${TICKET_STATUS_LABEL[t.status] ?? t.status} · ${PRIORITY_LABEL[t.priority] ?? t.priority}`}
                      selected={idx === selectedIndex}
                      onClick={() => navigate(`/admin/chamados/${t.id}`)}
                    />
                  );
                })}
              </Section>
            )}

            {!loading && results.clients.length > 0 && (
              <Section label="Clientes">
                {results.clients.map((c) => {
                  const idx = items.findIndex((i) => i.id === `client-${c.id}`);
                  return (
                    <Item
                      key={c.id}
                      icon={<Building2 className="h-4 w-4" />}
                      title={c.name}
                      subtitle={c.document ?? ''}
                      selected={idx === selectedIndex}
                      onClick={() => navigate(`/admin/clientes/${c.id}`)}
                    />
                  );
                })}
              </Section>
            )}

            {!loading && results.users.length > 0 && (
              <Section label="Usuários">
                {results.users.map((u) => {
                  const idx = items.findIndex((i) => i.id === `user-${u.id}`);
                  return (
                    <Item
                      key={u.id}
                      icon={<User className="h-4 w-4" />}
                      title={u.name}
                      subtitle={u.email}
                      selected={idx === selectedIndex}
                      onClick={() => navigate(`/admin/configuracoes`)}
                    />
                  );
                })}
              </Section>
            )}
          </div>
        )}

        {/* Footer hint */}
        <div className="border-t border-slate-100 px-4 py-2 text-[11px] text-slate-400 dark:border-slate-700">
          <kbd className="rounded border border-slate-200 bg-slate-50 px-1 py-0.5 font-mono text-[10px] dark:border-slate-600 dark:bg-slate-700">↑↓</kbd>{' '}
          navegar{' '}
          <kbd className="rounded border border-slate-200 bg-slate-50 px-1 py-0.5 font-mono text-[10px] dark:border-slate-600 dark:bg-slate-700">Enter</kbd>{' '}
          abrir{' '}
          <kbd className="rounded border border-slate-200 bg-slate-50 px-1 py-0.5 font-mono text-[10px] dark:border-slate-600 dark:bg-slate-700">Esc</kbd>{' '}
          fechar
        </div>
      </div>
    </div>
  );
}

/* ---- helpers ---- */

interface FlatItem {
  id: string;
  href: string;
}

function buildItems(r: SearchResults): FlatItem[] {
  const out: FlatItem[] = [];
  for (const t of r.tickets) out.push({ id: `ticket-${t.id}`, href: `/admin/chamados/${t.id}` });
  for (const c of r.clients) out.push({ id: `client-${c.id}`, href: `/admin/clientes/${c.id}` });
  for (const u of r.users) out.push({ id: `user-${u.id}`, href: `/admin/configuracoes` });
  return out;
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-1">
      <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </p>
      {children}
    </div>
  );
}

function Item({
  icon,
  title,
  subtitle,
  selected,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
        selected ? 'bg-fluxo-50 text-fluxo-700 dark:bg-fluxo-500/10 dark:text-fluxo-300' : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700'
      }`}
    >
      <span className={selected ? 'text-fluxo-500' : 'text-slate-400'}>{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{title}</div>
        {subtitle && <div className="truncate text-xs text-slate-500">{subtitle}</div>}
      </div>
    </button>
  );
}
