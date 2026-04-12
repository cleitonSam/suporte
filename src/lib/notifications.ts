// Notificações in-app. Gravam no banco; o header consulta periodicamente ou
// re-renderiza em revalidatePath.

import { db } from './db';
import { logger } from './logger';
import type { NotificationType } from '@prisma/client';

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  linkUrl?: string;
}

export async function notify(params: CreateNotificationParams) {
  try {
    await db.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        body: params.body ?? null,
        linkUrl: params.linkUrl ?? null,
      },
    });
  } catch (err) {
    logger.error({ err, params }, '[notifications] falha ao criar notifica\u00e7\u00e3o');
  }
}

/** Envia a mesma notificação para vários usuários. */
export async function notifyMany(userIds: string[], n: Omit<CreateNotificationParams, 'userId'>) {
  await Promise.all(userIds.map((userId) => notify({ ...n, userId })));
}

/** Conta não-lidas. */
export async function countUnread(userId: string): Promise<number> {
  return db.notification.count({ where: { userId, readAt: null } });
}

/** Lista últimas N (opcional filtrar por não-lidas). */
export async function listRecent(userId: string, limit = 20, onlyUnread = false) {
  return db.notification.findMany({
    where: { userId, ...(onlyUnread ? { readAt: null } : {}) },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function markRead(userId: string, id: string) {
  await db.notification.updateMany({
    where: { id, userId },
    data: { readAt: new Date() },
  });
}

export async function markAllRead(userId: string) {
  await db.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}
