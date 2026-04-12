import { notFound } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { reopenTicketAction } from '@/server/actions/ticket-admin';
import { ReplyForm } from '@/components/reply-form';
import {
  TICKET_STATUS_COLOR,
  TICKET_STATUS_LABEL,
  PRIORITY_COLOR,
  PRIORITY_LABEL,
  formatDate,
} from '@/lib/utils';

export default async function ChamadoDetalhePage({ params }: { params: { id: string } }) {
  const session = await auth();
  const user = session?.user;

  const ticket = await db.ticket.findFirst({
    where: {
      id: params.id,
      deletedAt: null,
      ...(user.userType === 'CLIENT_CONTACT' && { clientId: user.clientId }),
    },
    include: {
      client: true,
      openedBy: { select: { name: true, email: true } },
      assignedTo: { select: { name: true } },
      category: { select: { name: true } },
      equipment: { select: { name: true } },
      messages: {
        where: { deletedAt: null, isInternal: false },
        include: { author: { select: { id: true, name: true, userType: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!ticket) notFound();

  const isClosed = ticket.status === 'CLOSED';
  const isResolved = ticket.status === 'RESOLVED';
  const canReopen = isResolved || isClosed;
  const canReply = !isClosed;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex items-center justify-between">
        <Link href="/portal" className="text-sm text-slate-600 hover:text-fluxo-500">
          ← Voltar para meus chamados
        </Link>
        {canReopen && (
          <form action={reopenTicketAction}>
            <input type="hidden" name="ticketId" value={ticket.id} />
            <button
              type="submit"
              className="rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100"
            >
              ↩ Reabrir chamado
            </button>
          </form>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="font-mono text-xs text-slate-500">{ticket.ticketNumber}</p>
            <h1 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">{ticket.title}</h1>
            <p className="mt-2 whitespace-pre-wrap text-slate-700">{ticket.description}</p>
            <p className="mt-3 text-xs text-slate-500">
              Aberto por {ticket.openedBy.name} em {formatDate(ticket.createdAt)}
            </p>
          </div>
          <div className="ml-4 flex flex-col items-end gap-2 flex-shrink-0">
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                TICKET_STATUS_COLOR[ticket.status]
              }`}
            >
              {TICKET_STATUS_LABEL[ticket.status]}
            </span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                PRIORITY_COLOR[ticket.priority]
              }`}
            >
              {PRIORITY_LABEL[ticket.priority]}
            </span>
          </div>
        </div>

        {(ticket.category || ticket.equipment || ticket.assignedTo) && (
          <div className="mt-4 flex flex-wrap gap-4 border-t border-slate-100 pt-4 text-xs text-slate-600">
            {ticket.category && <span>Categoria: <strong>{ticket.category.name}</strong></span>}
            {ticket.equipment && <span>Equipamento: <strong>{ticket.equipment.name}</strong></span>}
            {ticket.assignedTo && <span>Atendente: <strong>{ticket.assignedTo.name}</strong></span>}
          </div>
        )}

        {isResolved && (
          <div className="mt-4 rounded-md bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800">
            ✓ Este chamado foi marcado como resolvido. Se o problema persistir, clique em <strong>Reabrir chamado</strong>.
          </div>
        )}
      </div>

      <h2 className="mt-8 text-lg font-semibold text-slate-900">Conversa</h2>
      <div className="mt-3 space-y-3">
        {ticket.messages.length === 0 && (
          <p className="text-sm text-slate-500">
            Nenhuma resposta ainda. Aguarde nossa equipe ou envie informações adicionais abaixo.
          </p>
        )}
        {ticket.messages.map((m) => {
          const isAgent = m.author.userType === 'AGENT';
          return (
            <div
              key={m.id}
              className={`rounded-lg border p-4 ${
                isAgent ? 'border-fluxo-200 bg-fluxo-50' : 'border-slate-200 bg-white'
              }`}
            >
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-semibold">
                  {m.author.name}{' '}
                  {isAgent && <span className="text-fluxo-500">(Fluxo Suporte)</span>}
                </span>
                <span className="text-slate-500">{formatDate(m.createdAt)}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm text-slate-800">{m.body}</p>
            </div>
          );
        })}
      </div>

      {canReply && (
        <ReplyForm
          ticketId={ticket.id}
          allowInternal={false}
          clientName={ticket.client.name}
        />
      )}

      {isClosed && (
        <div className="mt-6 rounded-md border border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">
          Este chamado está fechado. Use o botão <strong>Reabrir chamado</strong> se precisar de mais suporte.
        </div>
      )}
    </div>
  );
}
