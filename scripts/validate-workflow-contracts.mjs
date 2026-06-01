import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function fail(message) {
  failures.push(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function headerValue(node, headerName) {
  const headers = node.parameters?.headerParameters?.parameters ?? [];
  return headers.find((header) => header.name?.toLowerCase() === headerName.toLowerCase())?.value;
}

function requireHttpNode(workflow, endpoint) {
  const node = workflow.nodes?.find(
    (candidate) =>
      candidate.type === "n8n-nodes-base.httpRequest" &&
      typeof candidate.parameters?.url === "string" &&
      candidate.parameters.url.endsWith(endpoint)
  );

  assert(node, `${workflow.name} is missing HTTP request node for ${endpoint}`);
  return node;
}

const importableDir = path.join(root, "n8n", "importable-json");
const workflowFiles = fs
  .readdirSync(importableDir)
  .filter((file) => file.endsWith(".json"))
  .map((file) => path.join("n8n", "importable-json", file));

const workflowJsonText = workflowFiles.map((file) => readText(file)).join("\n");
const migrationText = fs
  .readdirSync(path.join(root, "supabase", "migrations"))
  .filter((file) => file.endsWith(".sql"))
  .map((file) => readText(path.join("supabase", "migrations", file)))
  .join("\n");

for (const forbidden of [
  "=={{",
  "xizzrlisczijlgtfmpat.supabase.co",
  "ai-lead-generation-expert.vercel.app",
  "uzairrrrr6@gmail.com",
  "uzair@getsynqro.com"
]) {
  assert(!workflowJsonText.includes(forbidden), `n8n workflow JSON contains forbidden hardcoded value/expression: ${forbidden}`);
}

const rpcNames = new Set(
  [...workflowJsonText.matchAll(/\/rest\/v1\/rpc\/([A-Za-z0-9_]+)/g)].map((match) => match[1])
);
for (const rpcName of rpcNames) {
  assert(
    new RegExp(`create\\s+or\\s+replace\\s+function\\s+(public\\.)?${rpcName}\\s*\\(`, "i").test(migrationText),
    `RPC ${rpcName} is referenced by n8n JSON but not defined in Supabase migrations`
  );
}

function listSourceFiles(directory) {
  const results = [];
  function visit(relativeDirectory) {
    for (const entry of fs.readdirSync(path.join(root, relativeDirectory), { withFileTypes: true })) {
      const relativePath = path.join(relativeDirectory, entry.name);
      if (entry.isDirectory()) {
        visit(relativePath);
      } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
        results.push(relativePath);
      }
    }
  }
  visit(directory);
  return results;
}

const sourceFiles = [...listSourceFiles("app"), ...listSourceFiles("lib")];

for (const relative of sourceFiles) {
  const fullPath = path.join(root, relative);
  if (!fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) continue;
  const text = fs.readFileSync(fullPath, "utf8");
  for (const match of text.matchAll(/\.rpc\(["']([A-Za-z0-9_]+)["']/g)) {
    assert(
      new RegExp(`create\\s+or\\s+replace\\s+function\\s+(public\\.)?${match[1]}\\s*\\(`, "i").test(migrationText),
      `RPC ${match[1]} is referenced by ${relative} but not defined in Supabase migrations`
    );
  }
}

for (const workflowFile of workflowFiles) {
  try {
    const parsed = readJson(workflowFile);
    const workflows = Array.isArray(parsed) ? parsed : [parsed];
    assert(workflows.length > 0, `${workflowFile} is empty`);
    for (const workflow of workflows) {
      assert(typeof workflow.name === "string" && workflow.name.length > 0, `${workflowFile} has a workflow missing name`);
      assert(Array.isArray(workflow.nodes), `${workflowFile} has a workflow missing nodes array`);
    }
  } catch (error) {
    fail(`${workflowFile} is not valid workflow JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

const leadIntakeWorkflow = readJson("n8n/importable-json/WF-01 Lead Intake - Backend Proxy.json");
const discoveryWorkflow = readJson("n8n/importable-json/WF-10 Lead Discovery - Backend Runner.json");
const routingWorkflow = readJson("n8n/importable-json/WF-04 Routing.json");
const draftWorkflow = readJson("n8n/importable-json/WF-05 Draft Generation.json");

const leadIntakeNode = requireHttpNode(leadIntakeWorkflow, "/api/workflows/lead-intake");
const discoveryNode = requireHttpNode(discoveryWorkflow, "/api/workflows/discovery/run");

for (const [label, node] of [
  ["WF-01 lead intake", leadIntakeNode],
  ["WF-10 discovery", discoveryNode]
]) {
  assert(node?.parameters?.method === "POST", `${label} must call the app endpoint with POST`);
  assert(
    node?.parameters?.url?.startsWith("={{$env.APP_BASE_URL}}/api/workflows/"),
    `${label} must use APP_BASE_URL for app endpoint URL`
  );
  const apiKeyHeader = headerValue(node, "x-n8n-api-key");
  assert(apiKeyHeader, `${label} must send x-n8n-api-key`);
  assert(
    /N8N_(WORKFLOW_)?API_KEY/.test(apiKeyHeader ?? ""),
    `${label} x-n8n-api-key must reference N8N_API_KEY or N8N_WORKFLOW_API_KEY`
  );
}

assert(
  headerValue(leadIntakeNode, "content-type") === "application/json",
  "WF-01 lead intake must send application/json content-type"
);
assert(
  leadIntakeNode?.parameters?.jsonBody?.includes("JSON.stringify"),
  "WF-01 lead intake must forward webhook JSON body"
);

const discoverySetNode = discoveryWorkflow.nodes?.find((node) =>
  ["Set Request Body", "Build Request Body"].includes(node.name)
);
const discoverySetFields = JSON.stringify(discoverySetNode?.parameters ?? {});
assert(
  discoverySetFields.includes("dry_run"),
  "WF-10 discovery wrapper must pass a dry_run flag before calling the app endpoint"
);
assert(
  discoveryNode?.parameters?.jsonBody?.includes("JSON.stringify"),
  "WF-10 discovery must forward prepared request body JSON"
);

for (const routePath of [
  "app/api/workflows/lead-intake/route.ts",
  "app/api/workflows/discovery/run/route.ts",
  "app/api/workflows/discovery/process-recovered/route.ts"
]) {
  assert(fs.existsSync(path.join(root, routePath)), `${routePath} does not exist`);
  assert(readText(routePath).includes("requireWorkflowAuth"), `${routePath} must enforce workflow auth`);
}

const authHelper = readText("lib/api/auth.ts");
for (const token of ["N8N_API_KEY", "N8N_WORKFLOW_API_KEY", "x-n8n-api-key", "Bearer"]) {
  assert(authHelper.includes(token), `lib/api/auth.ts must support ${token}`);
}

const leadDiscovery = readText("lib/workflows/lead-discovery.ts");
const quotaMigration = readText("supabase/migrations/003_places_total_quota_rpc.sql");
assert(leadDiscovery.includes('rpc("reserve_places_quota"'), "lead discovery must call reserve_places_quota RPC");
for (const arg of [
  "target_campaign_id",
  "counter_name",
  "increment_by",
  "counter_max_allowed",
  "total_max_allowed"
]) {
  assert(leadDiscovery.includes(arg), `lead discovery RPC call is missing ${arg}`);
  assert(quotaMigration.includes(arg), `reserve_places_quota migration is missing ${arg}`);
}
assert(
  quotaMigration.includes("create or replace function reserve_places_quota("),
  "migration must define reserve_places_quota"
);
assert(
  quotaMigration.includes("grant execute on function reserve_places_quota"),
  "migration must grant execute on reserve_places_quota"
);
assert(
  leadDiscovery.includes("loadPromotableCandidatesFromDb"),
  "lead discovery must reload promotable candidates from persisted DB state"
);
assert(
  !leadDiscovery.includes('from "@/lib/workflows/routing"'),
  "backend discovery must stop at WF-03; n8n owns WF-04 routing"
);

const routingSource = routingWorkflow.nodes?.find((node) => node.name === "Select Scored Leads");
assert(routingWorkflow.active === false, "WF-04 importable workflow must be inactive by default");
assert(routingSource?.parameters?.tableId === "wf04_scored_leads", "WF-04 must read from wf04_scored_leads");

const draftSource = draftWorkflow.nodes?.find((node) => node.name === "Select Due Outreach Queue");
const draftSwitch = draftWorkflow.nodes?.find((node) => node.name === "Switch WF-05 Action");
const draftValidation = draftWorkflow.nodes?.find((node) => node.name === "Validate Draft");
assert(draftWorkflow.active === false, "WF-05 importable workflow must be inactive by default");
assert(draftSource?.parameters?.tableId === "wf05_due_queue_items", "WF-05 must read from wf05_due_queue_items");
assert(draftSwitch, "WF-05 must switch on wf05_action before draft context loading");
assert(
  draftValidation?.parameters?.mode === "runOnceForAllItems",
  "WF-05 Validate Draft must process the full input batch"
);
assert(
  !draftValidation?.parameters?.jsCode?.includes("$input.first()") &&
    !draftValidation?.parameters?.jsCode?.includes('$(\"Load Draft Context\").first()'),
  "WF-05 Validate Draft must not collapse execution to the first item"
);
for (const token of [
  "create or replace view public.wf04_scored_leads",
  "create or replace view public.wf05_due_queue_items",
  "create or replace function public.sync_wf05_queue_action",
  "create or replace function public.acquire_discovery_recovery_lease"
]) {
  assert(migrationText.toLowerCase().includes(token), `Supabase migrations are missing ${token}`);
}

const workflowDocs = fs
  .readdirSync(path.join(root, "n8n", "workflows"))
  .filter((file) => file.endsWith(".md"))
  .map((file) => readText(path.join("n8n", "workflows", file)))
  .join("\n");

assert(
  !workflowDocs.includes("reserve_discovery_quota"),
  "workflow docs must not reference retired reserve_discovery_quota RPC"
);
assert(
  workflowDocs.includes("reserve_places_quota"),
  "workflow docs must reference reserve_places_quota RPC"
);

if (failures.length > 0) {
  console.error("Workflow contract validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Workflow contract validation passed for ${workflowFiles.length} importable workflow JSON files.`);
