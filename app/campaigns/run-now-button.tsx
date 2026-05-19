"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const refreshTimers = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<ManualRunResult | null>(null);

  useEffect(() => () => {
    refreshTimers.current.forEach((timer) => clearTimeout(timer));
  }, []);

  function scheduleBoundedRefresh() {
    refreshTimers.current.forEach((timer) => clearTimeout(timer));
    router.refresh();
    refreshTimers.current = [5000, 10000, 20000, 30000].map((delay) =>
      setTimeout(() => router.refresh(), delay)
    );
  }

  const runNow = () => {
    setResult(null);
    startTransition(async () => {
      try {
        setResult(await triggerCampaignManualRun(campaignId));
        scheduleBoundedRefresh();
      } catch (error) {
        setResult({
          status: "failed",
          message: error instanceof Error ? error.message : "Manual discovery request failed"
        });
        scheduleBoundedRefresh();
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
