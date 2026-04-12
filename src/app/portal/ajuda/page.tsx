import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import AjudaClient from './ajuda-client';

export const metadata = {
  title: 'Base de Conhecimento — Fluxo Suporte',
  description: 'Encontre respostas e artigos úteis sobre nossos serviços.',
};

export default async function AjudaPage() {
  const session = await auth();

  if (!session?.user) {
    return null;
  }

  const categories = await db.kbCategory.findMany({
    where: { isActive: true },
    include: {
      _count: {
        select: { articles: { where: { isPublished: true } } },
      },
    },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });

  return <AjudaClient categories={categories} />;
}
