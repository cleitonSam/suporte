import Link from 'next/link';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { createTemplateAction, deleteTemplateAction } from '@/server/actions/templates';
import { Plus, Pencil, Trash2, CheckCircle2 } from 'lucide-react';

interface PageProps {
  searchParams: { saved?: string; removed?: string; error?: string; novo?: string };
}

export default async function TemplatesPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user || session.user.userType !== 'AGENT') return null;

  const templates = await db.responseTemplate.findMany({
    where: {
      OR: [{ authorId: null }, { authorId: session.user.id }],
    },
    include: { author: { select: { id: true, name: true } } },
    orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
  });

  const isCreating = searchParams.novo === '1';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Templates de resposta</h1>
          <p className="text-sm text-slate-500">
            Respostas prontas para reutilizar nos chamados.
          </p>
        </div>
        {!isCreating && (
          <Link
            href="/admin/templates?novo=1"
            className="inline-flex items-center gap-1.5 rounded-md bg-fluxo-500 px-3 py-2 text-sm font-semibold text-white shadow-fluxo hover:bg-fluxo-600"
          >
            <Plus className="h-4 w-4" /> Novo template
          </Link>
        )}
      </div>

      {searchParams.saved === '1' && (
        <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4" /> Template salvo.
        </div>
      )}
      {searchParams.removed === '1' && (
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Template removido.
        </div>
      )}
      {searchParams.error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          Erro ao salvar. Verifique os campos.
        </div>
      )}

      {isCreating && (
        <form
          action={createTemplateAction}
          className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 className="text-sm font-semibold text-slate-900">Novo template</h2>
          <div>
            <label className="block text-xs font-medium text-slate-700">Título</label>
            <input
              name="title"
              required
              minLength={2}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Ex: Solicitação de informações adicionais"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700">Corpo</label>
            <textarea
              name="body"
              required
              rows={6}
              minLength={2}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm"
              placeholder="Olá {{nome}}, podemos confirmar..."
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Você pode usar texto livre. Variáveis como {'{{nome}}'} são substituídas na inserção.
            </p>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              className="rounded-md bg-fluxo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-fluxo-600"
            >
              Criar
            </button>
            <Link
              href="/admin/templates"
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              Cancelar
            </Link>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {templates.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Nenhum template cadastrado ainda.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {templates.map((t) => (
              <li key={t.id} className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">{t.title}</h3>
                    {!t.isActive && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                        inativo
                      </span>
                    )}
                    {t.authorId === null && (
                      <span className="rounded-full bg-fluxo-50 px-2 py-0.5 text-[10px] text-fluxo-700">
                        global
                      </span>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-xs text-slate-500">
                    {t.body}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Link
                    href={`/admin/templates/${t.id}`}
                    className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    title="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </Link>
                  <form action={deleteTemplateAction}>
                    <input type="hidden" name="id" value={t.id} />
                    <button
                      type="submit"
                      className="rounded-md p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
