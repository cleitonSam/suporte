import { NextResponse } from 'next/server';
import { processInboundEmail, type InboundEmailPayload } from '@/server/services/inbound-email-service';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Webhook do Cloudflare Email Worker (ou outro provider de inbound parse).
 *
 * Auth: header `X-Fluxo-Secret` deve casar com env INBOUND_EMAIL_SECRET.
 *
 * Body JSON esperado:
 *   {
 *     "from":      "Fulano <fulano@empresa.com.br>",
 *     "to":        "chamados-abc123def456@suporte.fluxodigitaltech.com.br",
 *     "subject":   "Internet caiu",
 *     "text":      "Plain text do corpo...",
 *     "html":      "<p>HTML opcional</p>",
 *     "messageId": "<id@provider>"
 *   }
 *
 * Respostas:
 *   200 { ok: true, ticketId, ticketNumber }   -> ticket criado
 *   200 { ok: false, reason }                  -> ignorado (token/contato invalidos)
 *   401                                        -> secret invalido
 *   400                                        -> JSON invalido
 */
export async function POST(req: Request) {
  const secret = process.env.INBOUND_EMAIL_SECRET;
  if (!secret) {
    logger.error('[inbound/email] INBOUND_EMAIL_SECRET nao configurado');
    return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  }

  const provided = req.headers.get('x-fluxo-secret');
  if (provided !== secret) {
    logger.warn({ ip: req.headers.get('x-forwarded-for') }, '[inbound/email] secret invalido');
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let payload: InboundEmailPayload;
  try {
    payload = (await req.json()) as InboundEmailPayload;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  try {
    const result = await processInboundEmail(payload);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    logger.error({ err }, '[inbound/email] erro processando');
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
