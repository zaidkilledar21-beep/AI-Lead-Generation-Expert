"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { completeReviewQueueItemAction, regenerateEmailDraftAction, updateEmailDraftAction } from "@/lib/crm/actions";
import { formatReplyIntentLabel } from "@/lib/crm/status-contract";
import { ActionFeedbackForm } from "@/components/crm/action-feedback-form";

interface ReviewItem {
  id: string;
  source: "manual_review" | "email_draft" | "reply_event";
  sourceId: string;
  draftId?: string;
  replyEventId?: string;
  leadId: string;
  businessName: string;
  reason: string;
  priority: string;
  createdAt: string;
  city?: string;
  country?: string;
  leadStatus?: string;
  band?: string | null;
  score?: number | null;
  campaignName?: string | null;
  replyExcerpt?: string | null;
  draftSubject?: string | null;
  draftPreview?: string | null;
  intent?: string | null;
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

const rejectionPrompt = "Please explain why this item is being rejected.";

function sourceLabel(source: ReviewItem["source"]) {
  if (source === "email_draft") return "Draft approval";
  if (source === "reply_event") return "Reply review";
  return "Manual review";
}

function reviewReasonLabel(item: ReviewItem) {
  if (!item.reason.startsWith("reply_")) return item.reason;
  return formatReplyIntentLabel(item.reason.slice("reply_".length));
}

function sourceIdField(source: ReviewItem["source"]) {
  if (source === "manual_review") return "reviewId";
  if (source === "email_draft") return "draftId";
  return "replyEventId";
}

function ReviewQueueActionForm({
  item,
  decision,
  label,
  successMessage,
  variant,
  outcome,
  noteName,
  className = "flex-1"
}: Readonly<{
  item: ReviewItem;
  decision: string;
  label: string;
  successMessage: string;
  variant?: "primary" | "secondary" | "danger";
  outcome?: "won" | "lost";
  noteName?: "notes" | "reason";
  className?: string;
}>) {
  return (
    <ActionFeedbackForm action={completeReviewQueueItemAction} successMessage={successMessage} className={className}>
      <input type="hidden" name="source" value={item.source} />
      <input type="hidden" name={sourceIdField(item.source)} value={item.sourceId} />
      <input type="hidden" name="leadId" value={item.leadId} />
      <input type="hidden" name="decision" value={decision} />
      {outcome ? <input type="hidden" name="outcome" value={outcome} /> : null}
      {noteName ? <textarea name={noteName} className="field mb-2" rows={3} placeholder={rejectionPrompt} /> : null}
      <Button type="submit" variant={variant} className="w-full shadow-lg">{label}</Button>
    </ActionFeedbackForm>
  );
}

export function ReviewBoard({ items }: Readonly<{ items: ReviewItem[] }>) {
  const [selectedId, setSelectedId] = useState<string | null>(items[0]?.id || null);

  useEffect(() => {
    if (!items.some((item) => item.id === selectedId)) {
      setSelectedId(items[0]?.id ?? null);
    }
  }, [items, selectedId]);

  const groups = [
    { title: "Urgent", match: (priority: string) => ["urgent", "high"].includes(priority) },
    { title: "Needs Attention", match: (priority: string) => !["urgent", "high", "low"].includes(priority) },
    { title: "Low Priority", match: (priority: string) => priority === "low" }
  ];

  const selected = items.find(item => item.id === selectedId) || null;
  const manualItems = items.filter((item) => item.source === "manual_review" && ["urgent", "high"].includes(item.priority));
  const draftItems = items.filter((item) => item.source === "email_draft");
  const replyItems = items.filter((item) => item.source === "reply_event");

  return (
    <div className="two-column review-grid gap-6">
      <section className="flex flex-col gap-6">
        <section className="grid gap-3 md:grid-cols-3">
          {manualItems.length === 0 ? <div className="crm-state-card p-4 text-sm font-medium text-white/60">No urgent manual reviews.</div> : null}
          {draftItems.length === 0 ? <div className="crm-state-card p-4 text-sm font-medium text-white/60">No draft approvals pending.</div> : null}
          {replyItems.length === 0 ? <div className="crm-state-card p-4 text-sm font-medium text-white/60">No reply reviews pending.</div> : null}
        </section>
        {groups.map((group) => {
          const groupItems = items.filter((item) => group.match(item.priority));

          return (
            <section className="panel p-5" key={group.title}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">{group.title}</h2>
                <Badge tone={group.title === "Urgent" ? "danger" : "muted"}>{groupItems.length}</Badge>
              </div>
              <div className="flex flex-col gap-3">
                {groupItems.length === 0 ? (
                  <div className="empty-state">No {group.title.toLowerCase()} review items match the current filters.</div>
                ) : null}
                <AnimatePresence mode="popLayout">
                  {groupItems.map((item) => (
                    <motion.button
                      type="button"
                      layout
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, filter: "blur(8px)" }}
                      whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.05)" }}
                      whileTap={{ scale: 0.98 }}
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      className={`
                        w-full p-4 rounded-xl cursor-pointer border text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand
                        ${selectedId === item.id ? "border-[var(--brand)] bg-[var(--brand)]/12 shadow-[0_12px_34px_rgba(0,0,0,0.20)]" : "border-white/10 bg-white/[0.045]"}
                      `}
                    >
                      <div className="flex justify-between items-start gap-3 mb-3">
                        <strong className="text-sm font-semibold leading-tight text-white">{item.businessName}</strong>
                        <Badge tone={item.priority === "high" || item.priority === "urgent" ? "danger" : "warning"}>
                          {item.priority}
                        </Badge>
                      </div>
                      <div className="mb-3 flex flex-wrap gap-2">
                        <Badge tone="info">{sourceLabel(item.source)}</Badge>
                        {item.band ? <Badge tone="muted">Band {item.band}</Badge> : null}
                        {item.score != null ? <Badge tone="muted">Score {item.score}</Badge> : null}
                      </div>
                      <p className="text-sm text-zinc-300 leading-relaxed line-clamp-2 mb-3">{reviewReasonLabel(item)}</p>
                      <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
                        <span>{item.campaignName ?? "No campaign"}</span>
                        <span>{[item.city, item.country].filter(Boolean).join(", ") || "Unknown geo"}</span>
                      </div>
                      <div className="mt-2 text-xs font-mono text-zinc-500">
                        {item.createdAt ? new Date(item.createdAt).toLocaleString() : "--"}
                      </div>
                    </motion.button>
                  ))}
                </AnimatePresence>
              </div>
            </section>
          );
        })}
      </section>

      <aside className="sticky top-6">
        <div className="panel h-full min-h-[400px]">
          <div className="p-5 border-b border-white/10 bg-white/[0.03]">
            <h2 className="text-lg font-semibold text-white">Review Workspace</h2>
            <p className="mt-1 text-xs text-white/45">Approve, reject, regenerate, or close the selected item.</p>
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
                  <div className="crm-state-card p-6">
                    <h3 className="text-2xl font-semibold text-white mb-3 leading-tight">{selected.businessName}</h3>
                    <div className="flex flex-wrap gap-2 mb-4">
                      <Badge tone={selected.priority === "urgent" || selected.priority === "high" ? "danger" : "warning"}>
                        {selected.priority}
                      </Badge>
                      <Badge tone="info">{sourceLabel(selected.source)}</Badge>
                      {selected.leadStatus ? <Badge tone="muted">{selected.leadStatus}</Badge> : null}
                      {selected.band ? <Badge tone="muted">Band {selected.band}</Badge> : null}
                    </div>
                    <div className="record-card text-sm text-zinc-200 leading-relaxed mb-4">
                      {reviewReasonLabel(selected)}
                    </div>
                    {selected.draftSubject ? (
                      <ActionFeedbackForm action={updateEmailDraftAction} successMessage="Draft edits saved." className="crm-state-card text-sm text-zinc-400 mb-4 space-y-3">
                        <input type="hidden" name="draftId" value={selected.sourceId} />
                        <input type="hidden" name="leadId" value={selected.leadId} />
                        <label className="flex flex-col gap-1">
                          <span className="text-zinc-200">Subject</span>
                          <input name="subject" className="field" defaultValue={selected.draftSubject} />
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="text-zinc-200">Body</span>
                          <textarea name="body" className="field" rows={8} defaultValue={selected.draftPreview ?? ""} />
                        </label>
                        <Button type="submit" variant="secondary">Save draft edits</Button>
                      </ActionFeedbackForm>
                    ) : null}
                    {selected.replyExcerpt ? (
                      <div className="record-card text-sm text-zinc-300 mb-4">
                        <strong className="block text-zinc-200 mb-2">{selected.intent ? formatReplyIntentLabel(selected.intent) : "Reply"}</strong>
                        <p className="line-clamp-4 whitespace-pre-wrap">{selected.replyExcerpt}</p>
                      </div>
                    ) : null}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-4">
                      <div className="crm-state-card p-3">
                        <span className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500">Score</span>
                        <span className="mt-1 block font-semibold text-zinc-200">{selected.score ?? "--"}</span>
                      </div>
                      <div className="crm-state-card p-3">
                        <span className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500">Campaign</span>
                        <span className="mt-1 block font-semibold text-zinc-200">{selected.campaignName ?? "--"}</span>
                      </div>
                    </div>
                    <div className="text-sm text-zinc-400 flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                      {[selected.city, selected.country].filter(Boolean).join(", ") || "Unknown geo"}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {selected.source === "manual_review" ? reviewDecisions.map((decision) => (
                      <ReviewQueueActionForm
                        item={selected}
                        decision={decision.value}
                        label={decision.label}
                        successMessage={decision.value === "approved" ? "Manual review approved." : "Manual review rejected."}
                        variant={decisionVariant(decision.value)}
                        noteName={decision.value === "rejected" ? "notes" : undefined}
                        key={decision.value}
                      />
                    )) : null}
                    {selected.source === "email_draft" ? (
                      <>
                        <ReviewQueueActionForm item={selected} decision="approved" label="Approve draft" successMessage="Draft approved." />
                        <ReviewQueueActionForm item={selected} decision="rejected" label="Reject draft" successMessage="Draft rejected." variant="danger" noteName="reason" />
                        <ActionFeedbackForm
                          action={regenerateEmailDraftAction}
                          successMessage="Regeneration requested. WF-05 will pick this up on the next run."
                          className="w-full flex flex-col gap-2"
                        >
                          <input type="hidden" name="draftId" value={selected.sourceId} />
                          <input type="hidden" name="leadId" value={selected.leadId} />
                          <input name="reason" placeholder="Regeneration note" className="field" />
                          <Button type="submit" variant="secondary" className="w-full shadow-lg">Request regenerate</Button>
                        </ActionFeedbackForm>
                      </>
                    ) : null}
                    {selected.source === "reply_event" ? (
                      <>
                        <ReviewQueueActionForm item={selected} decision="mark_reply_handled" label="Mark handled" successMessage="Reply marked handled." variant="secondary" />
                        <ReviewQueueActionForm item={selected} decision="won" label="Mark won" successMessage="Lead marked won." outcome="won" />
                        <ReviewQueueActionForm item={selected} decision="lost" label="Mark lost" successMessage="Lead marked lost." variant="danger" outcome="lost" noteName="notes" />
                      </>
                    ) : null}
                  </div>
                  {selected.source === "reply_event" ? (
                    <a className="ui-button ui-button-secondary w-full text-center mt-2" href={`/inbox?tab=review&thread=${selected.sourceId}`}>
                      Open inbox thread
                    </a>
                  ) : null}
                  
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
