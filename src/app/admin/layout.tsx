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
import { ToastFromQuery } from '@/components/toast-from-query';
import { NavItem } from '@/components/admin/nav-item';
import { StatusDot } from '@/components/ui/status-dot';
import { LogoFluxo } from '@/components/logo-fluxo';

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
      {/* Sidebar — tech operator panel */}
      <aside className="fixed inset-y-0 left-0 z-50 flex w-64 -translate-x-full flex-col border-r border-slate-900/40 bg-[#0a1228] text-slate-100 shadow-2xl transition-transform duration-200 ease-in-out lg:static lg:translate-x-0">
        {/* Background texture sutil */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'radial-gradient(circle at center, rgb(148 163 184) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />

        {/* Logo */}
        <div className="relative flex h-16 flex-shrink-0 items-center gap-3 border-b border-slate-800/60 px-5">
          <LogoFluxo size="sm" priority />
          <div className="flex flex-col leading-tight">
            <span className="font-display text-sm font-bold tracking-tight text-white">
              Suporte
            </span>
            <span className="font-mono-tech text-[9px] uppercase tracking-tech text-cyan-400/80">
              [ tech.ops ]
            </span>
          </div>
        </div>

        {/* Status line — micro detalhe técnico */}
        <div className="relative border-b border-slate-800/60 px-5 py-2.5">
          <div className="flex items-center justify-between">
            <StatusDot tone="emerald" pulse>
              <span className="text-[10px] font-semibold uppercase tracking-tech text-slate-400">
                Operacional
              </span>
            </StatusDot>
            <span className="font-mono-tech text-[9px] text-slate-500">v0.1.0</span>
          </div>
        </div>

        {/* Navegação */}
        <nav className="relative flex-1 space-y-0.5 overflow-y-auto px-3 py-4 fluxo-scroll">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <NavItem
                key={item.href}
                href={item.href}
                label={item.label}
                iconElement={<Icon className="h-4 w-4" aria-hidden="true" />}
              />
            );
          })}
        </nav>

        {/* Footer do usuário — sleeker */}
        <div className="relative flex-shrink-0 border-t border-slate-800/60 p-3">
          <div className="rounded-md border border-slate-800/80 bg-slate-900/40 p-3 backdrop-blur">
            <div className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-fluxo-gradient text-[11px] font-bold text-white"
              >
                {(user?.name ?? 'U').slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-semibold text-white">{user?.name}</div>
                <div className="truncate font-mono-tech text-[10px] text-slate-400">
                  {user?.email}
                </div>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span
                className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono-tech text-[9px] font-semibold uppercase tracking-tech ${
                  user?.role === 'ADMIN'
                    ? 'bg-cyan-400/15 text-cyan-300 ring-1 ring-cyan-400/30'
                    : 'bg-fluxo-500/20 text-fluxo-200 ring-1 ring-fluxo-500/30'
                }`}
              >
                {user?.role === 'ADMIN' ? 'ADMIN' : 'AGENT'}
              </span>
              <div className="flex items-center gap-1">
                <Link
                  href="/admin/perfil"
                  aria-label="Perfil"
                  className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
                >
                  <UserCircle className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
                <form action={logout}>
                  <button
                    type="submit"
                    aria-label="Sair"
                    className="rounded p-1 text-slate-400 transition-colors hover:bg-rose-500/20 hover:text-rose-300"
                  >
                    <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Conteúdo principal */}
      <main className="flex-1 overflow-y-auto">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-slate-200/80 bg-white/70 px-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/70 sm:px-6">
          {/* Lado esquerdo: hamburger mobile */}
          <div className="flex items-center gap-2">
            <MobileMenuButton />
            {/* Logo mini no mobile */}
            <div className="flex items-center gap-2 lg:hidden">
              <LogoFluxo size="xs" />
              <span className="font-display text-sm font-bold text-slate-900 dark:text-white">
                Suporte
              </span>
            </div>
            {/* Status pill desktop */}
            <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 dark:border-slate-800 dark:bg-slate-900 lg:inline-flex">
              <StatusDot tone="emerald" pulse>
                <span className="font-mono-tech text-[10px] uppercase tracking-tech text-slate-500 dark:text-slate-400">
                  Online
                </span>
              </StatusDot>
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
        <ToastFromQuery />
        <div className="mx-auto max-w-7xl p-4 sm:p-6">{children}</div>
      </main>
    </div>
  );
}
