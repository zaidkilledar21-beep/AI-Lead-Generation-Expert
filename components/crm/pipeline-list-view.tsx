"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ActionFeedbackForm } from "@/components/crm/action-feedback-form";
import { Badge, bandTone } from "@/components/ui/badge";
import { CrmSelect } from "@/components/ui/crm-select";
import { ScoreBar } from "@/components/ui/score-bar";
import { approveLeadWithFeedbackAction, changeLeadStatusAction, bulkApproveLeadsAction, bulkAssignLeadsAction, bulkChangeLeadStatusAction } from "@/lib/crm/actions";
import { useLeadSelection } from "@/lib/hooks/use-lead-selection";
import { isTerminalLeadStatus } from "@/lib/crm/status-contract";
import { useState, useTransition } from "react";

type FounderProfile = {
  user_id: string;
  display_name: string;
};

type PipelineRow = Record<string, any>;

export function getPipelineApprovalBlockReason(row: PipelineRow, globalOutreachPaused = false) {
  if (row.approvedForOutreach) return null;
  const status = String(row.status ?? "");
  if (isTerminalLeadStatus(status)) return "Terminal";
  if (status.startsWith("replied") || Number(row.replyCount ?? 0) > 0 || row.latestReplyIntent || row.hasUnhandledReply) return "Reply received";
  if (!row.email) return "Missing email";
  if (row.score == null || !row.effectiveBand) return "Missing score";
  if (globalOutreachPaused) return "Global pause";
  return null;
}

function exportRows(rows: any[]) {
  const headers = ["Business", "Email", "Phone", "Status", "Band", "Score", "Campaign", "Owner", "Country", "City"];
  const csvRows = rows.map((row) => [
    row.businessName,
    row.email,
    row.phone,
    row.status,
    row.effectiveBand,
    row.score,
    row.campaignName,
    row.assignedTo,
    row.country,
    row.city
  ]);
  const escape = (value: unknown) => `"${String(value ?? "").replaceAll("\"", "\"\"")}"`;
  const csv = [headers, ...csvRows].map((row) => row.map(escape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `synqro-leads-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function PipelineListView({
  filtered,
  profiles,
  globalOutreachPaused = false
}: Readonly<{ filtered: PipelineRow[]; profiles: FounderProfile[]; globalOutreachPaused?: boolean }>) {
  const { selectedArray, toggleSelection, toggleAll, clearSelection, isSelected, isAllSelected, count } = useLeadSelection(filtered);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ tone: "success" | "danger"; message: string } | null>(null);

  const selectedCount = selectedArray.length;

  function pluralize(countValue: number, singular: string, plural = `${singular}s`) {
    return `${countValue} ${countValue === 1 ? singular : plural}`;
  }

  const handleBulkApprove = () => {
    const actionCount = selectedCount;
    setFeedback(null);
    startTransition(async () => {
      try {
        await bulkApproveLeadsAction(selectedArray);
        setFeedback({ tone: "success", message: `${pluralize(actionCount, "lead")} approved.` });
        clearSelection();
      } catch (error) {
        setFeedback({ tone: "danger", message: `Bulk approve failed: ${error instanceof Error ? error.message : "Unknown error"}` });
      }
    });
  };

  const handleBulkStatus = (status: "paused" | "unsubscribed" | "archived") => {
    const actionCount = selectedCount;
    setFeedback(null);
    startTransition(async () => {
      try {
        await bulkChangeLeadStatusAction(selectedArray, status);
        const verb = status === "archived" ? "archived" : status === "paused" ? "paused" : "unsubscribed";
        setFeedback({ tone: "success", message: `${pluralize(actionCount, "lead")} ${verb}.` });
        clearSelection();
      } catch (error) {
        setFeedback({ tone: "danger", message: `Bulk ${status} failed: ${error instanceof Error ? error.message : "Unknown error"}` });
      }
    });
  };

  const handleBulkAssign = (assignedTo: string) => {
    const actionCount = selectedCount;
    const assignee = assignedTo || null;
    setFeedback(null);
    startTransition(async () => {
      try {
        await bulkAssignLeadsAction(selectedArray, assignee);
        setFeedback({
          tone: "success",
          message: assignee ? `${pluralize(actionCount, "lead")} assigned to ${assignee}.` : `${pluralize(actionCount, "lead")} unassigned.`
        });
        clearSelection();
      } catch (error) {
        setFeedback({ tone: "danger", message: `Bulk assign failed: ${error instanceof Error ? error.message : "Unknown error"}` });
      }
    });
  };

  const selectedRows = filtered.filter((row) => selectedArray.includes(row.id));

  return (
    <section className="pipeline-table-shell pipeline-panel crm-surface relative">
      {feedback ? (
        <div className={`m-4 rounded-2xl border px-4 py-3 text-sm ${
          feedback.tone === "success"
            ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
            : "border-red-500/25 bg-red-500/10 text-red-200"
        }`}>
          {feedback.message}
        </div>
        ) : null}
      <AnimatePresence>
        {count > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="pipeline-selection-rail z-10 px-4 py-3"
          >
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-semibold text-white/90">{count} selected</span>
              <Badge tone="muted" className="px-3 py-1.5">{selectedRows.length} visible</Badge>
              <button type="button" onClick={clearSelection} className="ui-button ui-button-ghost h-8 px-3 text-xs">
                Clear selection
              </button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button 
                type="button"
                onClick={handleBulkApprove} 
                disabled={isPending}
                className="ui-button ui-button-primary h-8 px-4 text-xs disabled:opacity-50"
              >
                Approve Selected
              </button>
              <button 
                type="button"
                onClick={() => handleBulkStatus("paused")} 
                disabled={isPending}
                className="ui-button ui-button-secondary h-8 px-4 text-xs disabled:opacity-50"
              >
                Pause Selected
              </button>
              <button 
                type="button"
                onClick={() => handleBulkStatus("archived")} 
                disabled={isPending}
                className="ui-button ui-button-danger h-8 px-4 text-xs disabled:opacity-50"
              >
                Archive Selected
              </button>
              <CrmSelect
                name="bulk-assigned-to"
                defaultValue=""
                disabled={isPending}
                className="min-w-[210px]"
                placeholder="Assign selected..."
                emptyState="No founder profiles configured."
                options={[
                  { value: "__unassigned__", label: "Unassigned", description: "Clear current owner assignment." },
                  ...profiles.map((profile) => ({
                    value: profile.display_name,
                    label: profile.display_name
                  }))
                ]}
                onValueChange={(value) => handleBulkAssign(value === "__unassigned__" ? "" : value)}
              />
              <button
                type="button"
                onClick={() => {
                  exportRows(selectedRows);
                  setFeedback({ tone: "success", message: `${pluralize(selectedRows.length, "lead")} exported.` });
                }}
                className="ui-button ui-button-secondary h-8 px-4 text-xs"
              >
                Export CSV
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="pipeline-table-toolbar">
        <div>
          <h2>Lead list</h2>
          <p>Rows stay dense enough to scan, while bulk actions remain one click away.</p>
        </div>
        <div className="pipeline-table-toolbar-actions">
          <Badge tone="muted" className="px-3 py-1.5">{filtered.length} rows</Badge>
          <Badge tone="muted" className="px-3 py-1.5">{selectedCount} selected</Badge>
        </div>
      </div>
      <div className="table-wrap">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5 text-sm text-white/40">
              <th className="p-4 w-12">
                <input 
                  type="checkbox" 
                  className="rounded border-white/20 bg-white/5 text-brand focus:ring-brand focus:ring-offset-black transition-colors cursor-pointer"
                  checked={isAllSelected}
                  onChange={toggleAll}
                />
              </th>
              <th className="p-4 font-medium">Business</th>
              <th className="p-4 font-medium">Score</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium">Campaign</th>
              <th className="p-4 font-medium">Reply</th>
              <th className="p-4 font-medium">Owner</th>
              <th className="p-4 font-medium">Review</th>
              <th className="p-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8">
                  <div className="pipeline-board-empty">
                    No leads match the current filters. Clear a few filters or switch the workflow view to bring leads back into scope.
                  </div>
                </td>
              </tr>
            ) : null}
            {filtered.map((row, i) => {
              const isTerminal = isTerminalLeadStatus(row.status);
              const approvalBlockReason = getPipelineApprovalBlockReason(row, globalOutreachPaused);
              const canApprove = !row.approvedForOutreach && !approvalBlockReason;
              const canPause = !isTerminal && row.status !== "replied_interested";
              const canArchive = !isTerminal;
              let approvalAction = <Badge tone="muted">{approvalBlockReason ?? "No approval action"}</Badge>;
              if (row.approvedForOutreach) {
                approvalAction = <Badge tone="success">Approved</Badge>;
              } else if (canApprove) {
                approvalAction = (
                  <ActionFeedbackForm action={approveLeadWithFeedbackAction} successMessage="Lead approved for outreach.">
                    <input type="hidden" name="leadId" value={row.id} />
                    <button className="ui-button ui-button-primary h-8 px-3 text-xs" type="submit">
                      Approve
                    </button>
                  </ActionFeedbackForm>
                );
              }

              return (
              <motion.tr
                key={row.id}
                className={`border-b transition-colors group ${isSelected(row.id) ? "is-selected border-brand/20" : "border-white/5 hover:bg-white/[0.02]"}`}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: (i % 10) * 0.05, type: "spring", stiffness: 300, damping: 30 }}
              >
                <td className="p-4">
                  <input 
                    type="checkbox" 
                    className="rounded border-white/20 bg-white/5 text-brand focus:ring-brand focus:ring-offset-black transition-colors cursor-pointer"
                    checked={isSelected(row.id)}
                    onChange={() => toggleSelection(row.id)}
                  />
                </td>
                <td className="p-4">
                  <div className="pipeline-row-primary">
                    <a href={`/pipeline/${row.id}`} className="transition-colors group-hover:text-brand">
                      {row.businessName}
                    </a>
                  </div>
                  <div className="pipeline-row-meta mt-1">
                    {[row.city, row.country].filter(Boolean).join(", ") || "Unknown geo"}
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Badge tone={bandTone(row.effectiveBand)}>{row.effectiveBand ?? "NA"}</Badge>
                    <span className="font-mono text-xs text-white/60">{row.score ?? "--"}</span>
                  </div>
                  <ScoreBar value={row.score ?? 0} band={row.effectiveBand ?? undefined} />
                </td>
                <td className="p-4"><Badge tone="info">{row.status}</Badge></td>
                <td className="p-4 text-sm text-white/70">{row.campaignName ?? <span className="text-white/30">Unassigned</span>}</td>
                <td className="p-4">
                  <div className="flex flex-col items-start gap-1">
                    {row.latestReplyIntent ? <Badge tone="warning">{row.latestReplyIntent}</Badge> : <span className="text-sm text-white/30">No reply</span>}
                    {row.hasUnhandledReply && <div className="text-xs text-white/50">Unhandled</div>}
                  </div>
                </td>
                <td className="p-4 text-sm text-white/70">{row.assignedTo ?? <span className="text-white/30">Unassigned</span>}</td>
                <td className="p-4">
                  {row.hasPendingReview ? <Badge tone="danger">Pending</Badge> : <Badge tone="muted">Reviewed</Badge>}
                </td>
                <td className="p-4">
                  <div className="pipeline-row-actions">
                    {approvalAction}
                    <div className="flex gap-2">
                      {canPause ? (
                        <ActionFeedbackForm action={changeLeadStatusAction} successMessage="Lead paused.">
                          <input type="hidden" name="leadId" value={row.id} />
                          <input type="hidden" name="status" value="paused" />
                          <button className="ui-button ui-button-secondary h-8 px-3 text-xs" type="submit">
                            Pause
                          </button>
                        </ActionFeedbackForm>
                      ) : null}
                      {canArchive ? (
                        <ActionFeedbackForm action={changeLeadStatusAction} successMessage="Lead archived.">
                          <input type="hidden" name="leadId" value={row.id} />
                          <input type="hidden" name="status" value="archived" />
                          <button className="ui-button ui-button-danger h-8 px-3 text-xs" type="submit">
                            Archive
                          </button>
                        </ActionFeedbackForm>
                      ) : null}
                    </div>
                  </div>
                </td>
              </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
