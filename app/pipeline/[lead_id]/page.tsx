import { notFound } from "next/navigation";
import { PageHeader } from "@/components/crm/page-header";
import { Badge, bandTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScoreBar } from "@/components/ui/score-bar";
import { approveLeadAction, assignLeadAction, changeLeadStatusAction, closeLeadAction, overrideBandAction, updateLeadNotesAction } from "@/lib/crm/actions";
import { getLeadDetail } from "@/lib/crm/queries";

export default async function LeadDetailPage({ params }: { params: { lead_id: string } }) {
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
            {!lead.approvedForOutreach ? (
              <form action={approveLeadAction}>
                <input type="hidden" name="leadId" value={lead.id} />
                <Button type="submit">Approve for outreach</Button>
              </form>
            ) : (
              <Badge tone="success">Approved for outreach</Badge>
            )}
          </div>
        }
      />

      <div className="two-column lead-detail-grid">
        <section>
          <div className="panel">
            <div className="panel-header">
              <h2>Business profile</h2>
              <div className="button-row">
                <Badge tone={bandTone(lead.effectiveBand)}>{lead.effectiveBand ?? "NA"}</Badge>
                <Badge tone="info">{lead.status}</Badge>
              </div>
            </div>
            <div className="panel-body detail-grid">
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

          <div className="panel">
            <div className="panel-header"><h2>ICP score</h2></div>
            <div className="panel-body">
              <div className="metric-grid metric-grid-compact">
                <div>
                  <div className="metric-label">Total score</div>
                  <div className="metric-value">{lead.score ?? "--"}</div>
                  <ScoreBar value={lead.score ?? 0} band={lead.effectiveBand} />
                </div>
                <div>
                  <div className="metric-label">Confidence</div>
                  <div className="metric-value metric-value-small">{lead.confidence ?? "Unknown"}</div>
                </div>
                <div>
                  <div className="metric-label">Latest reply</div>
                  <div className="metric-value metric-value-small">{lead.latestReplyIntent ?? "None"}</div>
                </div>
              </div>
              <div className="table-wrap top-gap">
                <table className="data-table">
                  <thead><tr><th>Metric</th><th>Score</th><th>Evidence</th><th>Missing</th></tr></thead>
                  <tbody>
                    {lead.scoreEvidence.map((item) => (
                      <tr key={item.id}>
                        <td>{item.metricName}</td>
                        <td className="mono">{item.score}/{item.maxScore}</td>
                        <td>{item.evidence ?? <span className="muted">No evidence</span>}</td>
                        <td>{item.missingData ?? <span className="muted">None</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header"><h2>Automation hypothesis</h2></div>
            <div className="panel-body detail-grid">
              <div><span className="metric-label">Pain point</span><strong>{lead.hypothesis?.painPoint ?? "Not generated"}</strong></div>
              <div><span className="metric-label">Manual workflow</span><strong>{lead.hypothesis?.manualWorkflow ?? "Not generated"}</strong></div>
              <div><span className="metric-label">Suggested solution</span><strong>{lead.hypothesis?.suggestedSolution ?? "Not generated"}</strong></div>
              <div><span className="metric-label">Business impact</span><strong>{lead.hypothesis?.businessImpact ?? "Not generated"}</strong></div>
              <div className="detail-span-2"><span className="metric-label">Outreach hook</span><strong>{lead.hypothesis?.outreachHook ?? "Not generated"}</strong></div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header"><h2>Enrichment</h2></div>
            <div className="panel-body detail-grid">
              <div><span className="metric-label">Booking link</span><strong>{lead.enrichment?.booking_link_found ? "Found" : "Not found"}</strong></div>
              <div><span className="metric-label">Contact form</span><strong>{lead.enrichment?.contact_form_found ? "Found" : "Not found"}</strong></div>
              <div><span className="metric-label">Chat widget</span><strong>{lead.enrichment?.chat_widget_found ? "Found" : "Not found"}</strong></div>
              <div><span className="metric-label">Last enriched</span><strong>{lead.enrichment?.last_enriched_at ? new Date(lead.enrichment.last_enriched_at).toLocaleString() : "Unknown"}</strong></div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header"><h2>Timeline</h2></div>
            <div className="panel-body timeline">
              {lead.timeline.length === 0 ? <div className="empty-state">No timeline events yet.</div> : null}
              {lead.timeline.map((item) => (
                <div className="timeline-item" key={item.id}>
                  <strong>{item.label}</strong>
                  <span className="muted">{item.detail}</span>
                  {item.at ? <time>{new Date(item.at).toLocaleString()}</time> : null}
                </div>
              ))}
            </div>
          </div>
        </section>

        <aside>
          <div className="panel">
            <div className="panel-header"><h2>Actions</h2></div>
            <div className="panel-body">
              <form action={assignLeadAction} className="form">
                <input type="hidden" name="leadId" value={lead.id} />
                <label>Assign to<input name="assignedTo" defaultValue={lead.assignedTo ?? ""} /></label>
                <Button type="submit" variant="secondary">Assign</Button>
              </form>
              <hr />
              <form action={overrideBandAction} className="form">
                <input type="hidden" name="leadId" value={lead.id} />
                <label>Band
                  <select name="band" defaultValue={lead.effectiveBand ?? "B"}>
                    {["A", "B", "C", "D"].map((band) => <option key={band}>{band}</option>)}
                  </select>
                </label>
                <label>Reason<input name="reason" placeholder="Why override this band?" /></label>
                <Button type="submit" variant="secondary">Override band</Button>
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

          <div className="panel">
            <div className="panel-header"><h2>Replies</h2></div>
            <div className="panel-body stack-list">
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

          <div className="panel">
            <div className="panel-header"><h2>Drafts & reviews</h2></div>
            <div className="panel-body stack-list">
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

          <div className="panel">
            <div className="panel-header"><h2>Notes</h2></div>
            <div className="panel-body">
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
