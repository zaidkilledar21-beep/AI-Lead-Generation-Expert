"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Badge, bandTone } from "@/components/ui/badge";
import { ScoreBar } from "@/components/ui/score-bar";
import { approveLeadAction, changeLeadStatusAction, bulkApproveLeadsAction, bulkChangeLeadStatusAction } from "@/lib/crm/actions";
import { useLeadSelection } from "@/lib/hooks/use-lead-selection";
import { useTransition } from "react";

export function PipelineListView({ filtered }: Readonly<{ filtered: any[] }>) {
  const { selectedArray, toggleSelection, toggleAll, clearSelection, isSelected, isAllSelected, count } = useLeadSelection(filtered);
  const [isPending, startTransition] = useTransition();

  const handleBulkApprove = () => {
    startTransition(async () => {
      await bulkApproveLeadsAction(selectedArray);
      clearSelection();
    });
  };

  const handleBulkStatus = (status: "paused" | "unsubscribed" | "archived") => {
    startTransition(async () => {
      await bulkChangeLeadStatusAction(selectedArray, status);
      clearSelection();
    });
  };

  return (
    <section className="glass-panel overflow-hidden relative">
      <AnimatePresence>
        {count > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-0 left-0 right-0 z-10 p-4 bg-brand/10 backdrop-blur-xl border-b border-brand/20 flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-white/90">{count} selected</span>
              <button onClick={clearSelection} className="text-xs text-brand hover:text-brand-light transition-colors">Clear</button>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleBulkApprove} 
                disabled={isPending}
                className="px-4 py-2 text-xs font-medium bg-brand hover:bg-brand-light text-white rounded-lg transition-colors shadow-lg shadow-brand/20 disabled:opacity-50"
              >
                Approve Selected
              </button>
              <button 
                onClick={() => handleBulkStatus("paused")} 
                disabled={isPending}
                className="px-4 py-2 text-xs font-medium bg-white/5 hover:bg-white/10 text-white/80 rounded-lg transition-colors border border-white/10 disabled:opacity-50"
              >
                Pause Selected
              </button>
              <button 
                onClick={() => handleBulkStatus("archived")} 
                disabled={isPending}
                className="px-4 py-2 text-xs font-medium bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors border border-red-500/20 disabled:opacity-50"
              >
                Archive Selected
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="p-6 border-b border-white/5">
        <h2 className="text-lg font-medium text-white/90">Lead list</h2>
        <span className="text-sm text-white/40">Row actions are live; bulk actions are the next safe extension point.</span>
      </div>
      <div className="overflow-x-auto">
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
            {filtered.map((row, i) => (
              <motion.tr 
                key={row.id}
                className={`border-b hover:bg-white/[0.02] transition-colors group ${isSelected(row.id) ? "bg-brand/5 border-brand/20" : "border-white/5"}`}
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
                  <a href={`/pipeline/${row.id}`} className="block font-medium text-white/90 group-hover:text-brand transition-colors">
                    {row.businessName}
                  </a>
                  <div className="text-sm text-white/40 mt-1">
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
                <td className="p-4 text-sm text-white/60">{row.campaignName ?? <span className="text-white/30">Unassigned</span>}</td>
                <td className="p-4">
                  <div className="flex flex-col items-start gap-1">
                    {row.latestReplyIntent ? <Badge tone="warning">{row.latestReplyIntent}</Badge> : <span className="text-sm text-white/30">No reply</span>}
                    {row.hasUnhandledReply && <div className="text-xs text-white/50">Unhandled</div>}
                  </div>
                </td>
                <td className="p-4 text-sm text-white/60">{row.assignedTo ?? <span className="text-white/30">Unassigned</span>}</td>
                <td className="p-4">
                  {row.hasPendingReview ? <Badge tone="danger">Pending</Badge> : <Badge tone="muted">Reviewed</Badge>}
                </td>
                <td className="p-4">
                  <div className="flex flex-col gap-2">
                    {row.approvedForOutreach ? (
                      <Badge tone="success">Approved</Badge>
                    ) : (
                      <form action={approveLeadAction}>
                        <input type="hidden" name="leadId" value={row.id} />
                        <button className="px-3 py-1.5 text-xs font-medium bg-brand hover:bg-brand-light text-white rounded-lg transition-colors shadow-lg shadow-brand/20" type="submit">
                          Approve
                        </button>
                      </form>
                    )}
                    <div className="flex gap-2">
                      <form action={changeLeadStatusAction}>
                        <input type="hidden" name="leadId" value={row.id} />
                        <input type="hidden" name="status" value="paused" />
                        <button className="px-3 py-1.5 text-xs font-medium bg-white/5 hover:bg-white/10 text-white/80 rounded-lg transition-colors border border-white/10" type="submit">
                          Pause
                        </button>
                      </form>
                      <form action={changeLeadStatusAction}>
                        <input type="hidden" name="leadId" value={row.id} />
                        <input type="hidden" name="status" value="archived" />
                        <button className="px-3 py-1.5 text-xs font-medium bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors border border-red-500/20" type="submit">
                          Archive
                        </button>
                      </form>
                    </div>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
