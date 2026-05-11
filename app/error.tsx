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
    <main className="crm-state-shell">
      <section className="crm-state-panel">
        <div className="crm-state-badge">Runtime error</div>
        <div className="crm-state-hero">
          <h1>Something went wrong</h1>
          <p>The CRM hit an unexpected error. Retry to reload the current surface or return to the pipeline.</p>
        </div>

        <div className="crm-state-card crm-surface mt-6 p-5">
          <p className="m-0 text-sm leading-6 text-white/80">
            {error.message || "An unexpected error prevented this view from rendering."}
          </p>
        </div>

        <div className="crm-state-actions">
          <Button type="button" onClick={reset}>
            Try again
          </Button>
          <a className="ui-button ui-button-secondary" href="/pipeline">
            Go to pipeline
          </a>
        </div>

        <p className="crm-state-meta">State reset is local to this view and does not affect your session.</p>
      </section>
    </main>
  );
}
