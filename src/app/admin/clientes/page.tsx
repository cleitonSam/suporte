import Link from 'next/link';
import { Building2, Search } from 'lucide-react';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { createClientAction } from '@/server/actions/clients';
import { formatDate } from '@/lib/utils';
import { formatCnpj } from '@/lib/cnpj';
import { CnpjInput } from '@/components/cnpj-input';
import { SubmitButton } from '@/components/submit-button';
import { ClientStatusDot } from '@/components/ui/status-dot';
import type { ClientStatus, Prisma } from '@prisma/client';

function buildQs(curr: Record<string, string | undefined>, override: Record<string, string | null>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...curr, ...override })) {
    if (v) params.set(k, v);
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; novo?: string };
}) {
  const session = await auth();
  if (!session?.user) return null;

  const statusFilter =
    searchParams.status && ['ACTIVE', 'SUSPENDED', 'INACTIVE'].includes(searchParams.status)
      ? (searchParams.status as ClientStatus)
      : undefined;

  const where: Prisma.ClientWhereInput = {
    deletedAt: null,
    ...(statusFilter && { status: statusFilter }),
    ...(searchParams.q && {
      OR: [
        { name: { contains: searchParams.q, mode: 'insensitive' } },
        { legalName: { contains: searchParams.q, mode: 'insensitive' } },
        { cnpj: { contains: searchParams.q.replace(/\D/g, '') } },
        { email: { contains: searchParams.q, mode: 'insensitive' } },
      ],
    }),
  };

  const [clients, statusCounts] = await Promise.all([
    db.client.findMany({
      where,
      include: {
        _count: {
          select: {
            tickets: {
              where: { deletedAt: null, status: { in: ['NEW', 'OPEN', 'IN_PROGRESS'] } },
            },
            equipment: { where: { deletedAt: null } },
          },
        },
      },
      orderBy: { name: 'asc' },
    }),
    db.client.groupBy({
      by: ['status'],
      where: { deletedAt: null },
      _count: { id: true },
    }),
  ]);

  const counts: Record<string, number> = { ACTIVE: 0, SUSPENDED: 0, INACTIVE: 0 };
  for (const c of statusCounts) counts[c.status] = c._count.id;
  const totalAll = counts.ACTIVE + counts.SUSPENDED + counts.INACTIVE;

  const showForm = searchParams.novo === '1';

  const chips: Array<{ key: ClientStatus | ''; label: string; count: number }> = [
    { key: '',          label: 'Todos',     count: totalAll },
    { key: 'ACTIVE',    label: 'Ativos',    count: counts.ACTIVE },
    { key: 'SUSPENDED', label: 'Suspensos', count: counts.SUSPENDED },
    { key: 'INACTIVE',  label: 'Inativos',  count: counts.INACTIVE },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fluxo-600 dark:text-cyan-400">
            Carteira
          </p>
          <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white">Clientes</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {clients.length} resultado{clients.length === 1 ? '' : 's'} · {totalAll} cliente{totalAll === 1 ? '' : 's'} no total
          </p>
        </div>
        <Link
          href="/admin/clientes?novo=1"
          className="inline-flex items-center gap-1.5 rounded-md bg-fluxo-500 px-4 py-2 text-sm font-semibold text-white shadow-fluxo transition hover:bg-fluxo-600"
        >
          + Novo cliente
        </Link>
      </div>

      {/* Formulário de cadastro */}
      {showForm && (
        <form
          action={createClientAction}
          className="rounded-xl border border-fluxo-200 bg-fluxo-50/60 p-6 dark:border-fluxo-800/60 dark:bg-fluxo-900/30"
        >
          <h2 className="mb-4 font-display text-lg font-semibold text-slate-900 dark:text-white">
            Cadastrar novo cliente
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="client-name" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Nome / Fantasia *
              </label>
              <input
                id="client-name"
                name="name"
                required
                minLength={2}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
              />
            </div>
            <div>
              <label htmlFor="client-legal" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Razão Social
              </label>
              <input
                id="client-legal"
                name="legalName"
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
              />
            </div>
            <div>
              <label htmlFor="client-cnpj" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                CNPJ
              </label>
              <CnpjInput id="client-cnpj" name="cnpj" />
            </div>
            <div>
              <label htmlFor="client-email" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Email
              </label>
              <input
                id="client-email"
                name="email"
                type="email"
                autoComplete="email"
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
              />
            </div>
            <div>
              <label htmlFor="client-phone" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Telefone
              </label>
              <input
                id="client-phone"
                name="phone"
                autoComplete="tel"
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
              />
            </div>
            <div>
              <label htmlFor="client-address" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Endereço
              </label>
              <input
                id="client-address"
                name="address"
                autoComplete="street-address"
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
              />
            </div>
          </div>
          <div className="mt-5 flex gap-2">
            <SubmitButton pendingText="Salvando...">Salvar cliente</SubmitButton>
            <Link
              href="/admin/clientes"
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
            >
              Cancelar
            </Link>
          </div>
        </form>
      )}

      {/* Chips de status + busca */}
      <div className="flex flex-wrap items-center gap-2">
        {chips.map((c) => {
          const active = (searchParams.status ?? '') === c.key;
          return (
            <Link
              key={c.key || 'all'}
              href={`/admin/clientes${buildQs(searchParams, { status: c.key || null, novo: null })}`}
              className={
                active
                  ? 'inline-flex items-center gap-2 rounded-full bg-fluxo-500 px-3.5 py-1 text-sm font-semibold text-white shadow-fluxo'
                  : 'inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1 text-sm font-medium text-slate-700 transition-colors hover:border-fluxo-300 hover:text-fluxo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }
            >
              {c.label}
              <span
                className={
                  active
                    ? 'inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-white/20 px-1.5 text-[10px] font-bold tabular-nums'
                    : 'inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-slate-100 px-1.5 text-[10px] font-bold tabular-nums text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                }
              >
                {c.count}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Busca */}
      <form method="GET" className="flex gap-2">
        {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
        <div className="relative flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          />
          <label htmlFor="cli-q" className="sr-only">Buscar cliente</label>
          <input
            id="cli-q"
            type="text"
            name="q"
            defaultValue={searchParams.q}
            placeholder="Nome, razão social, CNPJ ou email..."
            className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 pl-8 text-sm shadow-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900"
        >
          Buscar
        </button>
        {searchParams.q && (
          <Link
            href={`/admin/clientes${statusFilter ? `?status=${statusFilter}` : ''}`}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Limpar
          </Link>
        )}
      </form>

      {/* Lista */}
      {clients.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm dark:border-slate-600 dark:bg-slate-800">
          <Building2 className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
          <p className="mt-3 text-sm text-slate-500">
            Nenhum cliente encontrado.{' '}
            {!searchParams.q && !searchParams.status && (
              <Link href="/admin/clientes?novo=1" className="text-fluxo-500 hover:underline">
                Cadastre o primeiro.
              </Link>
            )}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
              <thead className="bg-slate-50/60 dark:bg-slate-800/60">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Cliente</th>
                  <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">CNPJ</th>
                  <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Contato</th>
                  <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Status</th>
                  <th scope="col" className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">Chamados abertos</th>
                  <th scope="col" className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">Equipamentos</th>
                  <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Cadastro</th>
                  <th scope="col" className="px-4 py-3" aria-hidden="true" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {clients.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-fluxo-50/40 dark:hover:bg-slate-700/40">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/clientes/${c.id}`}
                        className="font-medium text-slate-900 transition-colors hover:text-fluxo-600 dark:text-slate-100 dark:hover:text-cyan-400"
                      >
                        {c.name}
                      </Link>
                      {c.legalName && (
                        <div className="text-xs text-slate-500">{c.legalName}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">
                      {c.cnpj ? formatCnpj(c.cnpj) : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                      <div>{c.email ?? '—'}</div>
                      {c.phone && <div className="text-xs text-slate-500">{c.phone}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <ClientStatusDot status={c.status} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full px-2 text-xs font-semibold tabular-nums ${
                          c._count.tickets > 0
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {c._count.tickets}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums text-slate-700 dark:text-slate-300">
                      {c._count.equipment}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatDate(c.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/clientes/${c.id}`}
                        aria-label={`Ver detalhes de ${c.name}`}
                        className="text-sm font-medium text-fluxo-600 transition-colors hover:text-fluxo-700 dark:text-cyan-400 dark:hover:text-cyan-300"
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
      )}
    </div>
  );
}
