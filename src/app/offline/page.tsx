import { WifiOff } from 'lucide-react';

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 dark:bg-slate-950">
      <div className="max-w-md rounded-lg border border-slate-200 bg-white p-8 text-center shadow-elevate dark:border-slate-700 dark:bg-slate-800">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400">
          <WifiOff className="h-5 w-5" aria-hidden="true" />
        </div>
        <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">
          Você está offline
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Esta página requer conexão com a internet. Verifique sua rede e tente novamente.
        </p>
        <p className="mt-4 font-mono-tech text-[10px] uppercase tracking-tech text-slate-400">
          Fluxo Suporte · offline mode
        </p>
      </div>
    </div>
  );
}
