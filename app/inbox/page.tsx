import { PageHeader } from "@/components/crm/page-header";
import { getInboxThreads } from "@/lib/crm/queries";
import { InboxView } from "@/components/crm/inbox-view";

export default async function InboxPage({
  searchParams
}: Readonly<{
  searchParams?: { thread?: string; tab?: string };
}>) {
  const threads = await getInboxThreads();
  const tab = searchParams?.tab ?? "all";
  const filtered = threads.filter((thread) => {
    if (tab === "all") return true;
    if (tab === "unhandled") return thread.isUnhandled;
    if (tab === "positive") return ["interested", "pricing_request", "call_request", "positive_interest"].includes(thread.intent ?? "");
    if (tab === "review") return thread.requiresHumanReview;
    return true;
  });
  const selected = filtered.find((thread) => thread.id === searchParams?.thread) ?? filtered[0] ?? null;

  return (
    <>
      <PageHeader title="Inbox" description="Shared founder inbox with full reply context, suggested next action, and one-click handling." />
      <section className="glass-panel group">
        <div className="p-6 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-lg font-medium text-white/90">Views</h2>
          <div className="flex gap-2">
            <a className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "all" ? "bg-white/10 text-white" : "bg-transparent hover:bg-white/5 text-white/60"}`} href="/inbox?tab=all">All</a>
            <a className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "unhandled" ? "bg-brand/20 text-brand" : "bg-transparent hover:bg-white/5 text-white/60"}`} href="/inbox?tab=unhandled">Unhandled</a>
            <a className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "positive" ? "bg-blue-500/20 text-blue-400" : "bg-transparent hover:bg-white/5 text-white/60"}`} href="/inbox?tab=positive">Positive</a>
            <a className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "review" ? "bg-red-500/20 text-red-400" : "bg-transparent hover:bg-white/5 text-white/60"}`} href="/inbox?tab=review">Needs review</a>
          </div>
        </div>
      </section>
      
      <InboxView filtered={filtered} selected={selected} tab={tab} />

    </>
  );
}
