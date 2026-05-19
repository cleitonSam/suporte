'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/components/toast';

type ToastType = 'success' | 'error' | 'info';

/**
 * Catálogo de mensagens disparadas via ?ok= / ?error= / ?info=.
 * Server actions redirecionam com a chave; aqui transformamos em toast.
 */
const MESSAGES: Record<string, { type: ToastType; msg: string }> = {
  // Clientes
  'cliente.criado':       { type: 'success', msg: 'Cliente criado com sucesso.' },
  'cliente.atualizado':   { type: 'success', msg: 'Cliente atualizado.' },
  'cliente.suspenso':     { type: 'info',    msg: 'Cliente suspenso.' },
  'cliente.inativado':    { type: 'info',    msg: 'Cliente inativado.' },
  'cliente.reativado':    { type: 'success', msg: 'Cliente reativado.' },
  'cliente.removido':     { type: 'info',    msg: 'Cliente removido.' },

  // Contatos
  'contato.criado':       { type: 'success', msg: 'Contato criado.' },
  'contato.atualizado':   { type: 'success', msg: 'Contato atualizado.' },
  'contato.removido':     { type: 'info',    msg: 'Contato removido.' },
  'contato.convite_reenviado': { type: 'success', msg: 'Convite reenviado por email.' },

  // Equipamentos
  'equipamento.criado':     { type: 'success', msg: 'Equipamento cadastrado.' },
  'equipamento.atualizado': { type: 'success', msg: 'Equipamento atualizado.' },
  'equipamento.removido':   { type: 'info',    msg: 'Equipamento removido.' },

  // Bulk operations
  'bulk.aplicado':        { type: 'success', msg: 'Ação aplicada nos chamados selecionados.' },

  // Saved filters
  'filtro.salvo':         { type: 'success', msg: 'Filtro salvo.' },
  'filtro.removido':      { type: 'info',    msg: 'Filtro removido.' },

  // Macros
  'macro.aplicada':       { type: 'success', msg: 'Macro aplicada no chamado.' },

  // Relatórios mensais
  'relatorio.enviado':    { type: 'success', msg: 'Relatório enviado por email aos contatos do cliente.' },
  'sem_contatos':         { type: 'error',   msg: 'Cliente não tem contatos cadastrados com email.' },

  // Chamados / templates / automação / KB
  'template.removido':    { type: 'info',    msg: 'Template removido.' },
  'automacao.removida':   { type: 'info',    msg: 'Regra de automação removida.' },
  'automacao.toggled':    { type: 'success', msg: 'Status da automação atualizado.' },
  'artigo.removido':      { type: 'info',    msg: 'Artigo removido da base de conhecimento.' },
  'categoria.removida':   { type: 'info',    msg: 'Categoria desativada.' },

  // Erros genéricos
  validation:             { type: 'error',   msg: 'Verifique os campos do formulário.' },
  forbidden:              { type: 'error',   msg: 'Você não tem permissão para esta ação.' },
  not_found:              { type: 'error',   msg: 'Registro não encontrado.' },
  email_exists:           { type: 'error',   msg: 'Já existe um cadastro com esse email.' },
  email_falhou:           { type: 'error',   msg: 'Não foi possível enviar o email.' },
  internal_error:         { type: 'error',   msg: 'Algo deu errado. Tente novamente.' },
};

export function ToastFromQuery() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { toast } = useToast();
  const lastKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const ok = params.get('ok');
    const err = params.get('error');
    const info = params.get('info');
    const key = ok ?? err ?? info;
    if (!key) {
      lastKeyRef.current = null;
      return;
    }
    if (lastKeyRef.current === key) return;
    lastKeyRef.current = key;

    const entry = MESSAGES[key];
    if (entry) {
      toast(entry.type, entry.msg);
    } else if (ok) {
      toast('success', 'Concluído.');
    } else if (info) {
      toast('info', key);
    } else {
      toast('error', 'Algo deu errado.');
    }

    const next = new URLSearchParams(params.toString());
    next.delete('ok');
    next.delete('error');
    next.delete('info');
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [params, pathname, router, toast]);

  return null;
}
