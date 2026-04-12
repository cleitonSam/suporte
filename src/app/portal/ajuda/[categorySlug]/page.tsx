import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Eye } from 'lucide-react';

interface PageProps {
  params: Promise<{ categorySlug: string }>;
}

export const metadata = {
  title: 'Artigos — Fluxo Suporte',
};

export default async function CategoryArticlesPage({ params }: PageProps) {
  const { categorySlug } = await params;

  const session = await auth();
  if (!session?.user) return null;

  const category = await db.kbCategory.findUnique({
    where: { slug: categorySlug },
    include: {
      articles: {
        where: { isPublished: true },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          viewCount: true,
          createdAt: true,
        },
      },
    },
  });

  if (!category || !category.isActive) {
    notFound();
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/portal/ajuda"
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>
      </div>

      <div className="flex items-start gap-4">
        <div className="text-4xl">
          {categoryIcons[category.icon || ''] || '📚'}
        </div>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-slate-900">{category.name}</h1>
          {category.description && (
            <p className="mt-2 text-slate-600">{category.description}</p>
          )}
        </div>
      </div>

      {/* Articles */}
      {category.articles.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
          <p className="text-slate-600">Nenhum artigo publicado nesta categoria.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {category.articles.map((article) => (
            <Link
              key={article.id}
              href={`/portal/ajuda/${categorySlug}/${article.slug}`}
              className="block rounded-lg border border-slate-200 bg-white p-4 transition-all hover:border-fluxo-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="font-semibold text-slate-900 hover:text-fluxo-600">
                    {article.title}
                  </h2>
                  {article.excerpt && (
                    <p className="mt-1 text-sm text-slate-600 line-clamp-2">
                      {article.excerpt}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                <div className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  {article.viewCount} {article.viewCount === 1 ? 'visualização' : 'visualizações'}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
