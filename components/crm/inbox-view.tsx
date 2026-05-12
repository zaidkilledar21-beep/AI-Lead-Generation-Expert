"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { CrmSelect } from "@/components/ui/crm-select";
import { EmptyState } from "@/components/ui/empty-state";
import { markReplyHandledAction, assignReplyAction, closeLeadAction } from "@/lib/crm/actions";
import { OBJECTION_REPLY_INTENTS, POSITIVE_REPLY_INTENTS, formatReplyIntentLabel } from "@/lib/crm/status-contract";
import { ActionFeedbackForm } from "@/components/crm/action-feedback-form";
import { CopyButton } from "@/components/crm/copy-button";
import { getReplySlaLabel } from "@/lib/crm/inbox-utils";

interface InboxThread {
  id: string;
  leadId: string;
  businessName: string;
  fromEmail: string;
  receivedAt: string | null;
  intent: string | null;
  sentiment: string | null;
  isUnhandled: boolean;
  requiresHumanReview?: boolean;
  body: string | null;
  excerpt: string | null;
  summary: string | null;
  suggestedNextAction: string | null;
  aiDraftReply: string | null;
  campaignName?: string | null;
  band?: string | null;
  confidence?: string | null;
  sentCount?: number;
  lastSentAt?: string | null;
  leadAssignedTo?: string | null;
  replyAssignedTo?: string | null;
}

interface TimelineItem {
  id: string;
  type: string;
  label: string;
  at: string;
  body?: string;
  sender?: string;
}

interface LeadProfile {
  user_id: string;
  display_name: string;
}

interface LeadDetails {
  id: string;
  assignedTo?: string | null;
  timeline: TimelineItem[];
}

function intentTone(intent: string | null): "info" | "success" | "warning" | "danger" | "muted" {
  if ((POSITIVE_REPLY_INTENTS as readonly string[]).includes(intent ?? "")) return "success";
  if ((OBJECTION_REPLY_INTENTS as readonly string[]).includes(intent ?? "")) return "danger";
  if (intent === "out_of_office") return "warning";
  if (intent === "bounce") return "muted";
  return "info";
}

function chipToneForSla(label: string | null): "info" | "warning" {
  if (!label) return "info";
  return label === "New today" ? "info" : "warning";
}

export function InboxView({
  filtered,
  selected,
  tab,
  query = "",
  sort = "newest",
  leadDetails,
  profiles = []
}: Readonly<{
  filtered: InboxThread[];
  selected: InboxThread | null;
  tab: string;
  query?: string;
  sort?: string;
  leadDetails?: LeadDetails | null;
  profiles?: LeadProfile[];
}>) {
  const [now, setNow] = useState<number | null>(null);
  const assignFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    setNow(Date.now());
  }, []);

  const messages = useMemo(() => {
    if (!leadDetails?.timeline) return [];
    return [...leadDetails.timeline]
      .filter((item) =>
        item.type === "reply" ||
        item.type === "sent" ||
        item.type === "outreach" ||
        (item.type === "action" && (item.label.includes("sent") || item.label.includes("outreach")))
      )
      .reverse();
  }, [leadDetails]);

  const listHref = (threadId: string) => {
    const params = new URLSearchParams({ tab, thread: threadId });
    if (query) params.set("q", query);
    if (sort !== "newest") params.set("sort", sort);
    return `/inbox?${params.toString()}`;
  };

  const openCount = filtered.filter((thread) => thread.isUnhandled).length;
  const reviewCount = filtered.filter((thread) => thread.requiresHumanReview).length;
  const actionableCount = filtered.filter((thread) => Boolean(thread.suggestedNextAction || thread.aiDraftReply)).length;
  const totalSent = filtered.reduce((sum, thread) => sum + (thread.sentCount ?? 0), 0);

  if (!filtered.length) {
    return (
      <div className="mt-6">
        <EmptyState
          title="No inbox threads match these filters."
          description="Clear the current view or switch back to All to reopen the shared founder inbox."
          action={(
            <a className="ui-button ui-button-secondary" href="/inbox">
              Reset inbox filters
            </a>
          )}
        />
      </div>
    );
  }

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(340px,0.96fr)_minmax(0,1.04fr)]">
      <section className="crm-state-card overflow-hidden">
        <div className="border-b border-white/8 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/40">Conversation queue</p>
              <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-white">Fast triage for shared founder replies.</h3>
              <p className="mt-2 max-w-lg text-sm leading-6 text-white/55">
                Open threads, AI-ready responses, and review-needed conversations are surfaced together so the next action is obvious.
              </p>
            </div>
            <Badge tone="muted">{filtered.length} visible</Badge>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Open", value: openCount, tone: "warning" },
              { label: "Review", value: reviewCount, tone: "danger" },
              { label: "AI ready", value: actionableCount, tone: "success" },
              { label: "Sent", value: totalSent, tone: "default" }
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3 shadow-[0_12px_30px_rgba(0,0,0,0.18)]">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">{stat.label}</span>
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      stat.tone === "warning" ? "bg-amber-400" :
                      stat.tone === "danger" ? "bg-rose-400" :
                      stat.tone === "success" ? "bg-emerald-400" :
                      "bg-brand-light"
                    }`}
                  />
                </div>
                <div className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">{stat.value}</div>
                <div className="mt-1 text-xs text-white/45">
                  {stat.label === "Open" ? "Still waiting" : stat.label === "Review" ? "Human gate" : stat.label === "AI ready" ? "Suggested next step" : "Touches recorded"}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="max-h-[74vh] overflow-y-auto p-3">
          <div className="flex flex-col gap-2">
            {filtered.map((thread, i) => {
              const isSelected = selected?.id === thread.id;
              const slaLabel = now ? getReplySlaLabel(thread.receivedAt, !thread.isUnhandled, now) : null;
              const assignedName = thread.replyAssignedTo ?? thread.leadAssignedTo;
              const assignedInitials = assignedName
                ? assignedName.split(" ").map((part) => part[0]).join("").toUpperCase().slice(0, 2)
                : null;
              const receivedLabel = thread.receivedAt && now
                ? new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(
                    Math.round((new Date(thread.receivedAt).getTime() - now) / 86400000),
                    "day"
                  )
                : (thread.receivedAt ? new Date(thread.receivedAt).toLocaleDateString() : "--");

              return (
                <motion.a
                  href={listHref(thread.id)}
                  key={thread.id}
                  initial={{ opacity: 0, x: -18 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03, type: "spring", stiffness: 320, damping: 28 }}
                  className={`group relative block overflow-hidden rounded-[22px] border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                    isSelected
                      ? "border-brand/35 bg-brand/10 shadow-[0_18px_36px_rgba(0,0,0,0.24)]"
                      : "border-white/8 bg-white/[0.035] hover:border-white/14 hover:bg-white/[0.055]"
                  }`}
                >
                  <div className={`absolute inset-y-0 left-0 w-1.5 ${isSelected ? "bg-brand" : "bg-white/10"} opacity-80`} />

                  <div className="flex items-start justify-between gap-3 pl-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className={`truncate text-sm font-semibold leading-tight ${isSelected ? "text-white" : "text-white/92"}`}>
                          {thread.businessName}
                        </strong>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                          thread.isUnhandled
                            ? "bg-amber-500/15 text-amber-200"
                            : "bg-emerald-500/12 text-emerald-200"
                        }`}>
                          {thread.isUnhandled ? "Open" : "Handled"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-white/48">{thread.fromEmail}</p>
                    </div>

                    <div className="shrink-0 text-right">
                      <span className="block text-[11px] font-mono text-white/52">{receivedLabel}</span>
                      {thread.campaignName ? <span className="mt-1 block text-xs text-white/38">{thread.campaignName}</span> : null}
                    </div>
                  </div>

                  <p className="pl-3 pr-1 mt-3 line-clamp-2 text-sm leading-6 text-white/72">
                    {thread.excerpt || thread.summary || "No reply excerpt stored."}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-2 pl-3">
                    <Badge tone={intentTone(thread.intent)} className="px-2.5 py-0.5 text-[10px] uppercase tracking-wide">
                      {thread.intent ? formatReplyIntentLabel(thread.intent) : "unclassified"}
                    </Badge>
                    {thread.band ? <Badge tone="muted" className="px-2.5 py-0.5 text-[10px]">Band {thread.band}</Badge> : null}
                    {thread.confidence ? <Badge tone="info" className="px-2.5 py-0.5 text-[10px]">Confidence {thread.confidence}</Badge> : null}
                    {slaLabel ? <Badge tone={chipToneForSla(slaLabel)} className="px-2.5 py-0.5 text-[10px]">{slaLabel}</Badge> : null}
                    {thread.suggestedNextAction ? <Badge tone="success" className="px-2.5 py-0.5 text-[10px]">AI next action</Badge> : null}
                    {thread.aiDraftReply ? <Badge tone="default" className="px-2.5 py-0.5 text-[10px]">Draft ready</Badge> : null}
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3 pl-3">
                    <div className="flex items-center gap-2">
                      {assignedInitials ? (
                        <div
                          className="flex h-6 w-6 items-center justify-center rounded-full border border-white/12 bg-white/10 text-[10px] font-semibold text-white/70"
                          title={`Assigned to ${assignedName}`}
                        >
                          {assignedInitials}
                        </div>
                      ) : null}
                      <span className="text-[11px] text-white/45">{assignedName ?? "Unassigned"}</span>
                    </div>
                    <span className="text-[11px] font-mono text-white/35">{thread.sentCount ?? 0} sent</span>
                  </div>
                </motion.a>
              );
            })}
          </div>
        </div>
      </section>

      <aside className="grid gap-6">
        {selected ? (
          <>
            <section className="crm-state-card overflow-hidden">
              <div className="border-b border-white/8 p-6">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/40">Active conversation</p>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-brand/25 bg-brand/15 text-lg font-semibold text-white shadow-[0_18px_34px_rgba(130,81,238,0.18)]">
                        {selected.businessName.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate text-2xl font-semibold tracking-[-0.03em] text-white">{selected.businessName}</h3>
                        <p className="mt-1 truncate text-sm text-white/55">
                          {selected.fromEmail}
                          {selected.campaignName ? ` · ${selected.campaignName}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Badge tone={selected.isUnhandled ? "warning" : "success"}>{selected.isUnhandled ? "Needs attention" : "Handled"}</Badge>
                      {selected.intent ? <Badge tone={intentTone(selected.intent)}>{formatReplyIntentLabel(selected.intent)}</Badge> : null}
                      {selected.band ? <Badge tone="muted">Band {selected.band}</Badge> : null}
                      {selected.confidence ? <Badge tone="info">Confidence {selected.confidence}</Badge> : null}
                      {now && selected.receivedAt ? <Badge tone={chipToneForSla(getReplySlaLabel(selected.receivedAt, !selected.isUnhandled, now))}>{getReplySlaLabel(selected.receivedAt, !selected.isUnhandled, now)}</Badge> : null}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[420px]">
                    {[
                      { label: "Sent touches", value: selected.sentCount ?? 0, note: selected.lastSentAt ? new Date(selected.lastSentAt).toLocaleDateString() : "No send history" },
                      { label: "Assignment", value: selected.replyAssignedTo ?? leadDetails?.assignedTo ?? selected.leadAssignedTo ?? "—", note: "Reply owner" },
                      { label: "Lead record", value: selected.leadId.slice(0, 8), note: "Open full lead" }
                    ].map((stat) => (
                      <div key={stat.label} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                        <span className="block text-[10px] font-semibold uppercase tracking-[0.22em] text-white/38">{stat.label}</span>
                        <div className="mt-2 truncate text-sm font-semibold text-white">{stat.value}</div>
                        <div className="mt-1 text-xs text-white/45">{stat.note}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 border-b border-white/8 p-5 sm:grid-cols-[minmax(0,1fr)_minmax(300px,360px)]">
                <div className="rounded-2xl border border-brand/15 bg-brand/10 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand-light/70">Suggested next action</span>
                    <Badge tone="success" className="px-2.5 py-0.5 text-[10px] uppercase">Ready</Badge>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-white/80">
                    {selected.suggestedNextAction || "No suggested next action stored."}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">Ownership</span>
                    <Badge tone={selected.isUnhandled ? "warning" : "success"} className="px-2.5 py-0.5 text-[10px] uppercase">
                      {selected.isUnhandled ? "Open" : "Resolved"}
                    </Badge>
                  </div>
                  <ActionFeedbackForm formRef={assignFormRef} action={assignReplyAction} successMessage="Conversation assignment updated." className="mt-3 flex flex-col gap-2">
                    <input type="hidden" name="replyEventId" value={selected.id} />
                    <input type="hidden" name="leadId" value={selected.leadId} />
                    <CrmSelect
                      name="assignedTo"
                      defaultValue={selected.replyAssignedTo ?? leadDetails?.assignedTo ?? selected.leadAssignedTo ?? ""}
                      placeholder="Assign to..."
                      emptyState="No founder profiles configured."
                      options={profiles.map((profile) => ({
                        value: profile.display_name,
                        label: profile.display_name
                      }))}
                      onValueChange={() => assignFormRef.current?.requestSubmit()}
                    />
                  </ActionFeedbackForm>
                  <p className="mt-2 text-xs leading-5 text-white/38">Assigning a reply updates the conversation owner immediately.</p>
                </div>
              </div>
            </section>

            <section className="crm-state-card overflow-hidden">
              <div className="border-b border-white/8 p-5">
                <h4 className="text-sm font-semibold tracking-[-0.02em] text-white">Conversation timeline</h4>
                <p className="mt-1 text-xs leading-5 text-white/45">Lead and inbox context, ordered by the most recent activity.</p>
              </div>
              <div className="space-y-3 p-5">
                {messages.length > 0 ? messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.type === "sent" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[88%] rounded-[20px] border px-4 py-3 shadow-[0_12px_32px_rgba(0,0,0,0.16)] ${
                        msg.type === "sent"
                          ? "border-brand/22 bg-brand/10 text-brand-light"
                          : "border-white/10 bg-white/[0.05] text-white/84"
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-between gap-4">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-55">
                          {msg.type === "sent" ? "You" : (msg.sender || "Lead")}
                        </span>
                        <span className="text-[10px] font-mono opacity-45">
                          {msg.at ? new Date(msg.at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                        </span>
                      </div>
                      <div className="whitespace-pre-wrap text-sm leading-6">{msg.body}</div>
                    </div>
                  </div>
                )) : (
                  <div className="rounded-[20px] border border-white/8 bg-white/[0.035] p-5 text-sm leading-6 text-white/65">
                    {selected.body || selected.excerpt || "No reply body stored."}
                  </div>
                )}
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-[24px] border border-brand/18 bg-brand/10 p-5">
                <div className="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand-light/75">AI summary</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-brand-light/85">
                  {selected.summary || "No AI summary was stored for this reply."}
                </p>
              </div>

              <div className="rounded-[24px] border border-sky-400/18 bg-sky-500/10 p-5">
                <div className="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-sky-300">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                  </svg>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-sky-200">Suggested next action</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-sky-100/85">
                  {selected.suggestedNextAction || "Wait for further classification."}
                </p>
                <div className="mt-4">
                  <CopyButton value={selected.suggestedNextAction} label="Copy suggested next action" unavailableLabel="No suggested next action stored." className="text-[10px]" />
                </div>
              </div>
            </section>

            <section className="crm-state-card overflow-hidden">
              <div className="flex items-center justify-between gap-4 border-b border-white/8 p-5">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/18 text-brand-light">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand">
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">AI draft reply</h4>
                    <p className="mt-1 text-xs text-white/45">Copy the draft and send it from the Gmail-managed inbox.</p>
                  </div>
                </div>
                <CopyButton value={selected.aiDraftReply} label="Copy AI draft" unavailableLabel="No AI draft stored." className="text-[10px]" />
              </div>
              <div className="p-5">
                <div className="rounded-[20px] border border-brand/15 bg-brand/5 p-4 text-sm leading-6 text-white/80">
                  {selected.aiDraftReply ?? "No AI reply draft was generated for this reply."}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <CopyButton value={selected.body || selected.excerpt} label="Copy reply body" unavailableLabel="No reply body stored." className="text-[10px]" />
                  <CopyButton value={selected.fromEmail} label="Copy lead email" unavailableLabel="No lead email stored." className="text-[10px]" />
                </div>
              </div>
            </section>

            <ActionFeedbackForm action={markReplyHandledAction} successMessage="Reply marked handled." className="crm-state-card overflow-hidden">
              <input type="hidden" name="replyEventId" value={selected.id} />
              <input type="hidden" name="leadId" value={selected.leadId} />
              <div className="border-b border-white/8 p-5">
                <h4 className="text-sm font-semibold text-white">Close the interaction</h4>
                <p className="mt-1 text-xs leading-5 text-white/45">Marking handled removes this thread from the active inbox queue.</p>
              </div>
              <div className="space-y-4 p-5">
                <textarea
                  name="notes"
                  rows={3}
                  placeholder="Add a closing note for this interaction..."
                  className="field resize-none text-sm"
                />
                <div className="flex items-center justify-between gap-4">
                  <p className="text-[10px] leading-5 text-white/34">Handled threads stay in history, but leave the active triage lane.</p>
                  <button type="submit" className="ui-button ui-button-primary">
                    Complete interaction
                  </button>
                </div>
              </div>
            </ActionFeedbackForm>

            <div className="flex flex-wrap gap-3">
              <ActionFeedbackForm action={closeLeadAction} successMessage="Lead marked won." className="flex items-center">
                <input type="hidden" name="leadId" value={selected.leadId} />
                <input type="hidden" name="replyEventId" value={selected.id} />
                <input type="hidden" name="outcome" value="won" />
                <button type="submit" className="ui-button ui-button-secondary border-emerald-500/20 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/18">
                  Mark won
                </button>
              </ActionFeedbackForm>
              <ActionFeedbackForm action={closeLeadAction} successMessage="Lead marked lost." className="flex items-center">
                <input type="hidden" name="leadId" value={selected.leadId} />
                <input type="hidden" name="replyEventId" value={selected.id} />
                <input type="hidden" name="outcome" value="lost" />
                <input type="hidden" name="notes" value="Marked lost from inbox." />
                <button type="submit" className="ui-button ui-button-danger">
                  Mark lost
                </button>
              </ActionFeedbackForm>
              <a href={`/pipeline/${selected.leadId}`} className="ui-button ui-button-secondary">
                Open full lead record
              </a>
            </div>
          </>
        ) : (
          <EmptyState
            title="Select a thread to inspect the reply."
            description="The selected conversation opens here with summary, AI context, and the handling actions."
            action={(
              <a className="ui-button ui-button-secondary" href="/inbox">
                Return to inbox
              </a>
            )}
          />
        )}
      </aside>
    </div>
  );
}
