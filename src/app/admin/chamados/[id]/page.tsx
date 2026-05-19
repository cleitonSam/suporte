import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Lock,
  Monitor,
  Pencil,
  RotateCcw,
  Tag,
  UserCircle,
  Users,
  Layers,
  Clock,
  CheckCircle,
  Calendar,
} from 'lucide-react';
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
import { SubmitButton } from '@/components/submit-button';
import { TicketStatusTimeline } from '@/components/ticket-status-timeline';
import { MessageBubble } from '@/components/message-bubble';
import { ActivityIcon } from '@/components/dashboard/activity-icon';
import { TicketStatusDot, PriorityDot } from '@/components/ui/status-dot';
import {
  TICKET_STATUS_LABEL,
  TICKET_EVENT_LABEL,
  formatDate,
  formatRelative,
} from '@/lib/utils';

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const ticket = await db.ticket.findUnique({
    where: { id: params.id },
    select: { ticketNumber: true, title: true, client: { select: { name: true } } },
  });
  if (!ticket) return { title: 'Chamado não encontrado' };
  return {
    title: `${ticket.ticketNumber} — ${ticket.title}`,
    description: `Chamado ${ticket.ticketNumber} (${ticket.client.name})`,
  };
}

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
        deletedAt: null,
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
      where: { status: 'ACTIVE', clientId: undefined, deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
      take: 100,
    }),
  ]);

  if (!ticket) notFound();

  const isClosed = ticket.status === 'CLOSED';
  const isResolved = ticket.status === 'RESOLVED';
  const isOpen = !isClosed && !isResolved;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
        <Link
          href="/admin/chamados"
          className="inline-flex items-center gap-1 transition-colors hover:text-fluxo-500"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Chamados
        </Link>
        <span aria-hidden="true">/</span>
        <span className="font-mono text-xs text-slate-500">{ticket.ticketNumber}</span>
      </div>

      {/* Hero band */}
      <section
        aria-labelledby="ticket-title"
        className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-elevate dark:border-slate-700 dark:bg-slate-800"
      >
        <div aria-hidden="true" className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-fluxo-500/10 blur-3xl" />
        <div className="relative space-y-5 p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
                {ticket.ticketNumber}
              </p>
              <h1
                id="ticket-title"
                className="mt-1 font-display text-xl font-bold text-slate-900 dark:text-white sm:text-2xl"
              >
                {ticket.title}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                <TicketStatusDot status={ticket.status} />
                <PriorityDot priority={ticket.priority} />
                {ticket.category && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                    <Tag className="h-3 w-3 text-slate-400" aria-hidden="true" />
                    {ticket.category.name}
                  </span>
                )}
                <SlaBadge ticket={ticket} />
              </div>
            </div>

            {/* Quick actions */}
            <div className="flex flex-wrap items-center gap-2">
              {isOpen && (
                <>
                  <form action={resolveTicketAction}>
                    <input type="hidden" name="ticketId" value={ticket.id} />
                    <SubmitButton
                      pendingText="Resolvendo..."
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                      Resolver
                    </SubmitButton>
                  </form>
                  <form action={closeTicketAction}>
                    <input type="hidden" name="ticketId" value={ticket.id} />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-elevate transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                    >
                      <Lock className="h-4 w-4" aria-hidden="true" />
                      Fechar
                    </button>
                  </form>
                </>
              )}
              {isResolved && (
                <>
                  <form action={closeTicketAction}>
                    <input type="hidden" name="ticketId" value={ticket.id} />
                    <SubmitButton pendingText="Fechando..." className="bg-slate-700 hover:bg-slate-800">
                      <Lock className="h-4 w-4" aria-hidden="true" />
                      Fechar definitivamente
                    </SubmitButton>
                  </form>
                  <form action={reopenTicketAction}>
                    <input type="hidden" name="ticketId" value={ticket.id} />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-3.5 py-2 text-sm font-medium text-amber-800 transition-colors hover:bg-amber-100"
                    >
                      <RotateCcw className="h-4 w-4" aria-hidden="true" />
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
                    className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-3.5 py-2 text-sm font-medium text-amber-800 transition-colors hover:bg-amber-100"
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    Reabrir
                  </button>
                </form>
              )}
              {!isEditing ? (
                <Link
                  href={`/admin/chamados/${ticket.id}?editando=1`}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 shadow-elevate transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                  Editar
                </Link>
              ) : (
                <Link
                  href={`/admin/chamados/${ticket.id}`}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 shadow-elevate transition-colors hover:bg-slate-50"
                >
                  Cancelar edição
                </Link>
              )}
            </div>
          </div>

          {/* Status timeline */}
          <TicketStatusTimeline status={ticket.status} />
        </div>
      </section>

      {/* Grid 2-col */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Description / edit */}
          {isEditing ? (
            <form
              action={editTicketAction}
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-elevate dark:border-slate-700 dark:bg-slate-800"
            >
              <input type="hidden" name="ticketId" value={ticket.id} />
              <div>
                <label htmlFor="tk-edit-title" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Título
                </label>
                <input
                  id="tk-edit-title"
                  name="title"
                  defaultValue={ticket.title}
                  required
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-elevate focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
                />
              </div>
              <div className="mt-4">
                <label htmlFor="tk-edit-desc" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Descrição
                </label>
                <textarea
                  id="tk-edit-desc"
                  name="description"
                  defaultValue={ticket.description ?? ''}
                  required
                  rows={6}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-elevate focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
                />
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="tk-edit-cat" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                    Categoria
                  </label>
                  <select
                    id="tk-edit-cat"
                    name="categoryId"
                    defaultValue={ticket.category?.id ?? ''}
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-elevate"
                  >
                    <option value="">— Nenhuma —</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="tk-edit-eq" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                    Equipamento
                  </label>
                  <select
                    id="tk-edit-eq"
                    name="equipmentId"
                    defaultValue={ticket.equipment?.id ?? ''}
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-elevate"
                  >
                    <option value="">— Nenhum —</option>
                    {equipment.map((e) => (
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <Link
                  href={`/admin/chamados/${ticket.id}`}
                  className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                >
                  Cancelar
                </Link>
                <SubmitButton pendingText="Salvando...">Salvar alterações</SubmitButton>
              </div>
            </form>
          ) : (
            <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-elevate dark:border-slate-700 dark:bg-slate-800">
              <header className="border-b border-slate-200 px-6 py-3 dark:border-slate-700">
                <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                  Descrição do problema
                </h2>
                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                  Aberto por <strong className="text-slate-700 dark:text-slate-200">{ticket.openedBy.name}</strong> ({ticket.openedBy.email}) em{' '}
                  {formatDate(ticket.createdAt)}
                </p>
              </header>
              <div className="p-6">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800 dark:text-slate-200">
                  {ticket.description}
                </p>
              </div>
            </article>
          )}

          {/* Thread */}
          <section aria-labelledby="conv-heading" className="space-y-3">
            <h2
              id="conv-heading"
              className="flex items-baseline gap-2 font-display text-base font-semibold text-slate-900 dark:text-white"
            >
              Conversa
              <span className="text-xs font-normal text-slate-500">
                ({ticket.messages.length})
              </span>
            </h2>
            {ticket.messages.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500 dark:border-slate-600 dark:bg-slate-800">
                Nenhuma mensagem ainda. Envie a primeira resposta abaixo.
              </p>
            ) : (
              <ul role="list" className="space-y-3">
                {ticket.messages.map((m) => (
                  <li key={m.id}>
                    <MessageBubble
                      author={m.author}
                      body={m.body}
                      createdAt={m.createdAt}
                      isInternal={m.isInternal}
                    />
                  </li>
                ))}
              </ul>
            )}

            {!isClosed && (
              <ReplyForm
                ticketId={ticket.id}
                templates={templates}
                allowInternal={true}
                clientName={ticket.client.name}
              />
            )}
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          {/* Controle */}
          <section
            aria-labelledby="control-heading"
            className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-elevate dark:border-slate-700 dark:bg-slate-800"
          >
            <header className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
              <h3
                id="control-heading"
                className="font-display text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                Controle
              </h3>
            </header>
            <div className="space-y-3 p-4">
              <InlineSelectForm
                action={updateTicketStatusAction}
                ticketId={ticket.id}
                name="status"
                label="Status"
                defaultValue={ticket.status}
                options={[
                  { value: 'NEW', label: 'Novo' },
                  { value: 'OPEN', label: 'Aberto' },
                  { value: 'IN_PROGRESS', label: 'Em andamento' },
                  { value: 'WAITING_CLIENT', label: 'Aguardando cliente' },
                  { value: 'RESOLVED', label: 'Resolvido' },
                  { value: 'CLOSED', label: 'Fechado' },
                ]}
              />
              <InlineSelectForm
                action={changePriorityAction}
                ticketId={ticket.id}
                name="priority"
                label="Prioridade"
                defaultValue={ticket.priority}
                options={[
                  { value: 'LOW', label: 'Baixa' },
                  { value: 'MEDIUM', label: 'Média' },
                  { value: 'HIGH', label: 'Alta' },
                  { value: 'URGENT', label: 'Urgente' },
                ]}
              />
              <InlineSelectForm
                action={assignTicketAction}
                ticketId={ticket.id}
                name="assignedToId"
                label="Atendente"
                defaultValue={ticket.assignedToId ?? ''}
                options={[
                  { value: '', label: '— Sem atribuição —' },
                  ...agents.map((a) => ({ value: a.id, label: a.name })),
                ]}
              />
              <InlineSelectForm
                action={moveQueueAction}
                ticketId={ticket.id}
                name="queueId"
                label="Fila"
                defaultValue={ticket.queue?.id ?? ''}
                options={[
                  { value: '', label: '— Sem fila —' },
                  ...queues.map((q) => ({ value: q.id, label: q.name })),
                ]}
              />
            </div>
          </section>

          {/* Detalhes */}
          <section
            aria-labelledby="details-heading"
            className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-elevate dark:border-slate-700 dark:bg-slate-800"
          >
            <header className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
              <h3
                id="details-heading"
                className="font-display text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                Detalhes
              </h3>
            </header>
            <dl className="space-y-3 p-4 text-sm">
              <DetailRow icon={<Building2 className="h-3.5 w-3.5" aria-hidden="true" />} label="Cliente">
                <Link
                  href={`/admin/clientes/${ticket.client.id}`}
                  className="font-medium text-fluxo-600 hover:underline dark:text-cyan-400"
                >
                  {ticket.client.name}
                </Link>
                {ticket.client.phone && (
                  <p className="mt-0.5 text-xs text-slate-500">{ticket.client.phone}</p>
                )}
              </DetailRow>
              {ticket.assignedTo && (
                <DetailRow icon={<UserCircle className="h-3.5 w-3.5" aria-hidden="true" />} label="Atendente">
                  <span className="text-slate-900 dark:text-slate-100">{ticket.assignedTo.name}</span>
                </DetailRow>
              )}
              {ticket.queue && (
                <DetailRow icon={<Users className="h-3.5 w-3.5" aria-hidden="true" />} label="Fila">
                  <span className="text-slate-900 dark:text-slate-100">{ticket.queue.name}</span>
                </DetailRow>
              )}
              {ticket.category && (
                <DetailRow icon={<Layers className="h-3.5 w-3.5" aria-hidden="true" />} label="Categoria">
                  <span className="text-slate-900 dark:text-slate-100">{ticket.category.name}</span>
                </DetailRow>
              )}
              {ticket.equipment && (
                <DetailRow icon={<Monitor className="h-3.5 w-3.5" aria-hidden="true" />} label="Equipamento">
                  <p className="text-slate-900 dark:text-slate-100">{ticket.equipment.name}</p>
                  {ticket.equipment.rustdeskId && (
                    <a
                      href={`rustdesk://connection/new/${ticket.equipment.rustdeskId}`}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-fluxo-500 px-3 py-1.5 text-xs font-semibold text-white shadow-fluxo transition hover:bg-fluxo-600"
                      title={`RustDesk ID: ${ticket.equipment.rustdeskId}`}
                    >
                      <Monitor className="h-3.5 w-3.5" aria-hidden="true" />
                      Acesso remoto
                    </a>
                  )}
                </DetailRow>
              )}
              <DetailRow icon={<Calendar className="h-3.5 w-3.5" aria-hidden="true" />} label="Aberto em">
                <span className="text-slate-900 dark:text-slate-100">{formatDate(ticket.createdAt)}</span>
              </DetailRow>
              {ticket.resolvedAt && (
                <DetailRow icon={<CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />} label="Resolvido">
                  <span className="text-slate-900 dark:text-slate-100">{formatDate(ticket.resolvedAt)}</span>
                </DetailRow>
              )}
              {ticket.closedAt && (
                <DetailRow icon={<Lock className="h-3.5 w-3.5" aria-hidden="true" />} label="Fechado">
                  <span className="text-slate-900 dark:text-slate-100">{formatDate(ticket.closedAt)}</span>
                </DetailRow>
              )}
            </dl>
          </section>

          {/* Histórico */}
          <section
            aria-labelledby="history-heading"
            className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-elevate dark:border-slate-700 dark:bg-slate-800"
          >
            <header className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
              <h3
                id="history-heading"
                className="flex items-center gap-1.5 font-display text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                Histórico
              </h3>
            </header>
            {ticket.events.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-slate-500">
                Nenhum evento registrado.
              </p>
            ) : (
              <ul role="list" className="divide-y divide-slate-100 dark:divide-slate-700">
                {ticket.events.map((ev) => {
                  const label = TICKET_EVENT_LABEL[ev.type] ?? ev.type;
                  return (
                    <li key={ev.id} className="flex items-start gap-2.5 px-4 py-2.5">
                      <ActivityIcon type={ev.type} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                          {label}
                          {ev.oldValue && ev.newValue && ev.type === 'STATUS_CHANGED' && (
                            <span className="ml-1 font-normal text-slate-500">
                              {TICKET_STATUS_LABEL[ev.oldValue] ?? ev.oldValue} →{' '}
                              {TICKET_STATUS_LABEL[ev.newValue] ?? ev.newValue}
                            </span>
                          )}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          {ev.author && <>{ev.author.name} · </>}
                          {formatRelative(ev.createdAt)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function InlineSelectForm({
  action,
  ticketId,
  name,
  label,
  defaultValue,
  options,
}: {
  action: (formData: FormData) => void | Promise<void>;
  ticketId: string;
  name: string;
  label: string;
  defaultValue: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="ticketId" value={ticketId} />
      <label
        htmlFor={`ctrl-${name}-${ticketId}`}
        className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
      >
        {label}
      </label>
      <div className="mt-1 flex gap-2">
        <select
          id={`ctrl-${name}-${ticketId}`}
          name={name}
          defaultValue={defaultValue}
          className="flex-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm shadow-elevate focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500 dark:border-slate-600 dark:bg-slate-700"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <SubmitButton
          pendingText="..."
          className="bg-slate-800 px-3 py-1.5 text-xs hover:bg-slate-900 dark:bg-slate-600 dark:hover:bg-slate-500"
        >
          OK
        </SubmitButton>
      </div>
    </form>
  );
}

function DetailRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {icon}
        {label}
      </dt>
      <dd className="mt-0.5 text-sm">{children}</dd>
    </div>
  );
}
