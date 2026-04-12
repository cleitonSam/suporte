'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function createQueueAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error('Não autenticado');
  const user = session.user as any;
  if (user.role !== 'ADMIN') throw new Error('Sem permissão');

  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  const color = formData.get('color') as string;

  if (!name?.trim()) redirect('/admin/configuracoes?aba=filas&error=validation');

  await db.queue.create({
    data: { name: name.trim(), description: description || null, color: color || null },
  });

  revalidatePath('/admin/configuracoes');
  redirect('/admin/configuracoes?aba=filas');
}

export async function addQueueMemberAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error('Não autenticado');
  const user = session.user as any;
  if (user.role !== 'ADMIN') throw new Error('Sem permissão');

  const queueId = formData.get('queueId') as string;
  const userId = formData.get('userId') as string;

  await db.queueMember.upsert({
    where: { queueId_userId: { queueId, userId } },
    create: { queueId, userId },
    update: {},
  });

  revalidatePath('/admin/configuracoes');
  revalidatePath('/admin/fila');
}

export async function removeQueueMemberAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error('Não autenticado');
  const user = session.user as any;
  if (user.role !== 'ADMIN') throw new Error('Sem permissão');

  const queueId = formData.get('queueId') as string;
  const userId = formData.get('userId') as string;

  await db.queueMember.deleteMany({ where: { queueId, userId } });

  revalidatePath('/admin/configuracoes');
  revalidatePath('/admin/fila');
}

export async function toggleQueueStatusAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error('Não autenticado');
  const user = session.user as any;
  if (user.role !== 'ADMIN') throw new Error('Sem permissão');

  const id = formData.get('id') as string;
  const queue = await db.queue.findUnique({ where: { id } });
  if (!queue) return;

  await db.queue.update({ where: { id }, data: { isActive: !queue.isActive } });
  revalidatePath('/admin/configuracoes');
}
