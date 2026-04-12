import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { deleteKbArticleAction } from '@/server/actions/knowledge-base';
import { formatDate } from '@/lib/utils';
import { Plus, Pencil, Trash2, Eye, ThumbsUp, ThumbsDown, ChevronLeft, BookOpen } from 'lucide-react';

interface PageProps {
  params: { categorySlug: string };
  searchParams: { created?: string; updated?: string; deleted?: string; error?: string };
}

export default async function CategoryArticlesPage({ params, searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user || session.user.userType !== 'AGENT') return null;

  const category = await db.kbCategory.findUnique({
    where: { slug: params.categorySlug },
  });

  if (!category) notFound();

  const articles = await db.kbArticle.findMany({
    where: { categoryId: category.id },
    orderBy: [{ isPublished: 'desc' }, { createdAt: 'desc' }],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/conhecimento"
          className="rounded-md bg-slate-100 p-2 text-slate-600 hover:bg-slate-200"
          title="Voltar"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">{category.name}</h1>
          {category.description && (
            <p className="text-sm text-slate-500">{category.description}</p>
          )}
        </div>
        <Link
          href="/admin/conhecimento/artigo/novo"
          className="inline-flex items-center gap-1.5 rounded-md bg-fluxo-500 px-3 py-2 text-sm font-semibold text-white shadow-fluxo hover:bg-fluxo-600"
        >
          <Plus className="h-4 w-4" /> Novo artigo
        </Link>
      </div>

      {searchParams.created === '1' && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Artigo criado com sucesso.
        </div>
      )}
      {searchParams.updated === '1' && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Artigo atualizado com sucesso.
        </div>
      )}
      {searchParams.deleted === '1' && (
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Artigo removido.
        </div>
      )}
      {searchParams.error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          Erro: {searchParams.error}
        </div>
      )}

      {articles.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
          <BookOpen className="mx-auto h-12 w-12 text-slate-400" />
          <p className="mt-2 text-sm text-slate-600">Nenhum artigo criado nesta categoria ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {articles.map((article) => (
            <div
              key={article.id}
              className="flex items-start justify-between rounded-lg border border-slate-200 bg-white p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-slate-900">{article.title}</h3>
                  {!article.isPublished && (
                    <span className="inline-block rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
                      Rascunho
                    </span>
                  )}
                  {article.isPublished && (
                    <span className="inline-block rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-medium text-emerald-600">
                      Publicado
                    </span>
                  )}
                </div>
                {article.excerpt && (
                  <p className="mt-1 text-sm text-slate-500 line-clamp-1">{article.excerpt}</p>
                )}
                <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                  <div className="flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5" />
                    {article.viewCount}
                  </div>
                  <div className="flex items-center gap-1">
                    <ThumbsUp className="h-3.5 w-3.5 text-emerald-600" />
                    {article.helpfulYes}
                  </div>
                  <div className="flex items-center gap-1">
                    <ThumbsDown className="h-3.5 w-3.5 text-rose-600" />
                    {article.helpfulNo}
                  </div>
                  <span className="text-slate-400">
                    Criado em {formatDate(article.createdAt)}
                  </span>
                </div>
              </div>

              <div className="ml-4 flex items-center gap-2">
                <Link
                  href={`/admin/conhecimento/artigo/${article.id}`}
                  className="rounded-md bg-slate-100 p-2 text-slate-600 hover:bg-slate-200"
                  title="Editar"
                >
                  <Pencil className="h-4 w-4" />
                </Link>
                <form
                  action={deleteKbArticleAction}
                  onSubmit={(e) => {
                    if (!confirm('Deletar este artigo permanentemente?')) {
                      e.preventDefault();
                    }
                  }}
                  className="contents"
                >
                  <input type="hidden" name="id" value={article.id} />
                  <button
                    type="submit"
                    className="rounded-md bg-rose-50 p-2 text-rose-600 hover:bg-rose-100"
                    title="Deletar"
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
