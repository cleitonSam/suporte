import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck, Search, Clock, User as UserIcon, ArrowRight } from 'lucide-react';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { formatDate, formatRelative } from '@/lib/utils';
import type { Prisma } from '@prisma/client';

export const metadata: Metadata = {
  title: 'Auditoria · Configurações',
  description: 'Trilha completa de ações do sistema',
};

const PER_PAGE = 50;

interface PageProps {
  searchParams: {
    q?: string;
    scope?: string;
    page?: string;
  };
}

const SCOPE_OPTIONS = [
  { key: '',           label: 'Todos',     prefix: null },
  { key: 'auth',       label: 'Auth',      prefix: 'auth.' },
  { key: 'user',       label: 'Usuários',  prefix: 'user.' },
  { key: 'client',     label: 'Clientes',  prefix: 'client.' },
  { key: 'ticket',     label: 'Chamados',  prefix: 'ticket.' },
  { key: 'equipment',  label: 'Equipam.',  prefix: 'equipment.' },
  { key: 'automation', label: 'Automação', prefix: 'automation.' },
  { key: 'kb',         label: 'Conhec.',   prefix: 'kb.' },
  { key: 'template',   label: 'Templates', prefix: 'template.' },
];

const ACTION_TONE: Record<string, { dot: string; text: string }> = {
  auth:       { dot: 'bg-fluxo-500',   text: 'text-fluxo-700 dark:text-fluxo-300' },
  user:       { dot: 'bg-cyan-500',    text: 'text-cyan-700 dark:text-cyan-300' },
  client:     { dot: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-300' },
  ticket:     { dot: 'bg-amber-500',   text: 'text-amber-700 dark:text-amber-300' },
  equipment:  { dot: 'bg-purple-500',  text: 'text-purple-700 dark:text-purple-300' },
  automation: { dot: 'bg-orange-500',  text: 'text-orange-700 dark:text-orange-300' },
  kb:         { dot: 'bg-sky-500',     text: 'text-sky-700 dark:text-sky-300' },
  template:   { dot: 'bg-slate-500',   text: 'text-slate-700 dark:text-slate-300' },
  rate_limit: { dot: 'bg-rose-500',    text: 'text-rose-700 dark:text-rose-300' },
};

function getActionTone(action: string) {
  const prefix = action.split('.')[0];
  return ACTION_TONE[prefix] ?? ACTION_TONE.template;
}

function buildQs(curr: Record<string, string | undefined>, override: Record<string, string | null>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...curr, ...override })) {
    if (v) params.set(k, v);
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export default async function AuditoriaPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50/60 p-6 text-sm text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30">
        <strong>Acesso negado.</strong> Apenas administradores podem acessar o audit log.
      </div>
    );
  }

  const page = Math.max(1, Number(searchParams.page ?? '1') || 1);
  const skip = (page - 1) * PER_PAGE;

  const scopeFilter = SCOPE_OPTIONS.find((s) => s.key === searchParams.scope);
  const scopePrefix = scopeFilter?.prefix;

  const where: Prisma.AuditLogWhereInput = {
    ...(scopePrefix && { action: { startsWith: scopePrefix } }),
    ...(searchParams.q && {
      OR: [
        { action: { contains: searchParams.q, mode: 'insensitive' } },
        { entity: { contains: searchParams.q, mode: 'insensitive' } },
        { entityId: { contains: searchParams.q } },
        { actor: { name: { contains: searchParams.q, mode: 'insensitive' } } },
      ],
    }),
  };

  const [logs, total, totalByScope] = await Promise.all([
    db.auditLog.findMany({
      where,
      include: {
        actor: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: PER_PAGE,
    }),
    db.auditLog.count({ where }),
    db.auditLog.groupBy({
      by: ['action'],
      _count: { id: true },
    }),
  ]);

  // Count per scope prefix
  const scopeCounts: Record<string, number> = {};
  for (const row of totalByScope) {
    const prefix = row.action.split('.')[0];
    scopeCounts[prefix] = (scopeCounts[prefix] ?? 0) + row._count.id;
  }
  const totalAll = Object.values(scopeCounts).reduce((s, n) => s + n, 0);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const hasFilters = Boolean(searchParams.q || searchParams.scope);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="micro-label-accent">Compliance · trilha</p>
          <h1 className="flex items-center gap-2 font-display text-3xl font-bold text-slate-900 dark:text-white">
            <ShieldCheck className="h-7 w-7 text-amber-500" aria-hidden="true" />
            Auditoria
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            <span className="font-mono-tech">{total}</span> registro{total === 1 ? '' : 's'} no filtro ·{' '}
            <span className="font-mono-tech">{totalAll}</span> total no sistema
          </p>
        </div>
        <Link
          href="/admin/configuracoes"
          className="text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400"
        >
          ← Configurações
        </Link>
      </div>

      {/* Scope chips */}
      <div className="-mx-1 overflow-x-auto px-1">
        <div className="inline-flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-1 shadow-elevate dark:border-slate-700 dark:bg-slate-800">
          {SCOPE_OPTIONS.map((s) => {
            const isActive = (searchParams.scope ?? '') === s.key;
            const count = s.prefix
              ? Object.entries(scopeCounts)
                  .filter(([k]) => s.prefix && (k + '.' === s.prefix || k === s.prefix.replace('.', '')))
                  .reduce((sum, [, n]) => sum + n, 0)
              : totalAll;
            return (
              <Link
                key={s.key || 'all'}
                href={`/admin/configuracoes/auditoria${buildQs(searchParams, { scope: s.key || null, page: null })}`}
                className={
                  isActive
                    ? 'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md bg-fluxo-500 px-3 py-1.5 text-xs font-semibold text-white shadow-fluxo'
                    : 'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700/60 dark:hover:text-white'
                }
              >
                {s.label}
                <span
                  className={
                    isActive
                      ? 'font-mono-tech text-[10px] font-bold text-white/80'
                      : 'font-mono-tech text-[10px] font-semibold text-slate-400 dark:text-slate-500'
                  }
                >
                  {count}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Search */}
      <form method="GET" className="flex gap-2">
        {searchParams.scope && <input type="hidden" name="scope" value={searchParams.scope} />}
        <div className="relative flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          />
          <label htmlFor="audit-q" className="sr-only">
            Buscar
          </label>
          <input
            id="audit-q"
            type="text"
            name="q"
            defaultValue={searchParams.q}
            placeholder="Action, entity, ID ou nome do ator..."
            className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 pl-8 text-sm shadow-elevate focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900"
        >
          Buscar
        </button>
        {hasFilters && (
          <Link
            href="/admin/configuracoes/auditoria"
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Limpar
          </Link>
        )}
      </form>

      {/* Lista */}
      {logs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-600 dark:bg-slate-800">
          <ShieldCheck className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
          <p className="mt-3 text-sm text-slate-500">
            Nenhum registro encontrado{hasFilters ? ' com esses filtros' : ''}.
          </p>
        </div>
      ) : (
        <ul role="list" className="space-y-2">
          {logs.map((log) => {
            const tone = getActionTone(log.action);
            const metadataStr =
              log.metadata && typeof log.metadata === 'object'
                ? JSON.stringify(log.metadata, null, 0)
                : null;
            return (
              <li
                key={log.id}
                className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-elevate transition-colors hover:bg-slate-50/40 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700/30"
              >
                <div className="flex items-start gap-3 p-4">
                  <span
                    aria-hidden="true"
                    className={`mt-1 inline-flex h-2 w-2 shrink-0 rounded-full ring-2 ring-inset ring-current/30 ${tone.dot}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <code className={`font-mono-tech text-xs font-semibold ${tone.text}`}>
                        {log.action}
                      </code>
                      {log.entity && (
                        <span className="font-mono-tech text-[10px] text-slate-500">
                          · {log.entity}
                          {log.entityId && (
                            <span className="text-slate-400">[ {log.entityId.slice(0, 8)} ]</span>
                          )}
                        </span>
                      )}
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      {log.actor ? (
                        <span className="inline-flex items-center gap-1">
                          <UserIcon className="h-3 w-3" aria-hidden="true" />
                          <span className="text-slate-700 dark:text-slate-200">{log.actor.name}</span>
                          <span className="font-mono-tech text-[10px] text-slate-400">
                            {log.actor.email}
                          </span>
                        </span>
                      ) : (
                        <span className="font-mono-tech text-[10px]">[ system ]</span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" aria-hidden="true" />
                        <time
                          dateTime={log.createdAt.toISOString()}
                          title={formatDate(log.createdAt)}
                          className="font-mono-tech"
                        >
                          {formatRelative(log.createdAt)}
                        </time>
                      </span>
                      {log.ipAddress && (
                        <span className="font-mono-tech text-[10px] text-slate-400">
                          {log.ipAddress}
                        </span>
                      )}
                    </div>

                    {metadataStr && metadataStr !== '{}' && (
                      <details className="mt-2 group">
                        <summary className="cursor-pointer text-[10px] font-medium uppercase tracking-tech text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                          [ metadata ]
                        </summary>
                        <pre className="mt-2 overflow-x-auto rounded-md bg-slate-50 p-2 font-mono-tech text-[11px] text-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Paginação */}
      {total > PER_PAGE && (
        <div className="flex items-center justify-between text-sm">
          <span className="font-mono-tech text-slate-500 dark:text-slate-400">
            {skip + 1}–{Math.min(skip + PER_PAGE, total)} / {total}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/admin/configuracoes/auditoria${buildQs(searchParams, { page: String(page - 1) })}`}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
              >
                ← Anterior
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/admin/configuracoes/auditoria${buildQs(searchParams, { page: String(page + 1) })}`}
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
              >
                Próxima
                <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
