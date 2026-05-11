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
            ) : (
              <span className="muted">No website</span>
            )}
            {mapsHref ? (
              <a className="ui-button ui-button-secondary" href={mapsHref} target="_blank" rel="noreferrer">
                Google Maps
              </a>
            ) : (
              <span className="muted">No Google Maps link</span>
            )}
            {linkedinHref ? (
              <a className="ui-button ui-button-secondary" href={linkedinHref} target="_blank" rel="noreferrer">
                LinkedIn
              </a>
            ) : (
              <span className="muted">No LinkedIn URL</span>
            )}
            {lead.approvedForOutreach ? (
              <Badge tone="success">Approved for outreach</Badge>
            ) : (
              <LeadActionForm action={approveLeadAction} successMessage="Lead approved for outreach.">
                <input type="hidden" name="leadId" value={lead.id} />
                <Button type="submit">Approve for outreach</Button>
              </LeadActionForm>
            )}
          </div>
        }
      />

      {pendingDraft || pendingReview ? (
        <section className="panel mt-6 border border-amber-500/20 bg-amber-500/[0.03]">
          <div className="panel-header items-start">
            <div>
              <h2>Founder review required</h2>
              <p className="muted">
                {pendingDraft
                  ? "A pending email draft needs approval before WF-06 can send it."
                  : "A manual review item is blocking outreach progression."}
              </p>
            </div>
            {pendingDraft ? <Badge tone="warning">Draft pending</Badge> : <Badge tone="warning">Manual review</Badge>}
          </div>
          <div className="panel-body grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_280px]">
            {pendingDraft ? (
              <>
                <DraftReviewEditor draft={pendingDraft} leadId={lead.id} />
                <div className="stack-list">
                  <div className="crm-state-card">
                    <span className="metric-label">Step</span>
                    <strong>{pendingDraft.step_number ?? "--"}</strong>
                  </div>
                  <div className="crm-state-card">
                    <span className="metric-label">Validation</span>
                    <strong>{pendingDraft.validation_passed ? "Passed" : "Needs review"}</strong>
                  </div>
                  <div className="crm-state-card">
                    <span className="metric-label">Word count</span>
                    <strong>{pendingDraft.word_count ?? "--"}</strong>
                  </div>
                  <div className="crm-state-card">
                    <span className="metric-label">Warnings</span>
                    <strong>
                      {Array.isArray(pendingDraft.generation_warnings)
                        ? pendingDraft.generation_warnings.join(", ")
                        : "None"}
                    </strong>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="crm-state-card flex flex-col gap-3">
                  <div>
                    <span className="metric-label">Blocking reason</span>
                    <strong className="block mt-1 text-white/90">{pendingReview?.reason ?? "Manual review required"}</strong>
                    <p className="mt-2 text-sm text-white/60">
                      This lead is paused until the review queue clears the item or the lead is adjusted.
                    </p>
                  </div>
                  <LinkButton variant="secondary" href="/review">
                    Open Review Queue
                  </LinkButton>
                </div>
                <div className="stack-list">
                  <div className="crm-state-card">
                    <span className="metric-label">Lead status</span>
                    <strong>{lead.status}</strong>
                  </div>
                  <div className="crm-state-card">
                    <span className="metric-label">Queue status</span>
                    <strong>{pendingReview?.review_status ?? "pending"}</strong>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.85fr)] gap-6 items-start mt-6">
        <section className="space-y-6">
          <div className="panel">
            <div className="panel-header">
              <div>
                <h2>Business profile</h2>
                <p>Identity, ownership, and routing context used by the CRM workflow.</p>
              </div>
              <div className="button-row">
                <Badge tone={bandTone(lead.effectiveBand)}>{lead.effectiveBand ?? "NA"}</Badge>
                <Badge tone="info">{lead.status}</Badge>
              </div>
            </div>
            <div className="panel-body space-y-6">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="crm-state-card">
                  <span className="metric-label">Source</span>
                  <strong>{lead.source ?? "Unknown"}</strong>
                </div>
                <div className="crm-state-card">
                  <span className="metric-label">Campaign</span>
                  <strong>{lead.campaignName ?? "Unassigned"}</strong>
                </div>
                <div className="crm-state-card">
                  <span className="metric-label">Owner</span>
                  <strong>{lead.assignedTo ?? "Unassigned"}</strong>
                </div>
              </div>

              <div className="detail-grid">
                <InlineEditableField leadId={lead.id} field="business_name" initialValue={lead.businessName} label="Business name" />
                <InlineEditableField leadId={lead.id} field="email" initialValue={lead.email} label="Email" />
                <InlineEditableField leadId={lead.id} field="phone" initialValue={lead.phone} label="Phone" />
                <InlineEditableField leadId={lead.id} field="whatsapp" initialValue={lead.whatsapp} label="WhatsApp" />
                <InlineEditableField leadId={lead.id} field="website" initialValue={lead.website} label="Website" />
                <InlineEditableField leadId={lead.id} field="linkedin_url" initialValue={lead.linkedinUrl} label="LinkedIn URL" />
                <InlineEditableField leadId={lead.id} field="decision_maker_name" initialValue={lead.decisionMakerName} label="Decision maker" />
                <InlineEditableField leadId={lead.id} field="decision_maker_role" initialValue={lead.decisionMakerRole} label="Role" />
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <div>
                <h2>ICP score</h2>
                <p>How WF-03 scored this lead and what evidence is still missing.</p>
              </div>
            </div>
            <div className="panel-body space-y-6">
              <div className="crm-state-card flex flex-col md:flex-row items-center gap-8">
                <div className="shrink-0">
                  <ScoreVisualizer score={lead.score ?? 0} band={lead.effectiveBand} />
                </div>
                <div className="flex flex-col gap-4 flex-grow w-full">
                  <div className="flex justify-between items-center pb-4 border-b border-white/5">
                    <span className="text-sm font-medium text-white/50 uppercase tracking-wider">Confidence</span>
                    <span className="text-lg font-light text-white/90">{lead.confidence ?? "Unknown"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-white/50 uppercase tracking-wider">Latest reply</span>
                    <span className="text-lg font-light text-white/90">{lead.latestReplyIntent ?? "None"}</span>
                  </div>
                </div>
              </div>
              <div className="table-wrap">
                <table className="data-table min-w-[860px]">
                  <thead>
                    <tr>
                      <th>Metric</th>
                      <th>Score</th>
                      <th>Evidence</th>
                      <th>Missing</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lead.scoreEvidence.map((item) => (
                      <tr key={item.id}>
                        <td className="text-white/85">{item.metricName}</td>
                        <td className="font-mono text-brand/80">
                          {item.score}/{item.maxScore}
                        </td>
                        <td className="text-white/65">{item.evidence ?? <span className="text-white/30">No evidence</span>}</td>
                        <td className="text-white/65">{item.missingData ?? <span className="text-white/30">None</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <div>
                <h2>Automation hypothesis</h2>
                <p>Why this lead was flagged and how the workflow expects to approach it.</p>
              </div>
            </div>
            <div className="panel-body">
              <div className="detail-grid">
                <div className="crm-state-card">
                  <span className="metric-label">Pain point</span>
                  <strong>{lead.hypothesis?.painPoint ?? "Not generated"}</strong>
                </div>
                <div className="crm-state-card">
                  <span className="metric-label">Manual workflow</span>
                  <strong>{lead.hypothesis?.manualWorkflow ?? "Not generated"}</strong>
                </div>
                <div className="crm-state-card">
                  <span className="metric-label">Suggested solution</span>
                  <strong>{lead.hypothesis?.suggestedSolution ?? "Not generated"}</strong>
                </div>
                <div className="crm-state-card">
                  <span className="metric-label">Business impact</span>
                  <strong>{lead.hypothesis?.businessImpact ?? "Not generated"}</strong>
                </div>
                <div className="crm-state-card detail-span-2">
                  <span className="metric-label">Outreach hook</span>
                  <strong>{lead.hypothesis?.outreachHook ?? "Not generated"}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <div>
                <h2>Enrichment</h2>
                <p>Signals discovered during crawl and enrichment steps.</p>
              </div>
            </div>
            <div className="panel-body">
              <div className="detail-grid">
                <div className="crm-state-card">
                  <span className="metric-label">Booking link</span>
                  <strong>{lead.enrichment?.booking_link_found ? "Found" : "Not found"}</strong>
                </div>
                <div className="crm-state-card">
                  <span className="metric-label">Contact form</span>
                  <strong>{lead.enrichment?.contact_form_found ? "Found" : "Not found"}</strong>
                </div>
                <div className="crm-state-card">
                  <span className="metric-label">Chat widget</span>
                  <strong>{lead.enrichment?.chat_widget_found ? "Found" : "Not found"}</strong>
                </div>
                <div className="crm-state-card">
                  <span className="metric-label">Last enriched</span>
                  <strong>{lead.enrichment?.last_enriched_at ? new Date(lead.enrichment.last_enriched_at).toLocaleString() : "Unknown"}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <div>
                <h2>Timeline</h2>
                <p>{timelineCount} system events, newest first.</p>
              </div>
            </div>
            <div className="panel-body">
              {lead.timeline.length === 0 ? <div className="empty-state">No timeline events yet.</div> : null}
              {lead.timeline.length > 0 ? (
                <div className="stack-list">
                  {lead.timeline.map((item) => {
                    let Icon = Activity;
                    if (item.label.includes("Approved")) Icon = CheckCircle;
                    if (item.label.includes("Email")) Icon = Mail;
                    if (item.label.includes("Reply")) Icon = MessageSquare;
                    if (item.label.includes("Discovered") || item.label.includes("Enriched")) Icon = Search;
                    if (item.label.includes("Closed won")) Icon = Briefcase;
                    if (item.label.includes("Closed lost") || item.label.includes("Rejected")) Icon = ThumbsDown;

                    return (
                      <div className="record-card border border-white/5" key={item.id}>
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/70 text-white/70 shadow-lg shadow-black/20">
                            <Icon className="h-4 w-4 text-brand" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <strong className="block text-white/90 font-medium">{item.label}</strong>
                            <p className="mt-2 text-sm leading-6 text-white/65">{item.detail}</p>
                            {item.at ? (
                              <time className="mt-3 block text-xs font-mono text-brand/60">
                                {new Date(item.at).toLocaleString()}
                              </time>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <aside className="xl:col-span-5 flex flex-col gap-6 sticky top-6">
          <div className="panel">
            <div className="panel-header">
              <div>
                <h2>Actions</h2>
                <p>Workflow-safe operations for assignment, status, and closure.</p>
              </div>
            </div>
            <div className="panel-body space-y-4">
              <div className="crm-state-card">
                <LeadActionForm action={assignLeadAction} successMessage="Lead assignment saved." className="form">
                  <input type="hidden" name="leadId" value={lead.id} />
                  <label>
                    Assign to
                    <input name="assignedTo" defaultValue={lead.assignedTo ?? ""} />
                  </label>
                  <Button type="submit" variant="secondary">
                    Assign
                  </Button>
                </LeadActionForm>
              </div>

              <div className="crm-state-card">
                <LeadActionForm action={overrideBandAction} successMessage="Band override saved." className="form">
                  <input type="hidden" name="leadId" value={lead.id} />
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-white/60">Band</span>
                    <CrmSelect
                      name="band"
                      defaultValue={lead.effectiveBand ?? "B"}
                      options={["A", "B", "C", "D"].map((band) => ({ value: band, label: `Band ${band}` }))}
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-white/60">Reason</span>
                    <input name="reason" placeholder="Why override this band?" className="field" />
                  </label>
                  <button type="submit" className="ui-button ui-button-secondary">
                    Override band
                  </button>
                </LeadActionForm>
              </div>

              <div className="crm-state-card">
                <div className="button-row">
                  <LeadActionForm action={changeLeadStatusAction} successMessage="Lead paused.">
                    <input type="hidden" name="leadId" value={lead.id} />
                    <input type="hidden" name="status" value="paused" />
                    <Button type="submit" variant="secondary">
                      Pause
                    </Button>
                  </LeadActionForm>
                  <LeadActionForm action={changeLeadStatusAction} successMessage="Lead archived.">
                    <input type="hidden" name="leadId" value={lead.id} />
                    <input type="hidden" name="status" value="archived" />
                    <Button type="submit" variant="danger">
                      Archive
                    </Button>
                  </LeadActionForm>
                </div>
              </div>

              <div className="crm-state-card">
                <div className="button-row">
                  <LeadActionForm action={closeLeadAction} successMessage="Lead marked closed won.">
                    <input type="hidden" name="leadId" value={lead.id} />
                    <input type="hidden" name="outcome" value="won" />
                    <Button type="submit">Closed won</Button>
                  </LeadActionForm>
                  <LeadActionForm action={closeLeadAction} successMessage="Lead marked closed lost.">
                    <input type="hidden" name="leadId" value={lead.id} />
                    <input type="hidden" name="outcome" value="lost" />
                    <Button type="submit" variant="danger">
                      Closed lost
                    </Button>
                  </LeadActionForm>
                </div>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <div>
                <h2>Replies</h2>
                <p>{replyCount} reply{replyCount === 1 ? "" : "s"} tracked for this lead.</p>
              </div>
              <Badge tone="muted">{replyCount}</Badge>
            </div>
            <div className="panel-body space-y-4">
              {lead.replies.length === 0 ? <div className="empty-state">No replies recorded.</div> : null}
              {lead.replies.map((reply: any) => (
                <div className="crm-state-card" key={reply.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white/90">{reply.summary ?? reply.reply_body ?? "Reply received"}</p>
                      <p className="mt-2 text-sm text-white/60">{reply.suggested_next_action ?? "No suggested next action."}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap justify-end gap-2">
                      <Badge tone="info">{reply.intent_classification ?? "reply"}</Badge>
                      <Badge tone={reply.handled_at ? "success" : "warning"}>{reply.handled_at ? "Handled" : "Open"}</Badge>
                    </div>
                  </div>
                  <div className="crm-state-card mt-3 border border-white/5 bg-white/[0.025]">
                    <div className="metric-label mb-1">AI reply draft</div>
                    <p className="whitespace-pre-wrap text-sm leading-6 text-white/75">
                      {reply.ai_draft_reply ?? "No AI reply draft was generated for this reply."}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <div>
                <h2>Drafts & reviews</h2>
                <p>{draftCount} draft{draftCount === 1 ? "" : "s"} and {reviewCount} review{reviewCount === 1 ? "" : "s"} on file.</p>
              </div>
              <Badge tone="muted">{draftCount + reviewCount}</Badge>
            </div>
            <div className="panel-body space-y-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-white/80">Pending drafts</h3>
                  <Badge tone="muted">{draftCount}</Badge>
                </div>
                {lead.drafts.length === 0 ? <div className="empty-state">No drafts recorded.</div> : null}
                {lead.drafts.map((draft: any) => (
                  <DraftReviewEditor draft={draft} leadId={lead.id} compact key={draft.id} />
                ))}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-white/80">Manual reviews</h3>
                  <Badge tone="muted">{reviewCount}</Badge>
                </div>
                {lead.reviews.length === 0 ? <div className="empty-state">No manual reviews recorded.</div> : null}
                {lead.reviews.map((review: any) => (
                  <div className="crm-state-card" key={review.id}>
                    <strong className="block text-white/90">{review.reason ?? "Review item"}</strong>
                    <div className="mt-2 text-sm text-white/60">{review.review_status}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <div>
                <h2>Notes</h2>
                <p>Founder notes stay local to the lead and are part of the same operational surface.</p>
              </div>
            </div>
            <div className="panel-body">
              <LeadActionForm action={updateLeadNotesAction} successMessage="Notes saved." className="form">
                <input type="hidden" name="leadId" value={lead.id} />
                <label>
                  Founder notes
                  <textarea name="notes" rows={8} defaultValue={lead.notes ?? ""} />
                </label>
                <Button type="submit">Save notes</Button>
              </LeadActionForm>
              <div className="stack-list mt-4">
                {lead.notesHistory.map((note: any) => (
                  <div className="crm-state-card" key={note.id}>
                    <div className="muted">
                      {note.created_by} - {new Date(note.created_at).toLocaleString()}
                    </div>
                    <p className="text-sm leading-6 text-white/75">{note.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>

      <StickyBottomBar>
        <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="crm-state-card flex-1 px-4 py-3">
            <div className="flex items-center gap-3">
              {lead.approvedForOutreach ? <Badge tone="success">Approved for outreach</Badge> : <Badge tone="warning">Needs approval</Badge>}
              <div className="min-w-0">
                <div className="text-sm font-medium text-white/90">Lead actions</div>
                <div className="text-sm text-white/55">
                  Approve, pause, archive, or close the lead without leaving this surface.
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {lead.approvedForOutreach ? (
              <div className="crm-state-card flex items-center gap-2 px-4 py-3">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span className="text-sm font-medium text-green-300">Approved</span>
              </div>
            ) : (
              <LeadActionForm action={approveLeadAction} successMessage="Lead approved for outreach." className="flex-1 lg:flex-none">
                <input type="hidden" name="leadId" value={lead.id} />
                <button type="submit" className="ui-button ui-button-primary w-full shadow-lg shadow-brand/20 lg:w-auto">
                  Approve for Outreach
                </button>
              </LeadActionForm>
            )}
            <LeadActionForm action={changeLeadStatusAction} successMessage="Lead paused.">
              <input type="hidden" name="leadId" value={lead.id} />
              <input type="hidden" name="status" value="paused" />
              <button type="submit" className="ui-button ui-button-secondary">
                Pause
              </button>
            </LeadActionForm>
            <LeadActionForm action={changeLeadStatusAction} successMessage="Lead archived.">
              <input type="hidden" name="leadId" value={lead.id} />
              <input type="hidden" name="status" value="archived" />
              <button type="submit" className="ui-button ui-button-danger">
                Archive
              </button>
            </LeadActionForm>
          </div>
        </div>
      </StickyBottomBar>
    </>
  );
}
