'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
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

function parseEquipmentForm(formData: FormData) {
  return equipmentSchema.safeParse({
    clientId: formData.get('clientId'),
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
}

export async function createEquipmentAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.userType !== 'AGENT') redirect('/admin?error=forbidden');

  const clientId = formData.get('clientId') as string;
  const parsed = parseEquipmentForm(formData);

  if (!parsed.success) {
    redirect(`/admin/clientes/${clientId}/equipamentos/novo?error=validation`);
  }

  const d = parsed.data;
  const created = await db.equipment.create({
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

  await audit({
    action: 'equipment.create',
    actorId: session.user.id,
    entity: 'Equipment',
    entityId: created.id,
    metadata: { name: created.name, clientId: created.clientId, status: created.status },
  });

  revalidatePath(`/admin/clientes/${clientId}`);
  revalidatePath('/admin/inventario');
  redirect(`/admin/clientes/${clientId}?aba=equipamentos&ok=equipamento.criado`);
}

export async function updateEquipmentAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.userType !== 'AGENT') redirect('/admin?error=forbidden');

  const id = formData.get('id') as string;
  if (!id) redirect('/admin/inventario?error=validation');

  const existing = await db.equipment.findUnique({
    where: { id },
    select: { clientId: true },
  });
  if (!existing) redirect('/admin/inventario?error=not_found');

  const parsed = parseEquipmentForm(formData);
  if (!parsed.success) {
    redirect(
      `/admin/clientes/${existing.clientId}/equipamentos/${id}/editar?error=validation`,
    );
  }

  const d = parsed.data;
  await db.equipment.update({
    where: { id },
    data: {
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

  await audit({
    action: 'equipment.update',
    actorId: session.user.id,
    entity: 'Equipment',
    entityId: id,
    metadata: { name: d.name, status: d.status },
  });

  revalidatePath(`/admin/clientes/${existing.clientId}`);
  revalidatePath('/admin/inventario');
  redirect(`/admin/clientes/${existing.clientId}?aba=equipamentos&ok=equipamento.atualizado`);
}

export async function updateEquipmentStatusAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.userType !== 'AGENT') redirect('/admin?error=forbidden');

  const id = formData.get('id') as string;
  const status = formData.get('status') as EquipmentStatus;
  const returnTo = (formData.get('returnTo') as string) || '/admin/inventario';

  if (!id || !status) redirect(`${returnTo}?error=validation`);

  const existing = await db.equipment.findUnique({
    where: { id },
    select: { clientId: true, status: true, name: true },
  });
  if (!existing) redirect(`${returnTo}?error=not_found`);
  if (existing.status === status) redirect(returnTo);

  await db.equipment.update({ where: { id }, data: { status } });

  await audit({
    action: 'equipment.status_change',
    actorId: session.user.id,
    entity: 'Equipment',
    entityId: id,
    metadata: { name: existing.name, from: existing.status, to: status },
  });

  revalidatePath(`/admin/clientes/${existing.clientId}`);
  revalidatePath('/admin/inventario');
  redirect(`${returnTo}?ok=equipamento.atualizado`);
}

export async function deleteEquipmentAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.userType !== 'AGENT') redirect('/admin?error=forbidden');

  const id = formData.get('id') as string;
  const returnTo = (formData.get('returnTo') as string) || '/admin/inventario';

  if (!id) redirect(`${returnTo}?error=validation`);

  const existing = await db.equipment.findUnique({
    where: { id },
    select: { clientId: true, name: true },
  });
  if (!existing) redirect(`${returnTo}?error=not_found`);

  await db.equipment.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await audit({
    action: 'equipment.delete',
    actorId: session.user.id,
    entity: 'Equipment',
    entityId: id,
    metadata: { name: existing.name, clientId: existing.clientId },
  });

  revalidatePath(`/admin/clientes/${existing.clientId}`);
  revalidatePath('/admin/inventario');
  redirect(`${returnTo}?ok=equipamento.removido`);
}
