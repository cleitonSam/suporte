import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { updateClientAction } from '@/server/actions/clients';
import { resendInviteAction } from '@/server/actions/users';
import { TICKET_STATUS_COLOR, TICKET_STATUS_LABEL, formatRelative, formatDate } from '@/lib/utils';

export default async function ClienteDetalhePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { aba?: string; saved?: string; convite?: string; removido?: string; error?: string };
}) {
  const aba = searchParams.aba ?? 'dados';

  const client = await db.client.findFirst({
    where: { id: params.id, deletedAt: null },
    include: {
      users: {
        where: { userType: 'CLIENT_CONTACT', deletedAt: null },
        orderBy: { name: 'asc' },
      },
      tickets: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          assignedTo: { select: { name: true } },
          category: { select: { name: true } },
        },
      },
      equipment: {
        where: { deletedAt: null },
        include: { category: { select: { name: true } } },
        orderBy: { name: 'asc' },
      },
    },
  });

  if (!client) notFound();

  const tabs = [
    { key: 'dados', label: 'Dados' },
    { key: 'contatos', label: `Contatos (${client.users.length})` },
    { key: 'equipamentos', label: `Equipamentos (${client.equipment.length})` },
    { key: 'chamados', label: `Chamados (${client.tickets.length})` },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-sm text-slate-600">
        <Link href="/admin/clientes" className="hover:text-fluxo-500">Clientes</Link>
        <span>/</span>
        <span className="font-medium text-slate-900">{client.name}</span>
      </div>

      {searchParams.saved === '1' && (
        <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-800">
          ✓ Dados salvos com sucesso.
        </div>
      )}

      {searchParams.convite === 'reenviado' && (
        <div className="mb-4 rounded-md bg-fluxo-50 p-3 text-sm text-fluxo-700">
          ✓ Convite reenviado com nova senha temporária. Peça para o contato verificar a caixa de entrada (e spam).
        </div>
      )}
      {searchParams.convite === 'enviado' && (
        <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-800">
          ✓ Contato criado e convite enviado por email.
        </div>
      )}
      {searchParams.convite === 'criado' && (
        <div className="mb-4 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
          ✓ Contato criado. <strong>Convite por email não foi enviado</strong> — repasse as credenciais manualmente.
        </div>
      )}
      {searchParams.convite === 'email_falhou' && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <div className="font-semibold">⚠ Contato criado, mas o email de convite NÃO foi entregue.</div>
          <div className="mt-1 text-xs">
            Verifique o terminal do servidor para ver o erro exato (procure por <code className="rounded bg-red-100 px-1">[email]</code>).
            Causas comuns: credenciais SMTP inválidas, porta bloqueada, ou o destinatário foi rejeitado.
            Use o botão <strong>✉ Enviar convite</strong> abaixo para tentar de novo.
          </div>
        </div>
      )}
      {searchParams.convite === 'erro' && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
          ⚠ Falha ao reenviar o email de convite. Verifique as credenciais SMTP e os logs do servidor.
        </div>
      )}
      {searchParams.removido === '1' && (
        <div className="mb-4 rounded-md bg-slate-100 p-3 text-sm text-slate-700">
          ✓ Contato removido.
        </div>
      )}
      {searchParams.error === 'email_exists' && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
          ⚠ Já existe um usuário cadastrado com esse email.
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">{client.name}</h1>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            client.status === 'ACTIVE'
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-slate-100 text-slate-600'
          }`}
        >
          {client.status === 'ACTIVE' ? 'Ativo' : client.status === 'SUSPENDED' ? 'Suspenso' : 'Inativo'}
        </span>
      </div>

      {/* Abas */}
      <div className="mt-6 flex gap-1 border-b border-slate-200">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/admin/clientes/${params.id}?aba=${t.key}`}
            className={`rounded-t-md px-4 py-2 text-sm font-medium transition-colors ${
              aba === t.key
                ? 'border-b-2 border-fluxo-500 text-fluxo-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* ABA: Dados */}
      {aba === 'dados' && (
        <form action={updateClientAction} className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <input type="hidden" name="id" value={client.id} />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">Nome / Fantasia *</label>
              <input name="name" required defaultValue={client.name}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Razão Social</label>
              <input name="legalName" defaultValue={client.legalName ?? ''}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">CNPJ</label>
              <input name="cnpj" defaultValue={client.cnpj ?? ''}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Email</label>
              <input name="email" type="email" defaultValue={client.email ?? ''}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Telefone</label>
              <input name="phone" defaultValue={client.phone ?? ''}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Endereço</label>
              <input name="address" defaultValue={client.address ?? ''}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500" />
            </div>
          </div>
          <div className="mt-4">
            <button type="submit" className="rounded-md bg-fluxo-500 px-4 py-2 text-sm font-medium text-white hover:bg-fluxo-600">
              Salvar alterações
            </button>
          </div>
        </form>
      )}

      {/* ABA: Contatos */}
      {aba === 'contatos' && (
        <div className="mt-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-slate-600">Contatos que podem abrir chamados por este cliente.</p>
            <Link href={`/admin/clientes/${params.id}/novo-contato`}
              className="rounded-md bg-fluxo-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-fluxo-600">
              + Novo contato
            </Link>
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="min-w-[700px] divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Nome</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Email</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Telefone</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Último acesso</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Status</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {client.users.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-500">Nenhum contato cadastrado ainda.</td></tr>
                )}
                {client.users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 font-medium text-slate-900">
                      <Link
                        href={`/admin/clientes/${params.id}/contatos/${u.id}`}
                        className="hover:text-fluxo-500"
                      >
                        {u.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-slate-700">{u.email}</td>
                    <td className="px-4 py-2 text-slate-700">{u.phone ?? '—'}</td>
                    <td className="px-4 py-2 text-slate-500">{u.lastLoginAt ? formatRelative(u.lastLoginAt) : 'Nunca'}</td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${u.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                        {u.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Link
                          href={`/admin/clientes/${params.id}/contatos/${u.id}`}
                          className="rounded border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                        >
                          ✎ Editar
                        </Link>
                        <form action={resendInviteAction}>
                          <input type="hidden" name="userId" value={u.id} />
                          <button
                            type="submit"
                            title="Gera nova senha e envia o email de convite"
                            className="rounded border border-fluxo-200 px-2 py-1 text-xs font-medium text-fluxo-500 hover:bg-fluxo-50 hover:text-fluxo-700"
                          >
                            ✉ Enviar convite
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ABA: Equipamentos */}
      {aba === 'equipamentos' && (
        <div className="mt-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-slate-600">Inventário de equipamentos deste cliente.</p>
            <Link href={`/admin/clientes/${params.id}/equipamentos/novo`}
              className="rounded-md bg-fluxo-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-fluxo-600">
              + Novo equipamento
            </Link>
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="min-w-[700px] divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Nome</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Categoria</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Marca / Modelo</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Serial / Patrimônio</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Localização</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Garantia</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {client.equipment.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-500">Nenhum equipamento cadastrado.</td></tr>
                )}
                {client.equipment.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 font-medium text-slate-900">{e.name}</td>
                    <td className="px-4 py-2 text-slate-700">{e.category.name}</td>
                    <td className="px-4 py-2 text-slate-700">{[e.brand, e.model].filter(Boolean).join(' ') || '—'}</td>
                    <td className="px-4 py-2 font-mono text-xs text-slate-600">
                      {e.serialNumber && <div>S/N: {e.serialNumber}</div>}
                      {e.patrimony && <div>Pat: {e.patrimony}</div>}
                      {!e.serialNumber && !e.patrimony && '—'}
                    </td>
                    <td className="px-4 py-2 text-slate-700">{e.location ?? '—'}</td>
                    <td className="px-4 py-2 text-slate-700">
                      {e.warrantyExpiresAt ? (
                        <span className={new Date(e.warrantyExpiresAt) < new Date() ? 'text-red-600' : 'text-emerald-700'}>
                          {formatDate(e.warrantyExpiresAt).split(' ')[0]}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        e.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800'
                        : e.status === 'IN_REPAIR' ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-600'
                      }`}>
                        {e.status === 'ACTIVE' ? 'Ativo' : e.status === 'IN_REPAIR' ? 'Em reparo' : 'Desativado'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ABA: Chamados */}
      {aba === 'chamados' && (
        <div className="mt-6">
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="min-w-[700px] divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Número</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Título</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Status</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Atendente</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Aberto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {client.tickets.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-500">Nenhum chamado.</td></tr>
                )}
                {client.tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 font-mono text-xs text-slate-500">{t.ticketNumber}</td>
                    <td className="px-4 py-2">
                      <Link href={`/admin/chamados/${t.id}`} className="font-medium text-slate-900 hover:text-fluxo-500">
                        {t.title}
                      </Link>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TICKET_STATUS_COLOR[t.status]}`}>
                        {TICKET_STATUS_LABEL[t.status]}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-700">{t.assignedTo?.name ?? '—'}</td>
                    <td className="px-4 py-2 text-slate-500">
                      {new Date(t.createdAt).toLocaleDateString('pt-BR')}
                    </td>
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
