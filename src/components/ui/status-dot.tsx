import type { TicketPriority, TicketStatus, ClientStatus, EquipmentStatus } from '@prisma/client';

type Tone =
  | 'fluxo'
  | 'sky'
  | 'amber'
  | 'purple'
  | 'emerald'
  | 'rose'
  | 'slate'
  | 'orange';

const TONE_DOT: Record<Tone, string> = {
  fluxo: 'bg-fluxo-500 ring-fluxo-500/30',
  sky: 'bg-sky-500 ring-sky-500/30',
  amber: 'bg-amber-500 ring-amber-500/30',
  purple: 'bg-purple-500 ring-purple-500/30',
  emerald: 'bg-emerald-500 ring-emerald-500/30',
  rose: 'bg-rose-500 ring-rose-500/30',
  slate: 'bg-slate-400 ring-slate-400/30',
  orange: 'bg-orange-500 ring-orange-500/30',
};

const TONE_TEXT: Record<Tone, string> = {
  fluxo: 'text-fluxo-700 dark:text-fluxo-300',
  sky: 'text-sky-700 dark:text-sky-300',
  amber: 'text-amber-700 dark:text-amber-300',
  purple: 'text-purple-700 dark:text-purple-300',
  emerald: 'text-emerald-700 dark:text-emerald-300',
  rose: 'text-rose-700 dark:text-rose-300',
  slate: 'text-slate-700 dark:text-slate-300',
  orange: 'text-orange-700 dark:text-orange-300',
};

interface Props {
  tone: Tone;
  /** Quando true, pulsa (use pra estados ativos/críticos). */
  pulse?: boolean;
  /** Filho opcional — texto que vem ao lado do dot. */
  children?: React.ReactNode;
  /** Modo compacto = só o dot, sem padding extra. */
  bare?: boolean;
}

export function StatusDot({ tone, pulse = false, children, bare = false }: Props) {
  const dot = (
    <span className="relative flex h-2 w-2">
      {pulse && (
        <span
          aria-hidden="true"
          className={`absolute inset-0 inline-flex h-full w-full animate-ping rounded-full opacity-40 ${TONE_DOT[tone]}`}
        />
      )}
      <span
        aria-hidden="true"
        className={`relative inline-flex h-2 w-2 rounded-full ring-2 ring-inset ${TONE_DOT[tone]}`}
      />
    </span>
  );

  if (bare || !children) return dot;

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${TONE_TEXT[tone]}`}>
      {dot}
      {children}
    </span>
  );
}

// ────────────────────────────────────────────────────────────
// Mapeamentos prontos pra status comuns
// ────────────────────────────────────────────────────────────

const TICKET_STATUS_TONE: Record<TicketStatus, Tone> = {
  NEW: 'fluxo',
  OPEN: 'sky',
  IN_PROGRESS: 'amber',
  WAITING_CLIENT: 'purple',
  RESOLVED: 'emerald',
  CLOSED: 'slate',
  REOPENED: 'rose',
};

const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  NEW: 'Novo',
  OPEN: 'Aberto',
  IN_PROGRESS: 'Em andamento',
  WAITING_CLIENT: 'Aguardando',
  RESOLVED: 'Resolvido',
  CLOSED: 'Fechado',
  REOPENED: 'Reaberto',
};

export function TicketStatusDot({ status, pulse }: { status: TicketStatus; pulse?: boolean }) {
  const tone = TICKET_STATUS_TONE[status];
  return (
    <StatusDot tone={tone} pulse={pulse}>
      {TICKET_STATUS_LABEL[status]}
    </StatusDot>
  );
}

const PRIORITY_TONE: Record<TicketPriority, Tone> = {
  LOW: 'slate',
  MEDIUM: 'fluxo',
  HIGH: 'orange',
  URGENT: 'rose',
};

const PRIORITY_LABEL: Record<TicketPriority, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
  URGENT: 'Urgente',
};

export function PriorityDot({ priority }: { priority: TicketPriority }) {
  return (
    <StatusDot tone={PRIORITY_TONE[priority]} pulse={priority === 'URGENT'}>
      {PRIORITY_LABEL[priority]}
    </StatusDot>
  );
}

const CLIENT_STATUS_TONE: Record<ClientStatus, Tone> = {
  ACTIVE: 'emerald',
  SUSPENDED: 'amber',
  INACTIVE: 'slate',
};

const CLIENT_STATUS_LABEL: Record<ClientStatus, string> = {
  ACTIVE: 'Ativo',
  SUSPENDED: 'Suspenso',
  INACTIVE: 'Inativo',
};

export function ClientStatusDot({ status }: { status: ClientStatus }) {
  return (
    <StatusDot tone={CLIENT_STATUS_TONE[status]}>
      {CLIENT_STATUS_LABEL[status]}
    </StatusDot>
  );
}

const EQUIPMENT_STATUS_TONE: Record<EquipmentStatus, Tone> = {
  ACTIVE: 'emerald',
  IN_REPAIR: 'amber',
  RETIRED: 'slate',
};

const EQUIPMENT_STATUS_LABEL: Record<EquipmentStatus, string> = {
  ACTIVE: 'Ativo',
  IN_REPAIR: 'Em reparo',
  RETIRED: 'Desativado',
};

export function EquipmentStatusDot({ status }: { status: EquipmentStatus }) {
  return (
    <StatusDot tone={EQUIPMENT_STATUS_TONE[status]}>
      {EQUIPMENT_STATUS_LABEL[status]}
    </StatusDot>
  );
}
