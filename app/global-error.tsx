'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Kora Global Error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-[#f8fafc] p-6 font-sans text-slate-800">
        <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-white p-8 shadow-sm">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-rose-600 font-bold text-xl">
            !
          </div>
          <h1 className="text-xl font-bold text-slate-900">Application Error</h1>
          <p className="mt-2 text-sm text-slate-500">
            A system error occurred. Your data is protected.
          </p>
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => reset()}
              className="rounded-xl bg-[#0e7490] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#0e7490]/90"
            >
              Try again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Reload Page
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
