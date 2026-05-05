import { PageHeader } from "@/components/crm/page-header";
import { CrmSelect } from "@/components/ui/crm-select";
import { getInboxThreads, getLeadDetail, getSettingsData } from "@/lib/crm/queries";
import { InboxView } from "@/components/crm/inbox-view";
import { NEUTRAL_REPLY_INTENTS, OBJECTION_REPLY_INTENTS, POSITIVE_REPLY_INTENTS } from "@/lib/crm/status-contract";

function tabHref(tab: string, q: string, sort: string) {
  const params = new URLSearchParams({ tab });
  if (q) params.set("q", q);
  if (sort !== "newest") params.set("sort", sort);
  return `/inbox?${params.toString()}`;
}

export default async function InboxPage({
  searchParams
}: Readonly<{
  searchParams?: { thread?: string; tab?: string; q?: string; sort?: string };
}>) {
  const [threads, settings] = await Promise.all([
    getInboxThreads(),
    getSettingsData()
  ]);

  const tab = searchParams?.tab ?? "all";
  const query = (searchParams?.q ?? "").trim().toLowerCase();
  const sort = searchParams?.sort ?? "newest";
  const filtered = threads.filter((thread) => {
    if (tab === "all") return true;
    if (tab === "unhandled") return thread.isUnhandled;
    if (tab === "positive") return (POSITIVE_REPLY_INTENTS as readonly string[]).includes(thread.intent ?? "");
    if (tab === "objections") return (OBJECTION_REPLY_INTENTS as readonly string[]).includes(thread.intent ?? "");
    if (tab === "neutral") return (NEUTRAL_REPLY_INTENTS as readonly string[]).includes(thread.intent ?? "");
    if (tab === "ooo") return thread.intent === "out_of_office";
    if (tab === "bounced") return ["bounce", "bounce_or_noise"].includes(thread.intent ?? "");
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

  const selected = filtered.find((thread) => thread.id === searchParams?.thread) ?? filtered[0] ?? null;
  const leadDetails = selected ? await getLeadDetail(selected.leadId) : null;

  return (
    <>
      <PageHeader title="Inbox" description="Shared founder inbox with full reply context, suggested next action, and one-click handling." />
      <section className="glass-panel group">
        <div className="p-6 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-lg font-medium text-white/90">Views</h2>
          <div className="flex flex-wrap gap-2">
            <a className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "all" ? "bg-white/10 text-white" : "bg-transparent hover:bg-white/5 text-white/60"}`} href={tabHref("all", query, sort)}>All</a>
            <a className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "unhandled" ? "bg-brand/20 text-brand" : "bg-transparent hover:bg-white/5 text-white/60"}`} href={tabHref("unhandled", query, sort)}>Unhandled</a>
            <a className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "positive" ? "bg-blue-500/20 text-blue-400" : "bg-transparent hover:bg-white/5 text-white/60"}`} href={tabHref("positive", query, sort)}>Positive</a>
            <a className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "objections" ? "bg-orange-500/20 text-orange-400" : "bg-transparent hover:bg-white/5 text-white/60"}`} href={tabHref("objections", query, sort)}>Objections</a>
            <a className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "neutral" ? "bg-white/10 text-white" : "bg-transparent hover:bg-white/5 text-white/60"}`} href={tabHref("neutral", query, sort)}>Neutral</a>
            <a className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "ooo" ? "bg-purple-500/20 text-purple-400" : "bg-transparent hover:bg-white/5 text-white/60"}`} href={tabHref("ooo", query, sort)}>OOO</a>
            <a className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "bounced" ? "bg-gray-500/20 text-gray-400" : "bg-transparent hover:bg-white/5 text-white/60"}`} href={tabHref("bounced", query, sort)}>Bounced</a>
            <a className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "review" ? "bg-red-500/20 text-red-400" : "bg-transparent hover:bg-white/5 text-white/60"}`} href={tabHref("review", query, sort)}>Needs review</a>
          </div>
        </div>
        <form className="p-6 pt-0 flex flex-col md:flex-row gap-3">
          <input type="hidden" name="tab" value={tab} />
          <input name="q" defaultValue={searchParams?.q ?? ""} placeholder="Search sender, business, campaign, summary..." className="field flex-1" />
          <CrmSelect
            name="sort"
            defaultValue={sort}
            className="md:w-56"
            options={[
              { value: "newest", label: "Newest first" },
              { value: "oldest", label: "Oldest first" },
              { value: "business", label: "Business A-Z" },
              { value: "intent", label: "Intent A-Z" }
            ]}
          />
          <button className="ui-button ui-button-secondary" type="submit">Apply</button>
        </form>
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
