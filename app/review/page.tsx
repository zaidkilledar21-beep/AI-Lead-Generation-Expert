import { PageHeader } from "@/components/crm/page-header";
import { CrmDateField } from "@/components/ui/crm-date-field";
import { CrmSelect } from "@/components/ui/crm-select";
import { getReviewItems } from "@/lib/crm/queries";
import { ReviewBoard } from "@/components/crm/review-board";

type ReviewSearchParams = {
  item?: string;
  source?: string;
  priority?: string;
  campaign?: string;
  band?: string;
  created_from?: string;
  created_to?: string;
  status?: string;
  q?: string;
};

function sourceMatches(itemSource: string, filter?: string) {
  if (!filter) return true;
  if (filter === "manual") return itemSource === "manual_review";
  if (filter === "draft") return itemSource === "email_draft";
  if (filter === "reply") return itemSource === "reply_event";
  return true;
}

function matchesReviewFilters(item: Awaited<ReturnType<typeof getReviewItems>>[number], searchParams: ReviewSearchParams) {
  const reviewItem = item as Record<string, any>;
  const createdAt = item.createdAt ? new Date(item.createdAt).getTime() : null;
  const createdFrom = searchParams.created_from ? new Date(searchParams.created_from).getTime() : null;
  const createdTo = searchParams.created_to ? new Date(`${searchParams.created_to}T23:59:59`).getTime() : null;
  const q = searchParams.q?.trim().toLowerCase();
  const searchable = [
    item.businessName,
    item.reason,
    item.campaignName,
    reviewItem.replyExcerpt,
    reviewItem.draftSubject,
    reviewItem.draftPreview
  ].filter(Boolean).join(" ").toLowerCase();

  return (
    sourceMatches(item.source, searchParams.source) &&
    (!searchParams.priority || item.priority === searchParams.priority) &&
    (!searchParams.campaign || item.campaignName === searchParams.campaign) &&
    (!searchParams.band || item.band === searchParams.band) &&
    (!searchParams.status || item.reviewStatus === searchParams.status || item.leadStatus === searchParams.status) &&
    (!createdFrom || (createdAt !== null && createdAt >= createdFrom)) &&
    (!createdTo || (createdAt !== null && createdAt <= createdTo)) &&
    (!q || searchable.includes(q))
  );
}

export default async function ReviewPage({
  searchParams
}: Readonly<{
  searchParams?: ReviewSearchParams;
}>) {
  const items = await getReviewItems();
  const params = searchParams ?? {};
  const filtered = items.filter((item) => matchesReviewFilters(item, params));
  const campaignOptions = [...new Set(items.map((item) => item.campaignName).filter(Boolean))]
    .sort((a, b) => String(a).localeCompare(String(b)))
    .map((campaign) => ({ value: String(campaign), label: String(campaign) }));
  const priorityOptions = [...new Set(items.map((item) => item.priority).filter(Boolean))]
    .sort((a, b) => String(a).localeCompare(String(b)))
    .map((priority) => ({ value: String(priority), label: String(priority) }));
  const statusOptions = [...new Set(items.flatMap((item) => [item.reviewStatus, item.leadStatus]).filter(Boolean))]
    .sort((a, b) => String(a).localeCompare(String(b)))
    .map((status) => ({ value: String(status), label: String(status).replaceAll("_", " ") }));

  return (
    <>
      <PageHeader title="Review Queue" description="Resolve approval gates, ambiguous scoring, and manual review exceptions before outreach progresses." />
      <section className="panel mb-6">
        <div className="panel-header">
          <h2>Review filters</h2>
          <span className="muted">{filtered.length} of {items.length} items</span>
        </div>
        <div className="panel-body">
          <form className="form-grid">
            <label>
              <span>Search</span>
              <input name="q" defaultValue={params.q ?? ""} placeholder="Business, reason, campaign, reply, draft" />
            </label>
            <label>
              <span>Type</span>
              <CrmSelect
                name="source"
                defaultValue={params.source ?? ""}
                placeholder="All review types"
                options={[
                  { value: "manual", label: "Manual" },
                  { value: "draft", label: "Draft" },
                  { value: "reply", label: "Reply" }
                ]}
              />
            </label>
            <label>
              <span>Priority</span>
              <CrmSelect name="priority" defaultValue={params.priority ?? ""} placeholder="All priorities" options={priorityOptions} />
            </label>
            <label>
              <span>Campaign</span>
              <CrmSelect name="campaign" defaultValue={params.campaign ?? ""} placeholder="All campaigns" emptyState="No campaigns in review queue." options={campaignOptions} />
            </label>
            <label>
              <span>Band</span>
              <CrmSelect
                name="band"
                defaultValue={params.band ?? ""}
                placeholder="All bands"
                options={["A", "B", "C", "D"].map((band) => ({ value: band, label: `Band ${band}` }))}
              />
            </label>
            <label>
              <span>Status</span>
              <CrmSelect name="status" defaultValue={params.status ?? ""} placeholder="All statuses" options={statusOptions} />
            </label>
            <label>
              <span>Created from</span>
              <CrmDateField name="created_from" defaultValue={params.created_from ?? ""} />
            </label>
            <label>
              <span>Created to</span>
              <CrmDateField name="created_to" defaultValue={params.created_to ?? ""} />
            </label>
            <div className="button-row self-end">
              <button className="ui-button ui-button-primary" type="submit">Apply filters</button>
              <a className="ui-button ui-button-secondary" href="/review">Reset</a>
            </div>
          </form>
        </div>
      </section>
      <ReviewBoard items={filtered} />
    </>
  );
}
