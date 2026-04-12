import { AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';
import { computeSlaSnapshot, formatMinutes, type SlaStatus } from '@/lib/sla';
import type { TicketPriority, TicketStatus } from '@prisma/client';

interface TicketLike {
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: Date;
  firstResponseAt: Date | null;
  resolvedAt: Date | null;
  firstResponseDueAt: Date | null;
  resolutionDueAt: Date | null;
  slaBreached?: boolean;
}

const statusStyles: Record<SlaStatus, string> = {
  on_track: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-700 ring-amber-200',
  breached: 'bg-rose-50 text-rose-700 ring-rose-200',
  met: 'bg-slate-50 text-slate-600 ring-slate-200',
  none: 'bg-slate-50 text-slate-400 ring-slate-200',
};

const statusLabel: Record<SlaStatus, string> = {
  on_track: 'No prazo',
  warning: 'Vencendo',
  breached: 'Estourado',
  met: 'Cumprido',
  none: '—',
};

function iconFor(status: SlaStatus) {
  if (status === 'breached' || status === 'warning') return AlertTriangle;
  if (status === 'met') return CheckCircle2;
  return Clock;
}

export function SlaBadge({
  ticket,
  variant = 'resolution',
}: {
  ticket: TicketLike;
  variant?: 'resolution' | 'firstResponse';
}) {
  const snap = computeSlaSnapshot(ticket);
  const status: SlaStatus = variant === 'resolution' ? snap.resolution : snap.firstResponse;
  const Icon = iconFor(status);
  const label = statusLabel[status];
  const mins = snap.minutesToDeadline;
  const showMins =
    mins !== null && (status === 'on_track' || status === 'warning' || status === 'breached');

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${statusStyles[status]}`}
      title={
        variant === 'resolution'
          ? `SLA de resolução (${snap.label})`
          : `SLA de primeira resposta (${snap.label})`
      }
    >
      <Icon className="h-3 w-3" />
      <span>{label}</span>
      {showMins && (
        <span className="font-normal opacity-75">
          {status === 'breached'
            ? `+${formatMinutes(mins !== null ? -mins : 0).replace('-', '')}`
            : formatMinutes(mins)}
        </span>
      )}
    </span>
  );
}
