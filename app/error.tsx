"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

type RouteError = Error & { digest?: string };

export default function AppErrorBoundary({
  error,
  reset
}: Readonly<{
  error: RouteError;
  reset: () => void;
}>) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen bg-[var(--bg)] px-6 py-10 text-white">
      <div className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center justify-center">
        <section className="crm-surface w-full max-w-xl p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-red-200">
              !
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Something went wrong
              </h1>
              <p className="mt-1 text-sm text-white/55">
                The CRM hit an unexpected error. Retry to reload the current surface.
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-sm text-white/70">
            {error.message || "An unexpected error prevented this view from rendering."}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button type="button" onClick={reset}>
              Try again
            </Button>
            <a className="ui-button ui-button-secondary" href="/pipeline">
              Go to pipeline
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}