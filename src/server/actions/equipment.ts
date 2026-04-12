'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';
import type { EquipmentStatus } from '@prisma/client';

const equipmentSchema = z.object({
  clientId: z.string().min(1),
  categoryId: z.string().min(1),
  name: z.string().min(2).max(200),
  brand: z.string().max(100).optional().nullable(),
  model: z.string().max(100).optional().nullable(),
  serialNumber: z.string().max(100).optional().nullable(),
  patrimony: z.string().max(100).optional().nullable(),
  ipAddress: z.string().max(45).optional().nullable(),
  macAddress: z.string().max(17).optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  purchaseDate: z.string().optional().nullable(),
  warrantyExpiresAt: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'IN_REPAIR', 'RETIRED']).default('ACTIVE'),
  notes: z.string().max(5000).optional().nullable(),
});

export async function createEquipmentAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error('Não autenticado');
  const user = session.user as any;
  if (user.userType !== 'AGENT') throw new Error('Sem permissão');

  const clientId = formData.get('clientId') as string;

  const parsed = equipmentSchema.safeParse({
    clientId,
    categoryId: formData.get('categoryId'),
    name: formData.get('name'),
    brand: formData.get('brand') || null,
    model: formData.get('model') || null,
    serialNumber: formData.get('serialNumber') || null,
    patrimony: formData.get('patrimony') || null,
    ipAddress: formData.get('ipAddress') || null,
    macAddress: formData.get('macAddress') || null,
    location: formData.get('location') || null,
    purchaseDate: formData.get('purchaseDate') || null,
    warrantyExpiresAt: formData.get('warrantyExpiresAt') || null,
    status: formData.get('status') ?? 'ACTIVE',
    notes: formData.get('notes') || null,
  });

  if (!parsed.success) {
    redirect(`/admin/clientes/${clientId}/equipamentos/novo?error=validation`);
  }

  const d = parsed.data;
  await db.equipment.create({
    data: {
      clientId: d.clientId,
      categoryId: d.categoryId,
      name: d.name,
      brand: d.brand,
      model: d.model,
      serialNumber: d.serialNumber,
      patrimony: d.patrimony,
      ipAddress: d.ipAddress,
      macAddress: d.macAddress,
      location: d.location,
      purchaseDate: d.purchaseDate ? new Date(d.purchaseDate) : null,
      warrantyExpiresAt: d.warrantyExpiresAt ? new Date(d.warrantyExpiresAt) : null,
      status: d.status as EquipmentStatus,
      notes: d.notes,
    },
  });

  revalidatePath(`/admin/clientes/${clientId}`);
  revalidatePath('/admin/inventario');
  redirect(`/admin/clientes/${clientId}?aba=equipamentos`);
}

export async function updateEquipmentStatusAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error('Não autenticado');
  const user = session.user as any;
  if (user.userType !== 'AGENT') throw new Error('Sem permissão');

  const id = formData.get('id') as string;
  const status = formData.get('status') as EquipmentStatus;
  const clientId = formData.get('clientId') as string;

  await db.equipment.update({ where: { id }, data: { status } });

  revalidatePath(`/admin/clientes/${clientId}`);
  revalidatePath('/admin/inventario');
}

export async function deleteEquipmentAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error('Não autenticado');
  const user = session.user as any;
  if (user.userType !== 'AGENT') throw new Error('Sem permissão');

  const id = formData.get('id') as string;
  const clientId = formData.get('clientId') as string;

  await db.equipment.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  revalidatePath(`/admin/clientes/${clientId}`);
  revalidatePath('/admin/inventario');
  redirect(`/admin/clientes/${clientId}?aba=equipamentos`);
}
