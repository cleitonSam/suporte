// Audit log — registra ações sensíveis (autenticação, mudanças de usuário,
// mudanças de ticket, exclusões, reset de senha).
// Falha de gravação nunca deve quebrar a ação principal, então tudo vai com try/catch.

import { db } from './db';
import { logger } from './logger';
import { headers } from 'next/headers';

export type AuditAction =
  | 'auth.login_success'
  | 'auth.login_failed'
  | 'auth.login_rate_limited'
  | 'auth.logout'
  | 'auth.password_reset_requested'
  | 'auth.password_reset_used'
  | 'auth.password_changed'
  | 'user.create'
  | 'user.update'
  | 'user.delete'
  | 'user.invite_sent'
  | 'user.invite_resent'
  | 'client.create'
  | 'client.update'
  | 'client.delete'
  | 'ticket.create'
  | 'ticket.update'
  | 'ticket.status_change'
  | 'ticket.assign'
  | 'ticket.delete'
  | 'ticket.reopen'
  | 'ticket.reply'
  | 'template.create'
  | 'template.update'
  | 'template.delete'
  | 'rate_limit.hit';

export interface AuditParams {
  action: AuditAction;
  actorId?: string | null;
  entity?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Grava um evento de auditoria. Tenta capturar IP e user-agent do request atual.
 * Nunca lança — erros vão pro logger.
 */
export async function audit(params: AuditParams): Promise<void> {
  try {
    let ipAddress: string | undefined;
    let userAgent: string | undefined;

    try {
      const h = headers();
      ipAddress =
        h.get('x-forwarded-for')?.split(',')[0]?.trim() ??
        h.get('x-real-ip') ??
        undefined;
      userAgent = h.get('user-agent') ?? undefined;
    } catch {
      // Fora de request context (ex: cron). OK.
    }

    await db.auditLog.create({
      data: {
        action: params.action,
        actorId: params.actorId ?? null,
        entity: params.entity ?? null,
        entityId: params.entityId ?? null,
        metadata: params.metadata ? (params.metadata as any) : undefined,
        ipAddress,
        userAgent,
      },
    });

    logger.info(
      {
        audit: true,
        action: params.action,
        actorId: params.actorId,
        entity: params.entity,
        entityId: params.entityId,
      },
      '[audit] ' + params.action
    );
  } catch (err) {
    logger.error({ err, params }, '[audit] falha ao gravar audit log');
  }
}
