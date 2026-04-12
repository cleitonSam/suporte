'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function createCategoryAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error('Não autenticado');
  const user = session.user as any;
  if (user.role !== 'ADMIN') throw new Error('Sem permissão');

  const name = (formData.get('name') as string)?.trim();
  const color = (formData.get('color') as string) || '#64748b';

  if (!name) return;

  const last = await db.ticketCategory.findFirst({ orderBy: { sortOrder: 'desc' } });
  await db.ticketCategory.create({
    data: {
      name,
      color,
      sortOrder: (last?.sortOrder ?? 0) + 1,
      isActive: true,
    },
  });

  revalidatePath('/admin/configuracoes');
}

export async function toggleCategoryAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error('Não autenticado');
  const user = session.user as any;
  if (user.role !== 'ADMIN') throw new Error('Sem permissão');

  const id = formData.get('id') as string;
  const cat = await db.ticketCategory.findUnique({ where: { id } });
  if (!cat) return;

  await db.ticketCategory.update({ where: { id }, data: { isActive: !cat.isActive } });
  revalidatePath('/admin/configuracoes');
}
