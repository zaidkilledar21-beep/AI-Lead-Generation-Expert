"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { triggerCampaignManualRun, type ManualRunResult } from "./actions";

function toneForStatus(status: ManualRunResult["status"]) {
  if (status === "success" || status === "requested" || status === "running") return "text-green-300";
  if (status === "quota_blocked" || status === "config_missing") return "text-yellow-300";
  return "text-red-300";
}

export function RunNowButton({
  campaignId,
  disabled = false
}: Readonly<{
  campaignId: string;
  disabled?: boolean;
}>) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<ManualRunResult | null>(null);

  const runNow = () => {
    setResult(null);
    startTransition(async () => {
      try {
        setResult(await triggerCampaignManualRun(campaignId));
      } catch (error) {
        setResult({
          status: "failed",
          message: error instanceof Error ? error.message : "Manual discovery request failed"
        });
      }
    });
  };

  return (
    <div className="grid gap-2">
      <Button type="button" disabled={disabled || isPending} onClick={runNow}>
        {disabled ? "Archived" : isPending ? "Requesting..." : "Run now"}
      </Button>
      {result ? (
        <p className={`text-xs ${toneForStatus(result.status)}`}>
          {result.message}
          {result.runId ? ` Run ${result.runId.slice(0, 8)}.` : ""}
        </p>
      ) : null}
    </div>
  );
}
