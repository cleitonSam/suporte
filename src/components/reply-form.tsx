'use client';

import { useState, useRef } from 'react';
import { FileText } from 'lucide-react';
import { replyTicketAction } from '@/server/actions/tickets';

interface Template {
  id: string;
  title: string;
  body: string;
}

interface Props {
  ticketId: string;
  templates?: Template[];
  allowInternal?: boolean;
  clientName?: string;
}

export function ReplyForm({ ticketId, templates = [], allowInternal = true, clientName }: Props) {
  const [body, setBody] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function applyTemplate(t: Template) {
    // Substituição simples de variáveis
    const rendered = t.body.replace(/\{\{\s*nome\s*\}\}/gi, clientName ?? 'cliente');
    setBody((prev) => (prev ? prev + '\n\n' + rendered : rendered));
    setShowTemplates(false);
    setTimeout(() => textareaRef.current?.focus(), 50);
  }

  return (
    <form
      action={async (fd) => {
        fd.set('body', body);
        await replyTicketAction(fd);
        setBody('');
      }}
      className="mt-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
    >
      <input type="hidden" name="ticketId" value={ticketId} />

      <div className="mb-2 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-slate-700">Resposta</label>
          {allowInternal && (
            <label className="flex items-center gap-1.5 text-sm text-slate-600">
              <input type="checkbox" name="isInternal" value="true" className="rounded" />
              Nota interna
            </label>
          )}
        </div>
        {templates.length > 0 && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTemplates((v) => !v)}
              className="flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
            >
              <FileText className="h-3 w-3" />
              Templates ({templates.length})
            </button>
            {showTemplates && (
              <div className="absolute right-0 top-8 z-20 max-h-80 w-[calc(100vw-3rem)] overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800 sm:w-80">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => applyTemplate(t)}
                    className="block w-full border-b border-slate-100 px-3 py-2 text-left hover:bg-fluxo-50 last:border-b-0"
                  >
                    <div className="text-sm font-medium text-slate-900">{t.title}</div>
                    <div className="line-clamp-2 text-xs text-slate-500">{t.body}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <textarea
        ref={textareaRef}
        name="body"
        required
        rows={4}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Escreva sua resposta..."
        className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
      />
      <div className="mt-3 flex justify-end">
        <button
          type="submit"
          disabled={!body.trim()}
          className="rounded-md bg-fluxo-500 px-4 py-2 text-sm font-medium text-white hover:bg-fluxo-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Enviar
        </button>
      </div>
    </form>
  );
}
