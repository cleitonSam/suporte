import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      fontFamily: {
        sans: ['var(--font-poppins)', 'system-ui', 'sans-serif'],
        display: ['var(--font-montserrat)', 'var(--font-poppins)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      colors: {
        fluxo: {
          50:  '#E6F0FF',
          100: '#CCE0FF',
          200: '#99C2FF',
          300: '#66A3FF',
          400: '#3385FF',
          500: '#0066FF',
          600: '#0052CC',
          700: '#003D99',
          800: '#0A1F3D',
          900: '#0D2B52',
          950: '#020617',
        },
        cyan: {
          50:  '#E6FEFF',
          100: '#CCFDFE',
          200: '#99FBFE',
          300: '#66F8FE',
          400: '#33F5FE',
          500: '#00F2FE',
          600: '#00C2CB',
          700: '#009199',
          800: '#006166',
          900: '#003033',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      backgroundImage: {
        'fluxo-gradient': 'linear-gradient(135deg, #0066FF 0%, #00F2FE 100%)',
        'fluxo-gradient-dark': 'linear-gradient(135deg, #020617 0%, #0A1F3D 60%, #003D99 100%)',
        'dot-grid':
          'radial-gradient(circle at center, rgb(100 116 139 / 0.15) 1px, transparent 1px)',
        'dot-grid-dark':
          'radial-gradient(circle at center, rgb(148 163 184 / 0.12) 1px, transparent 1px)',
        'mesh-fluxo':
          'radial-gradient(at 0% 0%, rgb(0 102 255 / 0.08) 0px, transparent 50%), radial-gradient(at 100% 100%, rgb(0 242 254 / 0.06) 0px, transparent 50%)',
      },
      backgroundSize: {
        grid: '24px 24px',
        'grid-sm': '16px 16px',
      },
      boxShadow: {
        fluxo: '0 4px 14px 0 rgb(0 102 255 / 0.18)',
        'fluxo-lg': '0 10px 40px -5px rgb(0 102 255 / 0.28)',
        elevate: '0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)',
        'elevate-lg':
          '0 4px 6px -2px rgb(15 23 42 / 0.04), 0 12px 24px -8px rgb(15 23 42 / 0.08)',
        'inset-line': 'inset 0 1px 0 0 rgb(255 255 255 / 0.04)',
        glow: '0 0 0 1px rgb(0 102 255 / 0.5), 0 0 20px 0 rgb(0 102 255 / 0.15)',
      },
      letterSpacing: {
        micro: '0.12em',
        tech: '0.18em',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
