import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { updateEquipmentAction } from '@/server/actions/equipment';
import { EquipmentForm } from '@/components/equipment-form';

interface PageProps {
  params: { id: string; equipmentId: string };
}

export default async function EditarEquipamentoPage({ params }: PageProps) {
  const [client, equipment, categories] = await Promise.all([
    db.client.findFirst({
      where: { id: params.id, deletedAt: null },
      select: { id: true, name: true },
    }),
    db.equipment.findFirst({
      where: { id: params.equipmentId, deletedAt: null, clientId: params.id },
    }),
    db.equipmentCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    }),
  ]);

  if (!client || !equipment) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
        <Link href="/admin/clientes" className="hover:text-fluxo-500">Clientes</Link>
        <span aria-hidden="true">/</span>
        <Link
          href={`/admin/clientes/${client.id}?aba=equipamentos`}
          className="hover:text-fluxo-500"
        >
          {client.name}
        </Link>
        <span aria-hidden="true">/</span>
        <span className="font-medium text-slate-900 dark:text-white">Editar equipamento</span>
      </div>

      <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
        Editar equipamento
      </h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Atualizando <strong>{equipment.name}</strong>.
      </p>

      <div className="mt-6">
        <EquipmentForm
          action={updateEquipmentAction}
          clientId={client.id}
          categories={categories}
          defaults={equipment}
          cancelHref={`/admin/clientes/${client.id}?aba=equipamentos`}
          submitLabel="Salvar alterações"
        />
      </div>
    </div>
  );
}
