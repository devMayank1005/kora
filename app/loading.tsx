export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-100 bg-white px-8 py-6 shadow-sm">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#0e7490] border-t-transparent"></div>
        <p className="text-xs font-medium text-slate-500">Loading Kora…</p>
      </div>
    </div>
  );
}
