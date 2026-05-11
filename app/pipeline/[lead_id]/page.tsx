import { notFound } from "next/navigation";
import { PageHeader } from "@/components/crm/page-header";
import { Badge, bandTone } from "@/components/ui/badge";
import { Button, LinkButton } from "@/components/ui/button";
import { CrmSelect } from "@/components/ui/crm-select";
import { ScoreVisualizer } from "@/components/crm/score-visualizer";
import { StickyBottomBar } from "@/components/crm/sticky-bottom-bar";
import { InlineEditableField } from "@/components/crm/inline-editable-field";
import { DraftReviewEditor } from "@/components/crm/draft-review-editor";
import { LeadActionForm } from "./lead-action-form";
import {
  approveLeadAction,
  assignLeadAction,
  changeLeadStatusAction,
  closeLeadAction,
  overrideBandAction,
  updateLeadNotesAction
} from "@/lib/crm/actions";
import { getLeadDetail } from "@/lib/crm/queries";
import { Activity, Briefcase, CheckCircle, Mail, MessageSquare, Search, ThumbsDown } from "lucide-react";

function externalLink(value: string | null | undefined) {
  if (!value) return null;
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function getNextStepLabel(pendingDraft: any, pendingReview: any, approvedForOutreach: boolean) {
  if (pendingDraft) return "Review pending draft";
  if (pendingReview) return "Resolve manual review";
  if (approvedForOutreach) return "Awaiting automation";
  return "Approve for outreach";
}

function LeadHeroSection({ lead, pendingDraft, pendingReview }: { lead: any; pendingDraft: any; pendingReview: any }) {
  return (
    <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
      <div className="crm-state-card flex flex-col justify-between p-6 bg-gradient-to-br from-white/[0.05] to-transparent border-white/10">
        <div>
          <span className="metric-label">ICP Score</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-4xl font-bold text-white tracking-tight">{lead.score ?? 0}</span>
            <span className="text-white/40 font-medium">/ 100</span>
          </div>
        </div>
        <div className="mt-4">
          <Badge tone={bandTone(lead.effectiveBand)} className="px-3 py-1 text-xs">Band {lead.effectiveBand ?? "NA"}</Badge>
        </div>
      </div>

      <div className="crm-state-card flex flex-col justify-between p-6 bg-gradient-to-br from-white/[0.03] to-transparent border-white/8">
        <div>
          <span className="metric-label">Status</span>
          <div className="mt-2">
            <span className="text-2xl font-semibold text-white/90 capitalize tracking-tight">{lead.status}</span>
          </div>
        </div>
        <div className="mt-4">
          <span className="text-xs text-white/40 font-medium tracking-wide uppercase">Confidence: {lead.confidence ?? "Unknown"}</span>
        </div>
      </div>

      <div className="crm-state-card flex flex-col justify-between p-6 bg-gradient-to-br from-white/[0.03] to-transparent border-white/8">
        <div>
          <span className="metric-label">Campaign</span>
          <div className="mt-2">
            <span className="text-2xl font-semibold text-white/90 truncate block tracking-tight">{lead.campaignName ?? "Unassigned"}</span>
          </div>
        </div>
        <div className="mt-4">
          <span className="text-xs text-white/40 font-medium tracking-wide uppercase">Source: {lead.source ?? "Unknown"}</span>
        </div>
      </div>

      <div className="crm-state-card flex flex-col justify-between p-6 bg-brand/5 border-brand/20">
        <div>
          <span className="metric-label text-brand-light">Next Step</span>
          <div className="mt-2">
            <span className="text-xl font-medium text-white/90 leading-snug tracking-tight">
              {getNextStepLabel(pendingDraft, pendingReview, lead.approvedForOutreach)}
            </span>
          </div>
        </div>
        <div className="mt-4">
          <span className="text-xs text-brand-light/60 font-medium tracking-wide uppercase">Priority: High</span>
        </div>
      </div>
    </section>
  );
}

function PendingActionAlert({ lead, pendingDraft, pendingReview }: { lead: any; pendingDraft: any; pendingReview: any }) {
  if (!pendingDraft && !pendingReview) return null;

  const title = "Founder action required";
  const description = pendingDraft
    ? "A pending email draft needs your approval before WF-06 can initiate the send."
    : "A manual review item is currently blocking outreach progression for this lead.";
  const badgeLabel = pendingDraft ? "Draft pending" : "Manual review";

  return (
    <section className="panel mt-6 border border-amber-500/30 bg-amber-500/[0.05] shadow-lg shadow-amber-900/10">
      <div className="panel-header items-start bg-amber-500/[0.02]">
        <div>
          <h2 className="text-amber-100/90 font-semibold tracking-tight">{title}</h2>
          <p className="text-amber-100/60 mt-1">{description}</p>
        </div>
        <Badge tone="warning" className="bg-amber-500/20 border-amber-500/30">{badgeLabel}</Badge>
      </div>
      <div className="panel-body grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_300px]">
        {pendingDraft ? (
          <>
            <DraftReviewEditor draft={pendingDraft} leadId={lead.id} />
            <div className="stack-list">
              <div className="crm-state-card bg-black/20 border-white/5">
                <span className="metric-label">Sequence Step</span>
                <strong className="text-white/90 block mt-1">{pendingDraft.step_number ?? "--"}</strong>
              </div>
              <div className="crm-state-card bg-black/20 border-white/5">
                <span className="metric-label">Quality Check</span>
                <strong className="text-white/90 block mt-1">{pendingDraft.validation_passed ? "Passed" : "Needs review"}</strong>
              </div>
              <div className="crm-state-card bg-black/20 border-white/5">
                <span className="metric-label">Word count</span>
                <strong className="text-white/90 block mt-1">{pendingDraft.word_count ?? "--"} words</strong>
              </div>
              <div className="crm-state-card bg-black/20 border-white/5">
                <span className="metric-label text-amber-200/70">Warnings</span>
                <strong className="text-amber-100/90 block mt-1 text-sm font-normal">
                  {Array.isArray(pendingDraft.generation_warnings) && pendingDraft.generation_warnings.length > 0
                    ? pendingDraft.generation_warnings.join(", ")
                    : "None detected"}
                </strong>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="crm-state-card flex flex-col gap-4 bg-black/20 border-white/5">
              <div>
                <span className="metric-label">Blocking reason</span>
                <strong className="block mt-2 text-white/95 text-lg leading-tight tracking-tight">{pendingReview?.reason ?? "Manual review required"}</strong>
                <p className="mt-3 text-sm text-white/50 leading-relaxed">
                  This lead is paused until the review queue clears the item or the lead data is manually adjusted.
                </p>
              </div>
              <LinkButton variant="secondary" href="/review" className="w-full">
                Open Review Queue
              </LinkButton>
            </div>
            <div className="stack-list">
              <div className="crm-state-card bg-black/20 border-white/5">
                <span className="metric-label">Lead status</span>
                <strong className="text-white/90 block mt-1">{lead.status}</strong>
              </div>
              <div className="crm-state-card bg-black/20 border-white/5">
                <span className="metric-label text-amber-200/70">Queue status</span>
                <strong className="text-amber-100/90 block mt-1 capitalize">{pendingReview?.review_status ?? "pending"}</strong>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function IdentityProfilePanel({ lead }: { lead: any }) {
  return (
    <div className="panel shadow-sm">
      <div className="panel-header">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center border border-brand/20">
            <Briefcase className="w-4 h-4 text-brand-light" />
          </div>
          <div>
            <h2 className="tracking-tight">Identity & Profile</h2>
            <p className="text-xs">Core business data and enrichment signals.</p>
          </div>
        </div>
      </div>
      <div className="panel-body space-y-8">
        <div className="detail-grid gap-y-8">
          <InlineEditableField leadId={lead.id} field="business_name" initialValue={lead.businessName} label="Business name" />
          <InlineEditableField leadId={lead.id} field="email" initialValue={lead.email} label="Email" />
          <InlineEditableField leadId={lead.id} field="decision_maker_name" initialValue={lead.decisionMakerName} label="Decision maker" />
          <InlineEditableField leadId={lead.id} field="decision_maker_role" initialValue={lead.decisionMakerRole} label="Role" />
          <InlineEditableField leadId={lead.id} field="phone" initialValue={lead.phone} label="Phone" />
          <InlineEditableField leadId={lead.id} field="website" initialValue={lead.website} label="Website" />
        </div>

        <div className="pt-6 border-t border-white/5">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="crm-state-card p-3 text-center border-white/5 bg-white/[0.01]">
              <span className="metric-label text-[9px]">Booking link</span>
              <strong className="block mt-1 text-sm">{lead.enrichment?.booking_link_found ? "Found" : "None"}</strong>
            </div>
            <div className="crm-state-card p-3 text-center border-white/5 bg-white/[0.01]">
              <span className="metric-label text-[9px]">Contact form</span>
              <strong className="block mt-1 text-sm">{lead.enrichment?.contact_form_found ? "Found" : "None"}</strong>
            </div>
            <div className="crm-state-card p-3 text-center border-white/5 bg-white/[0.01]">
              <span className="metric-label text-[9px]">Chat widget</span>
              <strong className="block mt-1 text-sm">{lead.enrichment?.chat_widget_found ? "Found" : "None"}</strong>
            </div>
            <div className="crm-state-card p-3 text-center border-white/5 bg-white/[0.01]">
              <span className="metric-label text-[9px]">Enriched</span>
              <strong className="block mt-1 text-sm">{lead.enrichment?.last_enriched_at ? "Recent" : "Never"}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScoringHypothesisPanel({ lead }: { lead: any }) {
  return (
    <div className="panel shadow-sm">
      <div className="panel-header">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center border border-brand/20">
            <Search className="w-4 h-4 text-brand-light" />
          </div>
          <div>
            <h2 className="tracking-tight">Scoring & Hypothesis</h2>
            <p className="text-xs">Logic used to qualify and draft outreach hooks.</p>
          </div>
        </div>
      </div>
      <div className="panel-body space-y-8">
        <div className="flex flex-col md:flex-row items-center gap-10 p-6 bg-white/[0.02] rounded-2xl border border-white/5">
          <div className="shrink-0">
            <ScoreVisualizer score={lead.score ?? 0} band={lead.effectiveBand} />
          </div>
          <div className="flex flex-col gap-6 flex-grow w-full max-w-md">
            <div className="flex justify-between items-center pb-2">
              <span className="text-sm font-medium text-white/40 uppercase tracking-widest">Confidence</span>
              <span className="text-xl font-semibold text-white/90">{lead.confidence ?? "Unknown"}</span>
            </div>
            <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
              <div className="bg-brand h-full" style={{ width: `${lead.score ?? 0}%` }} />
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-sm font-medium text-white/40 uppercase tracking-widest">Reply Intent</span>
              <span className="text-xl font-semibold text-white/90">{lead.latestReplyIntent ?? "None"}</span>
            </div>
          </div>
        </div>

        <div className="table-wrap rounded-xl border border-white/5 overflow-hidden">
          <table className="data-table">
            <thead>
              <tr className="bg-white/[0.03]">
                <th className="py-4 px-5">Scoring Factor</th>
                <th className="py-4 px-5">Impact</th>
                <th className="py-4 px-5">Evidence Discovered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {lead.scoreEvidence.map((item: any) => (
                <tr key={item.id} className="hover:bg-white/[0.01] transition-colors">
                  <td className="py-4 px-5 font-medium text-white/80">{item.metricName}</td>
                  <td className="py-4 px-5">
                    <span className="font-mono text-brand-light">
                      {item.score}/{item.maxScore}
                    </span>
                  </td>
                  <td className="py-4 px-5">
                    <p className="text-sm text-white/60 leading-relaxed max-w-md">
                      {item.evidence ?? (
                        <span className="text-white/20 italic">No direct evidence found yet.</span>
                      )}
                    </p>
                    {item.missingData ? (
                      <p className="mt-2 text-[10px] uppercase tracking-wider text-amber-400/60 font-medium">Missing: {item.missingData}</p>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid gap-6 md:grid-cols-2 mt-8">
          <div className="crm-state-card border-white/5 bg-white/[0.01] p-5">
            <span className="metric-label block mb-3 text-brand-light/70">Pain point hypothesis</span>
            <p className="text-sm leading-relaxed text-white/80">{lead.hypothesis?.painPoint ?? "Not generated yet"}</p>
          </div>
          <div className="crm-state-card border-white/5 bg-white/[0.01] p-5">
            <span className="metric-label block mb-3 text-brand-light/70">Value proposition</span>
            <p className="text-sm leading-relaxed text-white/80">{lead.hypothesis?.suggestedSolution ?? "Not generated yet"}</p>
          </div>
          <div className="crm-state-card border-white/5 bg-white/[0.01] p-5">
            <span className="metric-label block mb-3 text-brand-light/70">Manual workflow hook</span>
            <p className="text-sm leading-relaxed text-white/80">{lead.hypothesis?.manualWorkflow ?? "Not generated yet"}</p>
          </div>
          <div className="crm-state-card border-white/5 bg-white/[0.01] p-5">
            <span className="metric-label block mb-3 text-brand-light/70">Business impact</span>
            <p className="text-sm leading-relaxed text-white/80">{lead.hypothesis?.businessImpact ?? "Not generated yet"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelinePanel({ lead, timelineCount }: { lead: any; timelineCount: number }) {
  return (
    <div className="panel shadow-sm">
      <div className="panel-header border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center border border-brand/20">
            <Activity className="w-4 h-4 text-brand-light" />
          </div>
          <div>
            <h2 className="tracking-tight">Event Timeline</h2>
            <p className="text-xs">{timelineCount} system events recorded.</p>
          </div>
        </div>
      </div>
      <div className="panel-body">
        {lead.timeline.length === 0 ? <div className="empty-state">No timeline events recorded for this lead record.</div> : null}
        {lead.timeline.length > 0 ? (
          <div className="relative space-y-8 before:absolute before:inset-0 before:ml-4 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-brand/30 before:via-white/5 before:to-transparent">
            {lead.timeline.map((item: any) => {
              let Icon = Activity;
              if (item.label.includes("Approved")) Icon = CheckCircle;
              if (item.label.includes("Email")) Icon = Mail;
              if (item.label.includes("Reply")) Icon = MessageSquare;
              if (item.label.includes("Discovered") || item.label.includes("Enriched")) Icon = Search;
              if (item.label.includes("Closed won")) Icon = Briefcase;
              if (item.label.includes("Closed lost") || item.label.includes("Rejected")) Icon = ThumbsDown;

              return (
                <div className="relative flex items-start gap-6 group" key={item.id}>
                  <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/80 text-brand-light shadow-md transition-all group-hover:border-brand/40 group-hover:bg-brand/10">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1 pt-1">
                    <div className="flex items-center justify-between gap-4">
                      <strong className="text-sm font-semibold text-white/90 tracking-tight">{item.label}</strong>
                      {item.at ? (
                        <time className="text-[10px] font-mono text-white/30 whitespace-nowrap">
                          {new Date(item.at).toLocaleDateString()} · {new Date(item.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </time>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-white/55 font-normal">{item.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function AsideActions({ lead, replyCount, draftCount, reviewCount }: { lead: any; replyCount: number; draftCount: number; reviewCount: number }) {
  return (
    <aside className="xl:col-span-1 flex flex-col gap-8 sticky top-24">
      <div className="panel bg-white/[0.01] border-white/8">
        <div className="panel-header bg-white/[0.02]">
          <h2 className="text-sm uppercase tracking-widest text-white/40 font-bold">Quick Actions</h2>
        </div>
        <div className="panel-body space-y-5">
          <div className="space-y-4">
            <LeadActionForm action={assignLeadAction} successMessage="Lead assignment saved." className="space-y-3">
              <input type="hidden" name="leadId" value={lead.id} />
              <label className="block">
                <span className="text-[10px] uppercase tracking-wider text-white/40 font-bold block mb-1.5 ml-1">Owner</span>
                <input name="assignedTo" defaultValue={lead.assignedTo ?? ""} className="w-full bg-black/40 border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-brand/50 transition-colors" />
              </label>
              <Button type="submit" variant="secondary" className="w-full h-10 rounded-xl">
                Update Owner
              </Button>
            </LeadActionForm>

            <div className="pt-4 border-t border-white/5 space-y-4">
              <LeadActionForm action={overrideBandAction} successMessage="Band override saved." className="space-y-4">
                <input type="hidden" name="leadId" value={lead.id} />
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[10px] uppercase tracking-wider text-white/40 font-bold ml-1">Band</span>
                    <CrmSelect
                      name="band"
                      defaultValue={lead.effectiveBand ?? "B"}
                      options={["A", "B", "C", "D"].map((band) => ({ value: band, label: `Band ${band}` }))}
                    />
                  </label>
                  <div className="flex items-end">
                    <button type="submit" className="ui-button ui-button-secondary w-full h-[42px] rounded-xl text-xs font-bold uppercase tracking-tight">
                      Override
                    </button>
                  </div>
                </div>
              </LeadActionForm>
            </div>

            <div className="pt-4 border-t border-white/5 grid grid-cols-2 gap-3">
              <LeadActionForm action={closeLeadAction} successMessage="Lead marked closed won.">
                <input type="hidden" name="leadId" value={lead.id} />
                <input type="hidden" name="outcome" value="won" />
                <Button type="submit" className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20 h-11 rounded-xl">Won</Button>
              </LeadActionForm>
              <LeadActionForm action={closeLeadAction} successMessage="Lead marked closed lost.">
                <input type="hidden" name="leadId" value={lead.id} />
                <input type="hidden" name="outcome" value="lost" />
                <Button type="submit" variant="danger" className="w-full h-11 rounded-xl">Lost</Button>
              </LeadActionForm>
            </div>
          </div>
        </div>
      </div>

      <div className="panel shadow-sm">
        <div className="panel-header border-b border-white/5">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-brand-light" />
              <h2 className="tracking-tight">Replies</h2>
            </div>
            <Badge tone="muted" className="px-2 py-0.5">{replyCount}</Badge>
          </div>
        </div>
        <div className="panel-body space-y-6">
          {lead.replies.length === 0 ? <div className="empty-state py-8">No replies recorded.</div> : null}
          {lead.replies.map((reply: any) => (
            <div className="relative space-y-4" key={reply.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white/90 leading-tight">{reply.summary ?? reply.reply_body ?? "Reply received"}</p>
                  <p className="mt-2 text-xs text-white/40 font-medium uppercase tracking-wide">Next: {reply.suggested_next_action ?? "No action suggested"}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <Badge tone="info" className="text-[9px] px-2 py-0">{reply.intent_classification ?? "reply"}</Badge>
                  <Badge tone={reply.handled_at ? "success" : "warning"} className="text-[9px] px-2 py-0">{reply.handled_at ? "Handled" : "Open"}</Badge>
                </div>
              </div>
              <div className="p-4 rounded-xl border border-white/5 bg-white/[0.015] shadow-inner">
                <div className="text-[10px] uppercase tracking-widest text-brand-light/50 font-bold mb-2">System Draft</div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/70 italic">
                  &quot;{reply.ai_draft_reply ?? "No AI draft generated."}&quot;
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel bg-white/[0.01] border-white/8">
        <div className="panel-header">
          <h2 className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Founder Notes</h2>
        </div>
        <div className="panel-body">
          <LeadActionForm action={updateLeadNotesAction} successMessage="Notes saved." className="space-y-4">
            <input type="hidden" name="leadId" value={lead.id} />
            <textarea
              name="notes"
              rows={6}
              defaultValue={lead.notes ?? ""}
              placeholder="Private operational notes..."
              className="w-full bg-black/40 border-white/10 rounded-xl p-4 text-sm focus:border-brand/50 transition-colors resize-none"
            />
            <Button type="submit" className="w-full h-10 rounded-xl">Save Note</Button>
          </LeadActionForm>
          <div className="space-y-3 mt-6">
            {lead.notesHistory.map((note: any) => (
              <div className="p-3 rounded-lg border border-white/5 bg-white/[0.01]" key={note.id}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider">{note.created_by}</span>
                  <time className="text-[10px] font-mono text-white/20">{new Date(note.created_at).toLocaleDateString()}</time>
                </div>
                <p className="text-xs leading-relaxed text-white/60">{note.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}

export default async function LeadDetailPage({ params }: Readonly<{ params: Promise<{ lead_id: string }> }>) {
  const { lead_id } = await params;
  const lead = await getLeadDetail(lead_id);
  if (!lead) notFound();

  const pendingDraft = lead.drafts.find((draft: any) => !draft.sent && (draft.approval_status ?? "pending") === "pending") ?? null;
  const pendingReview = lead.reviews.find((review: any) => review.review_status === "pending") ?? null;
  const websiteHref = externalLink(lead.website);
  const mapsHref = externalLink(lead.googleMapsUrl);
  const linkedinHref = externalLink(lead.linkedinUrl);
  const replyCount = lead.replies.length;
  const draftCount = lead.drafts.length;
  const reviewCount = lead.reviews.length;
  const timelineCount = lead.timeline.length;

  return (
    <>
      <PageHeader
        title={lead.businessName}
        description={[lead.niche, lead.city, lead.country].filter(Boolean).join(" / ") || "Lead record"}
        actions={
          <div className="button-row">
            {websiteHref ? (
              <a className="ui-button ui-button-secondary" href={websiteHref} target="_blank" rel="noreferrer">
                Website
              </a>
            ) : null}
            {mapsHref ? (
              <a className="ui-button ui-button-secondary" href={mapsHref} target="_blank" rel="noreferrer">
                Google Maps
              </a>
            ) : null}
            {linkedinHref ? (
              <a className="ui-button ui-button-secondary" href={linkedinHref} target="_blank" rel="noreferrer">
                LinkedIn
              </a>
            ) : null}
            {lead.approvedForOutreach ? (
              <Badge tone="success">Approved</Badge>
            ) : (
              <LeadActionForm action={approveLeadAction} successMessage="Lead approved for outreach.">
                <input type="hidden" name="leadId" value={lead.id} />
                <Button type="submit">Approve for outreach</Button>
              </LeadActionForm>
            )}
          </div>
        }
      />

      <LeadHeroSection lead={lead} pendingDraft={pendingDraft} pendingReview={pendingReview} />

      <PendingActionAlert lead={lead} pendingDraft={pendingDraft} pendingReview={pendingReview} />

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.35fr)_minmax(380px,0.85fr)] gap-8 items-start mt-8">
        <section className="space-y-8">
          <IdentityProfilePanel lead={lead} />
          <ScoringHypothesisPanel lead={lead} />
          <TimelinePanel lead={lead} timelineCount={timelineCount} />
        </section>

        <AsideActions lead={lead} replyCount={replyCount} draftCount={draftCount} reviewCount={reviewCount} />
      </div>

      <StickyBottomBar>
        <div className="flex w-full flex-col gap-4 lg:flex-row lg:items-center lg:justify-between px-2">
          <div className="flex items-center gap-4">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center border shadow-inner ${lead.approvedForOutreach ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-amber-500/10 border-amber-500/20 text-amber-400"}`}>
              {lead.approvedForOutreach ? <CheckCircle className="h-5 w-5" /> : <Activity className="h-5 w-5" />}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-white tracking-tight leading-none mb-1">
                {lead.businessName}
              </div>
              <div className="text-xs text-white/40 font-medium">
                {lead.approvedForOutreach ? "Approved for outreach" : "Awaiting founder approval"} · {lead.status}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            {lead.approvedForOutreach ? (
              <div className="h-10 px-4 flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-bold shadow-lg shadow-emerald-500/5">
                <CheckCircle className="h-4 w-4" />
                Approved
              </div>
            ) : (
              <LeadActionForm action={approveLeadAction} successMessage="Lead approved for outreach.">
                <input type="hidden" name="leadId" value={lead.id} />
                <button type="submit" className="h-10 px-6 rounded-xl bg-brand text-white text-sm font-bold shadow-xl shadow-brand/20 hover:bg-brand-hover transition-all active:scale-95">
                  Approve Outreach
                </button>
              </LeadActionForm>
            )}
            <div className="h-8 w-px bg-white/10 mx-1 hidden lg:block" />
            <div className="flex items-center gap-2">
              <LeadActionForm action={changeLeadStatusAction} successMessage="Lead paused.">
                <input type="hidden" name="leadId" value={lead.id} />
                <input type="hidden" name="status" value="paused" />
                <button type="submit" className="h-10 px-4 rounded-xl border border-white/10 bg-white/[0.05] text-white/70 text-sm font-bold hover:bg-white/[0.08] transition-all">
                  Pause
                </button>
              </LeadActionForm>
              <LeadActionForm action={changeLeadStatusAction} successMessage="Lead archived.">
                <input type="hidden" name="leadId" value={lead.id} />
                <input type="hidden" name="status" value="archived" />
                <button type="submit" className="h-10 px-4 rounded-xl border border-white/10 bg-white/[0.05] text-rose-400/70 text-sm font-bold hover:bg-rose-500/10 transition-all">
                  Archive
                </button>
              </LeadActionForm>
            </div>
          </div>
        </div>
      </StickyBottomBar>
    </>
  );
}
