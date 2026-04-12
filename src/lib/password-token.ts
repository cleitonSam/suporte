// Tokens de primeiro acesso / reset de senha.
// Fluxo:
//   1. createPasswordToken(userId, purpose) → gera token claro + salva o hash.
//   2. Link é enviado por email contendo o token claro.
//   3. verifyPasswordToken(token) → valida e retorna o userId.
//   4. consumePasswordToken(id) → marca usado (após o usuário salvar a nova senha).

import crypto from 'node:crypto';
import { db } from './db';

const DEFAULT_TTL_HOURS = 24; // invite = 48h, reset = 1h (override via opts)

export type TokenPurpose = 'invite' | 'reset';

function hash(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export interface CreatedToken {
  id: string;
  token: string; // valor claro — só existe aqui, nunca no banco
}

/** Gera e persiste um token. Retorna o valor claro para colocar no email. */
export async function createPasswordToken(
  userId: string,
  purpose: TokenPurpose,
  opts: { ttlHours?: number } = {}
): Promise<CreatedToken> {
  // Invalida tokens anteriores não usados deste usuário p/ mesmo purpose
  await db.passwordResetToken.updateMany({
    where: { userId, purpose, usedAt: null },
    data: { usedAt: new Date() },
  });

  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = hash(token);
  const ttlHours = opts.ttlHours ?? (purpose === 'invite' ? 48 : 1);

  const created = await db.passwordResetToken.create({
    data: {
      userId,
      tokenHash,
      purpose,
      expiresAt: new Date(Date.now() + ttlHours * 3600_000),
    },
  });

  return { id: created.id, token };
}

export interface VerifiedToken {
  id: string;
  userId: string;
  purpose: TokenPurpose;
}

/** Valida um token claro. Retorna null se inválido / expirado / já usado. */
export async function verifyPasswordToken(token: string): Promise<VerifiedToken | null> {
  if (!token || token.length < 10) return null;
  const tokenHash = hash(token);
  const record = await db.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!record) return null;
  if (record.usedAt) return null;
  if (record.expiresAt.getTime() < Date.now()) return null;
  return {
    id: record.id,
    userId: record.userId,
    purpose: record.purpose as TokenPurpose,
  };
}

/** Marca o token como usado. Idempotente. */
export async function consumePasswordToken(id: string) {
  await db.passwordResetToken.update({
    where: { id },
    data: { usedAt: new Date() },
  });
}
