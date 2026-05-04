import { PageHeader } from "@/components/crm/page-header";
import { getInboxThreads, getLeadDetail, getSettingsData } from "@/lib/crm/queries";
import { InboxView } from "@/components/crm/inbox-view";
import { OBJECTION_REPLY_INTENTS, POSITIVE_REPLY_INTENTS } from "@/lib/crm/status-contract";

export default async function InboxPage({
  searchParams
}: Readonly<{
  searchParams?: { thread?: string; tab?: string };
}>) {
  const [threads, settings] = await Promise.all([
    getInboxThreads(),
    getSettingsData()
  ]);

  const tab = searchParams?.tab ?? "all";
  const filtered = threads.filter((thread) => {
    if (tab === "all") return true;
    if (tab === "unhandled") return thread.isUnhandled;
    if (tab === "positive") return (POSITIVE_REPLY_INTENTS as readonly string[]).includes(thread.intent ?? "");
    if (tab === "objections") return (OBJECTION_REPLY_INTENTS as readonly string[]).includes(thread.intent ?? "");
    if (tab === "ooo") return thread.intent === "out_of_office";
    if (tab === "bounced") return ["bounce", "bounce_or_noise"].includes(thread.intent ?? "");
    if (tab === "review") return thread.requiresHumanReview;
    return true;
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
            <a className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "all" ? "bg-white/10 text-white" : "bg-transparent hover:bg-white/5 text-white/60"}`} href="/inbox?tab=all">All</a>
            <a className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "unhandled" ? "bg-brand/20 text-brand" : "bg-transparent hover:bg-white/5 text-white/60"}`} href="/inbox?tab=unhandled">Unhandled</a>
            <a className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "positive" ? "bg-blue-500/20 text-blue-400" : "bg-transparent hover:bg-white/5 text-white/60"}`} href="/inbox?tab=positive">Positive</a>
            <a className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "objections" ? "bg-orange-500/20 text-orange-400" : "bg-transparent hover:bg-white/5 text-white/60"}`} href="/inbox?tab=objections">Objections</a>
            <a className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "ooo" ? "bg-purple-500/20 text-purple-400" : "bg-transparent hover:bg-white/5 text-white/60"}`} href="/inbox?tab=ooo">OOO</a>
            <a className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "bounced" ? "bg-gray-500/20 text-gray-400" : "bg-transparent hover:bg-white/5 text-white/60"}`} href="/inbox?tab=bounced">Bounced</a>
            <a className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "review" ? "bg-red-500/20 text-red-400" : "bg-transparent hover:bg-white/5 text-white/60"}`} href="/inbox?tab=review">Needs review</a>
          </div>
        </div>
      </section>
      
      <InboxView 
        filtered={filtered} 
        selected={selected} 
        tab={tab} 
        leadDetails={leadDetails}
        profiles={settings.profiles}
      />
    </>
  );
}
