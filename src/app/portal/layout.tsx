import Link from 'next/link';
import { auth, signOut } from '@/lib/auth';
import { HeadphonesIcon, LogOut, Plus, UserCircle } from 'lucide-react';
import { NotificationsBell } from '@/components/notifications-bell';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const user = session?.user;

  async function logout() {
    'use server';
    await signOut({ redirectTo: '/login' });
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/95">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Link href="/portal" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-fluxo-gradient shadow-fluxo">
              <HeadphonesIcon className="h-4 w-4 text-white" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-display text-sm font-bold text-slate-900 dark:text-white">Fluxo Suporte</span>
              <span className="text-[10px] font-medium uppercase tracking-widest text-fluxo-600 dark:text-cyan-400">
                Digital Tech
              </span>
            </div>
          </Link>

          <nav className="flex items-center gap-1 text-sm">
            <Link
              href="/portal"
              className="hidden rounded-md px-3 py-1.5 font-medium text-slate-700 transition-colors hover:bg-fluxo-50 hover:text-fluxo-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white sm:inline-block"
            >
              Meus chamados
            </Link>
            <Link
              href="/portal/novo"
              className="flex items-center gap-1.5 rounded-md bg-fluxo-500 px-2 py-1.5 font-semibold text-white shadow-fluxo transition-all hover:bg-fluxo-600 hover:shadow-fluxo-lg sm:px-3"
            >
              <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Novo chamado</span><span className="sm:hidden">Novo</span>
            </Link>
            <NotificationsBell variant="light" />
            <Link
              href="/portal/perfil"
              className="flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
              title={user?.name}
            >
              <UserCircle className="h-4 w-4" />
              <span className="hidden max-w-[120px] truncate sm:inline">{user?.name}</span>
            </Link>
            <form action={logout}>
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-slate-700 transition-colors hover:bg-rose-50 hover:text-rose-700 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-rose-500/20 dark:hover:text-rose-300"
                title="Sair"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-4 py-8">{children}</div>
      </main>

      <footer className="border-t border-slate-200 bg-white dark:border-slate-700/60 dark:bg-slate-900">
        <div className="mx-auto max-w-5xl px-4 py-4 text-center text-xs text-slate-500 dark:text-slate-400">
          © {new Date().getFullYear()} Fluxo Digital Tech · ti@fluxodigitaltech.com.br
        </div>
      </footer>
    </div>
  );
}
