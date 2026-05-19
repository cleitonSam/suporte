import Link from 'next/link';
import { Plus, Pencil, Trash2, FileText } from 'lucide-react';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { createTemplateAction, deleteTemplateAction } from '@/server/actions/templates';
import { SubmitButton } from '@/components/submit-button';
import { StatusDot } from '@/components/ui/status-dot';
import { ConfirmDialog } from '@/components/confirm-dialog';

interface PageProps {
  searchParams: { saved?: string; removed?: string; error?: string; novo?: string };
}

export default async function TemplatesPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user || session.user.userType !== 'AGENT') return null;

  const templates = await db.responseTemplate.findMany({
    where: {
      deletedAt: null,
      OR: [{ authorId: null }, { authorId: session.user.id }],
    },
    include: { author: { select: { id: true, name: true } } },
    orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
  });

  const isCreating = searchParams.novo === '1';
  const activeCount = templates.filter((t) => t.isActive).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="micro-label-accent">Resposta · pronta</p>
          <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white">
            Templates
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            <span className="font-mono-tech">{activeCount}</span> ativos de{' '}
            <span className="font-mono-tech">{templates.length}</span> · respostas prontas pra reutilizar nos chamados.
          </p>
        </div>
        {!isCreating && (
          <Link
            href="/admin/templates?novo=1"
            className="inline-flex items-center gap-1.5 rounded-md bg-fluxo-500 px-4 py-2 text-sm font-semibold text-white shadow-fluxo hover:bg-fluxo-600"
          >
            <Plus className="h-4 w-4" aria-hidden="true" /> Novo template
          </Link>
        )}
      </div>

      {isCreating && (
        <form
          action={createTemplateAction}
          className="space-y-3 rounded-lg border border-slate-200 bg-white p-5 shadow-elevate dark:border-slate-700 dark:bg-slate-800"
        >
          <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
            Novo template
          </h2>
          <div>
            <label htmlFor="tpl-title" className="micro-label">Título *</label>
            <input
              id="tpl-title"
              name="title"
              required
              minLength={2}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-elevate focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
              placeholder="Ex: Solicitação de informações adicionais"
            />
          </div>
          <div>
            <label htmlFor="tpl-body" className="micro-label">Corpo *</label>
            <textarea
              id="tpl-body"
              name="body"
              required
              rows={6}
              minLength={2}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 font-mono-tech text-sm shadow-elevate focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
              placeholder={'Olá {{nome}}, podemos confirmar...'}
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Variáveis como <code className="font-mono-tech rounded bg-slate-100 px-1 dark:bg-slate-700">{'{{nome}}'}</code> são substituídas na inserção.
            </p>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <SubmitButton pendingText="Criando...">Criar template</SubmitButton>
            <Link
              href="/admin/templates"
              className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400"
            >
              Cancelar
            </Link>
          </div>
        </form>
      )}

      {templates.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-600 dark:bg-slate-800">
          <FileText className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
          <p className="mt-3 text-sm text-slate-500">Nenhum template cadastrado ainda.</p>
        </div>
      ) : (
        <ul role="list" className="space-y-2">
          {templates.map((t) => (
            <li
              key={t.id}
              className="group relative overflow-hidden rounded-lg border border-slate-200 bg-white shadow-elevate transition-all hover:shadow-elevate-lg dark:border-slate-700 dark:bg-slate-800"
            >
              <div className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                      {t.title}
                    </h3>
                    {!t.isActive && (
                      <StatusDot tone="slate">Inativo</StatusDot>
                    )}
                    {t.authorId === null && (
                      <span className="inline-flex items-center gap-1 rounded font-mono-tech text-[9px] font-semibold uppercase tracking-tech px-1.5 py-0.5 bg-fluxo-500/10 text-fluxo-700 ring-1 ring-inset ring-fluxo-500/20 dark:text-fluxo-300">
                        GLOBAL
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 line-clamp-2 whitespace-pre-wrap font-mono-tech text-xs text-slate-600 dark:text-slate-400">
                    {t.body}
                  </p>
                </div>
                <div className="flex flex-shrink-0 items-center gap-1.5">
                  <Link
                    href={`/admin/templates/${t.id}`}
                    aria-label={`Editar ${t.title}`}
                    title="Editar"
                    className="rounded-md border border-slate-200 p-1.5 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-700"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                  <ConfirmDialog
                    title="Excluir template"
                    description={
                      <>
                        O template <strong>&quot;{t.title}&quot;</strong> será removido. Esta ação é reversível só restaurando no banco.
                      </>
                    }
                    confirmLabel="Excluir"
                    destructive
                    action={deleteTemplateAction}
                    hiddenFields={{ id: t.id }}
                  >
                    <button
                      type="button"
                      aria-label={`Excluir ${t.title}`}
                      title="Excluir"
                      className="rounded-md border border-rose-200 p-1.5 text-rose-600 transition-colors hover:bg-rose-50 dark:border-rose-900/60 dark:hover:bg-rose-950/30"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </ConfirmDialog>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
