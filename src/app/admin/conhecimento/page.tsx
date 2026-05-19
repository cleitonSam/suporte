import Link from 'next/link';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { createKbCategoryAction, deleteKbCategoryAction } from '@/server/actions/knowledge-base';
import { Plus, Pencil, Trash2, CheckCircle2, BookOpen } from 'lucide-react';
import { ConfirmDialog } from '@/components/confirm-dialog';

interface PageProps {
  searchParams: { created?: string; updated?: string; deleted?: string; error?: string; novo?: string };
}

export default async function KnowledgeBasePage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user || session.user.userType !== 'AGENT') return null;

  const categories = await db.kbCategory.findMany({
    where: { isActive: true },
    include: {
      _count: {
        select: { articles: true },
      },
    },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });

  const isCreating = searchParams.novo === '1';

  // Get icon from category or use default
  const getIcon = (iconName?: string | null) => {
    const iconMap: Record<string, string> = {
      BookOpen: '📖',
      HelpCircle: '❓',
      Lightbulb: '💡',
      Settings: '⚙️',
      Zap: '⚡',
      Shield: '🛡️',
    };
    return iconMap[iconName || ''] || '📚';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="micro-label-accent">Base · conhecimento</p>
          <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white">
            Conhecimento
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            <span className="font-mono-tech">{categories.length}</span> categoria{categories.length === 1 ? '' : 's'} · gerencie artigos pra ajudar seus clientes.
          </p>
        </div>
        {!isCreating && (
          <Link
            href="/admin/conhecimento?novo=1"
            className="inline-flex items-center gap-1.5 rounded-md bg-fluxo-500 px-4 py-2 text-sm font-semibold text-white shadow-fluxo hover:bg-fluxo-600"
          >
            <Plus className="h-4 w-4" aria-hidden="true" /> Nova categoria
          </Link>
        )}
      </div>

      {searchParams.created === '1' && (
        <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4" /> Categoria criada com sucesso.
        </div>
      )}
      {searchParams.updated === '1' && (
        <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4" /> Categoria atualizada com sucesso.
        </div>
      )}
      {searchParams.deleted === '1' && (
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Categoria desativada.
        </div>
      )}
      {searchParams.error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          Erro: {searchParams.error}
        </div>
      )}

      {isCreating && (
        <form
          action={createKbCategoryAction}
          className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-elevate"
        >
          <h2 className="text-sm font-semibold text-slate-900">Nova categoria</h2>
          <div>
            <label className="block text-xs font-medium text-slate-700">Nome</label>
            <input
              name="name"
              required
              minLength={2}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Ex: Configuração de Email"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700">Slug (opcional)</label>
            <input
              name="slug"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono text-sm"
              placeholder="configuracao-email (auto-gerado se vazio)"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700">Descrição (opcional)</label>
            <textarea
              name="description"
              rows={2}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Breve descrição desta categoria..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700">Ícone (opcional)</label>
            <select name="icon" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
              <option value="">Sem ícone</option>
              <option value="BookOpen">📖 BookOpen</option>
              <option value="HelpCircle">❓ HelpCircle</option>
              <option value="Lightbulb">💡 Lightbulb</option>
              <option value="Settings">⚙️ Settings</option>
              <option value="Zap">⚡ Zap</option>
              <option value="Shield">🛡️ Shield</option>
            </select>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              className="rounded-md bg-fluxo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-fluxo-600"
            >
              Criar categoria
            </button>
            <Link
              href="/admin/conhecimento"
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              Cancelar
            </Link>
          </div>
        </form>
      )}

      {categories.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-12 text-center dark:border-slate-600 dark:bg-slate-800">
          <BookOpen className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
          <p className="mt-3 text-sm text-slate-500">Nenhuma categoria criada ainda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <div
              key={category.id}
              className="group relative flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white p-5 shadow-elevate transition-all hover:-translate-y-0.5 hover:shadow-elevate-lg dark:border-slate-700 dark:bg-slate-800"
            >
              <span
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-fluxo-500/40 to-transparent"
              />
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-2 text-2xl" aria-hidden="true">{getIcon(category.icon)}</div>
                  <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                    {category.name}
                  </h3>
                  {category.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                      {category.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-700">
                <div className="flex items-baseline gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-mono-tech text-base font-bold text-slate-900 dark:text-white">
                    {category._count.articles}
                  </span>
                  artigo{category._count.articles !== 1 ? 's' : ''}
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <Link
                  href={`/admin/conhecimento/${category.slug}`}
                  className="flex-1 rounded-md bg-fluxo-500/10 px-3 py-2 text-center text-xs font-semibold text-fluxo-600 transition-colors hover:bg-fluxo-500/20 dark:text-fluxo-300"
                >
                  Ver artigos →
                </Link>
                <button
                  type="button"
                  aria-label="Editar categoria"
                  className="rounded-md border border-slate-200 p-1.5 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-700"
                  title="Editar (em breve)"
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <ConfirmDialog
                  title="Desativar categoria"
                  description={
                    <>
                      A categoria <strong>&quot;{category.name}&quot;</strong> ficará oculta. Os
                      artigos vinculados não serão removidos.
                    </>
                  }
                  confirmLabel="Desativar"
                  destructive
                  action={deleteKbCategoryAction}
                  hiddenFields={{ id: category.id }}
                >
                  <button
                    type="button"
                    aria-label={`Desativar categoria ${category.name}`}
                    className="rounded-md border border-rose-200 bg-rose-50/60 p-1.5 text-rose-600 transition-colors hover:bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/30"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </ConfirmDialog>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
