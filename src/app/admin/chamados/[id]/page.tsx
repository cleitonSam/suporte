import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import {
  updateTicketStatusAction,
  assignTicketAction,
  changePriorityAction,
  reopenTicketAction,
  resolveTicketAction,
  closeTicketAction,
  moveQueueAction,
  editTicketAction,
} from '@/server/actions/ticket-admin';
import { ReplyForm } from '@/components/reply-form';
import { SlaBadge } from '@/components/sla-badge';
import {
  TICKET_STATUS_COLOR,
  TICKET_STATUS_LABEL,
  PRIORITY_COLOR,
  PRIORITY_LABEL,
  formatDate,
  formatRelative,
} from '@/lib/utils';

export default async function ChamadoAdminPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { editando?: string };
}) {
  const session = await auth();
  if (!session?.user) return null;

  const isEditing = searchParams.editando === '1';

  const [ticket, agents, queues, templates, categories, equipment] = await Promise.all([
    db.ticket.findFirst({
      where: { id: params.id, deletedAt: null },
      include: {
        client: true,
        openedBy: { select: { name: true, email: true, userType: true } },
        assignedTo: { select: { id: true, name: true } },
        queue: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        equipment: { select: { id: true, name: true, rustdeskId: true } },
        messages: {
          where: { deletedAt: null },
          include: { author: { select: { id: true, name: true, userType: true } } },
          orderBy: { createdAt: 'asc' },
        },
        events: {
          include: { author: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    }),
    db.user.findMany({
      where: { userType: 'AGENT', isActive: true, deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    db.queue.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
    db.responseTemplate.findMany({
      where: {
        isActive: true,
        OR: [{ authorId: null }, { authorId: session.user.id }],
      },
      select: { id: true, title: true, body: true },
      orderBy: { title: 'asc' },
    }),
    db.ticketCategory.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { sortOrder: 'asc' },
    }),
    db.equipment.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
      take: 100,
    }),
  ]);

  if (!ticket) notFound();

  const isClosed = ticket.status === 'CLOSED';
  const isResolved = ticket.status === 'RESOLVED';
  const isActive = !isClosed && !isResolved;

  const EVENT_LABELS: Record<string, string> = {
    CREATED: 'Chamado criado',
    ASSIGNED: 'Atribuído',
    STATUS_CHANGED: 'Status alterado',
    PRIORITY_CHANGED: 'Prioridade alterada',
    COMMENTED: 'Comentário adicionado',
    EQUIPMENT_LINKED: 'Equipamento vinculado',
    REOPENED: 'Reaberto',
    CLOSED: 'Fechado',
  };

  return (
    <div>
      {/* Breadcrumb + ações rápidas no topo */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Link href="/admin/chamados" className="hover:text-fluxo-500">
            Chamados
          </Link>
          <span>/</span>
          <Link href="/admin/fila" className="hover:text-fluxo-500">
            Minha fila
          </Link>
          <span>/</span>
          <span className="font-mono font-medium text-slate-900">{ticket.ticketNumber}</span>
        </div>

        {/* Barra de ações rápidas */}
        <div className="flex items-center gap-2">
          {isActive && (
            <>
              <form action={resolveTicketAction}>
                <input type="hidden" name="ticketId" value={ticket.id} />
                <button
                  type="submit"
                  className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-600"
                >
                  Resolver
                </button>
              </form>
              <form action={closeTicketAction}>
                <input type="hidden" name="ticketId" value={ticket.id} />
                <button
                  type="submit"
                  className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  Fechar
                </button>
              </form>
            </>
          )}
          {isResolved && (
            <>
              <form action={closeTicketAction}>
                <input type="hidden" name="ticketId" value={ticket.id} />
                <button
                  type="submit"
                  className="rounded-md bg-slate-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800"
                >
                  Fechar definitivamente
                </button>
              </form>
              <form action={reopenTicketAction}>
                <input type="hidden" name="ticketId" value={ticket.id} />
                <button
                  type="submit"
                  className="rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100"
                >
                  Reabrir
                </button>
              </form>
            </>
          )}
          {isClosed && (
            <form action={reopenTicketAction}>
              <input type="hidden" name="ticketId" value={ticket.id} />
              <button
                type="submit"
                className="rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100"
              >
                Reabrir
              </button>
            </form>
          )}
          {!isEditing ? (
            <Link
              href={`/admin/chamados/${ticket.id}?editando=1`}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50"
            >
              Editar
            </Link>
          ) : (
            <Link
              href={`/admin/chamados/${ticket.id}`}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50"
            >
              Cancelar edição
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ═══ Coluna principal ═══ */}
        <div className="space-y-6 lg:col-span-2">
          {/* Cabeçalho / Edição */}
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            {isEditing ? (
              <form action={editTicketAction}>
                <input type="hidden" name="ticketId" value={ticket.id} />
                <label className="block text-xs font-medium text-slate-600">Título</label>
                <input
                  name="title"
                  defaultValue={ticket.title}
                  required
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
                />
                <label className="mt-4 block text-xs font-medium text-slate-600">Descrição</label>
                <textarea
                  name="description"
                  defaultValue={ticket.description ?? ''}
                  required
                  rows={5}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
                />
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600">Categoria</label>
                    <select
                      name="categoryId"
                      defaultValue={ticket.category?.id ?? ''}
                      className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                    >
                      <option value="">— Nenhuma —</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600">Equipamento</label>
                    <select
                      name="equipmentId"
                      defaultValue={ticket.equipment?.id ?? ''}
                      className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                    >
                      <option value="">— Nenhum —</option>
                      {equipment.map((e) => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <Link
                    href={`/admin/chamados/${ticket.id}`}
                    className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                  >
                    Cancelar
                  </Link>
                  <button
                    type="submit"
                    className="rounded-md bg-fluxo-500 px-4 py-2 text-sm font-medium text-white hover:bg-fluxo-600"
                  >
                    Salvar alterações
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-xs text-slate-500">{ticket.ticketNumber}</p>
                    <h1 className="mt-1 text-lg font-bold text-slate-900 sm:text-xl">{ticket.title}</h1>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TICKET_STATUS_COLOR[ticket.status]}`}>
                        {TICKET_STATUS_LABEL[ticket.status]}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_COLOR[ticket.priority]}`}>
                        {PRIORITY_LABEL[ticket.priority]}
                      </span>
                      {ticket.category && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                          {ticket.category.name}
                        </span>
                      )}
                      <SlaBadge ticket={ticket} />
                    </div>
                  </div>
                </div>
                <div className="mt-4 rounded-md bg-slate-50 p-4">
                  <p className="whitespace-pre-wrap text-sm text-slate-800">{ticket.description}</p>
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  Aberto por <strong>{ticket.openedBy.name}</strong> ({ticket.openedBy.email}) em{' '}
                  {formatDate(ticket.createdAt)}
                  {ticket.equipment && (
                    <>
                      {' '}· Equipamento: <strong>{ticket.equipment.name}</strong>
                    </>
                  )}
                </p>
              </>
            )}
          </div>

          {/* Thread de mensagens */}
          <div>
            <h2 className="mb-3 text-base font-semibold text-slate-900">
              Conversa
              <span className="ml-2 text-sm font-normal text-slate-500">({ticket.messages.length})</span>
            </h2>
            <div className="space-y-3">
              {ticket.messages.length === 0 && (
                <p className="text-sm text-slate-500">Nenhuma mensagem ainda.</p>
              )}
              {ticket.messages.map((m) => {
                const isAgent = m.author.userType === 'AGENT';
                const isInternal = m.isInternal;
                return (
                  <div
                    key={m.id}
                    className={`rounded-lg border p-4 ${
                      isInternal
                        ? 'border-yellow-200 bg-yellow-50'
                        : isAgent
                          ? 'border-fluxo-200 bg-fluxo-50'
                          : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-semibold">
                        {m.author.name}
                        {isAgent && <span className="ml-1 text-fluxo-500">(Fluxo)</span>}
                        {isInternal && (
                          <span className="ml-1 rounded bg-yellow-200 px-1 py-0.5 text-yellow-800">
                            nota interna
                          </span>
                        )}
                      </span>
                      <span className="text-slate-500">{formatDate(m.createdAt)}</span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-slate-800">{m.body}</p>
                  </div>
                );
              })}
            </div>

            {/* Caixa de resposta */}
            {!isClosed && (
              <ReplyForm
                ticketId={ticket.id}
                templates={templates}
                allowInternal={true}
                clientName={ticket.client.name}
              />
            )}
          </div>
        </div>

        {/* ═══ Coluna lateral ═══ */}
        <div className="space-y-4">
          {/* Painel de controle */}
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Controle do chamado</h3>

            {/* Status */}
            <form action={updateTicketStatusAction} className="mb-4">
              <input type="hidden" name="ticketId" value={ticket.id} />
              <label className="block text-xs font-medium text-slate-600">Status</label>
              <div className="mt-1 flex gap-2">
                <select
                  name="status"
                  defaultValue={ticket.status}
                  className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm shadow-sm"
                >
                  <option value="NEW">Novo</option>
                  <option value="OPEN">Aberto</option>
                  <option value="IN_PROGRESS">Em andamento</option>
                  <option value="WAITING_CLIENT">Aguardando cliente</option>
                  <option value="RESOLVED">Resolvido</option>
                  <option value="CLOSED">Fechado</option>
                </select>
                <button
                  type="submit"
                  className="rounded-md bg-slate-700 px-3 py-1.5 text-sm text-white hover:bg-slate-800"
                >
                  OK
                </button>
              </div>
            </form>

            {/* Prioridade */}
            <form action={changePriorityAction} className="mb-4">
              <input type="hidden" name="ticketId" value={ticket.id} />
              <label className="block text-xs font-medium text-slate-600">Prioridade</label>
              <div className="mt-1 flex gap-2">
                <select
                  name="priority"
                  defaultValue={ticket.priority}
                  className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm shadow-sm"
                >
                  <option value="LOW">Baixa</option>
                  <option value="MEDIUM">Média</option>
                  <option value="HIGH">Alta</option>
                  <option value="URGENT">Urgente</option>
                </select>
                <button
                  type="submit"
                  className="rounded-md bg-slate-700 px-3 py-1.5 text-sm text-white hover:bg-slate-800"
                >
                  OK
                </button>
              </div>
            </form>

            {/* Atribuir agente */}
            <form action={assignTicketAction} className="mb-4">
              <input type="hidden" name="ticketId" value={ticket.id} />
              <label className="block text-xs font-medium text-slate-600">Atribuir a</label>
              <div className="mt-1 flex gap-2">
                <select
                  name="assignedToId"
                  defaultValue={ticket.assignedToId ?? ''}
                  className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm shadow-sm"
                >
                  <option value="">— Sem atribuição —</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="rounded-md bg-slate-700 px-3 py-1.5 text-sm text-white hover:bg-slate-800"
                >
                  OK
                </button>
              </div>
            </form>

            {/* Mover fila */}
            <form action={moveQueueAction} className="mb-4">
              <input type="hidden" name="ticketId" value={ticket.id} />
              <label className="block text-xs font-medium text-slate-600">Fila</label>
              <div className="mt-1 flex gap-2">
                <select
                  name="queueId"
                  defaultValue={ticket.queue?.id ?? ''}
                  className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm shadow-sm"
                >
                  <option value="">— Sem fila —</option>
                  {queues.map((q) => (
                    <option key={q.id} value={q.id}>{q.name}</option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="rounded-md bg-slate-700 px-3 py-1.5 text-sm text-white hover:bg-slate-800"
                >
                  OK
                </button>
              </div>
            </form>
          </div>

          {/* Info do cliente */}
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Detalhes</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs font-medium text-slate-500">Cliente</p>
                <Link
                  href={`/admin/clientes/${ticket.client.id}`}
                  className="font-medium text-fluxo-500 hover:underline"
                >
                  {ticket.client.name}
                </Link>
                {ticket.client.phone && (
                  <p className="text-xs text-slate-500">{ticket.client.phone}</p>
                )}
              </div>
              {ticket.assignedTo && (
                <div>
                  <p className="text-xs font-medium text-slate-500">Atendente</p>
                  <p className="text-slate-900">{ticket.assignedTo.name}</p>
                </div>
              )}
              {ticket.queue && (
                <div>
                  <p className="text-xs font-medium text-slate-500">Fila</p>
                  <p className="text-slate-900">{ticket.queue.name}</p>
                </div>
              )}
              {ticket.category && (
                <div>
                  <p className="text-xs font-medium text-slate-500">Categoria</p>
                  <p className="text-slate-900">{ticket.category.name}</p>
                </div>
              )}
              {ticket.equipment && (
                <div>
                  <p className="text-xs font-medium text-slate-500">Equipamento</p>
                  <p className="text-slate-900">{ticket.equipment.name}</p>
                  {ticket.equipment.rustdeskId && (
                    <a
                      href={`rustdesk://connection/new/${ticket.equipment.rustdeskId}`}
                      className="mt-1.5 inline-flex items-center gap-1.5 rounded-md bg-fluxo-500 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-fluxo-600"
                      title={`Conectar via RustDesk (ID: ${ticket.equipment.rustdeskId})`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                        <rect x="2" y="3" width="20" height="14" rx="2" />
                        <line x1="8" y1="21" x2="16" y2="21" />
                        <line x1="12" y1="17" x2="12" y2="21" />
                      </svg>
                      Acesso remoto
                    </a>
                  )}
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-slate-500">Aberto em</p>
                <p className="text-slate-900">{formatDate(ticket.createdAt)}</p>
              </div>
              {ticket.resolvedAt && (
                <div>
                  <p className="text-xs font-medium text-slate-500">Resolvido em</p>
                  <p className="text-slate-900">{formatDate(ticket.resolvedAt)}</p>
                </div>
              )}
              {ticket.closedAt && (
                <div>
                  <p className="text-xs font-medium text-slate-500">Fechado em</p>
                  <p className="text-slate-900">{formatDate(ticket.closedAt)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Histórico de eventos */}
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Histórico</h3>
            <div className="space-y-2">
              {ticket.events.length === 0 && (
                <p className="text-xs text-slate-500">Nenhum evento registrado.</p>
              )}
              {ticket.events.map((ev) => (
                <div key={ev.id} className="flex items-start gap-2 text-xs text-slate-600">
                  <div className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-slate-400" />
                  <div>
                    <span className="font-medium text-slate-700">
                      {EVENT_LABELS[ev.type] ?? ev.type}
                    </span>
                    {ev.oldValue && ev.newValue && (
                      <span className="text-slate-500">
                        {' '}· {TICKET_STATUS_LABEL[ev.oldValue] ?? ev.oldValue} →{' '}
                        {TICKET_STATUS_LABEL[ev.newValue] ?? ev.newValue}
                      </span>
                    )}
                    {ev.author && <span className="text-slate-500"> por {ev.author.name}</span>}
                    <div className="text-slate-400">{formatRelative(ev.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
