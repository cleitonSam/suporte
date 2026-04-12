'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, BookOpen } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  _count: {
    articles: number;
  };
}

interface Props {
  categories: Category[];
}

const categoryIcons: Record<string, string> = {
  BookOpen: '📖',
  HelpCircle: '❓',
  Lightbulb: '💡',
  Settings: '⚙️',
  Zap: '⚡',
  Shield: '🛡️',
  Wrench: '🔧',
  Bell: '🔔',
};

export default function AjudaClient({ categories }: Props) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;

    const query = searchQuery.toLowerCase();
    return categories.filter((cat) => {
      const nameMatch = cat.name.toLowerCase().includes(query);
      const descMatch = cat.description?.toLowerCase().includes(query);
      return nameMatch || descMatch;
    });
  }, [categories, searchQuery]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">Base de Conhecimento</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Encontre respostas e artigos úteis para resolver seus problemas.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar categorias..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-500 focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400"
        />
      </div>

      {filteredCategories.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center dark:border-slate-600 dark:bg-slate-800/50">
          <BookOpen className="mx-auto h-12 w-12 text-slate-400" />
          <p className="mt-4 text-slate-600 dark:text-slate-400">
            {searchQuery ? 'Nenhuma categoria encontrada.' : 'Nenhuma categoria disponível.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCategories.map((category) => (
            <Link
              key={category.id}
              href={`/portal/ajuda/${category.slug}`}
              className="group flex flex-col rounded-lg border border-slate-200 bg-white p-6 transition-all hover:border-fluxo-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-fluxo-500/50"
            >
              <div className="mb-3 flex items-center gap-3">
                <div className="text-3xl">
                  {categoryIcons[category.icon || ''] || '📚'}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 group-hover:text-fluxo-600 dark:text-white">
                    {category.name}
                  </h3>
                </div>
              </div>

              {category.description && (
                <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">{category.description}</p>
              )}

              <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-700">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {category._count.articles}{' '}
                  {category._count.articles === 1 ? 'artigo' : 'artigos'}
                </span>
                <span className="text-xs text-fluxo-600 group-hover:font-semibold">
                  Ver →
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
