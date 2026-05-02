import { notFound } from "next/navigation";
import { PageHeader } from "@/components/crm/page-header";
import { Badge, bandTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScoreBar } from "@/components/ui/score-bar";
import { assignLeadAction, closeLeadAction, overrideBandAction, updateLeadNotesAction } from "@/lib/crm/actions";
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
            <a className="ui-button ui-button-secondary" href={lead.website ?? "#"} target="_blank" aria-disabled={!lead.website}>Website</a>
            <a className="ui-button ui-button-secondary" href={`mailto:${lead.email ?? ""}`} aria-disabled={!lead.email}>Email</a>
          </div>
        }
      />

      <div className="two-column">
        <section>
          <div className="panel">
            <div className="panel-header">
              <h2>Record</h2>
              <div className="button-row">
                <Badge tone={bandTone(lead.effectiveBand)}>{lead.effectiveBand ?? "NA"}</Badge>
                <Badge tone="info">{lead.status}</Badge>
              </div>
            </div>
            <div className="panel-body">
              <div className="metric-grid">
                <div>
                  <div className="metric-label">Score</div>
                  <div className="metric-value">{lead.score ?? "--"}</div>
                  <ScoreBar value={lead.score ?? 0} band={lead.effectiveBand} />
                </div>
                <div>
                  <div className="metric-label">Campaign</div>
                  <strong>{lead.campaignName ?? "Unassigned"}</strong>
                </div>
                <div>
                  <div className="metric-label">Reply</div>
                  <strong>{lead.replyIntent ?? "None"}</strong>
                </div>
                <div>
                  <div className="metric-label">Owner</div>
                  <strong>{lead.assignedTo ?? "Unassigned"}</strong>
                </div>
              </div>
              <p className="muted">{lead.hypothesis ?? "No outreach hypothesis has been generated yet."}</p>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header"><h2>Score evidence</h2></div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr><th>Metric</th><th>Score</th><th>Evidence</th><th>Missing</th></tr>
                </thead>
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

          <div className="panel">
            <div className="panel-header"><h2>Timeline</h2></div>
            <div className="panel-body timeline">
              {lead.timeline.length === 0 ? <div className="empty-state">No timeline events yet.</div> : null}
              {lead.timeline.map((item) => (
                <div className="timeline-item" key={`${item.type}-${item.id}`}>
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
            <div className="panel-header"><h2>Notes</h2></div>
            <div className="panel-body">
              <form action={updateLeadNotesAction} className="form">
                <input type="hidden" name="leadId" value={lead.id} />
                <label>Founder notes<textarea name="notes" rows={8} defaultValue={lead.notes ?? ""} /></label>
                <Button type="submit">Save notes</Button>
              </form>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
