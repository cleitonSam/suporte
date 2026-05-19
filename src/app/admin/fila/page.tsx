import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  Inbox,
  Lock,
  PauseCircle,
  PlayCircle,
  Users,
} from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { pullNextAction } from '@/server/actions/tickets';
import {
  resolveTicketAction,
  closeTicketAction,
  updateTicketStatusAction,
  assignTicketAction,
} from '@/server/actions/ticket-admin';
import { TicketStatusDot, PriorityDot } from '@/components/ui/status-dot';
import { formatRelative } from '@/lib/utils';
import type { TicketPriority } from '@prisma/client';

const PRIORITY_ACCENT: Record<TicketPriority, string> = {
  LOW: 'bg-slate-300 dark:bg-slate-600',
  MEDIUM: 'bg-fluxo-400',
  HIGH: 'bg-orange-400',
  URGENT: 'bg-rose-500',
};

export default async function FilaPage() {
  const session = await auth();
  if (!session?.user) return null;
  const user = session.user;

  const [queues, myTickets, agents] = await Promise.all([
    db.queue.findMany({
      where: {
        isActive: true,
        members: { some: { userId: user.id } },
      },
      include: {
        _count: {
          select: {
            tickets: {
              where: {
                deletedAt: null,
                assignedToId: null,
                status: { in: ['NEW', 'OPEN'] },
              },
            },
          },
        },
      },
    }),
    db.ticket.findMany({
      where: {
        assignedToId: user.id,
        deletedAt: null,
        status: { notIn: ['CLOSED'] },
      },
      include: {
        client: { select: { name: true } },
        queue: { select: { id: true, name: true } },
      },
      orderBy: [
        { priority: 'asc' },
        { updatedAt: 'desc' },
      ],
    }),
    db.user.findMany({
      where: { userType: 'AGENT', isActive: true, deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  const active = myTickets.filter((t) => ['IN_PROGRESS', 'WAITING_CLIENT', 'OPEN', 'NEW', 'REOPENED'].includes(t.status));
  const resolved = myTickets.filter((t) => t.status === 'RESOLVED');
  const totalQueueWaiting = queues.reduce((sum, q) => sum + q._count.tickets, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="micro-label-accent">Operação · você</p>
          <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white">Minha fila</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            <span className="font-mono-tech">{active.length}</span> em andamento ·{' '}
            <span className="font-mono-tech">{resolved.length}</span> resolvido{resolved.length === 1 ? '' : 's'} ·{' '}
            <span className="font-mono-tech">{totalQueueWaiting}</span> aguardando na{queues.length === 1 ? '' : 's'} fila{queues.length === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      {/* Filas pra puxar */}
      <section aria-labelledby="queues-heading" className="space-y-3">
        <h2 id="queues-heading" className="micro-label">Filas disponíveis</h2>
        {queues.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-600 dark:bg-slate-800">
            <Users className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
            <p className="mt-3 text-sm text-slate-500">
              Você não está em nenhuma fila. Peça pra um admin te adicionar.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {queues.map((q) => {
              const isEmpty = q._count.tickets === 0;
              return (
                <div
                  key={q.id}
                  className="group relative overflow-hidden rounded-lg border border-slate-200 bg-white p-5 shadow-elevate transition-all hover:-translate-y-0.5 hover:shadow-elevate-lg dark:border-slate-700 dark:bg-slate-800"
                >
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-fluxo-500/40 to-transparent"
                  />
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="micro-label">Fila</p>
                      <h3 className="mt-1 font-display text-lg font-semibold text-slate-900 dark:text-white">
                        {q.name}
                      </h3>
                      {q.description && (
                        <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                          {q.description}
                        </p>
                      )}
                    </div>
                    <div
                      aria-hidden="true"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-fluxo-500/10 text-fluxo-600 ring-1 ring-inset ring-fluxo-500/20"
                    >
                      <Inbox className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="mt-4 font-display text-3xl font-bold leading-none text-slate-900 dark:text-white">
                    <span className="font-mono-tech">{q._count.tickets}</span>
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">aguardando atendimento</p>
                  <form
                    action={async () => {
                      'use server';
                      await pullNextAction(q.id);
                    }}
                    className="mt-4"
                  >
                    <button
                      type="submit"
                      disabled={isEmpty}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-fluxo-500 px-4 py-2 text-sm font-semibold text-white shadow-fluxo transition hover:bg-fluxo-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none dark:disabled:bg-slate-700"
                    >
                      {isEmpty ? 'Sem chamados' : (
                        <>
                          Puxar próximo
                          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </>
                      )}
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Em atendimento */}
      <section aria-labelledby="active-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="active-heading" className="micro-label flex items-center gap-2">
            <PlayCircle className="h-3.5 w-3.5" aria-hidden="true" />
            Em atendimento
            <span className="font-mono-tech text-[10px] text-slate-400">
              [ {active.length} ]
            </span>
          </h2>
        </div>

        {active.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-600 dark:bg-slate-800">
            <p className="text-sm text-slate-500">
              Nenhum chamado em andamento. Puxe da fila acima.
            </p>
          </div>
        ) : (
          <ul role="list" className="space-y-2">
            {active.map((t) => (
              <li
                key={t.id}
                className="relative overflow-hidden rounded-lg border border-slate-200 bg-white shadow-elevate transition-all hover:shadow-elevate-lg dark:border-slate-700 dark:bg-slate-800"
              >
                <span
                  aria-hidden="true"
                  className={`absolute inset-y-0 left-0 w-1 ${PRIORITY_ACCENT[t.priority]}`}
                />
                <div className="flex flex-col gap-3 p-4 pl-5 md:flex-row md:items-center">
                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-mono-tech text-[10px] text-slate-500 dark:text-slate-400">
                        {t.ticketNumber}
                      </span>
                      <TicketStatusDot status={t.status} />
                      <PriorityDot priority={t.priority} />
                      <span className="font-mono-tech text-[10px] text-slate-400">
                        {formatRelative(t.updatedAt)}
                      </span>
                    </div>
                    <Link
                      href={`/admin/chamados/${t.id}`}
                      className="mt-1 block truncate font-medium text-slate-900 transition-colors hover:text-fluxo-600 dark:text-slate-100 dark:hover:text-cyan-400"
                    >
                      {t.title}
                    </Link>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {t.client.name}
                      {t.queue && <> · <span className="font-mono-tech text-[10px]">[ {t.queue.name} ]</span></>}
                    </p>
                  </div>

                  {/* Ações */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <form action={updateTicketStatusAction}>
                      <input type="hidden" name="ticketId" value={t.id} />
                      {t.status !== 'WAITING_CLIENT' ? (
                        <button
                          type="submit"
                          name="status"
                          value="WAITING_CLIENT"
                          title="Marcar como aguardando cliente"
                          className="inline-flex items-center gap-1 rounded-md border border-purple-300 bg-purple-50 px-2.5 py-1.5 text-xs font-medium text-purple-700 transition-colors hover:bg-purple-100 dark:border-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                        >
                          <PauseCircle className="h-3.5 w-3.5" aria-hidden="true" />
                          Aguard. cliente
                        </button>
                      ) : (
                        <button
                          type="submit"
                          name="status"
                          value="IN_PROGRESS"
                          title="Voltar para em andamento"
                          className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                        >
                          <PlayCircle className="h-3.5 w-3.5" aria-hidden="true" />
                          Em andamento
                        </button>
                      )}
                    </form>

                    <form action={resolveTicketAction}>
                      <input type="hidden" name="ticketId" value={t.id} />
                      <button
                        type="submit"
                        title="Marcar como resolvido"
                        className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Resolver
                      </button>
                    </form>

                    <form action={assignTicketAction} className="flex items-center gap-1">
                      <input type="hidden" name="ticketId" value={t.id} />
                      <label htmlFor={`transfer-${t.id}`} className="sr-only">Transferir para outro agente</label>
                      <select
                        id={`transfer-${t.id}`}
                        name="assignedToId"
                        defaultValue=""
                        className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-600 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                      >
                        <option value="" disabled>Transferir...</option>
                        {agents.filter((a) => a.id !== user.id).map((a) => (
                          <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                      >
                        OK
                      </button>
                    </form>

                    <Link
                      href={`/admin/chamados/${t.id}`}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                    >
                      Abrir
                      <ArrowRight className="h-3 w-3" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Resolvidos pendentes de fechamento */}
      {resolved.length > 0 && (
        <section aria-labelledby="resolved-heading" className="space-y-3">
          <h2 id="resolved-heading" className="micro-label flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
            Resolvidos · aguardando fechamento
            <span className="font-mono-tech text-[10px] text-slate-400">
              [ {resolved.length} ]
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Chamados marcados como resolvidos. Feche definitivamente ou reabra se necessário.
          </p>

          <ul role="list" className="space-y-2">
            {resolved.map((t) => (
              <li
                key={t.id}
                className="relative overflow-hidden rounded-lg border border-emerald-200 bg-emerald-50/40 transition-colors hover:bg-emerald-50/70 dark:border-emerald-900/60 dark:bg-emerald-950/20"
              >
                <div className="flex flex-col gap-3 p-3 md:flex-row md:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-mono-tech text-[10px] text-slate-500 dark:text-slate-400">
                        {t.ticketNumber}
                      </span>
                      <PriorityDot priority={t.priority} />
                    </div>
                    <Link
                      href={`/admin/chamados/${t.id}`}
                      className="mt-0.5 block truncate font-medium text-slate-800 transition-colors hover:text-fluxo-600 dark:text-slate-100 dark:hover:text-cyan-400"
                    >
                      {t.title}
                    </Link>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {t.client.name} · <span className="font-mono-tech">{formatRelative(t.updatedAt)}</span>
                    </p>
                  </div>

                  <div className="flex flex-shrink-0 gap-2">
                    <form action={closeTicketAction}>
                      <input type="hidden" name="ticketId" value={t.id} />
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                      >
                        <Lock className="h-3 w-3" aria-hidden="true" />
                        Fechar
                      </button>
                    </form>
                    <Link
                      href={`/admin/chamados/${t.id}`}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                    >
                      Abrir
                      <ArrowRight className="h-3 w-3" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
