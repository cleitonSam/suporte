'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

const MAX_NAME = 60;
const MAX_QS = 2000;

/**
 * Cria saved filter pro user. Recebe formData com:
 *  - name: nome do filtro
 *  - scope: 'ticket' (futuro: client, etc)
 *  - queryString: query string completa (sem o '?')
 *  - isShared: 'on' se compartilhar
 *  - returnTo: pra redirect
 */
export async function createSavedFilterAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.userType !== 'AGENT') redirect('/admin?error=forbidden');

  const name = (formData.get('name') as string | null)?.trim().slice(0, MAX_NAME);
  const queryString = (formData.get('queryString') as string | null)?.slice(0, MAX_QS) ?? '';
  const scope = (formData.get('scope') as string | null) || 'ticket';
  const isShared = formData.get('isShared') === 'on';
  const returnTo = (formData.get('returnTo') as string | null) || '/admin/chamados';

  if (!name || name.length < 2) {
    redirect(`${returnTo}?error=validation`);
  }

  await db.savedFilter.create({
    data: {
      userId: session.user.id,
      name,
      scope,
      queryString,
      isShared,
    },
  });

  revalidatePath(returnTo.split('?')[0] || returnTo);
  redirect(`${returnTo}${returnTo.includes('?') ? '&' : '?'}ok=filtro.salvo`);
}

export async function deleteSavedFilterAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const id = formData.get('id') as string;
  const returnTo = (formData.get('returnTo') as string | null) || '/admin/chamados';

  if (!id) redirect(`${returnTo}?error=validation`);

  // Só o owner pode deletar (mesmo se for shared)
  await db.savedFilter.deleteMany({
    where: { id, userId: session.user.id },
  });

  revalidatePath(returnTo.split('?')[0] || returnTo);
  redirect(`${returnTo}${returnTo.includes('?') ? '&' : '?'}ok=filtro.removido`);
}
