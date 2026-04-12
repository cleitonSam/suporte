'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import type { UserRole, UserType } from '@prisma/client';
import { sendInviteEmail, sendPasswordResetEmail } from '@/lib/email';
import { createPasswordToken, verifyPasswordToken, consumePasswordToken } from '@/lib/password-token';
import { audit } from '@/lib/audit';
import { rateLimit, RATE_POLICIES } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

const createUserSchema = z.object({
  name: z.string().min(2).max(200),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['ADMIN', 'AGENT', 'CLIENT']),
  userType: z.enum(['AGENT', 'CLIENT_CONTACT']),
  clientId: z.string().cuid().optional().nullable(),
});

export async function createUserAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error('Não autenticado');
  const currentUser = session.user;
  if (currentUser.role !== 'ADMIN') throw new Error('Sem permissão');

  const parsed = createUserSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
    role: formData.get('role') ?? 'AGENT',
    userType: formData.get('userType') ?? 'AGENT',
    clientId: formData.get('clientId') || null,
  });

  if (!parsed.success) {
    redirect('/admin/configuracoes?aba=usuarios&novo=1&error=validation');
  }

  const created = await db.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      passwordHash: await bcrypt.hash(parsed.data.password, 12),
      role: parsed.data.role as UserRole,
      userType: parsed.data.userType as UserType,
      clientId: parsed.data.clientId ?? null,
    },
  });

  await audit({
    action: 'user.create',
    actorId: currentUser.id,
    entity: 'User',
    entityId: created.id,
    metadata: { email: created.email, role: created.role, userType: created.userType },
  });

  revalidatePath('/admin/configuracoes');
  redirect('/admin/configuracoes?aba=usuarios&created=1');
}

// Cria contato de cliente — usado pelo admin na tela de detalhes do cliente.
// O contato nasce com uma senha aleatória impossível de adivinhar (32 bytes).
// Se "sendInvite" estiver marcado, geramos um token de primeiro acesso e
// mandamos um link por email para o usuário definir a própria senha.
export async function createClientContactAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error('Não autenticado');
  const currentUser = session.user;
  if (currentUser.userType !== 'AGENT') throw new Error('Sem permissão');

  const clientId = formData.get('clientId') as string;
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const phone = formData.get('phone') as string;
  const sendInvite = formData.get('sendInvite') === 'on';

  if (!clientId || !name || !email) {
    redirect(`/admin/clientes/${clientId}?aba=contatos&error=validation`);
  }

  // Nasce com senha aleatória inusável — o usuário precisa do link de ativação
  const { randomBytes } = await import('node:crypto');
  const randomPassword = randomBytes(32).toString('base64url');

  const client = await db.client.findUnique({ where: { id: clientId }, select: { name: true } });

  const existing = await db.user.findFirst({ where: { email: email.toLowerCase(), deletedAt: null } });
  if (existing) {
    redirect(`/admin/clientes/${clientId}?aba=contatos&error=email_exists`);
  }

  const created = await db.user.create({
    data: {
      name,
      email: email.toLowerCase(),
      passwordHash: await bcrypt.hash(randomPassword, 12),
      role: 'CLIENT',
      userType: 'CLIENT_CONTACT',
      clientId,
      phone: phone || null,
    },
  });

  await audit({
    action: 'user.create',
    actorId: currentUser.id,
    entity: 'User',
    entityId: created.id,
    metadata: { email: created.email, role: 'CLIENT', clientId },
  });

  let inviteStatus: 'enviado' | 'criado' | 'email_falhou' = 'criado';
  if (sendInvite) {
    try {
      const { token } = await createPasswordToken(created.id, 'invite');
      const sent = await sendInviteEmail({
        to: email,
        name,
        clientName: client?.name ?? '',
        token,
      });
      inviteStatus = sent ? 'enviado' : 'email_falhou';
      await audit({
        action: 'user.invite_sent',
        actorId: currentUser.id,
        entity: 'User',
        entityId: created.id,
        metadata: { delivered: sent },
      });
    } catch (err) {
      logger.error({ err }, '[createClientContact] falha no convite');
      inviteStatus = 'email_falhou';
    }
  }

  revalidatePath(`/admin/clientes/${clientId}`);
  redirect(`/admin/clientes/${clientId}?aba=contatos&convite=${inviteStatus}`);
}

// Atualiza um contato de cliente existente
export async function updateClientContactAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error('Não autenticado');
  const currentUser = session.user;
  if (currentUser.userType !== 'AGENT') throw new Error('Sem permissão');

  const userId = formData.get('userId') as string;
  const clientId = formData.get('clientId') as string;
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const phone = formData.get('phone') as string;
  const isActive = formData.get('isActive') === 'on';

  if (!userId || !clientId || !name || !email) {
    redirect(`/admin/clientes/${clientId}/contatos/${userId}?error=validation`);
  }

  // Verifica se email foi alterado e se já está em uso
  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) throw new Error('Contato não encontrado');

  if (email.toLowerCase() !== target.email) {
    const duplicate = await db.user.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null, NOT: { id: userId } },
    });
    if (duplicate) {
      redirect(`/admin/clientes/${clientId}/contatos/${userId}?error=email_exists`);
    }
  }

  await db.user.update({
    where: { id: userId },
    data: {
      name,
      email: email.toLowerCase(),
      phone: phone || null,
      isActive,
    },
  });

  await audit({
    action: 'user.update',
    actorId: currentUser.id,
    entity: 'User',
    entityId: userId,
    metadata: { name, email: email.toLowerCase(), isActive },
  });

  revalidatePath(`/admin/clientes/${clientId}`);
  redirect(`/admin/clientes/${clientId}/contatos/${userId}?saved=1`);
}

// Remove contato (soft-delete)
export async function deleteClientContactAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error('Não autenticado');
  const currentUser = session.user;
  if (currentUser.userType !== 'AGENT') throw new Error('Sem permissão');

  const userId = formData.get('userId') as string;
  const clientId = formData.get('clientId') as string;
  if (!userId || !clientId) throw new Error('Parâmetros ausentes');

  await db.user.update({
    where: { id: userId },
    data: { deletedAt: new Date(), isActive: false },
  });

  await audit({
    action: 'user.delete',
    actorId: currentUser.id,
    entity: 'User',
    entityId: userId,
  });

  revalidatePath(`/admin/clientes/${clientId}`);
  redirect(`/admin/clientes/${clientId}?aba=contatos&removido=1`);
}

// Troca de senha pelo próprio usuário logado
export async function changePasswordAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error('Não autenticado');
  const user = session.user;

  const currentPassword = formData.get('currentPassword') as string;
  const newPassword = formData.get('newPassword') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (!currentPassword || !newPassword || newPassword.length < 8) {
    redirect(`${user.userType === 'AGENT' ? '/admin' : '/portal'}/perfil?error=validation`);
  }
  if (newPassword !== confirmPassword) {
    redirect(`${user.userType === 'AGENT' ? '/admin' : '/portal'}/perfil?error=mismatch`);
  }

  const dbUser = await db.user.findUnique({ where: { id: user.id } });
  if (!dbUser) throw new Error('Usuário não encontrado');

  const valid = await bcrypt.compare(currentPassword, dbUser.passwordHash);
  if (!valid) {
    await audit({ action: 'auth.login_failed', actorId: user.id, metadata: { reason: 'change_pwd_wrong_current' } });
    redirect(`${user.userType === 'AGENT' ? '/admin' : '/portal'}/perfil?error=wrong_password`);
  }

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(newPassword, 12) },
  });

  await audit({ action: 'auth.password_changed', actorId: user.id, entity: 'User', entityId: user.id });

  redirect(`${user.userType === 'AGENT' ? '/admin' : '/portal'}/perfil?saved=1`);
}

// Reenvia convite gerando NOVO TOKEN de primeiro acesso (sem senha em texto).
export async function resendInviteAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error('Não autenticado');
  const currentUser = session.user;
  if (currentUser.userType !== 'AGENT') throw new Error('Sem permissão');

  const userId = formData.get('userId') as string;
  const from = (formData.get('from') as string) || '';
  if (!userId) throw new Error('userId ausente');

  const user = await db.user.findFirst({
    where: { id: userId, deletedAt: null },
    include: { client: { select: { name: true } } },
  });
  if (!user || !user.email) throw new Error('Usuário não encontrado');

  const { token } = await createPasswordToken(user.id, 'invite');
  const sendResult = await sendInviteEmail({
    to: user.email,
    name: user.name,
    clientName: user.client?.name ?? '',
    token,
  }).catch((err) => {
    logger.error({ err }, '[resendInvite] exceção');
    return false;
  });
  const flag = sendResult === true ? 'reenviado' : 'erro';

  await audit({
    action: 'user.invite_resent',
    actorId: currentUser.id,
    entity: 'User',
    entityId: userId,
    metadata: { delivered: sendResult === true },
  });

  const clientId = user.clientId!;
  revalidatePath(`/admin/clientes/${clientId}`);
  if (from === 'edit') {
    redirect(`/admin/clientes/${clientId}/contatos/${userId}?convite=${flag}`);
  }
  redirect(`/admin/clientes/${clientId}?aba=contatos&convite=${flag}`);
}

// ─────────────────────────────────────────────
// Fluxo público de primeiro acesso / reset de senha
// ─────────────────────────────────────────────

// 1) Usuário solicita reset: POST de /esqueci-senha
export async function requestPasswordResetAction(formData: FormData) {
  const email = String(formData.get('email') ?? '').toLowerCase().trim();
  if (!email) redirect('/esqueci-senha?error=validation');

  const rl = rateLimit(`reset:${email}`, RATE_POLICIES.passwordReset);
  if (!rl.allowed) {
    await audit({ action: 'rate_limit.hit', metadata: { scope: 'password_reset', email } });
    // Resposta genérica p/ não vazar a existência do email
    redirect('/esqueci-senha?enviado=1');
  }

  const user = await db.user.findFirst({ where: { email, deletedAt: null, isActive: true } });
  if (user) {
    try {
      const { token } = await createPasswordToken(user.id, 'reset');
      await sendPasswordResetEmail({ to: user.email, name: user.name, token });
      await audit({
        action: 'auth.password_reset_requested',
        actorId: user.id,
        entity: 'User',
        entityId: user.id,
      });
    } catch (err) {
      logger.error({ err }, '[requestPasswordReset] falha');
    }
  }

  redirect('/esqueci-senha?enviado=1');
}

// 2) Usuário define a nova senha via token: POST de /primeiro-acesso/[token]
export async function completePasswordResetAction(formData: FormData) {
  const token = String(formData.get('token') ?? '');
  const newPassword = String(formData.get('newPassword') ?? '');
  const confirmPassword = String(formData.get('confirmPassword') ?? '');

  if (!token) redirect('/login?error=invalid_token');
  if (newPassword.length < 8) {
    redirect(`/primeiro-acesso/${encodeURIComponent(token)}?error=weak`);
  }
  if (newPassword !== confirmPassword) {
    redirect(`/primeiro-acesso/${encodeURIComponent(token)}?error=mismatch`);
  }

  const verified = await verifyPasswordToken(token);
  if (!verified) {
    redirect('/login?error=invalid_token');
  }

  await db.user.update({
    where: { id: verified.userId },
    data: { passwordHash: await bcrypt.hash(newPassword, 12) },
  });
  await consumePasswordToken(verified.id);

  await audit({
    action: 'auth.password_reset_used',
    actorId: verified.userId,
    entity: 'User',
    entityId: verified.userId,
    metadata: { purpose: verified.purpose },
  });

  redirect('/login?reset=1');
}
