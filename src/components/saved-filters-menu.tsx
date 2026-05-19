'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, usePathname } from 'next/navigation';
import { Bookmark, BookmarkPlus, ChevronDown, Trash2, Users } from 'lucide-react';
import { createSavedFilterAction, deleteSavedFilterAction } from '@/server/actions/saved-filters';
import { ConfirmDialog } from '@/components/confirm-dialog';

interface SavedFilter {
  id: string;
  name: string;
  queryString: string;
  isShared: boolean;
  userId: string;
}

interface Props {
  scope?: string;
  /** Filtros pertencentes ao user logado. */
  mine: SavedFilter[];
  /** Filtros compartilhados por outros agentes. */
  shared: SavedFilter[];
  /** ID do user logado pra detectar ownership em shared. */
  currentUserId: string;
}

export function SavedFiltersMenu({ scope = 'ticket', mine, shared, currentUserId }: Props) {
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  // Query atual sem o param "saved" (que é só pra UI)
  const currentQs = (() => {
    const clean = new URLSearchParams(params.toString());
    clean.delete('ok');
    clean.delete('error');
    return clean.toString();
  })();

  const hasFilters = currentQs.length > 0;

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setShowSaveForm(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const total = mine.length + shared.length;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
      >
        <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />
        Filtros salvos
        {total > 0 && (
          <span className="font-mono-tech text-[10px] text-slate-400">[{total}]</span>
        )}
        <ChevronDown className="h-3 w-3" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-9 z-40 w-80 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-elevate-lg dark:border-slate-700 dark:bg-slate-800"
        >
          {/* Save current */}
          <div className="border-b border-slate-200 px-3 py-2.5 dark:border-slate-700">
            {!showSaveForm ? (
              <button
                type="button"
                onClick={() => setShowSaveForm(true)}
                disabled={!hasFilters}
                className="inline-flex w-full items-center gap-2 rounded-md bg-fluxo-500 px-3 py-1.5 text-xs font-semibold text-white shadow-fluxo transition hover:bg-fluxo-600 disabled:cursor-not-allowed disabled:opacity-50"
                title={!hasFilters ? 'Aplique filtros antes de salvar' : 'Salvar filtros atuais'}
              >
                <BookmarkPlus className="h-3.5 w-3.5" aria-hidden="true" />
                {hasFilters ? 'Salvar filtros atuais' : 'Aplique um filtro primeiro'}
              </button>
            ) : (
              <form action={createSavedFilterAction} className="space-y-2">
                <input type="hidden" name="scope" value={scope} />
                <input type="hidden" name="queryString" value={currentQs} />
                <input type="hidden" name="returnTo" value={pathname} />
                <div>
                  <label htmlFor="sf-name" className="micro-label">Nome</label>
                  <input
                    id="sf-name"
                    name="name"
                    required
                    autoFocus
                    minLength={2}
                    maxLength={60}
                    placeholder="Ex: Meus urgentes"
                    className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                  />
                </div>
                <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    name="isShared"
                    className="h-3.5 w-3.5 rounded border-slate-300 text-fluxo-500 focus:ring-fluxo-500"
                  />
                  Compartilhar com outros agentes
                </label>
                <div className="flex gap-1.5">
                  <button
                    type="submit"
                    className="rounded-md bg-fluxo-500 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-fluxo-600"
                  >
                    Salvar
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSaveForm(false)}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-[11px] text-slate-700 dark:border-slate-600 dark:text-slate-300"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Lista */}
          <div className="max-h-80 overflow-y-auto">
            {mine.length > 0 && (
              <div>
                <p className="px-3 py-1.5 micro-label">Meus</p>
                {mine.map((f) => (
                  <SavedFilterRow
                    key={f.id}
                    filter={f}
                    pathname={pathname}
                    isOwner={true}
                  />
                ))}
              </div>
            )}
            {shared.length > 0 && (
              <div className="border-t border-slate-100 dark:border-slate-700">
                <p className="px-3 py-1.5 micro-label">
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3 w-3" aria-hidden="true" />
                    Compartilhados
                  </span>
                </p>
                {shared.map((f) => (
                  <SavedFilterRow
                    key={f.id}
                    filter={f}
                    pathname={pathname}
                    isOwner={f.userId === currentUserId}
                  />
                ))}
              </div>
            )}
            {total === 0 && (
              <p className="px-3 py-5 text-center text-xs text-slate-500">
                Nenhum filtro salvo ainda.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SavedFilterRow({
  filter,
  pathname,
  isOwner,
}: {
  filter: SavedFilter;
  pathname: string;
  isOwner: boolean;
}) {
  return (
    <div className="group flex items-center justify-between gap-2 border-t border-slate-100 px-3 py-2 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/50">
      <Link
        href={`${pathname}?${filter.queryString}`}
        className="flex-1 truncate text-xs font-medium text-slate-800 hover:text-fluxo-600 dark:text-slate-200 dark:hover:text-cyan-400"
      >
        {filter.name}
        {filter.isShared && (
          <Users
            className="ml-1.5 inline-block h-3 w-3 text-slate-400"
            aria-label="Compartilhado"
          />
        )}
      </Link>
      {isOwner && (
        <ConfirmDialog
          title="Remover filtro salvo"
          description={
            <>
              O filtro <strong>&quot;{filter.name}&quot;</strong> será removido.
              {filter.isShared && ' Outros agentes deixarão de ver.'}
            </>
          }
          confirmLabel="Remover"
          destructive
          action={deleteSavedFilterAction}
          hiddenFields={{ id: filter.id, returnTo: pathname }}
        >
          <button
            type="button"
            aria-label={`Remover ${filter.name}`}
            className="rounded p-1 text-slate-400 opacity-0 transition-opacity hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100 dark:hover:bg-rose-950/30"
          >
            <Trash2 className="h-3 w-3" aria-hidden="true" />
          </button>
        </ConfirmDialog>
      )}
    </div>
  );
}
