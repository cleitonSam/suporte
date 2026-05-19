import type { Metadata, Viewport } from 'next';
import { Poppins, Montserrat } from 'next/font/google';
import { ToastProvider } from '@/components/toast';
import './globals.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
});

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-montserrat',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Fluxo Suporte — Fluxo Digital Tech',
    template: '%s · Fluxo Suporte',
  },
  description: 'Sistema de chamados da Fluxo Digital Tech',
  applicationName: 'Fluxo Suporte',
  robots: { index: false, follow: false },
  openGraph: {
    title: 'Fluxo Suporte',
    description: 'Sistema de chamados da Fluxo Digital Tech',
    type: 'website',
    locale: 'pt_BR',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
    { media: '(prefers-color-scheme: dark)', color: '#020617' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`dark ${poppins.variable} ${montserrat.variable}`}>
      <body className="min-h-screen bg-background font-sans antialiased">
        {/* Script inline para aplicar dark mode antes do React hidratar (evita flash) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='light'){document.documentElement.classList.remove('dark')}else{document.documentElement.classList.add('dark')}}catch(e){}})()`,
          }}
        />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
