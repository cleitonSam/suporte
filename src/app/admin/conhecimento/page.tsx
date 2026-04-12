import Link from 'next/link';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { createKbCategoryAction, deleteKbCategoryAction } from '@/server/actions/knowledge-base';
import { Plus, Pencil, Trash2, CheckCircle2, BookOpen } from 'lucide-react';

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Base de conhecimento</h1>
          <p className="text-sm text-slate-500">
            Gerencie artigos e categorias para ajudar seus clientes.
          </p>
        </div>
        {!isCreating && (
          <Link
            href="/admin/conhecimento?novo=1"
            className="inline-flex items-center gap-1.5 rounded-md bg-fluxo-500 px-3 py-2 text-sm font-semibold text-white shadow-fluxo hover:bg-fluxo-600"
          >
            <Plus className="h-4 w-4" /> Nova categoria
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
          className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
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
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
          <BookOpen className="mx-auto h-12 w-12 text-slate-400" />
          <p className="mt-2 text-sm text-slate-600">Nenhuma categoria criada ainda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <div
              key={category.id}
              className="flex flex-col rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="text-2xl mb-2">{getIcon(category.icon)}</div>
                  <h3 className="text-lg font-semibold text-slate-900">{category.name}</h3>
                  {category.description && (
                    <p className="mt-1 text-sm text-slate-500">{category.description}</p>
                  )}
                </div>
              </div>

              <div className="mt-4 border-t border-slate-200 pt-4">
                <div className="text-sm text-slate-600">
                  <span className="font-semibold text-fluxo-600">{category._count.articles}</span>{' '}
                  artigo{category._count.articles !== 1 ? 's' : ''}
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <Link
                  href={`/admin/conhecimento/${category.slug}`}
                  className="flex-1 rounded-md bg-fluxo-50 px-3 py-2 text-center text-sm font-medium text-fluxo-600 hover:bg-fluxo-100"
                >
                  Ver artigos
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    // In a real app, you'd open an edit modal or navigate to edit page
                  }}
                  className="rounded-md bg-slate-100 p-2 text-slate-600 hover:bg-slate-200"
                  title="Editar"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <form
                  action={deleteKbCategoryAction}
                  onSubmit={(e) => {
                    if (!confirm('Desativar esta categoria? Artigos não serão removidos.')) {
                      e.preventDefault();
                    }
                  }}
                  className="contents"
                >
                  <input type="hidden" name="id" value={category.id} />
                  <button
                    type="submit"
                    className="rounded-md bg-rose-50 p-2 text-rose-600 hover:bg-rose-100"
                    title="Desativar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
