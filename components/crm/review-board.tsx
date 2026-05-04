"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";
// Assuming completeReviewAction can be imported directly in a client component in Next 14+
import { completeReviewAction } from "@/lib/crm/actions";

interface ReviewItem {
  id: string;
  leadId: string;
  businessName: string;
  reason: string;
  priority: string;
  createdAt: string;
  city?: string;
  country?: string;
  leadStatus?: string;
}

function decisionVariant(decision: string) {
  if (decision === "rejected") return "danger" as const;
  if (decision === "approved") return "primary" as const;
  return "secondary" as const;
}

const reviewDecisions = [
  { value: "approved", label: "Approve for outreach" },
  { value: "rejected", label: "Reject / archive" }
] as const;

export function ReviewBoard({ items }: Readonly<{ items: ReviewItem[] }>) {
  const [selectedId, setSelectedId] = useState<string | null>(items[0]?.id || null);

  const groups = [
    { title: "Urgent", match: (priority: string) => ["urgent", "high"].includes(priority) },
    { title: "Needs Attention", match: (priority: string) => !["urgent", "high", "low"].includes(priority) },
    { title: "Low Priority", match: (priority: string) => priority === "low" }
  ];

  const selected = items.find(item => item.id === selectedId) || null;

  return (
    <div className="two-column review-grid gap-6">
      <section className="flex flex-col gap-6">
        {groups.map((group) => {
          const groupItems = items.filter((item) => group.match(item.priority));
          if (groupItems.length === 0) return null;

          return (
            <section className="glass-panel p-4 rounded-2xl border border-white/5" key={group.title}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-white">{group.title}</h2>
                <Badge tone={group.title === "Urgent" ? "danger" : "muted"}>{groupItems.length}</Badge>
              </div>
              <div className="flex flex-col gap-3">
                <AnimatePresence mode="popLayout">
                  {groupItems.map((item) => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, filter: "blur(8px)" }}
                      whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.05)" }}
                      whileTap={{ scale: 0.98 }}
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      className={`
                        p-4 rounded-xl cursor-pointer border transition-colors duration-200
                        ${selectedId === item.id ? "border-[var(--brand)] bg-[var(--brand)]/10" : "border-white/5 bg-white/5"}
                      `}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <strong className="text-zinc-100">{item.businessName}</strong>
                        <Badge tone={item.priority === "high" || item.priority === "urgent" ? "danger" : "warning"}>
                          {item.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-zinc-400 line-clamp-2 mb-2">{item.reason}</p>
                      <div className="text-xs font-mono text-zinc-500">
                        {item.createdAt ? new Date(item.createdAt).toLocaleString() : "--"}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </section>
          );
        })}
      </section>

      <aside className="sticky top-6">
        <div className="glass-panel rounded-2xl border border-white/5 h-full min-h-[400px]">
          <div className="p-4 border-b border-white/5">
            <h2 className="text-lg font-medium text-white">Review Workspace</h2>
          </div>
          <div className="p-6">
            <AnimatePresence mode="wait">
              {selected ? (
                <motion.div
                  key={selected.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex flex-col gap-6"
                >
                  <div className="glass-card p-6 rounded-xl border border-white/10 shadow-2xl">
                    <h3 className="text-2xl font-semibold text-white mb-4">{selected.businessName}</h3>
                    <div className="flex gap-2 mb-4">
                      <Badge tone={selected.priority === "urgent" || selected.priority === "high" ? "danger" : "warning"}>
                        {selected.priority}
                      </Badge>
                      {selected.leadStatus ? <Badge tone="muted">{selected.leadStatus}</Badge> : null}
                    </div>
                    <div className="text-zinc-300 mb-4 bg-black/20 p-4 rounded-lg border border-white/5">
                      {selected.reason}
                    </div>
                    <div className="text-sm text-zinc-500 flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                      {[selected.city, selected.country].filter(Boolean).join(", ") || "Unknown geo"}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {reviewDecisions.map((decision) => (
                      <form action={completeReviewAction} key={decision.value} className="flex-1">
                        <input type="hidden" name="reviewId" value={selected.id} />
                        <input type="hidden" name="leadId" value={selected.leadId} />
                        <input type="hidden" name="decision" value={decision.value} />
                        <Button 
                          type="submit" 
                          variant={decisionVariant(decision.value)}
                          className="w-full shadow-lg"
                        >
                          {decision.label}
                        </Button>
                      </form>
                    ))}
                  </div>
                  
                  <a className="ui-button ui-button-secondary w-full text-center mt-2" href={`/pipeline/${selected.leadId}`}>
                    Open full lead record
                  </a>
                </motion.div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center h-48 text-zinc-500"
                >
                  <div className="w-16 h-16 mb-4 rounded-full bg-white/5 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10.000 10.000 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
                  </div>
                  <p>No review items pending.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </aside>
    </div>
  );
}
