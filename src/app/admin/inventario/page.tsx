import Link from 'next/link';
import { Pencil, Trash2, Package, Search } from 'lucide-react';
import { db } from '@/lib/db';
import { deleteEquipmentAction } from '@/server/actions/equipment';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { WarrantyBadge } from '@/components/warranty-badge';
import { EquipmentStatusSelect } from '@/components/equipment-status-select';
import type { EquipmentStatus, Prisma } from '@prisma/client';

const PER_PAGE = 25;

type WarrantyFilter = 'expired' | 'expiring' | 'ok' | 'none';

function buildQs(current: Record<string, string | undefined>, override: Record<string, string | null>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...current, ...override })) {
    if (v) params.set(k, v);
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export default async function InventarioPage({
  searchParams,
}: {
  searchParams: {
    q?: string;
    clientId?: string;
    categoryId?: string;
    status?: string;
    warranty?: string;
    page?: string;
  };
}) {
  const page = Math.max(1, Number(searchParams.page ?? '1') || 1);
  const skip = (page - 1) * PER_PAGE;

  const now = new Date();
  const in30Days = new Date(now);
  in30Days.setDate(in30Days.getDate() + 30);

  const warranty = searchParams.warranty as WarrantyFilter | undefined;
  const warrantyWhere: Prisma.EquipmentWhereInput =
    warranty === 'expired'
      ? { warrantyExpiresAt: { lt: now } }
      : warranty === 'expiring'
        ? { warrantyExpiresAt: { gte: now, lte: in30Days } }
        : warranty === 'ok'
          ? { warrantyExpiresAt: { gt: in30Days } }
          : warranty === 'none'
            ? { warrantyExpiresAt: null }
            : {};

  const where: Prisma.EquipmentWhereInput = {
    deletedAt: null,
    ...(searchParams.clientId && { clientId: searchParams.clientId }),
    ...(searchParams.categoryId && { categoryId: searchParams.categoryId }),
    ...(searchParams.status && { status: searchParams.status as EquipmentStatus }),
    ...warrantyWhere,
    ...(searchParams.q && {
      OR: [
        { name: { contains: searchParams.q, mode: 'insensitive' } },
        { serialNumber: { contains: searchParams.q, mode: 'insensitive' } },
        { patrimony: { contains: searchParams.q, mode: 'insensitive' } },
        { model: { contains: searchParams.q, mode: 'insensitive' } },
        { ipAddress: { contains: searchParams.q } },
      ],
    }),
  };

  const [clients, categories, equipment, total, expiredCount, expiringCount] = await Promise.all([
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
      where,
      include: {
        client: { select: { id: true, name: true } },
        category: { select: { name: true } },
      },
      orderBy: [{ client: { name: 'asc' } }, { name: 'asc' }],
      skip,
      take: PER_PAGE,
    }),
    db.equipment.count({ where }),
    db.equipment.count({
      where: { deletedAt: null, warrantyExpiresAt: { lt: now } },
    }),
    db.equipment.count({
      where: { deletedAt: null, warrantyExpiresAt: { gte: now, lte: in30Days } },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const hasFilters = Boolean(
    searchParams.q ||
      searchParams.clientId ||
      searchParams.categoryId ||
      searchParams.status ||
      searchParams.warranty,
  );

  const warrantyChips: Array<{ key: WarrantyFilter | ''; label: string; count?: number; tone: string }> = [
    { key: '',          label: 'Todas',                  tone: 'border-slate-200 bg-white text-slate-700' },
    { key: 'expired',   label: `Expiradas (${expiredCount})`,   tone: 'border-rose-200 bg-rose-50 text-rose-700' },
    { key: 'expiring',  label: `Vencendo (${expiringCount})`,   tone: 'border-amber-200 bg-amber-50 text-amber-700' },
    { key: 'ok',        label: 'No prazo',               tone: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
    { key: 'none',      label: 'Sem garantia',           tone: 'border-slate-200 bg-slate-50 text-slate-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fluxo-600 dark:text-cyan-400">
            Inventário
          </p>
          <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white">
            Equipamentos
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {total} equipamento{total === 1 ? '' : 's'} no total · página {page} de {totalPages}
          </p>
        </div>
        {(expiredCount > 0 || expiringCount > 0) && (
          <div className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <Package className="h-4 w-4" aria-hidden="true" />
            <span>
              {expiredCount > 0 && <strong>{expiredCount}</strong>}
              {expiredCount > 0 && ' garantia(s) expirada(s)'}
              {expiredCount > 0 && expiringCount > 0 && ' · '}
              {expiringCount > 0 && <strong>{expiringCount}</strong>}
              {expiringCount > 0 && ' vence(m) em 30 dias'}
            </span>
          </div>
        )}
      </div>

      {/* Filtros */}
      <form
        method="GET"
        className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-5 dark:border-slate-700 dark:bg-slate-800"
      >
        <div className="lg:col-span-2">
          <label htmlFor="inv-q" className="block text-xs font-medium text-slate-600 dark:text-slate-400">
            Buscar
          </label>
          <div className="relative mt-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            />
            <input
              id="inv-q"
              type="text"
              name="q"
              defaultValue={searchParams.q}
              placeholder="Nome, serial, IP, modelo..."
              className="block w-full rounded-md border border-slate-300 px-3 py-2 pl-8 text-sm shadow-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
            />
          </div>
        </div>
        <div>
          <label htmlFor="inv-client" className="block text-xs font-medium text-slate-600 dark:text-slate-400">
            Cliente
          </label>
          <select
            id="inv-client"
            name="clientId"
            defaultValue={searchParams.clientId ?? ''}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
          >
            <option value="">Todos</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="inv-category" className="block text-xs font-medium text-slate-600 dark:text-slate-400">
            Categoria
          </label>
          <select
            id="inv-category"
            name="categoryId"
            defaultValue={searchParams.categoryId ?? ''}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
          >
            <option value="">Todas</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="inv-status" className="block text-xs font-medium text-slate-600 dark:text-slate-400">
            Status
          </label>
          <select
            id="inv-status"
            name="status"
            defaultValue={searchParams.status ?? ''}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
          >
            <option value="">Todos</option>
            <option value="ACTIVE">Ativo</option>
            <option value="IN_REPAIR">Em reparo</option>
            <option value="RETIRED">Desativado</option>
          </select>
        </div>

        {/* Chips de garantia */}
        <div className="col-span-full flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Garantia:</span>
          {warrantyChips.map((c) => {
            const active = (searchParams.warranty ?? '') === c.key;
            return (
              <Link
                key={c.key || 'all'}
                href={`/admin/inventario${buildQs(searchParams, { warranty: c.key || null, page: null })}`}
                className={`inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-medium transition-colors ${
                  active
                    ? 'border-fluxo-500 bg-fluxo-500 text-white'
                    : c.tone + ' hover:border-fluxo-300'
                }`}
              >
                {c.label}
              </Link>
            );
          })}
        </div>

        <div className="col-span-full flex flex-wrap items-center justify-end gap-2 pt-1">
          {hasFilters && (
            <Link
              href="/admin/inventario"
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Limpar
            </Link>
          )}
          <button
            type="submit"
            className="rounded-md bg-fluxo-500 px-4 py-1.5 text-sm font-medium text-white shadow-fluxo hover:bg-fluxo-600"
          >
            Filtrar
          </button>
        </div>
      </form>

      {/* Lista */}
      {equipment.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm dark:border-slate-600 dark:bg-slate-800">
          <Package className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
          <p className="mt-3 text-sm text-slate-500">
            Nenhum equipamento encontrado com esses filtros.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
              <thead className="bg-slate-50/60 dark:bg-slate-800/60">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Equipamento</th>
                  <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Cliente</th>
                  <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Categoria</th>
                  <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Serial / Patr.</th>
                  <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">IP</th>
                  <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Garantia</th>
                  <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Status</th>
                  <th scope="col" className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {equipment.map((e) => (
                  <tr key={e.id} className="transition-colors hover:bg-fluxo-50/40 dark:hover:bg-slate-700/40">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900 dark:text-slate-100">{e.name}</div>
                      {(e.brand || e.model) && (
                        <div className="text-xs text-slate-500">
                          {[e.brand, e.model].filter(Boolean).join(' ')}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/clientes/${e.client.id}?aba=equipamentos`}
                        className="text-fluxo-600 hover:underline dark:text-cyan-400"
                      >
                        {e.client.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{e.category.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">
                      {e.serialNumber && <div>S/N: {e.serialNumber}</div>}
                      {e.patrimony && <div>Pat: {e.patrimony}</div>}
                      {!e.serialNumber && !e.patrimony && '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">
                      {e.ipAddress ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <WarrantyBadge expiresAt={e.warrantyExpiresAt} />
                    </td>
                    <td className="px-4 py-3">
                      <EquipmentStatusSelect
                        equipmentId={e.id}
                        current={e.status}
                        returnTo={`/admin/inventario${buildQs(searchParams, {})}`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/admin/clientes/${e.client.id}/equipamentos/${e.id}/editar`}
                          aria-label={`Editar ${e.name}`}
                          title="Editar"
                          className="rounded-md border border-slate-200 p-1.5 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        </Link>
                        <ConfirmDialog
                          title="Remover equipamento"
                          description={
                            <>
                              O equipamento <strong>{e.name}</strong> será removido do inventário
                              do cliente <strong>{e.client.name}</strong>.
                            </>
                          }
                          confirmLabel="Remover"
                          destructive
                          action={deleteEquipmentAction}
                          hiddenFields={{
                            id: e.id,
                            returnTo: `/admin/inventario${buildQs(searchParams, {})}`,
                          }}
                        >
                          <button
                            type="button"
                            aria-label={`Remover ${e.name}`}
                            title="Remover"
                            className="rounded-md border border-rose-200 p-1.5 text-rose-600 transition-colors hover:bg-rose-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </ConfirmDialog>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Paginação */}
      {total > PER_PAGE && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500 dark:text-slate-400">
            Mostrando {skip + 1}–{Math.min(skip + PER_PAGE, total)} de {total}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/admin/inventario${buildQs(searchParams, { page: String(page - 1) })}`}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
              >
                ← Anterior
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/admin/inventario${buildQs(searchParams, { page: String(page + 1) })}`}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
              >
                Próxima →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
