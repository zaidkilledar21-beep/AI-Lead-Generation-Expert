export default function Loading() {
  return (
    <main className="min-h-screen bg-[var(--bg)] px-6 py-10 text-white">
      <div className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center justify-center">
        <section className="crm-surface w-full max-w-xl p-8">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-[var(--accent)]/20 border border-[var(--accent)]/20" />
            <div className="space-y-1">
              <div className="h-4 w-32 rounded-full bg-white/12 animate-pulse" />
              <div className="h-3 w-52 rounded-full bg-white/8 animate-pulse" />
            </div>
          </div>
          <div className="mt-8 grid gap-3">
            <div className="h-16 rounded-2xl border border-white/8 bg-white/[0.03] animate-pulse" />
            <div className="h-16 rounded-2xl border border-white/8 bg-white/[0.03] animate-pulse" />
            <div className="h-16 rounded-2xl border border-white/8 bg-white/[0.03] animate-pulse" />
          </div>
          <p className="mt-6 text-sm text-white/45">Loading CRM surfaces and operational data.</p>
        </section>
      </div>
    </main>
  );
}
