"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { archiveCampaignAction, duplicateCampaignAction, triggerCampaignManualRun, updateCampaignStatus, type ManualRunResult } from "../actions";

const archiveCopy =
  "Archiving keeps historical leads, runs, and analytics, but removes this campaign from active operating views.";

function manualRunTone(result: ManualRunResult | null) {
  if (!result) return "text-green-300";
  if (result.status === "failed") return "text-red-300";
  if (result.status === "quota_blocked" || result.status === "config_missing") return "text-yellow-300";
  return "text-green-300";
}

export function CampaignDetailControls({
  campaignId,
  status,
  manualRunBlocked
}: Readonly<{
  campaignId: string;
  status: string;
  manualRunBlocked: boolean;
}>) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [manualRunResult, setManualRunResult] = useState<ManualRunResult | null>(null);

  function runAction(action: () => Promise<unknown>, onSuccess?: (result: unknown) => void) {
    setError(null);
    setManualRunResult(null);
    startTransition(async () => {
      try {
        const result = await action();
        onSuccess?.(result);
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Campaign action failed");
      }
    });
  }

  const isArchived = status === "archived";
  const nextStatus: "active" | "paused" = status === "active" ? "paused" : "active";

  return (
    <div className="campaign-controls-stack">
      <div className="campaign-controls-primary">
        <Button
          type="button"
          disabled={isPending || manualRunBlocked || isArchived}
          onClick={() => runAction(() => triggerCampaignManualRun(campaignId), (result) => setManualRunResult(result as ManualRunResult))}
        >
          {isArchived ? "Archived" : manualRunBlocked ? "Readiness blocked" : isPending ? "Working..." : "Trigger manual discovery run"}
        </Button>
        <p className="campaign-controls-note">
          {isArchived
            ? "Archived campaigns keep history but cannot be run again."
            : manualRunBlocked
            ? "Run readiness is blocking manual execution. Clear the blockers above before re-running."
            : "Manual discovery respects the campaign readiness checks and current global pause state."}
        </p>
      </div>
      <div className="campaign-controls-secondary">
        <a className="ui-button ui-button-secondary" href={`/campaigns/${campaignId}/import`}>
          Import leads
        </a>
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
          onClick={() =>
            runAction(() => duplicateCampaignAction(campaignId), (newCampaignId) => {
              if (typeof newCampaignId === "string") {
                window.location.href = `/campaigns/${newCampaignId}`;
              }
            })
          }
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
      {manualRunResult ? <p className={`text-sm ${manualRunTone(manualRunResult)}`}>{manualRunResult.message}</p> : null}
    </div>
  );
}
