'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface Props {
  href: string;
  label: string;
  /** Ícone já renderizado (passado como ReactElement). Lucide usa currentColor,
   *  então cor é controlada pelo `<span>` wrapper. */
  iconElement: React.ReactNode;
}

export function NavItem({ href, label, iconElement }: Props) {
  const pathname = usePathname();
  const isActive =
    href === '/admin'
      ? pathname === '/admin'
      : pathname === href || pathname.startsWith(href + '/');

  return (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      className={
        isActive
          ? 'group relative flex items-center gap-3 rounded-md bg-fluxo-500/15 px-3 py-2 text-sm font-semibold text-white ring-1 ring-inset ring-fluxo-500/30'
          : 'group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-fluxo-700/30 hover:text-white'
      }
    >
      {isActive && (
        <span
          aria-hidden="true"
          className="absolute -left-3 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-cyan-400 shadow-[0_0_8px_rgb(34_211_238_/_0.6)]"
        />
      )}
      <span
        className={
          isActive
            ? 'inline-flex h-4 w-4 items-center justify-center text-cyan-400'
            : 'inline-flex h-4 w-4 items-center justify-center text-slate-400 transition-colors group-hover:text-cyan-400'
        }
      >
        {iconElement}
      </span>
      <span>{label}</span>
    </Link>
  );
}
