import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { pullNextAction } from '@/server/actions/tickets';
import {
  resolveTicketAction,
  closeTicketAction,
  updateTicketStatusAction,
  assignTicketAction,
} from '@/server/actions/ticket-admin';
import Link from 'next/link';
import {
  TICKET_STATUS_COLOR,
  TICKET_STATUS_LABEL,
  PRIORITY_COLOR,
  PRIORITY_LABEL,
  formatRelative,
} from '@/lib/utils';

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
        { priority: 'asc' }, // URGENT first
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

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Minha Fila</h1>
      <p className="mt-1 text-sm text-slate-600">
        Gerencie seus chamados. Puxe da fila, responda, resolva ou transfira.
      </p>

      {/* ── Filas para puxar ── */}
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {queues.length === 0 && (
          <p className="text-slate-500">Você não está em nenhuma fila.</p>
        )}
        {queues.map((q) => (
          <div key={q.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">{q.name}</h3>
            {q.description && <p className="mt-1 text-sm text-slate-600">{q.description}</p>}
            <p className="mt-3 text-3xl font-bold text-fluxo-500">{q._count.tickets}</p>
            <p className="text-xs text-slate-500">aguardando</p>
            <form
              action={async () => {
                'use server';
                await pullNextAction(q.id);
              }}
              className="mt-4"
            >
              <button
                type="submit"
                disabled={q._count.tickets === 0}
                className="w-full rounded-md bg-fluxo-500 px-4 py-2 text-sm font-medium text-white hover:bg-fluxo-600 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Puxar próximo
              </button>
            </form>
          </div>
        ))}
      </div>

      {/* ── Em atendimento ── */}
      <h2 className="mt-10 flex items-center gap-2 text-lg font-semibold text-slate-900">
        Em atendimento
        <span className="rounded-full bg-fluxo-100 px-2 py-0.5 text-xs font-medium text-fluxo-700">
          {active.length}
        </span>
      </h2>

      <div className="mt-4 space-y-3">
        {active.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="text-sm text-slate-500">Nenhum chamado em andamento. Puxe da fila acima.</p>
          </div>
        )}
        {active.map((t) => (
          <div key={t.id} className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-4 p-4">
              {/* Info principal */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-slate-400">{t.ticketNumber}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${TICKET_STATUS_COLOR[t.status]}`}>
                    {TICKET_STATUS_LABEL[t.status]}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${PRIORITY_COLOR[t.priority]}`}>
                    {PRIORITY_LABEL[t.priority]}
                  </span>
                  <span className="text-xs text-slate-400">{formatRelative(t.updatedAt)}</span>
                </div>
                <Link
                  href={`/admin/chamados/${t.id}`}
                  className="mt-1 block truncate text-sm font-semibold text-slate-900 hover:text-fluxo-500"
                >
                  {t.title}
                </Link>
                <p className="text-xs text-slate-500">
                  {t.client.name}
                  {t.queue && <> · Fila: {t.queue.name}</>}
                </p>
              </div>

              {/* Botões de ação rápida */}
              <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
                {/* Mudar status rápido */}
                <form action={updateTicketStatusAction}>
                  <input type="hidden" name="ticketId" value={t.id} />
                  {t.status !== 'WAITING_CLIENT' ? (
                    <button type="submit" name="status" value="WAITING_CLIENT"
                      className="rounded-md border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-100"
                      title="Marcar como aguardando cliente"
                    >
                      Aguard. cliente
                    </button>
                  ) : (
                    <button type="submit" name="status" value="IN_PROGRESS"
                      className="rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100"
                      title="Voltar para em andamento"
                    >
                      Em andamento
                    </button>
                  )}
                </form>

                {/* Resolver */}
                <form action={resolveTicketAction}>
                  <input type="hidden" name="ticketId" value={t.id} />
                  <button type="submit"
                    className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                    title="Marcar como resolvido"
                  >
                    Resolver
                  </button>
                </form>

                {/* Transferir para outro agente */}
                <form action={assignTicketAction} className="flex items-center gap-1">
                  <input type="hidden" name="ticketId" value={t.id} />
                  <select name="assignedToId" defaultValue=""
                    className="rounded-md border border-slate-200 px-2 py-1.5 text-xs text-slate-600"
                  >
                    <option value="" disabled>Transferir...</option>
                    {agents.filter((a) => a.id !== user.id).map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                  <button type="submit"
                    className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                  >
                    OK
                  </button>
                </form>

                {/* Abrir detalhe */}
                <Link
                  href={`/admin/chamados/${t.id}`}
                  className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Abrir
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Resolvidos (pendentes de fechamento) ── */}
      {resolved.length > 0 && (
        <>
          <h2 className="mt-10 flex items-center gap-2 text-lg font-semibold text-slate-900">
            Resolvidos
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
              {resolved.length}
            </span>
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Chamados marcados como resolvidos. Feche definitivamente ou reabra se necessário.
          </p>

          <div className="mt-4 space-y-2">
            {resolved.map((t) => (
              <div key={t.id} className="flex items-center gap-4 rounded-lg border border-emerald-100 bg-emerald-50/50 p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-slate-400">{t.ticketNumber}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${PRIORITY_COLOR[t.priority]}`}>
                      {PRIORITY_LABEL[t.priority]}
                    </span>
                  </div>
                  <Link
                    href={`/admin/chamados/${t.id}`}
                    className="mt-0.5 block truncate text-sm font-medium text-slate-800 hover:text-fluxo-500"
                  >
                    {t.title}
                  </Link>
                  <p className="text-xs text-slate-500">{t.client.name} · {formatRelative(t.updatedAt)}</p>
                </div>

                <div className="flex flex-shrink-0 gap-2">
                  <form action={closeTicketAction}>
                    <input type="hidden" name="ticketId" value={t.id} />
                    <button type="submit"
                      className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                    >
                      Fechar
                    </button>
                  </form>
                  <form action={resolveTicketAction}>
                    <input type="hidden" name="ticketId" value={t.id} />
                    {/* Reopen is handled differently */}
                  </form>
                  <Link
                    href={`/admin/chamados/${t.id}`}
                    className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Abrir
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
