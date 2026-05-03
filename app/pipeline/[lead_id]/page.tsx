import { notFound } from "next/navigation";
import { PageHeader } from "@/components/crm/page-header";
import { Badge, bandTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScoreVisualizer } from "@/components/crm/score-visualizer";
import { approveLeadAction, assignLeadAction, changeLeadStatusAction, closeLeadAction, overrideBandAction, updateLeadNotesAction } from "@/lib/crm/actions";
import { getLeadDetail } from "@/lib/crm/queries";

export default async function LeadDetailPage({ params }: Readonly<{ params: { lead_id: string } }>) {
  const lead = await getLeadDetail(params.lead_id);
  if (!lead) notFound();

  return (
    <>
      <PageHeader
        title={lead.businessName}
        description={[lead.niche, lead.city, lead.country].filter(Boolean).join(" / ") || "Lead record"}
        actions={
          <div className="button-row">
            <a className="ui-button ui-button-secondary" href={lead.website ?? "#"} target="_blank">Website</a>
            <a className="ui-button ui-button-secondary" href={lead.googleMapsUrl ?? "#"} target="_blank">Google Maps</a>
            {lead.approvedForOutreach ? (
              <Badge tone="success">Approved for outreach</Badge>
            ) : (
              <form action={approveLeadAction}>
                <input type="hidden" name="leadId" value={lead.id} />
                <Button type="submit">Approve for outreach</Button>
              </form>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start mt-6">
        <section className="xl:col-span-7 flex flex-col gap-6">
          <div className="glass-panel group">
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
              <h2>Business profile</h2>
              <div className="flex gap-2">
                <Badge tone={bandTone(lead.effectiveBand)}>{lead.effectiveBand ?? "NA"}</Badge>
                <Badge tone="info">{lead.status}</Badge>
              </div>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
              <div><span className="metric-label">Email</span><strong>{lead.email ?? "Unknown"}</strong></div>
              <div><span className="metric-label">Phone</span><strong>{lead.phone ?? "Unknown"}</strong></div>
              <div><span className="metric-label">WhatsApp</span><strong>{lead.whatsapp ?? "Unknown"}</strong></div>
              <div><span className="metric-label">Source</span><strong>{lead.source ?? "Unknown"}</strong></div>
              <div><span className="metric-label">Campaign</span><strong>{lead.campaignName ?? "Unassigned"}</strong></div>
              <div><span className="metric-label">Owner</span><strong>{lead.assignedTo ?? "Unassigned"}</strong></div>
              <div><span className="metric-label">Decision maker</span><strong>{lead.decisionMakerName ?? "Unknown"}</strong></div>
              <div><span className="metric-label">Role</span><strong>{lead.decisionMakerRole ?? "Unknown"}</strong></div>
            </div>
          </div>

          <div className="glass-panel group">
            <div className="p-6 border-b border-white/5"><h2 className="text-lg font-medium text-white/90">ICP score</h2></div>
            <div className="p-6">
              <div className="flex flex-col md:flex-row items-center gap-8 bg-black/20 rounded-xl p-6 border border-white/5">
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
              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead><tr className="border-b border-white/5 text-sm text-white/40"><th className="p-4 font-medium">Metric</th><th className="p-4 font-medium">Score</th><th className="p-4 font-medium">Evidence</th><th className="p-4 font-medium">Missing</th></tr></thead>
                  <tbody>
                    {lead.scoreEvidence.map((item) => (
                      <tr key={item.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors text-sm">
                        <td className="p-4 text-white/80">{item.metricName}</td>
                        <td className="p-4 font-mono text-brand/80">{item.score}/{item.maxScore}</td>
                        <td className="p-4 text-white/60">{item.evidence ?? <span className="text-white/30">No evidence</span>}</td>
                        <td className="p-4 text-white/60">{item.missingData ?? <span className="text-white/30">None</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="glass-panel group">
            <div className="p-6 border-b border-white/5"><h2 className="text-lg font-medium text-white/90">Automation hypothesis</h2></div>
            <div className="p-6 grid grid-cols-1 gap-y-4 gap-x-8">
              <div><span className="metric-label">Pain point</span><strong>{lead.hypothesis?.painPoint ?? "Not generated"}</strong></div>
              <div><span className="metric-label">Manual workflow</span><strong>{lead.hypothesis?.manualWorkflow ?? "Not generated"}</strong></div>
              <div><span className="metric-label">Suggested solution</span><strong>{lead.hypothesis?.suggestedSolution ?? "Not generated"}</strong></div>
              <div><span className="metric-label">Business impact</span><strong>{lead.hypothesis?.businessImpact ?? "Not generated"}</strong></div>
              <div className="detail-span-2"><span className="metric-label">Outreach hook</span><strong>{lead.hypothesis?.outreachHook ?? "Not generated"}</strong></div>
            </div>
          </div>

          <div className="glass-panel group">
            <div className="p-6 border-b border-white/5"><h2 className="text-lg font-medium text-white/90">Enrichment</h2></div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
              <div><span className="metric-label">Booking link</span><strong>{lead.enrichment?.booking_link_found ? "Found" : "Not found"}</strong></div>
              <div><span className="metric-label">Contact form</span><strong>{lead.enrichment?.contact_form_found ? "Found" : "Not found"}</strong></div>
              <div><span className="metric-label">Chat widget</span><strong>{lead.enrichment?.chat_widget_found ? "Found" : "Not found"}</strong></div>
              <div><span className="metric-label">Last enriched</span><strong>{lead.enrichment?.last_enriched_at ? new Date(lead.enrichment.last_enriched_at).toLocaleString() : "Unknown"}</strong></div>
            </div>
          </div>

          <div className="glass-panel group">
            <div className="p-6 border-b border-white/5"><h2 className="text-lg font-medium text-white/90">Timeline</h2></div>
            <div className="p-6 relative pl-8 border-l border-white/10 ml-6 space-y-6">
              {lead.timeline.length === 0 ? <div className="empty-state">No timeline events yet.</div> : null}
              {lead.timeline.map((item) => (
                <div className="relative" key={item.id}>
                  <div className="absolute -left-[41px] top-1.5 w-3 h-3 rounded-full bg-brand/50 border-2 border-[#09090b]"></div>
                  <strong className="block text-white/90 font-medium mb-1">{item.label}</strong>
                  <span className="block text-sm text-white/50">{item.detail}</span>
                  {item.at ? <time className="block text-xs font-mono text-white/30 mt-2">{new Date(item.at).toLocaleString()}</time> : null}
                </div>
              ))}
            </div>
          </div>
        </section>

        <aside className="xl:col-span-5 flex flex-col gap-6 sticky top-6">
          <div className="glass-panel group">
            <div className="p-6 border-b border-white/5"><h2 className="text-lg font-medium text-white/90">Actions</h2></div>
            <div className="p-6 space-y-6">
              <form action={assignLeadAction} className="form">
                <input type="hidden" name="leadId" value={lead.id} />
                <label>Assign to<input name="assignedTo" defaultValue={lead.assignedTo ?? ""} /></label>
                <Button type="submit" variant="secondary">Assign</Button>
              </form>
              <hr />
              <form action={overrideBandAction} className="flex flex-col gap-4">
                <input type="hidden" name="leadId" value={lead.id} />
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-white/60">Band</span>
                  <select name="band" defaultValue={lead.effectiveBand ?? "B"} className="bg-black/20 border border-white/10 rounded-lg p-2 text-white/90 focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all">
                    {["A", "B", "C", "D"].map((band) => <option key={band} value={band}>{band}</option>)}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-white/60">Reason</span>
                  <input name="reason" placeholder="Why override this band?" className="bg-black/20 border border-white/10 rounded-lg p-2 text-white/90 focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all" />
                </label>
                <button type="submit" className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/80 transition-all font-medium text-sm">Override band</button>
              </form>
              <hr />
              <div className="button-row">
                <form action={changeLeadStatusAction}>
                  <input type="hidden" name="leadId" value={lead.id} />
                  <input type="hidden" name="status" value="paused" />
                  <Button type="submit" variant="secondary">Pause</Button>
                </form>
                <form action={changeLeadStatusAction}>
                  <input type="hidden" name="leadId" value={lead.id} />
                  <input type="hidden" name="status" value="archived" />
                  <Button type="submit" variant="danger">Archive</Button>
                </form>
              </div>
              <div className="button-row top-gap">
                <form action={closeLeadAction}>
                  <input type="hidden" name="leadId" value={lead.id} />
                  <input type="hidden" name="outcome" value="won" />
                  <Button type="submit">Closed won</Button>
                </form>
                <form action={closeLeadAction}>
                  <input type="hidden" name="leadId" value={lead.id} />
                  <input type="hidden" name="outcome" value="lost" />
                  <Button type="submit" variant="danger">Closed lost</Button>
                </form>
              </div>
            </div>
          </div>

          <div className="glass-panel group">
            <div className="p-6 border-b border-white/5"><h2 className="text-lg font-medium text-white/90">Replies</h2></div>
            <div className="p-6 space-y-4">
              {lead.replies.length === 0 ? <div className="empty-state">No replies recorded.</div> : null}
              {lead.replies.map((reply: any) => (
                <div className="record-card" key={reply.id}>
                  <div className="button-row">
                    <Badge tone="info">{reply.intent_classification ?? "reply"}</Badge>
                    <Badge tone={reply.handled_at ? "success" : "warning"}>{reply.handled_at ? "Handled" : "Open"}</Badge>
                  </div>
                  <p>{reply.summary ?? reply.reply_body ?? "Reply received"}</p>
                  <div className="muted">{reply.suggested_next_action ?? "No suggested next action."}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel group">
            <div className="p-6 border-b border-white/5"><h2 className="text-lg font-medium text-white/90">Drafts & reviews</h2></div>
            <div className="p-6 space-y-4">
              {lead.drafts.map((draft: any) => (
                <div className="record-card" key={draft.id}>
                  <strong>{draft.subject ?? draft.subject_line ?? "Draft"}</strong>
                  <div className="muted">{draft.approval_status ?? "pending"}</div>
                </div>
              ))}
              {lead.reviews.map((review: any) => (
                <div className="record-card" key={review.id}>
                  <strong>{review.reason ?? "Review item"}</strong>
                  <div className="muted">{review.review_status}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel group">
            <div className="p-6 border-b border-white/5"><h2 className="text-lg font-medium text-white/90">Notes</h2></div>
            <div className="p-6">
              <form action={updateLeadNotesAction} className="form">
                <input type="hidden" name="leadId" value={lead.id} />
                <label>Founder notes<textarea name="notes" rows={8} defaultValue={lead.notes ?? ""} /></label>
                <Button type="submit">Save notes</Button>
              </form>
              <div className="stack-list top-gap">
                {lead.notesHistory.map((note: any) => (
                  <div className="record-card" key={note.id}>
                    <div className="muted">{note.created_by} - {new Date(note.created_at).toLocaleString()}</div>
                    <p>{note.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
