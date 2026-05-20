import { notFound } from "next/navigation";
import { PageHeader } from "@/components/crm/page-header";
import { Badge, bandTone } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricCard } from "@/components/ui/metric-card";
import { getLeadDetail } from "@/lib/crm/queries";

type LeadDetail = NonNullable<Awaited<ReturnType<typeof getLeadDetail>>>;
type ScoreEvidence = LeadDetail["scoreEvidence"][number];
type DetailItem = { label: string; value: string | number | null | undefined };

function formatDateTime(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString() : "--";
}

function formatStatus(value: string | null | undefined) {
  return value ? value.replaceAll("_", " ") : "--";
}

function externalLink(value: string | null | undefined) {
  if (!value) return null;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return `https://${value}`;
}

function operatorTone(value: string) {
  if (value === "Needs review" || value === "Blocked" || value === "Missing contact") return "warning" as const;
  if (value === "Draft ready" || value === "Queued" || value === "In sequence") return "success" as const;
  if (value === "Replied" || value === "Closed") return "info" as const;
  return "muted" as const;
}

function DetailGrid({ items }: { items: DetailItem[] }) {
  return (
    <div className="campaign-detail-field-grid">
      {items.map((item) => (
        <div className="campaign-detail-field" key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value ?? "--"}</strong>
        </div>
      ))}
    </div>
  );
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="panel-header">
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </div>
  );
}

function LeadHero({ lead }: { lead: LeadDetail }) {
  const websiteHref = externalLink(lead.website);
  const contactLabel = [lead.email ? "Email present" : "No email", lead.phone ? "Phone present" : "No phone"].join(" / ");

  return (
    <section className="panel campaign-detail-hero-shell">
      <div className="campaign-detail-hero-copy">
        <span className="crm-shell-eyebrow">Lead detail</span>
        <div className="grid gap-3">
          <h1>{lead.businessName}</h1>
          <p>{[lead.niche, lead.city, lead.country].filter(Boolean).join(" / ") || "Lead record"}</p>
        </div>
        <div className="pipeline-chip-row">
          <Badge tone={operatorTone(lead.operatorState)}>{lead.operatorState}</Badge>
          <Badge tone={bandTone(lead.effectiveBand)}>Band {lead.effectiveBand ?? "--"}</Badge>
          <span className="pipeline-chip">{formatStatus(lead.status)}</span>
          <span className="pipeline-chip">{contactLabel}</span>
          {lead.campaignId ? <a className="pipeline-chip" href={`/campaigns/${lead.campaignId}`}>{lead.campaignName ?? "Campaign"}</a> : null}
          {websiteHref ? <a className="pipeline-chip" href={websiteHref} target="_blank" rel="noreferrer">Website</a> : null}
        </div>
        <p className="muted text-sm">{lead.operatorReason}</p>
      </div>
    </section>
  );
}

function ScorePanel({ lead }: { lead: LeadDetail }) {
  const score = lead.scoreDetail;
  const metrics = [
    { label: "Total score", value: score?.totalScore ?? lead.score ?? "--" },
    { label: "Band", value: score?.band ?? lead.effectiveBand ?? "--" },
    { label: "Confidence", value: score?.confidence ?? lead.confidence ?? "--" },
    { label: "Manual review", value: score?.manualReviewRequired ? "Required" : "Not required" }
  ];

  return (
    <section className="panel">
      <SectionHeader title="Score" description="Latest qualification score, band, confidence, and review requirement." />
      <div className="panel-body grid gap-4">
        <div className="campaign-detail-metric-grid">
          {metrics.map((item) => (
            <MetricCard label={item.label} value={item.value} key={item.label} />
          ))}
        </div>
        <p className="muted text-sm">Latest score date: <strong>{formatDateTime(score?.createdAt)}</strong></p>
      </div>
    </section>
  );
}

function ScoreEvidencePanel({ evidence }: { evidence: ScoreEvidence[] }) {
  return (
    <section className="panel">
      <SectionHeader title="Score evidence" description="Why this lead received its score and what data was missing." />
      <div className="panel-body">
        {evidence.length > 0 ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Score</th>
                  <th>Evidence</th>
                  <th>Missing data / reason</th>
                </tr>
              </thead>
              <tbody>
                {evidence.map((item) => (
                  <tr key={item.id}>
                    <td>{formatStatus(item.metricName)}</td>
                    <td className="mono">{item.score}/{item.maxScore}</td>
                    <td><p className="muted max-w-[460px] text-sm leading-6">{item.evidence ?? "--"}</p></td>
                    <td><p className="muted max-w-[320px] text-sm leading-6">{item.missingData ?? "--"}</p></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No score evidence" description="No score evidence has been recorded for this lead yet." />
        )}
      </div>
    </section>
  );
}

function EnrichmentPanel({ lead }: { lead: LeadDetail }) {
  const enrichment = lead.enrichment;
  const signalItems = [
    { label: "Booking link", value: enrichment?.bookingLinkFound ? "Found" : "Not found" },
    { label: "Contact form", value: enrichment?.contactFormFound ? "Found" : "Not found" },
    { label: "Chat widget", value: enrichment?.chatWidgetFound ? "Found" : "Not found" },
    { label: "Team page", value: enrichment?.teamPageFound ? "Found" : "Not found" }
  ];
  const contactItems = [
    { label: "Email found", value: enrichment?.emailFound ?? lead.email ?? "Missing" },
    { label: "Phone found", value: enrichment?.phoneFound ?? lead.phone ?? "Missing" },
    { label: "WhatsApp", value: enrichment?.whatsappFound ?? lead.whatsapp ?? "Missing" },
    { label: "Last enriched", value: formatDateTime(enrichment?.lastEnrichedAt) }
  ];

  return (
    <section className="panel">
      <SectionHeader title="Enrichment and contact" description="Website crawl, contact extraction, discovered signals, and missing fields." />
      <div className="panel-body grid gap-5">
        <DetailGrid items={[{ label: "Crawl status", value: formatStatus(enrichment?.status) }, { label: "Confidence", value: enrichment?.confidence ?? "--" }, ...contactItems]} />
        <div className="campaign-detail-readiness-grid">
          {signalItems.map((item) => (
            <section className="crm-state-card" key={item.label}>
              <span className="metric-label">{item.label}</span>
              <strong className="mt-1 block">{item.value}</strong>
            </section>
          ))}
        </div>
        {enrichment?.summary ? <p className="muted text-sm leading-6">{enrichment.summary}</p> : null}
        {enrichment?.servicesOffered.length ? <p className="muted text-sm">Services: <strong>{enrichment.servicesOffered.join(", ")}</strong></p> : null}
        {enrichment?.detectedTools.length ? <p className="muted text-sm">Detected tools: <strong>{enrichment.detectedTools.join(", ")}</strong></p> : null}
        {enrichment?.errorMessage ? <p className="text-sm text-red-300">{enrichment.errorMessage}</p> : null}
      </div>
    </section>
  );
}

function HypothesisPanel({ lead }: { lead: LeadDetail }) {
  const hypothesis = lead.hypothesis;
  const items = [
    { label: "Outreach hook", value: hypothesis?.outreachHook },
    { label: "Pain point", value: hypothesis?.painPoint },
    { label: "Manual workflow", value: hypothesis?.manualWorkflow },
    { label: "Recommended angle", value: hypothesis?.suggestedSolution },
    { label: "Business impact", value: hypothesis?.businessImpact },
    { label: "Confidence", value: hypothesis?.confidence }
  ];

  return (
    <section className="panel">
      <SectionHeader title="AI hypothesis" description="The outreach angle and automation opportunity inferred for this lead." />
      <div className="panel-body">
        {hypothesis ? (
          <div className="campaign-detail-group-grid">
            {items.map((item) => (
              <section className="crm-state-card" key={item.label}>
                <span className="metric-label">{item.label}</span>
                <p className="mt-2 text-sm leading-6 text-white/80">{item.value ?? "--"}</p>
              </section>
            ))}
          </div>
        ) : (
          <EmptyState title="No AI hypothesis" description="No automation hypothesis has been generated for this lead yet." />
        )}
      </div>
    </section>
  );
}

function RoutingPanel({ lead }: { lead: LeadDetail }) {
  const routing = lead.routing;
  const items = [
    { label: "Manual review", value: formatStatus(routing.manualReviewStatus) },
    { label: "Review reason", value: formatStatus(routing.manualReviewReason) },
    { label: "Queue status", value: formatStatus(routing.queueStatus) },
    { label: "Queue reason", value: formatStatus(routing.queuePauseReason) },
    { label: "Draft status", value: formatStatus(lead.draftPreview?.approvalStatus) },
    { label: "Sequence", value: routing.sequenceName ?? routing.sequenceBand },
    { label: "Inbox", value: routing.inboxEmail },
    { label: "Next send", value: formatDateTime(routing.nextSendAt) }
  ];

  return (
    <section className="panel">
      <SectionHeader title="Routing" description="Manual review, queue, draft, sequence, inbox, and next-send state." />
      <div className="panel-body">
        <DetailGrid items={items} />
      </div>
    </section>
  );
}

function DraftPreviewPanel({ lead }: { lead: LeadDetail }) {
  const draft = lead.draftPreview;

  return (
    <section className="panel">
      <SectionHeader title="Draft preview" description="Safe preview of the latest generated draft and validation state." />
      <div className="panel-body">
        {draft ? (
          <div className="grid gap-4">
            <DetailGrid
              items={[
                { label: "Subject", value: draft.subject },
                { label: "Approval", value: formatStatus(draft.approvalStatus) },
                { label: "Validation", value: draft.validationPassed ? "Passed" : "Needs review" },
                { label: "Created", value: formatDateTime(draft.createdAt) }
              ]}
            />
            <section className="crm-state-card">
              <span className="metric-label">Body preview</span>
              <p className="mt-2 text-sm leading-6 text-white/75">{draft.bodyPreview ?? "--"}</p>
            </section>
            {draft.warnings.length ? <p className="muted text-sm">Warnings: <strong>{draft.warnings.join(", ")}</strong></p> : null}
            {draft.failures.length ? <p className="text-sm text-red-300">Validation failures: {draft.failures.join(", ")}</p> : null}
          </div>
        ) : (
          <EmptyState title="No draft yet" description="No generated email draft is available for this lead." />
        )}
      </div>
    </section>
  );
}

export default async function LeadDetailPage({
  params
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const { id: leadId } = await params;
  if (!leadId) notFound();

  const lead = await getLeadDetail(leadId);
  if (!lead) notFound();

  return (
    <div className="grid gap-5">
      <PageHeader
        title={lead.businessName}
        description="Lead intelligence, scoring evidence, enrichment, and routing state."
        actions={<a className="ui-button ui-button-secondary" href={`/pipeline/${lead.id}`}>Open pipeline record</a>}
      />
      <LeadHero lead={lead} />
      <ScorePanel lead={lead} />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
        <main className="grid gap-5">
          <ScoreEvidencePanel evidence={lead.scoreEvidence} />
          <EnrichmentPanel lead={lead} />
          <HypothesisPanel lead={lead} />
        </main>
        <aside className="grid content-start gap-5">
          <RoutingPanel lead={lead} />
          <DraftPreviewPanel lead={lead} />
        </aside>
      </div>
    </div>
  );
}
