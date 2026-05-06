import { getRequiredEnv } from "@/lib/env";

export type TriggerDiscoveryWorkflowInput = {
  campaignId: string;
  dryRun?: boolean;
  requestedBy: {
    userId: string;
    email: string | null;
    displayName: string;
  };
};

export type TriggerDiscoveryWorkflowResult = {
  ok: boolean;
  status: number;
  workflowRunId?: string | null;
  message?: string | null;
  payload?: unknown;
};

function discoveryWebhookUrl() {
  const explicitUrl = process.env.N8N_DISCOVERY_WEBHOOK_URL;
  if (explicitUrl) return explicitUrl;

  const baseUrl = getRequiredEnv("N8N_BASE_URL").replace(/\/+$/, "");
  const path = process.env.N8N_DISCOVERY_WEBHOOK_PATH || "/webhook/wf-10-lead-discovery";
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}

function workflowApiKey() {
  return process.env.N8N_API_KEY ?? getRequiredEnv("N8N_WORKFLOW_API_KEY");
}

export async function triggerDiscoveryWorkflow(input: TriggerDiscoveryWorkflowInput): Promise<TriggerDiscoveryWorkflowResult> {
  const response = await fetch(discoveryWebhookUrl(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-n8n-api-key": workflowApiKey()
    },
    body: JSON.stringify({
      campaign_id: input.campaignId,
      dry_run: Boolean(input.dryRun),
      requested_by: {
        user_id: input.requestedBy.userId,
        email: input.requestedBy.email,
        display_name: input.requestedBy.displayName
      },
      requested_at: new Date().toISOString(),
      source: "crm_manual_run",
      trigger_type: "manual"
    }),
    cache: "no-store"
  });

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      message: typeof payload === "object" && payload && "error" in payload ? String(payload.error) : text || response.statusText,
      payload
    };
  }

  const workflowRunId =
    typeof payload === "object" && payload
      ? "executionId" in payload
        ? String(payload.executionId)
        : "id" in payload
          ? String(payload.id)
          : null
      : null;

  return {
    ok: true,
    status: response.status,
    workflowRunId,
    message: typeof payload === "object" && payload && "message" in payload ? String(payload.message) : null,
    payload
  };
}
