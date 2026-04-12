'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';

export function MobileMenuButton() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Fecha ao trocar de página
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Previne scroll do body quando aberto
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const toggle = useCallback(() => setOpen(v => !v), []);

  return (
    <>
      {/* Hamburger button — mobile only */}
      <button
        type="button"
        onClick={toggle}
        className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
        aria-label={open ? 'Fechar menu' : 'Abrir menu'}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* O sidebar é controlado via CSS pela classe no parent */}
      <SidebarStateSync open={open} />
    </>
  );
}

/** Sincroniza o estado aberto/fechado com um data attribute no layout */
function SidebarStateSync({ open }: { open: boolean }) {
  useEffect(() => {
    const el = document.getElementById('admin-layout');
    if (el) {
      if (open) {
        el.classList.add('mobile-sidebar-open');
      } else {
        el.classList.remove('mobile-sidebar-open');
      }
    }
  }, [open]);
  return null;
}
