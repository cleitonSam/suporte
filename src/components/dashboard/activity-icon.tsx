import {
  Plus,
  UserPlus,
  ArrowRightLeft,
  AlertTriangle,
  MessageSquare,
  Wrench,
  RotateCcw,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import type { TicketEventType } from '@prisma/client';

const ICONS = {
  CREATED: { Icon: Plus, tone: 'bg-fluxo-500/10 text-fluxo-600 ring-fluxo-500/20' },
  ASSIGNED: { Icon: UserPlus, tone: 'bg-cyan-500/10 text-cyan-600 ring-cyan-500/20' },
  STATUS_CHANGED: { Icon: ArrowRightLeft, tone: 'bg-amber-500/10 text-amber-600 ring-amber-500/20' },
  PRIORITY_CHANGED: { Icon: AlertTriangle, tone: 'bg-orange-500/10 text-orange-600 ring-orange-500/20' },
  COMMENTED: { Icon: MessageSquare, tone: 'bg-slate-500/10 text-slate-600 ring-slate-500/20' },
  EQUIPMENT_LINKED: { Icon: Wrench, tone: 'bg-purple-500/10 text-purple-600 ring-purple-500/20' },
  REOPENED: { Icon: RotateCcw, tone: 'bg-rose-500/10 text-rose-600 ring-rose-500/20' },
  CLOSED: { Icon: CheckCircle2, tone: 'bg-emerald-500/10 text-emerald-600 ring-emerald-500/20' },
} as const;

export function ActivityIcon({ type }: { type: TicketEventType | string }) {
  const cfg = ICONS[type as keyof typeof ICONS] ?? { Icon: Circle, tone: 'bg-slate-500/10 text-slate-600 ring-slate-500/20' };
  const { Icon, tone } = cfg;
  return (
    <span
      aria-hidden="true"
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 ring-inset ${tone}`}
    >
      <Icon className="h-3.5 w-3.5" />
    </span>
  );
}
