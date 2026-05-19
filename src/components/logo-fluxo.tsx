import Image from 'next/image';

type LogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const SIZE: Record<LogoSize, { w: number; h: number }> = {
  xs: { w: 28, h: 28 },
  sm: { w: 36, h: 36 },
  md: { w: 44, h: 44 },
  lg: { w: 56, h: 56 },
  xl: { w: 96, h: 96 },
};

interface Props {
  /** Tamanho. Mantém proporção 1:1 ~. */
  size?: LogoSize;
  /** Em superfícies escuras, aplica filtro pra clarear o logo. */
  onDark?: boolean;
  /** Texto alternativo. Default: "Fluxo Digital Tech". */
  alt?: string;
  /** Classe adicional. */
  className?: string;
  /** Define se a imagem é priority (acima do fold). */
  priority?: boolean;
}

/**
 * Logo oficial da Fluxo Digital Tech.
 * Em fundos escuros use `onDark`: o filtro CSS deixa o logo claro
 * (não precisa de versão branca do PNG).
 */
export function LogoFluxo({
  size = 'md',
  onDark = false,
  alt = 'Fluxo Digital Tech',
  className = '',
  priority = false,
}: Props) {
  const { w, h } = SIZE[size];
  return (
    <Image
      src="/logo-fluxo.png"
      alt={alt}
      width={w}
      height={h}
      priority={priority}
      className={`${onDark ? 'brightness-0 invert' : ''} ${className}`}
      style={{ objectFit: 'contain' }}
    />
  );
}
