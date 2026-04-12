import Link from 'next/link';
import { db } from '@/lib/db';
import { formatDate } from '@/lib/utils';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { createClientAction } from '@/server/actions/clients';

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: { q?: string; novo?: string };
}) {
  const session = await auth();
  const user = session?.user as any;

  const clients = await db.client.findMany({
    where: {
      deletedAt: null,
      ...(searchParams.q && {
        OR: [
          { name: { contains: searchParams.q, mode: 'insensitive' } },
          { cnpj: { contains: searchParams.q } },
          { email: { contains: searchParams.q, mode: 'insensitive' } },
        ],
      }),
    },
    include: {
      _count: {
        select: {
          tickets: { where: { deletedAt: null, status: { in: ['NEW', 'OPEN', 'IN_PROGRESS'] } } },
          equipment: { where: { deletedAt: null } },
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  const showForm = searchParams.novo === '1';

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clientes</h1>
          <p className="mt-1 text-sm text-slate-600">{clients.length} cliente(s) cadastrado(s)</p>
        </div>
        <Link
          href="/admin/clientes?novo=1"
          className="rounded-md bg-fluxo-500 px-4 py-2 text-sm font-medium text-white hover:bg-fluxo-600"
        >
          + Novo cliente
        </Link>
      </div>

      {/* Formulário de cadastro */}
      {showForm && (
        <form
          action={createClientAction}
          className="mt-6 rounded-lg border border-fluxo-200 bg-fluxo-50 p-6"
        >
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Cadastrar novo cliente</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">Nome / Fantasia *</label>
              <input
                name="name"
                required
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Razão Social</label>
              <input
                name="legalName"
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">CNPJ</label>
              <input
                name="cnpj"
                placeholder="00.000.000/0001-00"
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Email</label>
              <input
                name="email"
                type="email"
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Telefone</label>
              <input
                name="phone"
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Endereço</label>
              <input
                name="address"
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              className="rounded-md bg-fluxo-500 px-4 py-2 text-sm font-medium text-white hover:bg-fluxo-600"
            >
              Salvar cliente
            </button>
            <Link
              href="/admin/clientes"
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </Link>
          </div>
        </form>
      )}

      {/* Busca */}
      <form method="GET" className="mt-6 flex gap-3">
        <input
          type="text"
          name="q"
          defaultValue={searchParams.q}
          placeholder="Buscar por nome, CNPJ ou email..."
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
        />
        <button
          type="submit"
          className="rounded-md bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Buscar
        </button>
        {searchParams.q && (
          <Link
            href="/admin/clientes"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Limpar
          </Link>
        )}
      </form>

      {/* Lista */}
      <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-[700px] divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Cliente</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">CNPJ</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Contato</th>
              <th className="px-4 py-3 text-center font-medium text-slate-600">Chamados abertos</th>
              <th className="px-4 py-3 text-center font-medium text-slate-600">Equipamentos</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Cadastro</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {clients.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  Nenhum cliente encontrado.{' '}
                  <Link href="/admin/clientes?novo=1" className="text-fluxo-500 hover:underline">
                    Cadastre o primeiro.
                  </Link>
                </td>
              </tr>
            )}
            {clients.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">{c.name}</div>
                  {c.legalName && <div className="text-xs text-slate-500">{c.legalName}</div>}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-600">{c.cnpj ?? '—'}</td>
                <td className="px-4 py-3 text-slate-700">
                  <div>{c.email ?? '—'}</div>
                  {c.phone && <div className="text-xs text-slate-500">{c.phone}</div>}
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      c._count.tickets > 0
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {c._count.tickets}
                  </span>
                </td>
                <td className="px-4 py-3 text-center text-slate-700">{c._count.equipment}</td>
                <td className="px-4 py-3 text-slate-500">{formatDate(c.createdAt)}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/clientes/${c.id}`}
                    className="text-sm text-fluxo-500 hover:text-fluxo-700"
                  >
                    Ver →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
