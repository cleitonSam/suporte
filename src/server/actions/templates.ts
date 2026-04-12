'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';

const schema = z.object({
  title: z.string().min(2).max(120),
  body: z.string().min(2).max(10_000),
  isActive: z.boolean().optional(),
});

async function requireAgent() {
  const session = await auth();
  if (!session?.user) throw new Error('Não autenticado');
  const user = session.user;
  if (user.userType !== 'AGENT') throw new Error('Sem permissão');
  return user;
}

export async function createTemplateAction(formData: FormData) {
  const user = await requireAgent();

  const parsed = schema.safeParse({
    title: formData.get('title'),
    body: formData.get('body'),
    isActive: formData.get('isActive') !== 'off',
  });
  if (!parsed.success) redirect('/admin/templates?error=validation');

  const created = await db.responseTemplate.create({
    data: {
      title: parsed.data.title,
      body: parsed.data.body,
      authorId: user.id,
      isActive: parsed.data.isActive ?? true,
    },
  });

  await audit({
    action: 'template.create',
    actorId: user.id,
    entity: 'ResponseTemplate',
    entityId: created.id,
  });

  revalidatePath('/admin/templates');
  redirect('/admin/templates?saved=1');
}

export async function updateTemplateAction(formData: FormData) {
  const user = await requireAgent();
  const id = formData.get('id') as string;
  if (!id) throw new Error('id ausente');

  const parsed = schema.safeParse({
    title: formData.get('title'),
    body: formData.get('body'),
    isActive: formData.get('isActive') !== 'off',
  });
  if (!parsed.success) redirect(`/admin/templates/${id}?error=validation`);

  await db.responseTemplate.update({
    where: { id },
    data: {
      title: parsed.data.title,
      body: parsed.data.body,
      isActive: parsed.data.isActive ?? true,
    },
  });

  await audit({
    action: 'template.update',
    actorId: user.id,
    entity: 'ResponseTemplate',
    entityId: id,
  });

  revalidatePath('/admin/templates');
  redirect('/admin/templates?saved=1');
}

export async function deleteTemplateAction(formData: FormData) {
  const user = await requireAgent();
  const id = formData.get('id') as string;
  if (!id) throw new Error('id ausente');

  await db.responseTemplate.delete({ where: { id } });
  await audit({
    action: 'template.delete',
    actorId: user.id,
    entity: 'ResponseTemplate',
    entityId: id,
  });

  revalidatePath('/admin/templates');
  redirect('/admin/templates?removed=1');
}
