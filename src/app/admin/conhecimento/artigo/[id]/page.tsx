import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { updateKbArticleAction } from '@/server/actions/knowledge-base';
import { ChevronLeft } from 'lucide-react';

interface PageProps {
  params: { id: string };
  searchParams: { error?: string };
}

export default async function EditArticlePage({ params, searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user || session.user.userType !== 'AGENT') return null;

  const article = await db.kbArticle.findUnique({
    where: { id: params.id },
    include: { category: true },
  });

  if (!article) notFound();

  const categories = await db.kbCategory.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/admin/conhecimento/${article.category.slug}`}
          className="rounded-md bg-slate-100 p-2 text-slate-600 hover:bg-slate-200"
          title="Voltar"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Editar artigo</h1>
          <p className="text-sm text-slate-500">Atualize o conteúdo de seu artigo.</p>
        </div>
      </div>

      {searchParams.error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          Erro: {searchParams.error}
        </div>
      )}

      <form
        action={updateKbArticleAction}
        className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <input type="hidden" name="id" value={article.id} />

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-900">Categoria *</label>
            <select
              name="categoryId"
              required
              defaultValue={article.categoryId}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
            >
              <option value="">Selecione uma categoria</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900">Status</label>
            <div className="mt-2 flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="isPublished"
                  defaultChecked={article.isPublished}
                  className="h-4 w-4 rounded border-slate-300 text-fluxo-500 focus:ring-fluxo-500"
                />
                <span className="text-sm text-slate-700">Publicado</span>
              </label>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Se desmarcado, o artigo fica em rascunho.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-900">Título *</label>
          <input
            name="title"
            type="text"
            required
            minLength={3}
            defaultValue={article.title}
            className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
            placeholder="Ex: Como resetar sua senha de email"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-900">Slug (opcional)</label>
          <input
            name="slug"
            type="text"
            defaultValue={article.slug}
            className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
            placeholder="como-resetar-senha-email (auto-gerado se vazio)"
          />
          <p className="mt-1 text-xs text-slate-500">Será auto-gerado do título se deixar vazio.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-900">Resumo (opcional)</label>
          <textarea
            name="excerpt"
            rows={2}
            defaultValue={article.excerpt || ''}
            className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
            placeholder="Uma breve descrição que aparecerá em listas."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-900">Conteúdo (Markdown) *</label>
          <textarea
            name="body"
            required
            minLength={10}
            rows={12}
            defaultValue={article.body}
            className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
            placeholder={`# Seu título aqui

Escreva o conteúdo em Markdown.

## Seção 1
- Ponto 1
- Ponto 2

## Seção 2
Parágrafo com **negrito** e *itálico*.

\`\`\`
Código
\`\`\``}
          />
          <p className="mt-1 text-xs text-slate-500">Suporta Markdown: títulos, listas, links, código, etc.</p>
        </div>

        <div className="rounded-md bg-slate-50 px-4 py-3 text-xs text-slate-600">
          <div className="font-medium mb-1">Estatísticas:</div>
          <div className="grid grid-cols-3 gap-4">
            <div>Visualizações: <span className="font-semibold">${article.viewCount}</span></div>
            <div>Útil (Sim): <span className="font-semibold text-emerald-600">${article.helpfulYes}</span></div>
            <div>Útil (Não): <span className="font-semibold text-rose-600">${article.helpfulNo}</span></div>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-slate-200 pt-5">
          <button
            type="submit"
            className="rounded-md bg-fluxo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-fluxo-600 focus:outline-none focus:ring-2 focus:ring-fluxo-500 focus:ring-offset-2"
          >
            Salvar alterações
          </button>
          <Link
            href={`/admin/conhecimento/${article.category.slug}`}
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
