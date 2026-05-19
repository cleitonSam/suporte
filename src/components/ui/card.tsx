import { cn } from '@/lib/utils';

type Props<T extends React.ElementType = 'div'> = {
  as?: T;
  /** Quando true, renderiza sem padding (você controla o interior). */
  unpadded?: boolean;
  /** Flat = sem sombra (apenas borda). Padrão tem shadow-elevate. */
  flat?: boolean;
  /** Hover lift sutil — pra cards interativos/clicáveis. */
  hover?: boolean;
} & React.ComponentPropsWithoutRef<T>;

export function Card<T extends React.ElementType = 'div'>({
  as,
  unpadded = false,
  flat = false,
  hover = false,
  className,
  children,
  ...rest
}: Props<T>) {
  const Component = as ?? 'div';
  return (
    <Component
      className={cn(
        'rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800',
        flat ? '' : 'shadow-elevate',
        hover && 'hover-lift cursor-pointer',
        !unpadded && 'p-5',
        className,
      )}
      {...rest}
    >
      {children}
    </Component>
  );
}

interface CardHeaderProps {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function CardHeader({ icon, title, description, action, className }: CardHeaderProps) {
  return (
    <div className={cn('flex items-start gap-3 border-b border-slate-100 px-5 py-3 dark:border-slate-700', className)}>
      {icon && (
        <span
          aria-hidden="true"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-fluxo-500/10 text-fluxo-600 ring-1 ring-inset ring-fluxo-500/20"
        >
          {icon}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
          {title}
        </h3>
        {description && (
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
