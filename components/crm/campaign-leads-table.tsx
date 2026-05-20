import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

type CampaignLeadRow = {
  id: string;
  businessName: string;
  website: string | null;
  email: string | null;
  phone: string | null;
  status: string | null;
  score: number | null;
  band: string | null;
  effectiveBand: string | null;
  confidence: string | null;
  manualReviewStatus: string | null;
  manualReviewReason: string | null;
  queueStatus: string | null;
  draftStatus: string | null;
  nextSendAt: string | null;
  operatorState: string;
  operatorReason: string;
  why: string | null;
  latestAction: string | null;
};

function formatDateTime(value: string | null) {
  return value ? new Date(value).toLocaleString() : "--";
}

function formatStatus(value: string | null | undefined) {
  return value ? value.replaceAll("_", " ") : "--";
}

function operatorTone(value: string) {
  if (value === "Needs review" || value === "Blocked" || value === "Missing contact") return "warning" as const;
  if (value === "Draft ready" || value === "Queued" || value === "In sequence") return "success" as const;
  if (value === "Replied" || value === "Closed") return "info" as const;
  return "muted" as const;
}

function ContactCell({ lead }: { lead: CampaignLeadRow }) {
  return (
    <div className="grid gap-1 text-xs">
      <span>{lead.email ?? "No email"}</span>
      <span className="muted">{lead.phone ?? "No phone"}</span>
      {lead.website ? <a href={lead.website} target="_blank" rel="noreferrer">Website</a> : <span className="muted">No website</span>}
    </div>
  );
}

function OperatorStateCell({ lead }: { lead: CampaignLeadRow }) {
  return (
    <div className="grid gap-1">
      <Badge tone={operatorTone(lead.operatorState)}>{lead.operatorState}</Badge>
      <span className="muted text-xs">{lead.operatorReason}</span>
    </div>
  );
}

function ReviewCell({ lead }: { lead: CampaignLeadRow }) {
  return (
    <div className="grid gap-1 text-xs">
      <span>{formatStatus(lead.manualReviewStatus)}</span>
      <span className="muted">{formatStatus(lead.manualReviewReason)}</span>
    </div>
  );
}

function QueueDraftCell({ lead }: { lead: CampaignLeadRow }) {
  return (
    <div className="grid gap-1 text-xs">
      <span>Queue: {formatStatus(lead.queueStatus)}</span>
      <span>Draft: {formatStatus(lead.draftStatus)}</span>
      {lead.nextSendAt ? <span className="muted">Next {formatDateTime(lead.nextSendAt)}</span> : null}
    </div>
  );
}

function LeadRow({ lead }: { lead: CampaignLeadRow }) {
  const leadHref = `/leads/${lead.id}`;

  return (
    <tr>
      <td>
        <div className="grid gap-1">
          <a href={leadHref}>{lead.businessName}</a>
          <span className="muted text-xs">{formatStatus(lead.status)}</span>
        </div>
      </td>
      <td><ContactCell lead={lead} /></td>
      <td className="mono">{lead.score ?? "--"}</td>
      <td>{lead.effectiveBand ?? lead.band ?? "--"}</td>
      <td>{lead.confidence ?? "--"}</td>
      <td><OperatorStateCell lead={lead} /></td>
      <td><ReviewCell lead={lead} /></td>
      <td><QueueDraftCell lead={lead} /></td>
      <td>
        <p className="muted max-w-[320px] text-xs leading-5">{lead.why ?? lead.latestAction ?? "--"}</p>
      </td>
      <td>
        <a href={leadHref}>Open lead</a>
      </td>
    </tr>
  );
}

export function CampaignLeadsTable({
  leads,
  emptyDescription,
  emptyTitle
}: {
  leads: CampaignLeadRow[];
  emptyDescription: string;
  emptyTitle: string;
}) {
  if (leads.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Business</th>
            <th>Contact</th>
            <th>Score</th>
            <th>Band</th>
            <th>Confidence</th>
            <th>Operator state</th>
            <th>Review</th>
            <th>Queue / draft</th>
            <th>Why / next action</th>
            <th>Open</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <LeadRow lead={lead} key={lead.id} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
