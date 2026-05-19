import Link from 'next/link';
import { Building2, Layers, Plus, Settings, Users } from 'lucide-react';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { createUserAction } from '@/server/actions/users';
import {
  createQueueAction,
  addQueueMemberAction,
  removeQueueMemberAction,
  toggleQueueStatusAction,
} from '@/server/actions/queues';
import { createCategoryAction, toggleCategoryAction } from '@/server/actions/categories';
import { SubmitButton } from '@/components/submit-button';
import { StatusDot } from '@/components/ui/status-dot';

export default async function ConfiguracoesPage({
  searchParams,
}: {
  searchParams: { aba?: string; novo?: string; fila?: string; created?: string; error?: string };
}) {
  const aba = searchParams.aba ?? 'usuarios';
  const session = await auth();
  const user = session?.user;
  const isAdmin = user?.role === 'ADMIN';

  const [agents, queues, categories] = await Promise.all([
    db.user.findMany({
      where: { userType: 'AGENT', deletedAt: null },
      orderBy: { name: 'asc' },
    }),
    db.queue.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        members: {
          include: { user: { select: { id: true, name: true } } },
        },
      },
    }),
    db.ticketCategory.findMany({ orderBy: { sortOrder: 'asc' } }),
  ]);

  const tabs = [
    { key: 'usuarios', label: 'Usuários', count: agents.length, Icon: Users },
    { key: 'filas', label: 'Filas', count: queues.length, Icon: Layers },
    { key: 'categorias', label: 'Categorias', count: categories.length, Icon: Building2 },
  ];

  const selectedQueue = queues.find((q) => q.id === searchParams.fila);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="micro-label-accent">Sistema · admin</p>
        <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white">Configurações</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Agentes, filas de atendimento e categorias de chamado.
        </p>
      </div>

      {!isAdmin && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
          Apenas administradores podem modificar configurações. Você está em modo leitura.
        </div>
      )}

      {/* Tabs — segmented control */}
      <div className="-mx-1 overflow-x-auto px-1">
        <div className="inline-flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-1 shadow-elevate dark:border-slate-700 dark:bg-slate-800">
          {tabs.map((t) => {
            const isActive = aba === t.key;
            const Icon = t.Icon;
            return (
              <Link
                key={t.key}
                href={`/admin/configuracoes?aba=${t.key}`}
                className={
                  isActive
                    ? 'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md bg-fluxo-500 px-3 py-1.5 text-xs font-semibold text-white shadow-fluxo'
                    : 'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700/60 dark:hover:text-white'
                }
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {t.label}
                <span
                  className={
                    isActive
                      ? 'font-mono-tech text-[10px] font-bold text-white/80'
                      : 'font-mono-tech text-[10px] font-semibold text-slate-400 dark:text-slate-500'
                  }
                >
                  {t.count}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ABA: USUÁRIOS */}
      {aba === 'usuarios' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Agentes e administradores que acessam o painel interno.
            </p>
            {isAdmin && (
              <Link
                href="/admin/configuracoes?aba=usuarios&novo=1"
                className="inline-flex items-center gap-1.5 rounded-md bg-fluxo-500 px-3 py-1.5 text-sm font-semibold text-white shadow-fluxo transition hover:bg-fluxo-600"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Novo agente
              </Link>
            )}
          </div>

          {searchParams.novo === '1' && isAdmin && (
            <form
              action={createUserAction}
              className="rounded-lg border border-fluxo-200 bg-fluxo-50/60 p-5 dark:border-fluxo-800/60 dark:bg-fluxo-900/30"
            >
              <input type="hidden" name="userType" value="AGENT" />
              <h3 className="mb-4 font-display text-sm font-semibold text-slate-900 dark:text-white">
                Novo agente
              </h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label htmlFor="agent-name" className="micro-label">Nome completo *</label>
                  <input
                    id="agent-name"
                    name="name"
                    required
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-elevate focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
                  />
                </div>
                <div>
                  <label htmlFor="agent-email" className="micro-label">Email *</label>
                  <input
                    id="agent-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-elevate focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
                  />
                </div>
                <div>
                  <label htmlFor="agent-password" className="micro-label">
                    Senha inicial * <span className="font-mono-tech normal-case tracking-normal text-slate-400">(mín. 8 chars)</span>
                  </label>
                  <input
                    id="agent-password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-elevate focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
                  />
                </div>
                <div>
                  <label htmlFor="agent-role" className="micro-label">Perfil</label>
                  <select
                    id="agent-role"
                    name="role"
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-elevate"
                  >
                    <option value="AGENT">Agente (T.I.)</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                </div>
              </div>
              <div className="mt-5 flex gap-2">
                <SubmitButton pendingText="Criando...">Criar agente</SubmitButton>
                <Link
                  href="/admin/configuracoes?aba=usuarios"
                  className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                >
                  Cancelar
                </Link>
              </div>
            </form>
          )}

          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-elevate dark:border-slate-700 dark:bg-slate-800">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
                <thead className="bg-slate-50/60 dark:bg-slate-800/60">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left micro-label">Nome</th>
                    <th scope="col" className="px-4 py-3 text-left micro-label">Email</th>
                    <th scope="col" className="px-4 py-3 text-left micro-label">Perfil</th>
                    <th scope="col" className="px-4 py-3 text-left micro-label">Filas</th>
                    <th scope="col" className="px-4 py-3 text-left micro-label">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {agents.map((a) => {
                    const agentQueues = queues.filter((q) => q.members.some((m) => m.userId === a.id));
                    return (
                      <tr key={a.id} className="transition-colors hover:bg-fluxo-50/40 dark:hover:bg-slate-700/40">
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{a.name}</td>
                        <td className="px-4 py-3 font-mono-tech text-xs text-slate-700 dark:text-slate-300">{a.email}</td>
                        <td className="px-4 py-3">
                          <span
                            className={
                              a.role === 'ADMIN'
                                ? 'inline-flex items-center rounded font-mono-tech text-[10px] font-semibold uppercase tracking-tech px-2 py-0.5 bg-cyan-400/15 text-cyan-700 ring-1 ring-inset ring-cyan-400/30 dark:text-cyan-300'
                                : 'inline-flex items-center rounded font-mono-tech text-[10px] font-semibold uppercase tracking-tech px-2 py-0.5 bg-fluxo-500/15 text-fluxo-700 ring-1 ring-inset ring-fluxo-500/30 dark:text-fluxo-300'
                            }
                          >
                            {a.role === 'ADMIN' ? 'ADMIN' : 'AGENT'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {agentQueues.length === 0 && <span className="text-xs text-slate-400">—</span>}
                            {agentQueues.map((q) => (
                              <span
                                key={q.id}
                                className="inline-flex items-center rounded-full bg-fluxo-500/10 px-2 py-0.5 text-[10px] font-medium text-fluxo-700 ring-1 ring-inset ring-fluxo-500/20 dark:text-fluxo-300"
                              >
                                {q.name}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <StatusDot tone={a.isActive ? 'emerald' : 'slate'}>
                            {a.isActive ? 'Ativo' : 'Inativo'}
                          </StatusDot>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ABA: FILAS */}
      {aba === 'filas' && (
        <div className="space-y-4">
          {isAdmin && (
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-elevate dark:border-slate-700 dark:bg-slate-800">
              <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold text-slate-900 dark:text-white">
                <Plus className="h-3.5 w-3.5 text-fluxo-500" aria-hidden="true" />
                Nova fila
              </h3>
              <form action={createQueueAction} className="flex flex-wrap items-end gap-3">
                <div className="min-w-[200px]">
                  <label htmlFor="queue-name" className="micro-label">Nome *</label>
                  <input
                    id="queue-name"
                    name="name"
                    required
                    placeholder="Redes, Impressoras, Urgências..."
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-elevate focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
                  />
                </div>
                <div className="min-w-[200px]">
                  <label htmlFor="queue-desc" className="micro-label">Descrição</label>
                  <input
                    id="queue-desc"
                    name="description"
                    placeholder="Opcional"
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-elevate focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
                  />
                </div>
                <div>
                  <label htmlFor="queue-color" className="micro-label">Cor</label>
                  <input
                    id="queue-color"
                    name="color"
                    type="color"
                    defaultValue="#3b82f6"
                    className="mt-1 h-9 w-16 cursor-pointer rounded-md border border-slate-300 shadow-elevate"
                  />
                </div>
                <SubmitButton pendingText="Criando...">Criar fila</SubmitButton>
              </form>
            </div>
          )}

          {queues.map((q) => {
            const memberIds = q.members.map((m) => m.userId);
            const nonMembers = agents.filter((a) => !memberIds.includes(a.id));
            const isSelected = selectedQueue?.id === q.id;

            return (
              <div
                key={q.id}
                className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-elevate dark:border-slate-700 dark:bg-slate-800"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/60 px-5 py-3 dark:border-slate-700 dark:bg-slate-800/60">
                  <div className="flex items-center gap-3">
                    {q.color && (
                      <div
                        aria-hidden="true"
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: q.color }}
                      />
                    )}
                    <div>
                      <span className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                        {q.name}
                      </span>
                      {q.description && (
                        <span className="ml-2 text-xs text-slate-500">{q.description}</span>
                      )}
                    </div>
                    <StatusDot tone={q.isActive ? 'emerald' : 'slate'}>
                      {q.isActive ? 'Ativa' : 'Inativa'}
                    </StatusDot>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/configuracoes?aba=filas&fila=${isSelected ? '' : q.id}`}
                      className="text-xs font-medium text-fluxo-600 hover:underline dark:text-cyan-400"
                    >
                      {isSelected ? 'Fechar' : (
                        <>Membros · <span className="font-mono-tech">{q.members.length}</span></>
                      )}
                    </Link>
                    {isAdmin && (
                      <form action={toggleQueueStatusAction}>
                        <input type="hidden" name="id" value={q.id} />
                        <button
                          type="submit"
                          className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                        >
                          {q.isActive ? 'Desativar' : 'Ativar'}
                        </button>
                      </form>
                    )}
                  </div>
                </div>

                {isSelected && (
                  <div className="grid grid-cols-1 gap-6 p-5 md:grid-cols-2">
                    <div>
                      <h4 className="micro-label mb-2">
                        Membros · <span className="font-mono-tech">{q.members.length}</span>
                      </h4>
                      <div className="space-y-1.5">
                        {q.members.length === 0 && (
                          <p className="text-xs text-slate-500">Nenhum membro. Adicione →</p>
                        )}
                        {q.members.map((m) => (
                          <div
                            key={m.userId}
                            className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-700/50"
                          >
                            <span className="text-sm text-slate-900 dark:text-slate-100">{m.user.name}</span>
                            {isAdmin && (
                              <form action={removeQueueMemberAction}>
                                <input type="hidden" name="queueId" value={q.id} />
                                <input type="hidden" name="userId" value={m.userId} />
                                <button
                                  type="submit"
                                  className="font-mono-tech text-[10px] font-semibold uppercase tracking-tech text-rose-600 hover:text-rose-800"
                                >
                                  Remover
                                </button>
                              </form>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {isAdmin && (
                      <div>
                        <h4 className="micro-label mb-2">Adicionar agente</h4>
                        {nonMembers.length === 0 ? (
                          <p className="text-xs text-slate-500">Todos os agentes já são membros.</p>
                        ) : (
                          <div className="space-y-1.5">
                            {nonMembers.map((a) => (
                              <form
                                key={a.id}
                                action={addQueueMemberAction}
                                className="flex items-center justify-between rounded-md border border-dashed border-slate-300 px-3 py-2 dark:border-slate-600"
                              >
                                <input type="hidden" name="queueId" value={q.id} />
                                <input type="hidden" name="userId" value={a.id} />
                                <span className="text-sm text-slate-700 dark:text-slate-300">{a.name}</span>
                                <button
                                  type="submit"
                                  className="inline-flex items-center gap-1 font-mono-tech text-[10px] font-semibold uppercase tracking-tech text-fluxo-600 hover:text-fluxo-700 dark:text-cyan-400"
                                >
                                  <Plus className="h-3 w-3" aria-hidden="true" />
                                  Adicionar
                                </button>
                              </form>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ABA: CATEGORIAS */}
      {aba === 'categorias' && (
        <div className="space-y-4">
          {isAdmin && (
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-elevate dark:border-slate-700 dark:bg-slate-800">
              <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold text-slate-900 dark:text-white">
                <Plus className="h-3.5 w-3.5 text-fluxo-500" aria-hidden="true" />
                Nova categoria
              </h3>
              <form action={createCategoryAction} className="flex flex-wrap items-end gap-3">
                <div className="min-w-[200px]">
                  <label htmlFor="cat-name" className="micro-label">Nome *</label>
                  <input
                    id="cat-name"
                    name="name"
                    required
                    placeholder="Hardware, Software, Rede..."
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-elevate focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
                  />
                </div>
                <div>
                  <label htmlFor="cat-color" className="micro-label">Cor</label>
                  <input
                    id="cat-color"
                    name="color"
                    type="color"
                    defaultValue="#64748b"
                    className="mt-1 h-9 w-16 cursor-pointer rounded-md border border-slate-300 shadow-elevate"
                  />
                </div>
                <SubmitButton pendingText="Criando...">Criar categoria</SubmitButton>
              </form>
            </div>
          )}

          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-elevate dark:border-slate-700 dark:bg-slate-800">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
                <thead className="bg-slate-50/60 dark:bg-slate-800/60">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left micro-label">Categoria</th>
                    <th scope="col" className="px-4 py-3 text-left micro-label">Cor</th>
                    <th scope="col" className="px-4 py-3 text-left micro-label">Ordem</th>
                    <th scope="col" className="px-4 py-3 text-left micro-label">Status</th>
                    {isAdmin && <th scope="col" className="px-4 py-3" aria-hidden="true" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {categories.map((c) => (
                    <tr key={c.id} className="transition-colors hover:bg-fluxo-50/40 dark:hover:bg-slate-700/40">
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{c.name}</td>
                      <td className="px-4 py-3">
                        {c.color ? (
                          <div className="flex items-center gap-2">
                            <div
                              aria-hidden="true"
                              className="h-4 w-4 shrink-0 rounded-full border border-slate-200 dark:border-slate-600"
                              style={{ backgroundColor: c.color }}
                            />
                            <span className="font-mono-tech text-[11px] text-slate-500">{c.color}</span>
                          </div>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 font-mono-tech text-xs text-slate-600 dark:text-slate-400">{c.sortOrder}</td>
                      <td className="px-4 py-3">
                        <StatusDot tone={c.isActive ? 'emerald' : 'slate'}>
                          {c.isActive ? 'Ativa' : 'Inativa'}
                        </StatusDot>
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-right">
                          <form action={toggleCategoryAction}>
                            <input type="hidden" name="id" value={c.id} />
                            <button
                              type="submit"
                              className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                            >
                              {c.isActive ? 'Desativar' : 'Ativar'}
                            </button>
                          </form>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
