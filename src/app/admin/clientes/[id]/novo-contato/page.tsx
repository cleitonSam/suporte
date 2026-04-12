import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { createClientContactAction } from '@/server/actions/users';

export default async function NovoContatoPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string };
}) {
  const client = await db.client.findFirst({
    where: { id: params.id, deletedAt: null },
    select: { id: true, name: true },
  });
  if (!client) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center gap-2 text-sm text-slate-600">
        <Link href="/admin/clientes" className="hover:text-fluxo-500">Clientes</Link>
        <span>/</span>
        <Link href={`/admin/clientes/${client.id}?aba=contatos`} className="hover:text-fluxo-500">{client.name}</Link>
        <span>/</span>
        <span className="font-medium text-slate-900">Novo contato</span>
      </div>

      <h1 className="text-2xl font-bold text-slate-900">Novo contato</h1>
      <p className="mt-1 text-sm text-slate-600">
        Crie um acesso ao portal para um funcionário de <strong>{client.name}</strong>.
      </p>

      {searchParams.error === 'validation' && (
        <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
          ⚠ Preencha os campos obrigatórios (nome e email).
        </div>
      )}
      {searchParams.error === 'email_exists' && (
        <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
          ⚠ Já existe um usuário cadastrado com esse email.
        </div>
      )}

      <form
        action={createClientContactAction}
        className="mt-6 space-y-5 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        <input type="hidden" name="clientId" value={client.id} />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700">Nome completo *</label>
            <input
              name="name" required
              placeholder="Ex: Maria Silva"
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Email *</label>
            <input
              name="email" type="email" required
              placeholder="maria@empresa.com.br"
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
            />
            <p className="mt-1 text-xs text-slate-500">O convite será enviado para este endereço.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Telefone</label>
            <input
              name="phone"
              placeholder="(11) 99999-9999"
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700">
              Senha inicial <span className="font-normal text-slate-500">(opcional)</span>
            </label>
            <input
              name="password" type="text" minLength={8}
              placeholder="Deixe em branco para gerar automaticamente"
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono shadow-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
            />
            <p className="mt-1 text-xs text-slate-500">
              Se deixar em branco, o sistema gera uma senha aleatória de 10 caracteres e envia por email.
            </p>
          </div>
        </div>

        {/* Bloco de envio de convite */}
        <div className="rounded-md border border-fluxo-200 bg-fluxo-50 p-4">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              name="sendInvite"
              defaultChecked
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-fluxo-500 focus:ring-fluxo-500"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm font-semibold text-fluxo-800">
                ✉ Enviar convite por email
              </div>
              <p className="mt-1 text-xs text-fluxo-700">
                O contato receberá um email com o link do portal, email de acesso e senha.
                Desmarque apenas se você prefere repassar as credenciais manualmente.
              </p>
            </div>
          </label>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="submit"
            className="rounded-md bg-fluxo-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-fluxo-600"
          >
            Criar e enviar convite
          </button>
          <Link
            href={`/admin/clientes/${client.id}?aba=contatos`}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
