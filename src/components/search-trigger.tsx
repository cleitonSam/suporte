'use client';

import { Search } from 'lucide-react';

export function SearchTrigger() {
  return (
    <button
      onClick={() => {
        // Simulate Ctrl+K to open the command palette
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
      }}
      className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-500 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
      title="Busca global (Ctrl+K)"
    >
      <Search className="h-3.5 w-3.5 text-slate-400" />
      <span className="text-xs text-slate-400">Buscar...</span>
      <kbd className="ml-2 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] text-slate-400 dark:border-slate-600 dark:bg-slate-700">
        Ctrl K
      </kbd>
    </button>
  );
}
