"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { archiveCampaignAction, duplicateCampaignAction, triggerCampaignManualRun, updateCampaignStatus } from "../actions";

const archiveCopy =
  "Archiving keeps historical leads, runs, and analytics, but removes this campaign from active operating views.";

export function CampaignDetailControls({
  campaignId,
  status,
  manualRunBlocked
}: Readonly<{
  campaignId: string;
  status: string;
  manualRunBlocked: boolean;
}>) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function runAction(action: () => Promise<unknown>, onSuccess?: (result: unknown) => void) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await action();
        onSuccess?.(result);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Campaign action failed");
      }
    });
  }

  const isArchived = status === "archived";
  const nextStatus: "active" | "paused" = status === "active" ? "paused" : "active";

  return (
    <div className="grid gap-3">
      <div className="button-row">
        <Button
          type="button"
          disabled={isPending || manualRunBlocked}
          onClick={() => runAction(() => triggerCampaignManualRun(campaignId))}
        >
          {isPending ? "Working..." : "Trigger manual n8n discovery run"}
        </Button>
        <a className="ui-button ui-button-secondary" href={`/campaigns/${campaignId}/import`}>Import leads</a>
        {!isArchived ? (
          <Button
            type="button"
            variant="secondary"
            disabled={isPending}
            onClick={() => runAction(() => updateCampaignStatus(campaignId, nextStatus))}
          >
            {status === "active" ? "Pause" : "Resume"}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="secondary"
          disabled={isPending}
          onClick={() => runAction(
            () => duplicateCampaignAction(campaignId),
            (newCampaignId) => {
              if (typeof newCampaignId === "string") {
                window.location.href = `/campaigns/${newCampaignId}`;
              }
            }
          )}
        >
          Duplicate
        </Button>
        {!isArchived ? (
          <Button
            type="button"
            variant="danger"
            disabled={isPending}
            onClick={() => {
              if (window.confirm(archiveCopy)) {
                runAction(() => archiveCampaignAction(campaignId));
              }
            }}
          >
            Archive
          </Button>
        ) : null}
      </div>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
    </div>
  );
}
