'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { z } from 'zod';

// CNPJ aceita 14 dígitos (com ou sem máscara). Apenas verifica formato básico.
const cnpjRegex = /^(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})?$/;

const clientSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(200),
  legalName: z.string().max(200).optional().nullable(),
  cnpj: z
    .string()
    .max(20)
    .regex(cnpjRegex, 'CNPJ em formato inválido')
    .optional()
    .nullable()
    .or(z.literal('')),
  email: z.string().email('Email inválido').optional().nullable().or(z.literal('')),
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
    redirect('/admin/clientes?novo=1&error=validation');
  }

  const client = await db.client.create({
    data: {
      name: parsed.data.name,
      legalName: parsed.data.legalName,
      cnpj: parsed.data.cnpj || null,
      email: parsed.data.email || null,
      phone: parsed.data.phone,
      address: parsed.data.address,
    },
  });

  await audit({
    action: 'client.create',
    actorId: session.user.id,
    entity: 'Client',
    entityId: client.id,
    metadata: { name: client.name, cnpj: client.cnpj },
  });

  revalidatePath('/admin/clientes');
  redirect(`/admin/clientes/${client.id}?ok=cliente.criado`);
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

  if (!parsed.success) {
    redirect(`/admin/clientes/${id}?error=validation`);
  }

  await db.client.update({
    where: { id },
    data: {
      ...parsed.data,
      cnpj: parsed.data.cnpj || null,
      email: parsed.data.email || null,
    },
  });

  await audit({
    action: 'client.update',
    actorId: session.user.id,
    entity: 'Client',
    entityId: id,
    metadata: { name: parsed.data.name },
  });

  revalidatePath(`/admin/clientes/${id}`);
  revalidatePath('/admin/clientes');
  redirect(`/admin/clientes/${id}?ok=cliente.atualizado`);
}
