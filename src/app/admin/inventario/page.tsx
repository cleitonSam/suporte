import Link from 'next/link';
import { db } from '@/lib/db';
import { formatDate } from '@/lib/utils';

export default async function InventarioPage({
  searchParams,
}: {
  searchParams: { q?: string; clientId?: string; categoryId?: string; status?: string };
}) {
  const [clients, categories, equipment] = await Promise.all([
    db.client.findMany({
      where: { deletedAt: null, status: 'ACTIVE' },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    db.equipmentCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    }),
    db.equipment.findMany({
      where: {
        deletedAt: null,
        ...(searchParams.clientId && { clientId: searchParams.clientId }),
        ...(searchParams.categoryId && { categoryId: searchParams.categoryId }),
        ...(searchParams.status && { status: searchParams.status as any }),
        ...(searchParams.q && {
          OR: [
            { name: { contains: searchParams.q, mode: 'insensitive' } },
            { serialNumber: { contains: searchParams.q, mode: 'insensitive' } },
            { patrimony: { contains: searchParams.q, mode: 'insensitive' } },
            { model: { contains: searchParams.q, mode: 'insensitive' } },
            { ipAddress: { contains: searchParams.q } },
          ],
        }),
      },
      include: {
        client: { select: { id: true, name: true } },
        category: { select: { name: true } },
      },
      orderBy: [{ client: { name: 'asc' } }, { name: 'asc' }],
    }),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventário de Equipamentos</h1>
          <p className="mt-1 text-sm text-slate-600">{equipment.length} equipamento(s) encontrado(s)</p>
        </div>
      </div>

      {/* Filtros */}
      <form method="GET" className="mt-6 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-medium text-slate-600">Buscar</label>
          <input
            type="text" name="q" defaultValue={searchParams.q}
            placeholder="Nome, serial, IP, modelo..."
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Cliente</label>
          <select name="clientId" defaultValue={searchParams.clientId ?? ''}
            className="mt-1 block rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm">
            <option value="">Todos</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Categoria</label>
          <select name="categoryId" defaultValue={searchParams.categoryId ?? ''}
            className="mt-1 block rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm">
            <option value="">Todas</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Status</label>
          <select name="status" defaultValue={searchParams.status ?? ''}
            className="mt-1 block rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm">
            <option value="">Todos</option>
            <option value="ACTIVE">Ativo</option>
            <option value="IN_REPAIR">Em reparo</option>
            <option value="RETIRED">Desativado</option>
          </select>
        </div>
        <button type="submit" className="rounded-md bg-fluxo-500 px-4 py-2 text-sm font-medium text-white hover:bg-fluxo-600">
          Filtrar
        </button>
        {(searchParams.q || searchParams.clientId || searchParams.categoryId || searchParams.status) && (
          <Link href="/admin/inventario" className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Limpar
          </Link>
        )}
      </form>

      {/* Tabela */}
      <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-[700px] divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-slate-600">Equipamento</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600">Cliente</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600">Categoria</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600">Serial / Patrimônio</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600">IP</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600">Localização</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600">Garantia</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {equipment.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                  Nenhum equipamento encontrado. Cadastre equipamentos na aba de cada cliente.
                </td>
              </tr>
            )}
            {equipment.map((e) => (
              <tr key={e.id} className="hover:bg-slate-50">
                <td className="px-4 py-2">
                  <div className="font-medium text-slate-900">{e.name}</div>
                  {(e.brand || e.model) && (
                    <div className="text-xs text-slate-500">{[e.brand, e.model].filter(Boolean).join(' ')}</div>
                  )}
                </td>
                <td className="px-4 py-2">
                  <Link href={`/admin/clientes/${e.client.id}?aba=equipamentos`}
                    className="text-fluxo-500 hover:underline">
                    {e.client.name}
                  </Link>
                </td>
                <td className="px-4 py-2 text-slate-700">{e.category.name}</td>
                <td className="px-4 py-2 font-mono text-xs text-slate-600">
                  {e.serialNumber && <div>S/N: {e.serialNumber}</div>}
                  {e.patrimony && <div>Pat: {e.patrimony}</div>}
                  {!e.serialNumber && !e.patrimony && '—'}
                </td>
                <td className="px-4 py-2 font-mono text-xs text-slate-600">{e.ipAddress ?? '—'}</td>
                <td className="px-4 py-2 text-slate-700">{e.location ?? '—'}</td>
                <td className="px-4 py-2 text-slate-700">
                  {e.warrantyExpiresAt ? (
                    <span className={new Date(e.warrantyExpiresAt) < new Date() ? 'text-red-600 font-medium' : 'text-emerald-700'}>
                      {new Intl.DateTimeFormat('pt-BR').format(new Date(e.warrantyExpiresAt))}
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
  );
}
