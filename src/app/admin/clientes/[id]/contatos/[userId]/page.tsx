import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import {
  updateClientContactAction,
  resendInviteAction,
  deleteClientContactAction,
} from '@/server/actions/users';
import { formatRelative, formatDate } from '@/lib/utils';

export default async function EditarContatoPage({
  params,
  searchParams,
}: {
  params: { id: string; userId: string };
  searchParams: { saved?: string; convite?: string; error?: string };
}) {
  const client = await db.client.findFirst({
    where: { id: params.id, deletedAt: null },
    select: { id: true, name: true },
  });
  if (!client) notFound();

  const user = await db.user.findFirst({
    where: {
      id: params.userId,
      clientId: params.id,
      userType: 'CLIENT_CONTACT',
      deletedAt: null,
    },
  });
  if (!user) notFound();

  const ticketCount = await db.ticket.count({
    where: { openedById: user.id, deletedAt: null },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center gap-2 text-sm text-slate-600">
        <Link href="/admin/clientes" className="hover:text-fluxo-500">Clientes</Link>
        <span>/</span>
        <Link href={`/admin/clientes/${client.id}?aba=contatos`} className="hover:text-fluxo-500">{client.name}</Link>
        <span>/</span>
        <span className="font-medium text-slate-900">{user.name}</span>
      </div>

      <h1 className="text-2xl font-bold text-slate-900">Editar contato</h1>
      <p className="mt-1 text-sm text-slate-600">
        Atualize os dados de acesso deste contato de <strong>{client.name}</strong>.
      </p>

      {/* Banners de feedback */}
      {searchParams.saved === '1' && (
        <div className="mt-4 rounded-md bg-green-50 p-3 text-sm text-green-800">
          ✓ Dados do contato atualizados com sucesso.
        </div>
      )}
      {searchParams.convite === 'reenviado' && (
        <div className="mt-4 rounded-md bg-fluxo-50 p-3 text-sm text-fluxo-700">
          ✓ Convite reenviado! Uma nova senha temporária foi gerada e enviada para <strong>{user.email}</strong>.
          Peça para o contato verificar a caixa de entrada (e também o spam).
        </div>
      )}
      {searchParams.convite === 'erro' && (
        <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
          ⚠ Falha ao enviar o email de convite. Verifique as credenciais SMTP no servidor e os logs do terminal.
        </div>
      )}
      {searchParams.error === 'validation' && (
        <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-800">⚠ Preencha os campos obrigatórios.</div>
      )}
      {searchParams.error === 'email_exists' && (
        <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-800">⚠ Este email já está em uso por outro usuário.</div>
      )}

      {/* Bloco destacado — Enviar convite */}
      <div className="mt-6 rounded-lg border-2 border-fluxo-200 bg-gradient-to-br from-fluxo-50 to-indigo-50 p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-fluxo-800">
              ✉ Enviar convite por email
            </h2>
            <p className="mt-1 text-xs text-fluxo-700">
              Gera uma nova senha temporária e envia um email para <strong>{user.email}</strong> com
              o link do portal, email e senha de acesso.
              {user.lastLoginAt
                ? ` (Último acesso: ${formatRelative(user.lastLoginAt)})`
                : ' Este contato ainda não acessou o portal.'}
            </p>
          </div>
          <form action={resendInviteAction} className="shrink-0">
            <input type="hidden" name="userId" value={user.id} />
            <input type="hidden" name="from" value="edit" />
            <button
              type="submit"
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-md bg-fluxo-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-fluxo-600"
            >
              ✉ Enviar convite agora
            </button>
          </form>
        </div>
      </div>

      {/* Formulário de edição */}
      <form
        action={updateClientContactAction}
        className="mt-6 space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        <input type="hidden" name="userId" value={user.id} />
        <input type="hidden" name="clientId" value={client.id} />

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-600">Dados de acesso</h2>
          <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700">Nome completo *</label>
              <input
                name="name" required defaultValue={user.name}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Email *</label>
              <input
                name="email" type="email" required defaultValue={user.email}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Telefone</label>
              <input
                name="phone" defaultValue={user.phone ?? ''}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                name="isActive"
                defaultChecked={user.isActive}
                className="h-4 w-4 rounded border-slate-300 text-fluxo-500 focus:ring-fluxo-500"
              />
              <span className="text-sm font-medium text-slate-700">Contato ativo</span>
              <span className="text-xs text-slate-500">(desmarque para bloquear o login sem excluir o cadastro)</span>
            </label>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          <button
            type="submit"
            className="rounded-md bg-fluxo-500 px-4 py-2 text-sm font-medium text-white hover:bg-fluxo-600"
          >
            Salvar alterações
          </button>
          <Link
            href={`/admin/clientes/${client.id}?aba=contatos`}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Voltar
          </Link>
        </div>
      </form>

      {/* Metadados + remover */}
      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-600">Informações</h2>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-slate-500">Cadastrado em</dt>
          <dd className="text-slate-900">{formatDate(user.createdAt)}</dd>
          <dt className="text-slate-500">Último acesso</dt>
          <dd className="text-slate-900">{user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Nunca acessou'}</dd>
          <dt className="text-slate-500">Chamados abertos</dt>
          <dd className="text-slate-900">{ticketCount}</dd>
        </dl>
      </div>

      <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-5">
        <h2 className="text-sm font-semibold text-red-900">Zona de risco</h2>
        <p className="mt-1 text-xs text-red-800">
          Remover o contato impede o login no portal. Os chamados dele continuam no histórico.
        </p>
        <form
          action={deleteClientContactAction}
          className="mt-3"
        >
          <input type="hidden" name="userId" value={user.id} />
          <input type="hidden" name="clientId" value={client.id} />
          <button
            type="submit"
            className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100"
          >
            Remover contato
          </button>
        </form>
      </div>
    </div>
  );
}
