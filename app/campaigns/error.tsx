"use client";

import { useEffect } from "react";
import { Button, LinkButton } from "@/components/ui/button";

export default function CampaignsError({
  error,
  reset
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="crm-state-shell">
      <div className="crm-state-panel">
        <div className="crm-state-badge">Campaigns</div>
        <div className="crm-state-hero">
          <h1>Campaigns could not load.</h1>
          <p>
            The route ran into a problem while loading the campaign surface. Try again, or return to the dashboard and
            open Campaigns again.
          </p>
        </div>
        <div className="crm-state-actions">
          <Button type="button" onClick={reset}>
            Retry
          </Button>
          <LinkButton href="/pipeline" variant="secondary">
            Back to pipeline
          </LinkButton>
        </div>
        <div className="crm-state-meta">{error.message}</div>
      </div>
    </div>
  );
}
