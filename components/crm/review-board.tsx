"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { completeReviewQueueItemAction } from "@/lib/crm/actions";
import { formatReplyIntentLabel } from "@/lib/crm/status-contract";
import { ActionFeedbackForm } from "@/components/crm/action-feedback-form";
import { DraftReviewEditor } from "@/components/crm/draft-review-editor";

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
  email?: string | null;
  hasUsableEmail?: boolean;
  leadStatus?: string;
  band?: string | null;
  score?: number | null;
  campaignName?: string | null;
  replyExcerpt?: string | null;
  draftSubject?: string | null;
  draftPreview?: string | null;
  intent?: string | null;
}

const rejectionPrompt = "Optional notes for this decision.";

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

function manualReviewApprovalBlock(item: ReviewItem) {
  if (item.source !== "manual_review") return null;
  const status = item.leadStatus ?? "";
  const reason = item.reason ?? "";
  const band = item.band ?? "";

  if (!item.hasUsableEmail) return "Missing prospect email";
  if (status === "enrichment_failed" || reason.includes("enrichment_failed")) return "Enrichment failed";
  if (["unsubscribed", "bounced", "paused", "not_interested", "archived"].includes(status)) {
    return `Lead is ${status.replaceAll("_", " ")}`;
  }
  if (band === "C" || band === "D") return `Band ${band} is not primary outreach-ready`;
  if (reason.includes("missing_contact") || reason.includes("blocked_missing_email")) return "Missing prospect email";
  return null;
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
  const approvalBlock = decision === "approved" ? manualReviewApprovalBlock(item) : null;

  return (
    <ActionFeedbackForm action={completeReviewQueueItemAction} successMessage={successMessage} className={className}>
      <input type="hidden" name="source" value={item.source} />
      <input type="hidden" name={sourceIdField(item.source)} value={item.sourceId} />
      <input type="hidden" name="leadId" value={item.leadId} />
      <input type="hidden" name="decision" value={decision} />
      {outcome ? <input type="hidden" name="outcome" value={outcome} /> : null}
      {noteName ? <textarea name={noteName} className="field mb-2" rows={3} placeholder={rejectionPrompt} /> : null}
      <Button type="submit" variant={variant} className="w-full shadow-lg" disabled={Boolean(approvalBlock)}>
        {label}
      </Button>
      {approvalBlock ? <p className="mt-2 text-xs leading-5 text-amber-200/85">{approvalBlock}</p> : null}
    </ActionFeedbackForm>
  );
}

function priorityAccent(priority: string) {
  if (["urgent", "high"].includes(priority)) return "bg-rose-400";
  if (priority === "low") return "bg-slate-500";
  return "bg-amber-400";
}

function priorityTone(priority: string): "default" | "success" | "info" | "warning" | "danger" | "muted" {
  if (["urgent", "high"].includes(priority)) return "danger";
  if (priority === "low") return "muted";
  return "warning";
}

export function ReviewBoard({ items }: Readonly<{ items: ReviewItem[] }>) {
  const [selectedId, setSelectedId] = useState<string | null>(items[0]?.id || null);
  const selected = items.find((item) => item.id === selectedId) || null;

  useEffect(() => {
    if (!items.some((item) => item.id === selectedId)) {
      setSelectedId(items[0]?.id ?? null);
    }
  }, [items, selectedId]);

  const groups = [
    {
      title: "Urgent",
      description: "Fast decisions and blocked workflows",
      match: (priority: string) => ["urgent", "high"].includes(priority)
    },
    {
      title: "Needs attention",
      description: "Important but not blocking",
      match: (priority: string) => !["urgent", "high", "low"].includes(priority)
    },
    {
      title: "Low priority",
      description: "Safe to process later",
      match: (priority: string) => priority === "low"
    }
  ];

  const urgentCount = useMemo(() => items.filter((item) => ["urgent", "high"].includes(item.priority)).length, [items]);
  const draftItems = useMemo(() => items.filter((item) => item.source === "email_draft"), [items]);
  const replyItems = useMemo(() => items.filter((item) => item.source === "reply_event"), [items]);
  const manualItems = useMemo(() => items.filter((item) => item.source === "manual_review"), [items]);

  if (!items.length) {
    return (
      <div className="mt-6">
        <EmptyState
          title="No review items match the current filters."
          description="Clear the filter set or switch to a broader review view to bring back approvals, replies, and manual interventions."
          action={(
            <a className="ui-button ui-button-secondary" href="/review">
              Reset review filters
            </a>
          )}
        />
      </div>
    );
  }

  return (
    <div className="mt-6 grid gap-6 xl:h-[calc(100vh-24rem)] xl:min-h-[560px] xl:grid-cols-[minmax(0,0.98fr)_minmax(360px,1.02fr)] xl:items-stretch xl:overflow-hidden">
      <section className="flex h-full min-h-0 flex-col gap-6 xl:overflow-y-auto xl:overscroll-contain xl:pr-2 xl:[scrollbar-color:rgba(139,92,246,0.55)_rgba(255,255,255,0.06)] xl:[scrollbar-gutter:stable] xl:[scrollbar-width:thin]">
        <section className="grid gap-3 md:grid-cols-3">
          <div className="crm-state-card p-4">
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">Urgent</span>
            <div className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">{urgentCount}</div>
            <p className="mt-1 text-xs text-white/45">Needs the fastest decision.</p>
          </div>
          <div className="crm-state-card p-4">
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">Draft approvals</span>
            <div className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">{draftItems.length}</div>
            <p className="mt-1 text-xs text-white/45">Waiting on a send decision.</p>
          </div>
          <div className="crm-state-card p-4">
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">Reply reviews</span>
            <div className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">{replyItems.length + manualItems.length}</div>
            <p className="mt-1 text-xs text-white/45">Human intervention lane.</p>
          </div>
        </section>

        {groups.map((group) => {
          const groupItems = items.filter((item) => group.match(item.priority));

          return (
            <section key={group.title} className="crm-state-card overflow-hidden">
              <div className="border-b border-white/8 px-5 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className={`h-2.5 w-2.5 rounded-full ${priorityAccent(groupItems[0]?.priority ?? "medium")}`} />
                      <h2 className="text-base font-semibold tracking-[-0.02em] text-white">{group.title}</h2>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-white/45">{group.description}</p>
                  </div>
                  <Badge tone={group.title === "Urgent" ? "danger" : "muted"}>{groupItems.length}</Badge>
                </div>
              </div>

              <div className="p-3">
                {groupItems.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/8 bg-white/[0.025] p-5 text-center text-sm text-white/48">
                    No {group.title.toLowerCase()} review items match the current filters.
                  </div>
                ) : null}

                <AnimatePresence mode="popLayout">
                  {groupItems.map((item) => {
                    const isSelected = selectedId === item.id;
                    const approvalBlock = manualReviewApprovalBlock(item);
                    const createdLabel = item.createdAt ? new Date(item.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "--";

                    return (
                      <motion.button
                        type="button"
                        layout
                        initial={{ opacity: 0, scale: 0.96, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: -8, filter: "blur(8px)" }}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        key={item.id}
                        onClick={() => setSelectedId(item.id)}
                        className={`group mb-2 flex w-full flex-col gap-3 rounded-2xl border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                          isSelected
                            ? "border-brand/35 bg-brand/10 shadow-[0_18px_36px_rgba(0,0,0,0.24)]"
                            : "border-white/8 bg-white/[0.04] hover:border-white/14 hover:bg-white/[0.06]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <strong className="truncate text-sm font-semibold leading-tight text-white" dir="auto" title={item.businessName}>
                                {item.businessName}
                              </strong>
                              <Badge tone={priorityTone(item.priority)} className="px-2.5 py-0.5 text-[10px] uppercase tracking-wide">
                                {item.priority}
                              </Badge>
                            </div>
                            <p className="mt-1 text-xs text-white/45">{sourceLabel(item.source)} | {item.campaignName ?? "No campaign"}</p>
                          </div>

                          <div className="shrink-0 text-right">
                            <span className="block text-[11px] font-mono text-white/45">{createdLabel}</span>
                            {item.score != null ? <span className="mt-1 block text-xs text-white/38">Score {item.score}</span> : null}
                          </div>
                        </div>

                        <p className="line-clamp-2 text-sm leading-6 text-white/72">{reviewReasonLabel(item)}</p>

                        <div className="flex flex-wrap gap-2">
                          {item.band ? <Badge tone="muted" className="px-2.5 py-0.5 text-[10px]">Band {item.band}</Badge> : null}
                          {item.leadStatus ? <Badge tone="info" className="px-2.5 py-0.5 text-[10px]">{item.leadStatus}</Badge> : null}
                          {item.replyExcerpt ? <Badge tone="default" className="px-2.5 py-0.5 text-[10px]">Reply context</Badge> : null}
                          {item.draftSubject ? <Badge tone="success" className="px-2.5 py-0.5 text-[10px]">Draft content</Badge> : null}
                          {approvalBlock ? <Badge tone="warning" className="px-2.5 py-0.5 text-[10px]">Not outreach-ready</Badge> : null}
                        </div>

                        <div className="flex items-center justify-between gap-3 border-t border-white/8 pt-3">
                          <div className="flex flex-wrap gap-2 text-xs text-white/42">
                            <span>{item.city ?? "Unknown city"}</span>
                            <span>{item.country ?? "Unknown country"}</span>
                          </div>
                          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
                            {isSelected ? "Focused" : "Open"}
                          </span>
                        </div>
                      </motion.button>
                    );
                  })}
                </AnimatePresence>
              </div>
            </section>
          );
        })}
      </section>

      <aside className="min-h-0">
        <div className="crm-state-card flex h-full min-h-[420px] flex-col overflow-hidden xl:min-h-0">
          <div className="border-b border-white/8 bg-white/[0.03] p-5">
            <h2 className="text-lg font-semibold tracking-[-0.02em] text-white">Review workspace</h2>
            <p className="mt-1 text-xs leading-5 text-white/45">Approve, reject, regenerate, or close the selected item.</p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 [scrollbar-color:rgba(139,92,246,0.55)_rgba(255,255,255,0.06)] [scrollbar-gutter:stable] [scrollbar-width:thin]">
            <AnimatePresence mode="wait">
              {selected ? (
                <motion.div
                  key={selected.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex flex-col gap-5"
                >
                  <div className="rounded-[24px] border border-white/8 bg-black/20 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="truncate text-2xl font-semibold tracking-[-0.03em] text-white" dir="auto" title={selected.businessName}>
                          {selected.businessName}
                        </h3>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge tone={priorityTone(selected.priority)}>{selected.priority}</Badge>
                          <Badge tone="info">{sourceLabel(selected.source)}</Badge>
                          {selected.leadStatus ? <Badge tone="muted">{selected.leadStatus}</Badge> : null}
                          {selected.band ? <Badge tone="muted">Band {selected.band}</Badge> : null}
                        </div>
                      </div>
                      <div className="grid min-w-[240px] grid-cols-2 gap-3 sm:min-w-[360px] sm:grid-cols-3">
                        {[
                          { label: "Score", value: selected.score ?? "--" },
                          { label: "Campaign", value: selected.campaignName ?? "--" },
                          { label: "Created", value: selected.createdAt ? new Date(selected.createdAt).toLocaleDateString([], { month: "short", day: "numeric" }) : "--" }
                        ].map((stat) => (
                          <div key={stat.label} className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
                            <span className="block text-[10px] font-semibold uppercase tracking-[0.22em] text-white/38">{stat.label}</span>
                            <span className="mt-1 block text-sm font-semibold text-white">{stat.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-sm leading-6 text-white/78">
                      {reviewReasonLabel(selected)}
                    </div>
                  </div>

                  {selected.source === "email_draft" ? (
                    <div className="rounded-[24px] border border-brand/15 bg-brand/5 p-1">
                      <DraftReviewEditor
                        draft={{
                          id: selected.sourceId,
                          subject: selected.draftSubject ?? "",
                          body: selected.draftPreview ?? "",
                          approval_status: "pending",
                          sent: false,
                          validation_passed: null,
                          block_reason: null
                        }}
                        leadId={selected.leadId}
                      />
                    </div>
                  ) : null}

                  {selected.replyExcerpt ? (
                    <div className="rounded-[24px] border border-white/8 bg-white/[0.035] p-5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">Reply context</span>
                        {selected.intent ? <Badge tone="info">{formatReplyIntentLabel(selected.intent)}</Badge> : null}
                      </div>
                      <p className="mt-3 text-sm leading-6 text-white/75 whitespace-pre-wrap">{selected.replyExcerpt}</p>
                    </div>
                  ) : null}

                  {selected.source === "manual_review" ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <ReviewQueueActionForm
                        item={selected}
                        decision="approved"
                        label="Approve for outreach"
                        successMessage="Manual review approved."
                        variant="primary"
                      />
                      <ReviewQueueActionForm
                        item={selected}
                        decision="rejected"
                        label="Reject / archive"
                        successMessage="Manual review rejected."
                        variant="danger"
                        noteName="notes"
                      />
                    </div>
                  ) : null}

                  {selected.source === "reply_event" ? (
                    <div className="grid gap-3 sm:grid-cols-3">
                      <ReviewQueueActionForm
                        item={selected}
                        decision="mark_reply_handled"
                        label="Mark handled"
                        successMessage="Reply marked handled."
                        variant="secondary"
                      />
                      <ReviewQueueActionForm
                        item={selected}
                        decision="won"
                        label="Mark won"
                        successMessage="Lead marked won."
                        outcome="won"
                      />
                      <ReviewQueueActionForm
                        item={selected}
                        decision="lost"
                        label="Mark lost"
                        successMessage="Lead marked lost."
                        variant="danger"
                        outcome="lost"
                        noteName="notes"
                      />
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-3">
                    {selected.source === "reply_event" ? (
                      <a className="ui-button ui-button-secondary" href={`/inbox?tab=review&thread=${selected.sourceId}`}>
                        Open inbox thread
                      </a>
                    ) : null}
                    <a className="ui-button ui-button-secondary" href={`/pipeline/${selected.leadId}`}>
                      Open full lead record
                    </a>
                  </div>
                </motion.div>
              ) : (
                <EmptyState
                  title="No review item selected."
                  description="Choose a review card to inspect the draft, reason, and decision actions."
                />
              )}
            </AnimatePresence>
          </div>
        </div>
      </aside>
    </div>
  );
}
