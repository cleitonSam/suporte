import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { ArticleActions } from './article-actions';
import { markdownToHtml } from '@/lib/markdown';

interface PageProps {
  params: Promise<{ categorySlug: string; articleSlug: string }>;
}

export const metadata = {
  title: 'Artigo — Fluxo Suporte',
};

export default async function ArticlePage({ params }: PageProps) {
  const { categorySlug, articleSlug } = await params;

  const session = await auth();
  if (!session?.user) return null;

  const article = await db.kbArticle.findUnique({
    where: { slug: articleSlug },
    include: {
      category: {
        select: {
          name: true,
          slug: true,
        },
      },
    },
  });

  if (!article || !article.isPublished || article.category.slug !== categorySlug) {
    notFound();
  }

  const htmlContent = markdownToHtml(article.body);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Link
          href={`/portal/ajuda/${categorySlug}`}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          {article.category.name}
        </Link>
      </div>

      {/* Title */}
      <div>
        <h1 className="text-4xl font-bold text-slate-900">{article.title}</h1>
        <p className="mt-2 text-sm text-slate-500">
          Última atualização: {new Date(article.updatedAt).toLocaleDateString('pt-BR')}
        </p>
      </div>

      {/* Content */}
      <article
        className="prose prose-sm max-w-none rounded-lg border border-slate-200 bg-white p-6 text-slate-700 dark:prose-invert sm:prose"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />

      {/* Actions */}
      <ArticleActions articleId={article.id} viewCount={article.viewCount} />
    </div>
  );
}
