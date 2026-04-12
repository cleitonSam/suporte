import Link from 'next/link';
import { auth, signOut } from '@/lib/auth';
import {
  LayoutDashboard,
  Ticket,
  ListChecks,
  Building2,
  Package,
  Settings,
  LogOut,
  HeadphonesIcon,
  UserCircle,
  FileText,
  BookOpen,
  Zap,
  BarChart3,
} from 'lucide-react';
import { NotificationsBell } from '@/components/notifications-bell';
import { CommandPalette } from '@/components/command-palette';
import { SearchTrigger } from '@/components/search-trigger';
import { ThemeToggle } from '@/components/theme-toggle';
import { MobileMenuButton } from '@/components/mobile-sidebar';

const nav = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/chamados', label: 'Chamados', icon: Ticket },
  { href: '/admin/fila', label: 'Minha fila', icon: ListChecks },
  { href: '/admin/clientes', label: 'Clientes', icon: Building2 },
  { href: '/admin/inventario', label: 'Inventário', icon: Package },
  { href: '/admin/conhecimento', label: 'Conhecimento', icon: BookOpen },
  { href: '/admin/automacoes', label: 'Automações', icon: Zap },
  { href: '/admin/templates', label: 'Templates', icon: FileText },
  { href: '/admin/relatorios', label: 'Relatórios', icon: BarChart3 },
  { href: '/admin/configuracoes', label: 'Configurações', icon: Settings },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const user = session?.user;

  async function logout() {
    'use server';
    await signOut({ redirectTo: '/login' });
  }

  return (
    <div id="admin-layout" className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Sidebar — oculto no mobile, slide-in quando .mobile-sidebar-open */}
      <aside className="fixed inset-y-0 left-0 z-50 flex w-64 -translate-x-full flex-col bg-fluxo-800 text-slate-100 shadow-xl transition-transform duration-200 ease-in-out lg:static lg:translate-x-0">
        {/* Logo */}
        <div className="relative flex h-16 flex-shrink-0 items-center gap-3 border-b border-fluxo-700/60 px-5">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-fluxo-gradient shadow-fluxo">
            <HeadphonesIcon className="h-4 w-4 text-white" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-display text-sm font-bold tracking-tight text-white">
              Fluxo Suporte
            </span>
            <span className="text-[10px] font-medium uppercase tracking-widest text-cyan-400">
              Digital Tech
            </span>
          </div>
        </div>

        {/* Navegação */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-fluxo-700/40 hover:text-white"
              >
                <Icon className="h-4 w-4 text-slate-400 transition-colors group-hover:text-cyan-400" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer do usuário */}
        <div className="flex-shrink-0 border-t border-fluxo-700/60 p-3">
          <div className="mb-2 rounded-lg bg-fluxo-900/50 px-3 py-2.5 backdrop-blur">
            <div className="truncate text-sm font-semibold text-white">{user?.name}</div>
            <div className="truncate text-xs text-slate-400">{user?.email}</div>
            <div className="mt-1.5">
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                  user?.role === 'ADMIN'
                    ? 'bg-cyan-400/15 text-cyan-300 ring-1 ring-cyan-400/30'
                    : 'bg-fluxo-500/20 text-fluxo-200 ring-1 ring-fluxo-500/30'
                }`}
              >
                {user?.role === 'ADMIN' ? 'Admin' : 'Agente'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Link
              href="/admin/perfil"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-fluxo-700/60 bg-fluxo-900/30 px-2 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-fluxo-700/40 hover:text-white"
            >
              <UserCircle className="h-3.5 w-3.5" />
              Perfil
            </Link>
            <form action={logout} className="flex-1">
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-1.5 rounded-md border border-fluxo-700/60 bg-fluxo-900/30 px-2 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-rose-500/20 hover:text-rose-300"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sair
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Conteúdo principal */}
      <main className="flex-1 overflow-y-auto">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-slate-200 bg-white/80 px-4 backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/80 sm:px-6">
          {/* Lado esquerdo: hamburger mobile */}
          <div className="flex items-center gap-2">
            <MobileMenuButton />
            {/* Logo mini no mobile */}
            <div className="flex items-center gap-2 lg:hidden">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-fluxo-gradient">
                <HeadphonesIcon className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="font-display text-sm font-bold text-slate-900 dark:text-white">Fluxo</span>
            </div>
          </div>
          {/* Lado direito: ações */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <SearchTrigger />
            </div>
            <ThemeToggle />
            <NotificationsBell variant="light" />
          </div>
        </header>
        <CommandPalette />
        <div className="mx-auto max-w-7xl p-4 sm:p-6">{children}</div>
      </main>
    </div>
  );
}
