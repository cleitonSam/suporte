import Link from 'next/link';
import { db } from '@/lib/db';
import { createTicketByAgentAction } from '@/server/actions/ticket-admin';

export default async function NovoChamadoAdminPage() {
  const [clients, categories, agents, queues] = await Promise.all([
    db.client.findMany({
      where: { deletedAt: null, status: 'ACTIVE' },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    db.ticketCategory.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }),
    db.user.findMany({ where: { userType: 'AGENT', isActive: true, deletedAt: null }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    db.queue.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center gap-2 text-sm text-slate-600">
        <Link href="/admin/chamados" className="hover:text-fluxo-500">Chamados</Link>
        <span>/</span>
        <span className="font-medium text-slate-900">Abrir chamado</span>
      </div>

      <h1 className="text-2xl font-bold text-slate-900">Abrir chamado manualmente</h1>
      <p className="mt-1 text-sm text-slate-600">
        Cria um chamado em nome de um cliente diretamente pelo painel do agente.
      </p>

      <form action={createTicketByAgentAction} className="mt-6 space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700">Título *</label>
            <input name="title" required minLength={5} maxLength={200}
              placeholder="Descreva o problema brevemente"
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500" />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700">Descrição *</label>
            <textarea name="description" required minLength={10} rows={5}
              placeholder="Detalhe o problema, ambiente, erro apresentado..."
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Cliente *</label>
            <select name="clientId" required
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500">
              <option value="">— Selecione o cliente —</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Categoria</label>
            <select name="categoryId"
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500">
              <option value="">— Nenhuma —</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Prioridade</label>
            <select name="priority" defaultValue="MEDIUM"
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500">
              <option value="LOW">Baixa</option>
              <option value="MEDIUM">Média</option>
              <option value="HIGH">Alta</option>
              <option value="URGENT">Urgente</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Fila</label>
            <select name="queueId"
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500">
              <option value="">— Padrão (Geral) —</option>
              {queues.map((q) => <option key={q.id} value={q.id}>{q.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Atribuir a</label>
            <select name="assignedToId"
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500">
              <option value="">— Sem atribuição —</option>
              {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button type="submit" className="rounded-md bg-fluxo-500 px-4 py-2 text-sm font-medium text-white hover:bg-fluxo-600">
            Abrir chamado
          </button>
          <Link href="/admin/chamados" className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
