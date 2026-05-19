'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { isValidCnpj, stripCnpj } from '@/lib/cnpj';
import { z } from 'zod';
import type { ClientStatus } from '@prisma/client';

const cnpjField = z
  .string()
  .max(20)
  .refine((v) => v === '' || isValidCnpj(v), 'CNPJ inválido')
  .optional()
  .nullable()
  .or(z.literal(''));

const clientSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(200),
  legalName: z.string().max(200).optional().nullable(),
  cnpj: cnpjField,
  email: z.string().email('Email inválido').optional().nullable().or(z.literal('')),
  phone: z.string().max(20).optional().nullable(),
  address: z.string().max(400).optional().nullable(),
});

function normalizeCnpj(value: string | null | undefined): string | null {
  const stripped = stripCnpj(value ?? '');
  return stripped.length === 14 ? stripped : null;
}

export async function createClientAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.userType !== 'AGENT') redirect('/admin?error=forbidden');

  const parsed = clientSchema.safeParse({
    name: formData.get('name'),
    legalName: formData.get('legalName') || null,
    cnpj: formData.get('cnpj') || '',
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
      cnpj: normalizeCnpj(parsed.data.cnpj),
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

export async function updateClientAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.userType !== 'AGENT') redirect('/admin?error=forbidden');

  const id = formData.get('id') as string;
  if (!id) redirect('/admin/clientes?error=validation');

  const parsed = clientSchema.safeParse({
    name: formData.get('name'),
    legalName: formData.get('legalName') || null,
    cnpj: formData.get('cnpj') || '',
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
      name: parsed.data.name,
      legalName: parsed.data.legalName,
      cnpj: normalizeCnpj(parsed.data.cnpj),
      email: parsed.data.email || null,
      phone: parsed.data.phone,
      address: parsed.data.address,
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

const STATUS_OK: Record<ClientStatus, string> = {
  ACTIVE: 'cliente.reativado',
  SUSPENDED: 'cliente.suspenso',
  INACTIVE: 'cliente.inativado',
};

export async function updateClientStatusAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.userType !== 'AGENT') redirect('/admin?error=forbidden');

  const id = formData.get('id') as string;
  const status = formData.get('status') as ClientStatus;
  if (!id || !status) redirect('/admin/clientes?error=validation');
  if (!['ACTIVE', 'SUSPENDED', 'INACTIVE'].includes(status)) {
    redirect(`/admin/clientes/${id}?error=validation`);
  }

  const existing = await db.client.findUnique({
    where: { id },
    select: { status: true, name: true },
  });
  if (!existing) redirect('/admin/clientes?error=not_found');
  if (existing.status === status) redirect(`/admin/clientes/${id}`);

  await db.client.update({ where: { id }, data: { status } });

  await audit({
    action: 'client.status_change',
    actorId: session.user.id,
    entity: 'Client',
    entityId: id,
    metadata: { name: existing.name, from: existing.status, to: status },
  });

  revalidatePath(`/admin/clientes/${id}`);
  revalidatePath('/admin/clientes');
  redirect(`/admin/clientes/${id}?ok=${STATUS_OK[status]}`);
}

/**
 * Soft-delete de cliente com cascade explicito em:
 *   - User (contatos): deletedAt + isActive=false (impede login)
 *   - Equipment: deletedAt
 *   - Ticket: deletedAt
 *
 * Esta acao NUNCA apaga linhas fisicamente. Tudo permanece no banco com
 * deletedAt setado — o audit log registra os counts para reconstrucao.
 * Para reativar, seria necessario uma acao de "restore" (nao implementada).
 *
 * So ADMIN pode disparar (acao destrutiva irreversivel pela UI).
 */
export async function deleteClientAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.userType !== 'AGENT') redirect('/admin?error=forbidden');
  if (session.user.role !== 'ADMIN') {
    await audit({
      action: 'client.delete',
      actorId: session.user.id,
      entity: 'Client',
      metadata: { reason: 'forbidden_role', role: session.user.role },
    });
    redirect('/admin/clientes?error=forbidden');
  }

  const id = formData.get('id') as string;
  if (!id) redirect('/admin/clientes?error=validation');

  const existing = await db.client.findUnique({
    where: { id, deletedAt: null },
    select: {
      name: true,
      _count: {
        select: {
          users: { where: { deletedAt: null } },
          equipment: { where: { deletedAt: null } },
          tickets: { where: { deletedAt: null } },
        },
      },
    },
  });
  if (!existing) redirect('/admin/clientes?error=not_found');

  const now = new Date();

  await db.$transaction([
    db.user.updateMany({
      where: { clientId: id, deletedAt: null },
      data: { deletedAt: now, isActive: false },
    }),
    db.equipment.updateMany({
      where: { clientId: id, deletedAt: null },
      data: { deletedAt: now },
    }),
    db.ticket.updateMany({
      where: { clientId: id, deletedAt: null },
      data: { deletedAt: now },
    }),
    db.client.update({
      where: { id },
      data: { deletedAt: now, status: 'INACTIVE' },
    }),
  ]);

  await audit({
    action: 'client.delete',
    actorId: session.user.id,
    entity: 'Client',
    entityId: id,
    metadata: {
      name: existing.name,
      cascade: {
        users: existing._count.users,
        equipment: existing._count.equipment,
        tickets: existing._count.tickets,
      },
    },
  });

  revalidatePath('/admin/clientes');
  redirect('/admin/clientes?ok=cliente.removido');
}
