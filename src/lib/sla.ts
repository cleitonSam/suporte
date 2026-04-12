// Cálculo de SLA por prioridade.
// Horas corridas (24/7). Para SLA em horário comercial, trocar por luxon + calendário.

import type { TicketPriority } from '@prisma/client';

export interface SlaPolicy {
  /** Horas até o primeiro retorno do agente */
  firstResponseHours: number;
  /** Horas até marcar como RESOLVED */
  resolutionHours: number;
  /** Label curto para UI */
  label: string;
}

export const SLA_POLICIES: Record<TicketPriority, SlaPolicy> = {
  URGENT: { firstResponseHours: 1, resolutionHours: 4, label: 'Urgente' },
  HIGH: { firstResponseHours: 2, resolutionHours: 8, label: 'Alta' },
  MEDIUM: { firstResponseHours: 4, resolutionHours: 24, label: 'Média' },
  LOW: { firstResponseHours: 8, resolutionHours: 72, label: 'Baixa' },
};

/**
 * Calcula as datas de vencimento de SLA com base na criação do chamado.
 */
export function computeSlaDeadlines(priority: TicketPriority, from = new Date()) {
  const p = SLA_POLICIES[priority];
  const firstResponseDueAt = new Date(from.getTime() + p.firstResponseHours * 3600_000);
  const resolutionDueAt = new Date(from.getTime() + p.resolutionHours * 3600_000);
  return { firstResponseDueAt, resolutionDueAt };
}

export type SlaStatus = 'on_track' | 'warning' | 'breached' | 'met' | 'none';

export interface SlaSnapshot {
  firstResponse: SlaStatus;
  resolution: SlaStatus;
  /** Label amigável para UI */
  label: string;
  /** Minutos até o prazo mais crítico (negativo = vencido) */
  minutesToDeadline: number | null;
}

/**
 * Retorna o status atual de SLA de um ticket.
 * - met: resolvido dentro do prazo
 * - breached: prazo vencido e ticket ainda não resolvido
 * - warning: faltam <= 20% do tempo da política
 * - on_track: ainda dentro do prazo
 * - none: ticket sem política (CLOSED antes de nascer etc.)
 */
export function computeSlaSnapshot(ticket: {
  priority: TicketPriority;
  createdAt: Date;
  firstResponseAt: Date | null;
  firstResponseDueAt: Date | null;
  resolvedAt: Date | null;
  resolutionDueAt: Date | null;
  status: string;
}): SlaSnapshot {
  const now = Date.now();
  const policy = SLA_POLICIES[ticket.priority];

  // Primeiro response
  let firstResponse: SlaStatus;
  if (ticket.firstResponseAt) {
    firstResponse =
      ticket.firstResponseDueAt && ticket.firstResponseAt > ticket.firstResponseDueAt
        ? 'breached'
        : 'met';
  } else if (!ticket.firstResponseDueAt) {
    firstResponse = 'none';
  } else {
    const remaining = ticket.firstResponseDueAt.getTime() - now;
    const total = policy.firstResponseHours * 3600_000;
    if (remaining <= 0) firstResponse = 'breached';
    else if (remaining / total <= 0.2) firstResponse = 'warning';
    else firstResponse = 'on_track';
  }

  // Resolução
  let resolution: SlaStatus;
  if (ticket.resolvedAt) {
    resolution =
      ticket.resolutionDueAt && ticket.resolvedAt > ticket.resolutionDueAt
        ? 'breached'
        : 'met';
  } else if (ticket.status === 'CLOSED') {
    resolution = 'met';
  } else if (!ticket.resolutionDueAt) {
    resolution = 'none';
  } else {
    const remaining = ticket.resolutionDueAt.getTime() - now;
    const total = policy.resolutionHours * 3600_000;
    if (remaining <= 0) resolution = 'breached';
    else if (remaining / total <= 0.2) resolution = 'warning';
    else resolution = 'on_track';
  }

  // Label resumido
  const worst = pickWorst(firstResponse, resolution);
  const label = LABEL[worst];

  // Minutos até deadline mais próximo
  let minutesToDeadline: number | null = null;
  const candidates: Date[] = [];
  if (!ticket.firstResponseAt && ticket.firstResponseDueAt) candidates.push(ticket.firstResponseDueAt);
  if (!ticket.resolvedAt && ticket.resolutionDueAt) candidates.push(ticket.resolutionDueAt);
  if (candidates.length > 0) {
    const nearest = candidates.reduce((a, b) => (a < b ? a : b));
    minutesToDeadline = Math.round((nearest.getTime() - now) / 60_000);
  }

  return { firstResponse, resolution, label, minutesToDeadline };
}

const ORDER: Record<SlaStatus, number> = {
  breached: 0,
  warning: 1,
  on_track: 2,
  met: 3,
  none: 4,
};

const LABEL: Record<SlaStatus, string> = {
  breached: 'SLA vencido',
  warning: 'SLA estourando',
  on_track: 'No prazo',
  met: 'Cumprido',
  none: '—',
};

function pickWorst(a: SlaStatus, b: SlaStatus): SlaStatus {
  return ORDER[a] < ORDER[b] ? a : b;
}

/** Formata minutos em "2h 15min" / "35min" / "-1h 20min". */
export function formatMinutes(minutes: number | null): string {
  if (minutes == null) return '—';
  const sign = minutes < 0 ? '-' : '';
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (h === 0) return `${sign}${m}min`;
  return `${sign}${h}h ${m}min`;
}
