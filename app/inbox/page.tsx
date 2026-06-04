import { PageHeader } from "@/components/crm/page-header";
import { TriageSummaryHeader } from "@/components/crm/triage/triage-summary-header";
import { CrmSelect } from "@/components/ui/crm-select";
import { getInboxThreads, getLeadDetail, getSettingsData } from "@/lib/crm/queries";
import { InboxView } from "@/components/crm/inbox-view";
import { NEUTRAL_REPLY_INTENTS, OBJECTION_REPLY_INTENTS, POSITIVE_REPLY_INTENTS } from "@/lib/crm/status-contract";

type InboxSearchParams = {
  thread?: string;
  tab?: string;
  q?: string;
  sort?: string;
};

function tabHref(tab: string, q: string, sort: string) {
  const params = new URLSearchParams({ tab });
  if (q) params.set("q", q);
  if (sort !== "newest") params.set("sort", sort);
  return `/inbox?${params.toString()}`;
}

export default async function InboxPage({
  searchParams
}: Readonly<{
  searchParams?: Promise<InboxSearchParams>;
}>) {
  const params: InboxSearchParams = (await searchParams) ?? {};
  const [threads, settings] = await Promise.all([
    getInboxThreads(),
    getSettingsData()
  ]);

  const tab = params.tab ?? "all";
  const query = (params.q ?? "").trim().toLowerCase();
  const sort = params.sort ?? "newest";
  const filtered = threads.filter((thread) => {
    if (tab === "all") return true;
    if (tab === "unhandled") return thread.isUnhandled;
    if (tab === "positive") return (POSITIVE_REPLY_INTENTS as readonly string[]).includes(thread.intent ?? "");
    if (tab === "objections") return (OBJECTION_REPLY_INTENTS as readonly string[]).includes(thread.intent ?? "");
    if (tab === "neutral") return (NEUTRAL_REPLY_INTENTS as readonly string[]).includes(thread.intent ?? "");
    if (tab === "ooo") return thread.intent === "out_of_office";
    if (tab === "bounced") return thread.intent === "bounce";
    if (tab === "review") return thread.requiresHumanReview;
    return true;
  }).filter((thread) => {
    if (!query) return true;
    const haystack = [
      thread.businessName,
      thread.fromEmail,
      thread.excerpt,
      thread.summary,
      thread.intent,
      thread.campaignName
    ].filter(Boolean).join(" ").toLowerCase();
    return haystack.includes(query);
  }).sort((a, b) => {
    if (sort === "oldest") return new Date(a.receivedAt ?? 0).getTime() - new Date(b.receivedAt ?? 0).getTime();
    if (sort === "business") return a.businessName.localeCompare(b.businessName);
    if (sort === "intent") return String(a.intent ?? "").localeCompare(String(b.intent ?? ""));
    return new Date(b.receivedAt ?? 0).getTime() - new Date(a.receivedAt ?? 0).getTime();
  });

  const inboxStats = {
    total: threads.length,
    unhandled: threads.filter((thread) => thread.isUnhandled).length,
    review: threads.filter((thread) => thread.requiresHumanReview).length,
    actionable: threads.filter((thread) => Boolean(thread.suggestedNextAction || thread.aiDraftReply)).length
  };

  const tabs = [
    { id: "all", label: "All", count: inboxStats.total, tone: "default" },
    { id: "unhandled", label: "Unhandled", count: inboxStats.unhandled, tone: "warning" },
    { id: "positive", label: "Positive", count: threads.filter((thread) => (POSITIVE_REPLY_INTENTS as readonly string[]).includes(thread.intent ?? "")).length, tone: "success" },
    { id: "objections", label: "Objections", count: threads.filter((thread) => (OBJECTION_REPLY_INTENTS as readonly string[]).includes(thread.intent ?? "")).length, tone: "danger" },
    { id: "neutral", label: "Neutral", count: threads.filter((thread) => (NEUTRAL_REPLY_INTENTS as readonly string[]).includes(thread.intent ?? "")).length, tone: "default" },
    { id: "ooo", label: "OOO", count: threads.filter((thread) => thread.intent === "out_of_office").length, tone: "muted" },
    { id: "bounced", label: "Bounced", count: threads.filter((thread) => thread.intent === "bounce").length, tone: "muted" },
    { id: "review", label: "Needs review", count: inboxStats.review, tone: "danger" }
  ] as const;

  const selected = filtered.find((thread) => thread.id === params.thread) ?? filtered[0] ?? null;
  const leadDetails = selected ? await getLeadDetail(selected.leadId) : null;

  return (
    <>
      <PageHeader title="Inbox" description="Shared founder inbox with full reply context, suggested next action, and one-click handling." />
      <section className="crm-state-card overflow-visible">
        <TriageSummaryHeader
          eyebrow="Shared founder operations inbox"
          title="Resolve replies with context, urgency, and a clear next action."
          description="Unhandled replies, AI suggestions, and human follow-ups are surfaced together so the right conversation gets the right response first."
          stats={[
            { label: "Visible", value: inboxStats.total, note: "In this view", tone: "default" },
            { label: "Unhandled", value: inboxStats.unhandled, note: "Needs attention", tone: "warning" },
            { label: "Review", value: inboxStats.review, note: "Human gate", tone: "danger" },
            { label: "AI ready", value: inboxStats.actionable, note: "Drafts + next steps", tone: "success" }
          ]}
          controls={(
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,520px)] lg:items-start">
              <div className="flex flex-wrap gap-2">
                {tabs.map((item) => {
                  const active = tab === item.id;
                  return (
                    <a
                      key={item.id}
                      href={tabHref(item.id, query, sort)}
                      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-colors ${
                        active
                          ? item.tone === "danger"
                            ? "border-rose-400/35 bg-rose-500/15 text-rose-200"
                            : item.tone === "warning"
                              ? "border-amber-400/35 bg-amber-500/15 text-amber-100"
                              : item.tone === "success"
                                ? "border-emerald-400/35 bg-emerald-500/15 text-emerald-100"
                                : "border-brand/30 bg-brand/15 text-white"
                          : "border-white/8 bg-white/[0.03] text-white/60 hover:border-white/14 hover:bg-white/[0.06] hover:text-white"
                      }`}
                    >
                      <span>{item.label}</span>
                      <span className="rounded-full bg-black/20 px-2 py-0.5 text-[10px] font-semibold tracking-[0.14em] text-white/60">
                        {item.count}
                      </span>
                    </a>
                  );
                })}
              </div>

              <form method="get" className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px_auto]">
                <input type="hidden" name="tab" value={tab} />
                <input
                  name="q"
                  defaultValue={params.q ?? ""}
                  placeholder="Search sender, business, campaign, summary..."
                  className="field"
                />
                <CrmSelect
                  name="sort"
                  defaultValue={sort}
                  options={[
                    { value: "newest", label: "Newest first" },
                    { value: "oldest", label: "Oldest first" },
                    { value: "business", label: "Business A-Z" },
                    { value: "intent", label: "Intent A-Z" }
                  ]}
                />
                <button className="ui-button ui-button-secondary" type="submit">Apply</button>
              </form>
            </div>
          )}
        />
      </section>
      
      <InboxView 
        filtered={filtered} 
        selected={selected} 
        tab={tab} 
        query={query}
        sort={sort}
        leadDetails={leadDetails}
        profiles={settings.profiles}
      />
    </>
  );
}
