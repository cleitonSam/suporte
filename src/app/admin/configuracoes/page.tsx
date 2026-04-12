import Link from 'next/link';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { createUserAction } from '@/server/actions/users';
import { createQueueAction, addQueueMemberAction, removeQueueMemberAction, toggleQueueStatusAction } from '@/server/actions/queues';
import { createCategoryAction, toggleCategoryAction } from '@/server/actions/categories';

export default async function ConfiguracoesPage({
  searchParams,
}: {
  searchParams: { aba?: string; novo?: string; fila?: string; created?: string; error?: string };
}) {
  const aba = searchParams.aba ?? 'usuarios';
  const session = await auth();
  const user = session?.user as any;
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
    { key: 'usuarios', label: `Usuários/Agentes (${agents.length})` },
    { key: 'filas', label: `Filas (${queues.length})` },
    { key: 'categorias', label: `Categorias (${categories.length})` },
  ];

  // Fila selecionada para gerenciar membros
  const selectedQueue = queues.find((q) => q.id === searchParams.fila);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Configurações</h1>

      {!isAdmin && (
        <div className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
          Apenas administradores podem modificar configurações.
        </div>
      )}

      {searchParams.created === '1' && (
        <div className="mt-4 rounded-md bg-green-50 p-3 text-sm text-green-800">
          ✓ Criado com sucesso.
        </div>
      )}

      {/* Abas */}
      <div className="mt-6 flex gap-1 border-b border-slate-200">
        {tabs.map((t) => (
          <Link key={t.key} href={`/admin/configuracoes?aba=${t.key}`}
            className={`rounded-t-md px-4 py-2 text-sm font-medium transition-colors ${
              aba === t.key ? 'border-b-2 border-fluxo-500 text-fluxo-600' : 'text-slate-600 hover:text-slate-900'
            }`}>
            {t.label}
          </Link>
        ))}
      </div>

      {/* ===== ABA: USUÁRIOS ===== */}
      {aba === 'usuarios' && (
        <div className="mt-6">
          <div className="mb-4 flex justify-between">
            <p className="text-sm text-slate-600">Agentes e administradores que acessam o painel interno.</p>
            {isAdmin && (
              <Link href="/admin/configuracoes?aba=usuarios&novo=1"
                className="rounded-md bg-fluxo-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-fluxo-600">
                + Novo agente
              </Link>
            )}
          </div>

          {searchParams.novo === '1' && isAdmin && (
            <form action={createUserAction} className="mb-6 rounded-lg border border-fluxo-200 bg-fluxo-50 p-5">
              <input type="hidden" name="userType" value="AGENT" />
              <h3 className="mb-4 font-semibold text-slate-900">Novo agente</h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700">Nome completo *</label>
                  <input name="name" required className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Email *</label>
                  <input name="email" type="email" required className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Senha inicial * (mín. 8 chars)</label>
                  <input name="password" type="password" required minLength={8} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Perfil</label>
                  <select name="role" className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm">
                    <option value="AGENT">Agente (T.I.)</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button type="submit" className="rounded-md bg-fluxo-500 px-4 py-2 text-sm font-medium text-white hover:bg-fluxo-600">
                  Criar agente
                </button>
                <Link href="/admin/configuracoes?aba=usuarios"
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  Cancelar
                </Link>
              </div>
            </form>
          )}

          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="min-w-[700px] divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Nome</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Email</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Perfil</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Filas</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {agents.map((a) => {
                  const agentQueues = queues.filter((q) => q.members.some((m) => m.userId === a.id));
                  return (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2 font-medium text-slate-900">{a.name}</td>
                      <td className="px-4 py-2 text-slate-700">{a.email}</td>
                      <td className="px-4 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          a.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {a.role === 'ADMIN' ? 'Admin' : 'Agente'}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex flex-wrap gap-1">
                          {agentQueues.length === 0 && <span className="text-slate-400 text-xs">Nenhuma</span>}
                          {agentQueues.map((q) => (
                            <span key={q.id} className="rounded-full bg-fluxo-100 px-2 py-0.5 text-xs text-fluxo-700">{q.name}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          a.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {a.isActive ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== ABA: FILAS ===== */}
      {aba === 'filas' && (
        <div className="mt-6 space-y-6">
          {/* Criar nova fila */}
          {isAdmin && (
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 font-semibold text-slate-900">Nova fila</h3>
              <form action={createQueueAction} className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600">Nome *</label>
                  <input name="name" required placeholder="Ex: Redes, Impressoras, Urgências"
                    className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500 w-full sm:w-48" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600">Descrição</label>
                  <input name="description" placeholder="Opcional"
                    className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500 w-full sm:w-56" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600">Cor</label>
                  <input name="color" type="color" defaultValue="#3b82f6"
                    className="mt-1 h-9 w-16 rounded-md border border-slate-300 px-1 py-1 shadow-sm" />
                </div>
                <button type="submit" className="rounded-md bg-fluxo-500 px-4 py-2 text-sm font-medium text-white hover:bg-fluxo-600">
                  Criar fila
                </button>
              </form>
            </div>
          )}

          {/* Lista de filas com gerenciamento de membros */}
          {queues.map((q) => {
            const memberIds = q.members.map((m) => m.userId);
            const nonMembers = agents.filter((a) => !memberIds.includes(a.id));
            const isSelected = selectedQueue?.id === q.id;

            return (
              <div key={q.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3">
                  <div className="flex items-center gap-3">
                    {q.color && (
                      <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: q.color }} />
                    )}
                    <div>
                      <span className="font-semibold text-slate-900">{q.name}</span>
                      {q.description && <span className="ml-2 text-sm text-slate-500">{q.description}</span>}
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      q.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {q.isActive ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/admin/configuracoes?aba=filas&fila=${isSelected ? '' : q.id}`}
                      className="text-xs text-fluxo-500 hover:underline">
                      {isSelected ? 'Fechar' : `Gerenciar membros (${q.members.length})`}
                    </Link>
                    {isAdmin && (
                      <form action={toggleQueueStatusAction}>
                        <input type="hidden" name="id" value={q.id} />
                        <button type="submit" className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50">
                          {q.isActive ? 'Desativar' : 'Ativar'}
                        </button>
                      </form>
                    )}
                  </div>
                </div>

                {isSelected && (
                  <div className="p-5">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      {/* Membros atuais */}
                      <div>
                        <h4 className="mb-2 text-sm font-medium text-slate-700">
                          Membros desta fila ({q.members.length})
                        </h4>
                        <div className="space-y-1.5">
                          {q.members.length === 0 && (
                            <p className="text-xs text-slate-500">Nenhum membro. Adicione abaixo.</p>
                          )}
                          {q.members.map((m) => (
                            <div key={m.userId} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2">
                              <span className="text-sm text-slate-900">{m.user.name}</span>
                              {isAdmin && (
                                <form action={removeQueueMemberAction}>
                                  <input type="hidden" name="queueId" value={q.id} />
                                  <input type="hidden" name="userId" value={m.userId} />
                                  <button type="submit" className="text-xs text-red-600 hover:text-red-800">
                                    Remover
                                  </button>
                                </form>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Adicionar membros */}
                      {isAdmin && (
                        <div>
                          <h4 className="mb-2 text-sm font-medium text-slate-700">
                            Adicionar agente à fila
                          </h4>
                          {nonMembers.length === 0 ? (
                            <p className="text-xs text-slate-500">Todos os agentes já são membros.</p>
                          ) : (
                            <div className="space-y-1.5">
                              {nonMembers.map((a) => (
                                <form key={a.id} action={addQueueMemberAction} className="flex items-center justify-between rounded-md border border-dashed border-slate-300 px-3 py-2">
                                  <input type="hidden" name="queueId" value={q.id} />
                                  <input type="hidden" name="userId" value={a.id} />
                                  <span className="text-sm text-slate-700">{a.name}</span>
                                  <button type="submit" className="text-xs text-fluxo-500 hover:text-fluxo-700 font-medium">
                                    + Adicionar
                                  </button>
                                </form>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ===== ABA: CATEGORIAS ===== */}
      {aba === 'categorias' && (
        <div className="mt-6 space-y-6">
          {/* Criar nova categoria */}
          {isAdmin && (
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 font-semibold text-slate-900">Nova categoria</h3>
              <form action={createCategoryAction} className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600">Nome *</label>
                  <input name="name" required placeholder="Ex: Hardware, Software, Rede..."
                    className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500 w-full sm:w-48" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600">Cor</label>
                  <input name="color" type="color" defaultValue="#64748b"
                    className="mt-1 h-9 w-16 rounded-md border border-slate-300 px-1 py-1 shadow-sm" />
                </div>
                <button type="submit" className="rounded-md bg-fluxo-500 px-4 py-2 text-sm font-medium text-white hover:bg-fluxo-600">
                  Criar categoria
                </button>
              </form>
            </div>
          )}

          {/* Lista de categorias */}
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="min-w-[700px] divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Categoria</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Cor</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Ordem</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Status</th>
                  {isAdmin && <th className="px-4 py-2"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {categories.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 font-medium text-slate-900">{c.name}</td>
                    <td className="px-4 py-2">
                      {c.color ? (
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-4 rounded-full border border-slate-200 flex-shrink-0" style={{ backgroundColor: c.color }} />
                          <span className="font-mono text-xs text-slate-500">{c.color}</span>
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-2 text-slate-600">{c.sortOrder}</td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        c.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {c.isActive ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-2 text-right">
                        <form action={toggleCategoryAction}>
                          <input type="hidden" name="id" value={c.id} />
                          <button type="submit" className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50">
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
      )}
    </div>
  );
}
