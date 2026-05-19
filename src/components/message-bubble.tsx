import { Lock } from 'lucide-react';
import type { UserType } from '@prisma/client';
import { formatDate } from '@/lib/utils';

interface Props {
  author: { name: string; userType?: UserType | null };
  body: string;
  createdAt: Date;
  isInternal?: boolean;
}

function initialsOf(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

export function MessageBubble({ author, body, createdAt, isInternal = false }: Props) {
  const isAgent = author.userType === 'AGENT';

  const avatarClass = isInternal
    ? 'bg-amber-500/15 text-amber-700 ring-amber-500/30 dark:text-amber-300'
    : isAgent
      ? 'bg-fluxo-gradient text-white shadow-fluxo'
      : 'bg-slate-200 text-slate-700 ring-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:ring-slate-600';

  const bubbleClass = isInternal
    ? 'border-amber-200 bg-amber-50/80 dark:border-amber-900/60 dark:bg-amber-950/30'
    : isAgent
      ? 'border-fluxo-200 bg-fluxo-50/60 dark:border-fluxo-900/60 dark:bg-fluxo-950/30'
      : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800';

  const accentLine = isInternal
    ? 'bg-amber-400'
    : isAgent
      ? 'bg-fluxo-500'
      : 'bg-slate-300 dark:bg-slate-600';

  return (
    <article className={`relative overflow-hidden rounded-xl border ${bubbleClass}`}>
      <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1 ${accentLine}`} />
      <div className="flex gap-3 p-4 pl-5">
        <span
          aria-hidden="true"
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ring-1 ring-inset ${avatarClass}`}
        >
          {initialsOf(author.name)}
        </span>
        <div className="min-w-0 flex-1">
          <header className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                {author.name}
              </span>
              {isAgent && !isInternal && (
                <span className="text-[10px] font-medium uppercase tracking-wider text-fluxo-600 dark:text-cyan-400">
                  · Fluxo
                </span>
              )}
              {isInternal && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-200 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-900 dark:bg-amber-700 dark:text-amber-100">
                  <Lock className="h-2.5 w-2.5" aria-hidden="true" />
                  Nota interna
                </span>
              )}
            </div>
            <time
              dateTime={createdAt.toISOString()}
              className="text-[11px] text-slate-500 dark:text-slate-400"
            >
              {formatDate(createdAt)}
            </time>
          </header>
          <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-800 dark:text-slate-200">
            {body}
          </p>
        </div>
      </div>
    </article>
  );
}
