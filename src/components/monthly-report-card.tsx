'use client';

import { useState } from 'react';
import { FileText, Send, Calendar } from 'lucide-react';
import { sendMonthlyReportNowAction } from '@/server/actions/monthly-reports';
import { SubmitButton } from '@/components/submit-button';

interface RecentReport {
  id: string;
  year: number;
  month: number;
  sentAt: Date;
  sentTo: string[];
  status: string;
}

interface Props {
  clientId: string;
  contactCount: number;
  recentReports: RecentReport[];
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function defaultPeriod(): { year: number; month: number } {
  const now = new Date();
  const ref = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return { year: ref.getFullYear(), month: ref.getMonth() + 1 };
}

export function MonthlyReportCard({ clientId, contactCount, recentReports }: Props) {
  const def = defaultPeriod();
  const [year, setYear] = useState(def.year);
  const [month, setMonth] = useState(def.month);

  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2];

  const noContacts = contactCount === 0;

  return (
    <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-elevate dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-start gap-3">
        <FileText className="mt-0.5 h-5 w-5 shrink-0 text-fluxo-600 dark:text-fluxo-400" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
            Relatório mensal pro cliente final
          </h3>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Gera PDF com KPIs do mês (chamados, SLA, satisfação, lista) e envia por email
            pros contatos cadastrados. O cron roda automaticamente no dia 1 de cada mês — aqui
            você dispara manualmente pra ver o resultado ou reenviar um período.
          </p>

          {noContacts ? (
            <p className="mt-3 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
              ⚠ Nenhum contato com email cadastrado. Adicione contatos na aba acima antes.
            </p>
          ) : (
            <form action={sendMonthlyReportNowAction} className="mt-4 flex flex-wrap items-end gap-2">
              <input type="hidden" name="clientId" value={clientId} />
              <input type="hidden" name="returnTo" value={`/admin/clientes/${clientId}`} />

              <div>
                <label htmlFor="mr-month" className="block text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Mês
                </label>
                <select
                  id="mr-month"
                  name="month"
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="mt-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                >
                  {MONTH_NAMES.map((name, i) => (
                    <option key={i} value={i + 1}>{name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="mr-year" className="block text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Ano
                </label>
                <select
                  id="mr-year"
                  name="year"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="mt-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <SubmitButton pendingText="Gerando e enviando...">
                <Send className="h-3.5 w-3.5" aria-hidden="true" />
                Gerar e enviar
              </SubmitButton>

              <span className="text-[11px] text-slate-500 dark:text-slate-400 ml-auto">
                Envia pra <strong>{contactCount}</strong> contato{contactCount === 1 ? '' : 's'}
              </span>
            </form>
          )}

          {recentReports.length > 0 && (
            <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-700">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Histórico recente
              </p>
              <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-700">
                {recentReports.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center gap-2 py-2 text-xs">
                    <Calendar className="h-3 w-3 text-slate-400" aria-hidden="true" />
                    <span className="font-mono-tech text-slate-700 dark:text-slate-200">
                      {MONTH_NAMES[r.month - 1]}/{r.year}
                    </span>
                    <span className="text-slate-500">
                      → {r.sentTo.length} destinatário{r.sentTo.length === 1 ? '' : 's'}
                    </span>
                    <span
                      className={
                        r.status === 'sent'
                          ? 'rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                          : 'rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                      }
                    >
                      {r.status === 'sent' ? 'enviado' : 'falhou'}
                    </span>
                    <span className="ml-auto text-slate-400 text-[10px]">
                      {new Date(r.sentAt).toLocaleString('pt-BR')}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
