import { randomBytes } from 'crypto';

/**
 * Gera token short (12 chars, lowercase + digits) pra usar no
 * endereco de email inbound: chamados-{token}@suporte...
 */
export function generateInboundToken(): string {
  return randomBytes(8).toString('hex').slice(0, 12);
}

/**
 * Parseia token do endereço `to:` de um email inbound.
 * Aceita:
 *   - chamados-abc123def456@suporte.fluxodigitaltech.com.br
 *   - "Suporte" <chamados-abc123def456@suporte.fluxodigitaltech.com.br>
 *   - tickets+abc123def456@dominio (plus-addressing)
 * Retorna token ou null.
 */
export function extractInboundToken(toAddress: string): string | null {
  if (!toAddress) return null;
  const angle = toAddress.match(/<([^>]+)>/);
  const addr = (angle ? angle[1] : toAddress).trim().toLowerCase();

  const dashMatch = addr.match(/chamados-([a-f0-9]{8,16})@/);
  if (dashMatch) return dashMatch[1];

  const plusMatch = addr.match(/[+]([a-f0-9]{8,16})@/);
  if (plusMatch) return plusMatch[1];

  return null;
}

/**
 * Extrai o email "pelado" (sem nome / sem aspas / sem <>) do header From.
 */
export function extractEmailAddress(fromHeader: string): string | null {
  if (!fromHeader) return null;
  const angle = fromHeader.match(/<([^>]+)>/);
  if (angle) return angle[1].trim().toLowerCase();
  const bareMatch = fromHeader.match(/[\w.+-]+@[\w.-]+\.[\w]+/);
  return bareMatch ? bareMatch[0].toLowerCase() : null;
}

/**
 * Monta endereço completo de inbound a partir do token + dominio base.
 */
export function buildInboundAddress(token: string, baseDomain?: string): string {
  const domain = baseDomain ?? process.env.INBOUND_EMAIL_DOMAIN ?? 'suporte.fluxodigitaltech.com.br';
  return `chamados-${token}@${domain}`;
}
