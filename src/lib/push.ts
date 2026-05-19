/**
 * Web Push notifications helper.
 *
 * Envio: backend chama sendPushToUser(userId, payload) que busca todas
 * as subscriptions do user e envia push. Subscriptions expiradas são
 * removidas automaticamente (410 Gone do navegador).
 *
 * Requer VAPID keys configurados em env:
 *   NEXT_PUBLIC_VAPID_PUBLIC_KEY
 *   VAPID_PRIVATE_KEY
 *   VAPID_SUBJECT  (mailto:ti@... ou https://...)
 *
 * Gerar par com: `npx web-push generate-vapid-keys`
 */

import webpush from 'web-push';
import { db } from './db';
import { logger } from './logger';

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT ?? 'mailto:ti@fluxodigitaltech.com.br';

let vapidConfigured = false;

if (publicKey && privateKey) {
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
}

export interface PushPayload {
  title: string;
  body?: string;
  url?: string;
  /** Identificador único pra deduplicar notificações na mesma ação. */
  tag?: string;
  /** Quando true, notificação fica até user clicar. Padrão false. */
  requireInteraction?: boolean;
  /** Override do ícone (URL absoluta ou path). */
  icon?: string;
  /** Número do ticket pra link inteligente. */
  ticketNumber?: string;
}

/**
 * Envia push pra todas as subscriptions ativas de um user.
 * Remove subscriptions que respondem 404/410 (expiradas).
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<{ sent: number; removed: number }> {
  if (!vapidConfigured) {
    logger.debug({ userId }, '[push] VAPID nao configurado, pulando');
    return { sent: 0, removed: 0 };
  }

  const subs = await db.pushSubscription.findMany({
    where: { userId },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });

  if (subs.length === 0) return { sent: 0, removed: 0 };

  const body = JSON.stringify(payload);
  const expired: string[] = [];
  let sent = 0;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body,
        );
        sent++;
      } catch (err: unknown) {
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          expired.push(sub.id);
        } else {
          logger.warn({ err, userId, endpoint: sub.endpoint }, '[push] falha ao enviar');
        }
      }
    }),
  );

  if (expired.length > 0) {
    await db.pushSubscription.deleteMany({ where: { id: { in: expired } } });
    logger.info({ userId, removed: expired.length }, '[push] removeu subscriptions expiradas');
  }

  // Atualiza lastUsedAt das que funcionaram
  if (sent > 0) {
    await db.pushSubscription
      .updateMany({
        where: {
          userId,
          id: { notIn: expired },
        },
        data: { lastUsedAt: new Date() },
      })
      .catch(() => {});
  }

  return { sent, removed: expired.length };
}

export function isPushConfigured(): boolean {
  return vapidConfigured;
}
