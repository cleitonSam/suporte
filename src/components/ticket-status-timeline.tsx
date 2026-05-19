import {
  Check,
  CircleDashed,
  Inbox,
  PlayCircle,
  PauseCircle,
  CheckCircle2,
  Lock,
  RotateCcw,
} from 'lucide-react';
import type { TicketStatus } from '@prisma/client';

interface Step {
  key: TicketStatus;
  label: string;
  shortLabel: string;
  Icon: React.ComponentType<{ className?: string }>;
}

const MAIN_STEPS: Step[] = [
  { key: 'NEW',         label: 'Novo',          shortLabel: 'Novo',    Icon: Inbox },
  { key: 'OPEN',        label: 'Aberto',        shortLabel: 'Aberto',  Icon: CircleDashed },
  { key: 'IN_PROGRESS', label: 'Em andamento',  shortLabel: 'Andam.',  Icon: PlayCircle },
  { key: 'RESOLVED',    label: 'Resolvido',     shortLabel: 'Resolv.', Icon: CheckCircle2 },
  { key: 'CLOSED',      label: 'Fechado',       shortLabel: 'Fechado', Icon: Lock },
];

const ORDER: Record<TicketStatus, number> = {
  NEW: 0,
  OPEN: 1,
  IN_PROGRESS: 2,
  WAITING_CLIENT: 2,
  REOPENED: 2,
  RESOLVED: 3,
  CLOSED: 4,
};

export function TicketStatusTimeline({ status }: { status: TicketStatus }) {
  const currentOrder = ORDER[status];

  return (
    <div className="space-y-2">
      <ol role="list" className="flex items-center justify-between gap-1 sm:gap-3">
        {MAIN_STEPS.map((step, idx) => {
          const stepOrder = ORDER[step.key];
          const isCurrent = stepOrder === currentOrder && status !== 'WAITING_CLIENT' && status !== 'REOPENED';
          const isDone = stepOrder < currentOrder;
          const isFuture = stepOrder > currentOrder;
          const Icon = isDone ? Check : step.Icon;
          const isLast = idx === MAIN_STEPS.length - 1;

          const dotClass = isCurrent
            ? 'bg-fluxo-500 text-white ring-fluxo-500/30 shadow-fluxo'
            : isDone
              ? 'bg-emerald-500 text-white ring-emerald-500/30'
              : 'bg-slate-100 text-slate-400 ring-slate-200 dark:bg-slate-700 dark:text-slate-500 dark:ring-slate-600';

          const lineClass = isDone || isCurrent
            ? 'bg-gradient-to-r from-emerald-400 to-fluxo-400'
            : 'bg-slate-200 dark:bg-slate-700';

          return (
            <li
              key={step.key}
              className="flex flex-1 items-center"
              aria-current={isCurrent ? 'step' : undefined}
            >
              <div className="flex flex-col items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className={`flex h-8 w-8 items-center justify-center rounded-full ring-2 ring-inset transition-colors ${dotClass}`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span
                  className={`hidden text-[10px] font-semibold uppercase tracking-wider sm:block ${
                    isCurrent
                      ? 'text-fluxo-600 dark:text-cyan-400'
                      : isDone
                        ? 'text-emerald-600'
                        : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  <span className="hidden lg:inline">{step.label}</span>
                  <span className="lg:hidden">{step.shortLabel}</span>
                </span>
              </div>
              {!isLast && (
                <span
                  aria-hidden="true"
                  className={`mx-1 h-0.5 flex-1 rounded-full sm:mx-2 ${lineClass}`}
                />
              )}
            </li>
          );
        })}
      </ol>
      {(status === 'WAITING_CLIENT' || status === 'REOPENED') && (
        <div className="flex items-center justify-center gap-1.5 text-xs">
          {status === 'WAITING_CLIENT' ? (
            <>
              <PauseCircle className="h-3.5 w-3.5 text-purple-600" aria-hidden="true" />
              <span className="font-medium text-purple-700 dark:text-purple-300">
                Aguardando retorno do cliente
              </span>
            </>
          ) : (
            <>
              <RotateCcw className="h-3.5 w-3.5 text-rose-600" aria-hidden="true" />
              <span className="font-medium text-rose-700 dark:text-rose-300">Chamado reaberto</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
