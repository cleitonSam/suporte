'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

const clientSchema = z.object({
  name: z.string().min(2).max(200),
  legalName: z.string().max(200).optional().nullable(),
  cnpj: z.string().max(20).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  phone: z.string().max(20).optional().nullable(),
  address: z.string().max(400).optional().nullable(),
});

export async function createClientAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error('Não autenticado');
  const user = session.user as any;
  if (user.userType !== 'AGENT') throw new Error('Sem permissão');

  const parsed = clientSchema.safeParse({
    name: formData.get('name'),
    legalName: formData.get('legalName') || null,
    cnpj: formData.get('cnpj') || null,
    email: formData.get('email') || null,
    phone: formData.get('phone') || null,
    address: formData.get('address') || null,
  });

  if (!parsed.success) {
    // Simples: redireciona de volta (V2 pode mostrar erros inline)
    redirect('/admin/clientes?novo=1&error=validation');
  }

  const client = await db.client.create({
    data: {
      name: parsed.data.name,
      legalName: parsed.data.legalName,
      cnpj: parsed.data.cnpj,
      email: parsed.data.email || null,
      phone: parsed.data.phone,
      address: parsed.data.address,
    },
  });

  revalidatePath('/admin/clientes');
  redirect(`/admin/clientes/${client.id}`);
}

export async function updateClientAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error('Não autenticado');

  const id = formData.get('id') as string;
  const parsed = clientSchema.safeParse({
    name: formData.get('name'),
    legalName: formData.get('legalName') || null,
    cnpj: formData.get('cnpj') || null,
    email: formData.get('email') || null,
    phone: formData.get('phone') || null,
    address: formData.get('address') || null,
  });

  if (!parsed.success) return;

  await db.client.update({
    where: { id },
    data: parsed.data,
  });

  revalidatePath(`/admin/clientes/${id}`);
  revalidatePath('/admin/clientes');
  redirect(`/admin/clientes/${id}?saved=1`);
}
