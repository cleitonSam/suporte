import { db } from './db';
import crypto from 'crypto';

/**
 * CSAT rating labels (Portuguese)
 */
export const CSAT_LABELS: Record<number, string> = {
  1: 'Péssimo',
  2: 'Ruim',
  3: 'Regular',
  4: 'Bom',
  5: 'Ótimo',
};

/**
 * Tailwind color classes mapped to ratings
 */
export const CSAT_COLORS: Record<number, string> = {
  1: 'bg-red-100 border-red-300',
  2: 'bg-orange-100 border-orange-300',
  3: 'bg-yellow-100 border-yellow-300',
  4: 'bg-green-100 border-green-300',
  5: 'bg-emerald-100 border-emerald-300',
};

/**
 * Emoji strings for each rating
 */
export const CSAT_EMOJIS: Record<number, string> = {
  1: '😠',
  2: '😕',
  3: '😐',
  4: '😊',
  5: '🤩',
};

/**
 * Create a new CSAT survey for a ticket
 * @param ticketId - The ticket ID
 * @param agentId - The agent ID who handled the ticket
 * @returns The unique survey token
 */
export async function createCsatSurvey(ticketId: string, agentId: string): Promise<string> {
  const token = crypto.randomBytes(16).toString('base64url');

  await db.csatSurvey.create({
    data: {
      ticketId,
      agentId,
      rating: 0,
      token,
    },
  });

  return token;
}
