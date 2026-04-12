/**
 * Integração com uazapi — API WhatsApp
 *
 * Variáveis de ambiente necessárias:
 *   UAZAPI_URL        = URL da instância (ex: https://sua-instancia.uazapi.com)
 *   UAZAPI_SESSION    = nome da sessão
 *   UAZAPI_SESSION_KEY = chave da sessão
 *   UAZAPI_TOKEN      = token de autenticação
 *
 * Referência: https://docs.uazapi.com/
 */

import { logger } from './logger';

// ── Config ──────────────────────────────────────────────
const UAZAPI_URL = process.env.UAZAPI_URL ?? '';
const UAZAPI_SESSION = process.env.UAZAPI_SESSION ?? '';
const UAZAPI_SESSION_KEY = process.env.UAZAPI_SESSION_KEY ?? '';
const UAZAPI_TOKEN = process.env.UAZAPI_TOKEN ?? '';

function isConfigured(): boolean {
  return !!(UAZAPI_URL && UAZAPI_SESSION && UAZAPI_TOKEN);
}

/**
 * Normaliza número de telefone para o formato WhatsApp Brasil
 * Aceita: +5511999999999, 5511999999999, 11999999999, (11) 99999-9999
 * Retorna: 5511999999999
 */
export function normalizePhone(phone: string): string {
  // Remove tudo que não é dígito
  let digits = phone.replace(/\D/g, '');

  // Se começa com +55 ou 55 e tem 12-13 dígitos, já está ok
  if (digits.startsWith('55') && digits.length >= 12) {
    return digits;
  }

  // Se tem 10-11 dígitos (DDD + número), adiciona 55
  if (digits.length >= 10 && digits.length <= 11) {
    return `55${digits}`;
  }

  // Retorna como está se não se encaixa
  return digits;
}

// ── Chamada genérica à API ──────────────────────────────
async function callApi(endpoint: string, body: Record<string, any>): Promise<any> {
  if (!isConfigured()) {
    logger.warn('[whatsapp] uazapi não configurado — mensagem não enviada');
    return null;
  }

  const url = new URL(endpoint, UAZAPI_URL);
  url.searchParams.set('session', UAZAPI_SESSION);
  url.searchParams.set('sessionKey', UAZAPI_SESSION_KEY);
  url.searchParams.set('token', UAZAPI_TOKEN);

  try {
    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      logger.error(
        { status: res.status, body: text },
        `[whatsapp] erro ao chamar ${endpoint}`,
      );
      return null;
    }

    return res.json();
  } catch (err) {
    logger.error({ err }, `[whatsapp] falha na requisição ${endpoint}`);
    return null;
  }
}

// ── Enviar mensagem de texto ────────────────────────────
export async function sendText(phone: string, message: string): Promise<boolean> {
  const normalized = normalizePhone(phone);
  const result = await callApi('/sendText', {
    phone: normalized,
    message,
  });
  return result !== null;
}

// ── Enviar imagem ───────────────────────────────────────
export async function sendImage(
  phone: string,
  imageUrl: string,
  caption?: string,
): Promise<boolean> {
  const normalized = normalizePhone(phone);
  const result = await callApi('/sendImage', {
    phone: normalized,
    image: imageUrl,
    caption: caption ?? '',
  });
  return result !== null;
}

// ── Enviar arquivo ──────────────────────────────────────
export async function sendFile(
  phone: string,
  fileUrl: string,
  filename: string,
): Promise<boolean> {
  const normalized = normalizePhone(phone);
  const result = await callApi('/sendFile', {
    phone: normalized,
    document: fileUrl,
    fileName: filename,
  });
  return result !== null;
}

// ── Enviar botões ───────────────────────────────────────
export async function sendButtons(
  phone: string,
  message: string,
  buttons: Array<{ id: string; text: string }>,
): Promise<boolean> {
  const normalized = normalizePhone(phone);
  const result = await callApi('/sendButton', {
    phone: normalized,
    message,
    buttons,
  });
  return result !== null;
}

// ── Verificar se número está no WhatsApp ────────────────
export async function checkNumber(phone: string): Promise<boolean> {
  const normalized = normalizePhone(phone);
  const result = await callApi('/checkNumber', {
    phone: normalized,
  });
  return result?.exists === true;
}

// ══════════════════════════════════════════════════════════
// Mensagens de negócio do Fluxo Suporte
// ══════════════════════════════════════════════════════════

const APP_URL = process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3001';

/**
 * Notifica o cliente quando o status do chamado muda
 */
export async function notifyTicketStatusChange(params: {
  clientPhone: string;
  clientName: string;
  ticketNumber: string;
  ticketId: string;
  oldStatus: string;
  newStatus: string;
}): Promise<boolean> {
  const statusLabels: Record<string, string> = {
    NEW: 'Novo',
    OPEN: 'Aberto',
    IN_PROGRESS: 'Em andamento',
    WAITING_CLIENT: 'Aguardando retorno',
    RESOLVED: 'Resolvido',
    CLOSED: 'Fechado',
    REOPENED: 'Reaberto',
  };

  const statusLabel = statusLabels[params.newStatus] ?? params.newStatus;
  const portalUrl = `${APP_URL}/portal/chamado/${params.ticketId}`;

  const message =
    `🔔 *Fluxo Suporte*\n\n` +
    `Olá, ${params.clientName}!\n\n` +
    `Seu chamado *${params.ticketNumber}* foi atualizado.\n\n` +
    `📋 *Novo status:* ${statusLabel}\n\n` +
    `Acesse o portal para mais detalhes:\n${portalUrl}\n\n` +
    `_Fluxo Digital Tech — Suporte técnico especializado_`;

  return sendText(params.clientPhone, message);
}

/**
 * Notifica o cliente quando há uma nova resposta no chamado
 */
export async function notifyNewReply(params: {
  clientPhone: string;
  clientName: string;
  ticketNumber: string;
  ticketId: string;
  agentName: string;
}): Promise<boolean> {
  const portalUrl = `${APP_URL}/portal/chamado/${params.ticketId}`;

  const message =
    `💬 *Fluxo Suporte*\n\n` +
    `Olá, ${params.clientName}!\n\n` +
    `*${params.agentName}* respondeu no seu chamado *${params.ticketNumber}*.\n\n` +
    `Acesse para ver a resposta:\n${portalUrl}\n\n` +
    `_Fluxo Digital Tech — Suporte técnico especializado_`;

  return sendText(params.clientPhone, message);
}

/**
 * Notifica o cliente quando o chamado é criado
 */
export async function notifyTicketCreated(params: {
  clientPhone: string;
  clientName: string;
  ticketNumber: string;
  ticketId: string;
  ticketTitle: string;
}): Promise<boolean> {
  const portalUrl = `${APP_URL}/portal/chamado/${params.ticketId}`;

  const message =
    `✅ *Fluxo Suporte*\n\n` +
    `Olá, ${params.clientName}!\n\n` +
    `Seu chamado foi registrado com sucesso.\n\n` +
    `📋 *Número:* ${params.ticketNumber}\n` +
    `📝 *Assunto:* ${params.ticketTitle}\n\n` +
    `Acompanhe pelo portal:\n${portalUrl}\n\n` +
    `_Fluxo Digital Tech — Suporte técnico especializado_`;

  return sendText(params.clientPhone, message);
}

/**
 * Notifica o técnico quando um chamado é atribuído a ele
 */
export async function notifyAgentAssigned(params: {
  agentPhone: string;
  agentName: string;
  ticketNumber: string;
  ticketId: string;
  ticketTitle: string;
  clientName: string;
}): Promise<boolean> {
  const adminUrl = `${APP_URL}/admin/chamados/${params.ticketId}`;

  const message =
    `🎫 *Fluxo Suporte*\n\n` +
    `Olá, ${params.agentName}!\n\n` +
    `Um chamado foi atribuído a você.\n\n` +
    `📋 *${params.ticketNumber}*\n` +
    `📝 ${params.ticketTitle}\n` +
    `🏢 Cliente: ${params.clientName}\n\n` +
    `${adminUrl}`;

  return sendText(params.agentPhone, message);
}

/**
 * Envia pesquisa de satisfação CSAT por WhatsApp
 */
export async function notifyCsatSurvey(params: {
  clientPhone: string;
  clientName: string;
  ticketNumber: string;
  surveyUrl: string;
}): Promise<boolean> {
  const message =
    `⭐ *Fluxo Suporte — Pesquisa de satisfação*\n\n` +
    `Olá, ${params.clientName}!\n\n` +
    `Como foi o atendimento do chamado *${params.ticketNumber}*?\n\n` +
    `Sua opinião é muito importante para melhorarmos nossos serviços.\n\n` +
    `Responda aqui (30 segundos):\n${params.surveyUrl}\n\n` +
    `😠 😕 😐 😊 🤩\n\n` +
    `_Fluxo Digital Tech_`;

  return sendText(params.clientPhone, message);
}
