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
  const urgentCount = filtered.filter((item) => ["urgent", "high"].includes(item.priority)).length;
  const draftCount = filtered.filter((item) => item.source === "email_draft").length;
  const replyCount = filtered.filter((item) => item.source === "reply_event").length;
  const manualCount = filtered.filter((item) => item.source === "manual_review").length;

  return (
    <>
      <PageHeader title="Review Queue" description="Resolve approval gates, ambiguous scoring, and manual review exceptions before outreach progresses." />
      <section className="crm-state-card overflow-hidden mb-6">
        <div className="border-b border-white/8 p-6 lg:p-7">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/40">Manual review cockpit</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white sm:text-[2rem]">Triage approvals, replies, and exceptions from one control center.</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/58">
                High priority items, draft approvals, and reply exceptions are grouped so the fastest safe decision is obvious.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:min-w-[620px]">
              {[
                { label: "Visible", value: filtered.length, note: "Current filters", tone: "default" },
                { label: "Urgent", value: urgentCount, note: "Needs attention", tone: "danger" },
                { label: "Drafts", value: draftCount, note: "Pending approval", tone: "warning" },
                { label: "Human review", value: replyCount + manualCount, note: "Replies + manual items", tone: "success" }
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
                  <div className="mt-1 text-xs text-white/45">{stat.note}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 border-t border-white/8 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(300px,560px)] lg:items-end">
          <div className="flex flex-wrap gap-2">
            {[
              { label: "All", href: "/review", active: !params.source && !params.priority && !params.campaign && !params.band && !params.created_from && !params.created_to && !params.status && !params.q },
              { label: "Urgent", href: `/review?${new URLSearchParams({ priority: "urgent" }).toString()}`, active: params.priority === "urgent" },
              { label: "Drafts", href: `/review?${new URLSearchParams({ source: "draft" }).toString()}`, active: params.source === "draft" },
              { label: "Replies", href: `/review?${new URLSearchParams({ source: "reply" }).toString()}`, active: params.source === "reply" },
              { label: "Manual", href: `/review?${new URLSearchParams({ source: "manual" }).toString()}`, active: params.source === "manual" }
            ].map((chip) => {
              const active = "active" in chip ? chip.active : false;
              return (
                <a
                  key={chip.label}
                  href={chip.href}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? "border-brand/30 bg-brand/15 text-white"
                      : "border-white/8 bg-white/[0.03] text-white/60 hover:border-white/14 hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  {chip.label}
                </a>
              );
            })}
          </div>

          <form className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <label className="field-group">
              <span className="field-label">Search</span>
              <input
                id="review-search"
                name="q"
                defaultValue={params.q ?? ""}
                placeholder="Business, reason, campaign, reply, draft"
                className="field"
              />
            </label>
            <label className="field-group">
              <span className="field-label">Type</span>
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
            <div className="flex gap-3">
              <button className="ui-button ui-button-primary" type="submit">Apply filters</button>
              <a className="ui-button ui-button-secondary" href="/review">Reset</a>
            </div>
            <label className="field-group">
              <span className="field-label">Priority</span>
              <CrmSelect name="priority" defaultValue={params.priority ?? ""} placeholder="All priorities" options={priorityOptions} />
            </label>
            <label className="field-group">
              <span className="field-label">Campaign</span>
              <CrmSelect name="campaign" defaultValue={params.campaign ?? ""} placeholder="All campaigns" emptyState="No campaigns in review queue." options={campaignOptions} />
            </label>
            <label className="field-group">
              <span className="field-label">Band</span>
              <CrmSelect
                name="band"
                defaultValue={params.band ?? ""}
                placeholder="All bands"
                options={["A", "B", "C", "D"].map((band) => ({ value: band, label: `Band ${band}` }))}
              />
            </label>
            <label className="field-group">
              <span className="field-label">Status</span>
              <CrmSelect name="status" defaultValue={params.status ?? ""} placeholder="All statuses" options={statusOptions} />
            </label>
            <label className="field-group">
              <span className="field-label">Created from</span>
              <CrmDateField name="created_from" defaultValue={params.created_from ?? ""} />
            </label>
            <label className="field-group">
              <span className="field-label">Created to</span>
              <CrmDateField name="created_to" defaultValue={params.created_to ?? ""} />
            </label>
          </form>
        </div>
      </section>
      <ReviewBoard items={filtered} />
    </>
  );
}
