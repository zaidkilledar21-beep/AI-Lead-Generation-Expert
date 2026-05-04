"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { markReplyHandledAction, assignLeadAction, closeLeadAction } from "@/lib/crm/actions";
import { OBJECTION_REPLY_INTENTS, POSITIVE_REPLY_INTENTS } from "@/lib/crm/status-contract";

interface InboxThread {
  id: string;
  leadId: string;
  businessName: string;
  fromEmail: string;
  receivedAt: string | null;
  intent: string | null;
  sentiment: string | null;
  isUnhandled: boolean;
  body: string | null;
  excerpt: string | null;
  summary: string | null;
  suggestedNextAction: string | null;
  aiDraftReply: string | null;
  leadAssignedTo?: string | null;
  replyAssignedTo?: string | null;
}

interface TimelineItem {
  id: string;
  type: string;
  label: string;
  at: string;
  body?: string;
  sender?: string;
}

interface LeadProfile {
  user_id: string;
  display_name: string;
}

interface LeadDetails {
  id: string;
  assignedTo?: string | null;
  timeline: TimelineItem[];
}

export function InboxView({ 
  filtered, 
  selected, 
  tab,
  leadDetails,
  profiles = []
}: Readonly<{ 
  filtered: InboxThread[]; 
  selected: InboxThread | null; 
  tab: string;
  leadDetails?: LeadDetails | null;
  profiles?: LeadProfile[];
}>) {
  const messages = useMemo(() => {
    if (!leadDetails?.timeline) return [];
    return [...leadDetails.timeline]
      .filter((item) => 
        item.type === "reply" ||
        item.type === "sent" ||
        item.type === "outreach" ||
        (item.type === "action" && (item.label.includes("sent") || item.label.includes("outreach")))
      )
      .reverse();
  }, [leadDetails?.timeline]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[75vh] min-h-[600px] mt-6">
      {/* Left Pane: Thread List */}
      <section className="lg:col-span-4 flex flex-col glass-panel overflow-hidden group">
        <div className="p-4 border-b border-white/5 shrink-0 flex justify-between items-center bg-black/10">
          <h2 className="font-medium text-white/90">Replies</h2>
          <Badge tone="muted">{filtered.length} visible</Badge>
        </div>
        
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <div className="flex flex-col">
            {filtered.map((thread, i) => {
              const isSelected = selected?.id === thread.id;
              
              // Intent color mapping
              let intentTone: "info" | "success" | "warning" | "danger" | "muted" = "info";
              if ((POSITIVE_REPLY_INTENTS as readonly string[]).includes(thread.intent ?? "")) intentTone = "success";
              if ((OBJECTION_REPLY_INTENTS as readonly string[]).includes(thread.intent ?? "")) intentTone = "danger";
              if (thread.intent === "out_of_office") intentTone = "warning";
              if (["bounce", "bounce_or_noise"].includes(thread.intent ?? "")) intentTone = "muted";

              // Sentiment indicator
              let sentimentColor = "bg-white/20";
              if (thread.sentiment === "positive") sentimentColor = "bg-emerald-500";
              else if (thread.sentiment === "negative") sentimentColor = "bg-rose-500";

              const assignedInitials = thread.leadAssignedTo 
                ? thread.leadAssignedTo.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                : null;

              return (
                <motion.a
                  href={`/inbox?tab=${tab}&thread=${thread.id}`}
                  key={thread.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05, type: "spring", stiffness: 300, damping: 30 }}
                  className={`p-4 border-b border-white/5 hover:bg-white/[0.04] transition-all relative ${
                    isSelected ? "bg-white/[0.03] before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-brand" : ""
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${sentimentColor} shadow-[0_0_8px_rgba(0,0,0,0.5)]`} title={`Sentiment: ${thread.sentiment ?? 'neutral'}`} />
                      <strong className={`font-medium truncate ${isSelected ? "text-brand" : "text-white/90"}`}>
                        {thread.businessName}
                      </strong>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {assignedInitials && (
                        <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-white/40 border border-white/10" title={`Assigned to ${thread.leadAssignedTo}`}>
                          {assignedInitials}
                        </div>
                      )}
                      <span className="text-[10px] font-mono text-white/40 whitespace-nowrap">
                        {thread.receivedAt ? new Date(thread.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--"}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-white/40 truncate mb-3 pl-4">
                    {thread.fromEmail ?? "Unknown sender"}
                  </div>
                  <div className="flex justify-between items-center pl-4">
                    <div className="flex gap-1.5">
                      <Badge tone={intentTone} className="text-[10px] px-1.5 py-0 uppercase tracking-tighter">
                        {thread.intent?.replaceAll("_", " ") ?? "unclassified"}
                      </Badge>
                    </div>
                    {thread.isUnhandled ? (
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Open</span>
                      </div>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-500/60 uppercase tracking-wider">Handled</span>
                    )}
                  </div>
                </motion.a>
              );
            })}
          </div>
        </div>
      </section>

      {/* Right Pane: Thread Workspace */}
      <aside className="lg:col-span-8 flex flex-col glass-panel overflow-hidden group">
        {selected ? (
          <>
            <div className="p-4 border-b border-white/5 shrink-0 bg-black/10 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand/20 flex items-center justify-center text-brand font-bold border border-brand/20">
                  {selected.businessName.charAt(0)}
                </div>
                <div>
                  <h2 className="font-medium text-white/90 leading-tight">{selected.businessName}</h2>
                  <p className="text-xs text-white/40">{selected.fromEmail}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <form action={closeLeadAction} className="flex items-center">
                    <input type="hidden" name="leadId" value={selected.leadId} />
                    <input type="hidden" name="replyEventId" value={selected.id} />
                    <input type="hidden" name="outcome" value="won" />
                    <button type="submit" className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase rounded-lg border border-emerald-500/20 transition-all active:scale-95">
                      Mark Won
                    </button>
                  </form>
                  <form action={closeLeadAction} className="flex items-center">
                    <input type="hidden" name="leadId" value={selected.leadId} />
                    <input type="hidden" name="replyEventId" value={selected.id} />
                    <input type="hidden" name="outcome" value="lost" />
                    <button type="submit" className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[10px] font-bold uppercase rounded-lg border border-rose-500/20 transition-all active:scale-95">
                      Mark Lost
                    </button>
                  </form>
                </div>

                <div className="h-6 w-px bg-white/10" />

                <form action={assignLeadAction} className="flex items-center gap-2">
                  <input type="hidden" name="leadId" value={selected.leadId} />
                  <select 
                    name="assignedTo" 
                    onChange={(e) => e.target.form?.requestSubmit()}
                    defaultValue={leadDetails?.assignedTo || ""}
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white/70 outline-none focus:border-brand transition-colors cursor-pointer"
                  >
                    <option value="" disabled>Assign to...</option>
                    {profiles.map(p => (
                      <option key={p.user_id} value={p.display_name}>{p.display_name}</option>
                    ))}
                  </select>
                </form>
                <div className="h-6 w-px bg-white/10" />
                <Badge tone={selected.isUnhandled ? "warning" : "success"}>
                  {selected.isUnhandled ? "Action Required" : "Resolved"}
                </Badge>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 scrollbar-hide flex flex-col gap-8">
              {/* Conversation History */}
              <div className="flex flex-col gap-4">
                {messages.length > 0 ? messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.type === "sent" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-2xl p-4 ${
                      msg.type === "sent" 
                        ? "bg-brand/10 border border-brand/20 text-brand-light rounded-tr-none" 
                        : "bg-white/5 border border-white/10 text-white/80 rounded-tl-none"
                    }`}>
                      <div className="flex justify-between items-center mb-2 gap-4">
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-50">
                          {msg.type === "sent" ? "You" : (msg.sender || "Lead")}
                        </span>
                        <span className="text-[10px] opacity-40 font-mono">
                          {msg.at ? new Date(msg.at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ""}
                        </span>
                      </div>
                      <div className="text-sm whitespace-pre-wrap leading-relaxed">
                        {msg.body}
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <div className="prose prose-invert max-w-none text-white/80 whitespace-pre-wrap leading-relaxed text-sm">
                      {selected.body || selected.excerpt || "No reply body stored."}
                    </div>
                  </div>
                )}
              </div>

              {/* AI Insights Panel */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-brand/10 border border-brand/20 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    <span className="text-xs font-bold text-brand uppercase tracking-wider">AI Summary</span>
                  </div>
                  <div className="text-sm text-brand-light/70 italic leading-relaxed">
                    "{selected.summary || "Analyzing thread context..."}"
                  </div>
                </div>
                
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-400">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                    </svg>
                    <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Suggested Next Action</span>
                  </div>
                  <div className="text-sm text-blue-100/70 leading-relaxed">
                    {selected.suggestedNextAction || "Wait for further classification."}
                  </div>
                </div>
              </div>

              {/* AI Draft Section */}
              <div className="bg-brand/5 border border-brand/20 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-brand/10">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-brand/20 flex items-center justify-center">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand">
                        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                      </svg>
                    </div>
                    <h3 className="font-medium text-brand">AI Draft Reply</h3>
                  </div>
                  <button className="text-[10px] font-bold text-brand uppercase hover:underline">Copy to clipboard</button>
                </div>
                <div className="prose prose-invert max-w-none text-brand/80 whitespace-pre-wrap text-sm leading-relaxed">
                  {selected.aiDraftReply ?? "Generating response based on founder profile..."}
                </div>
              </div>

              {/* Handled Form */}
              <form action={markReplyHandledAction} className="bg-black/40 border border-white/10 p-6 rounded-2xl mt-auto">
                <input type="hidden" name="replyEventId" value={selected.id} />
                <input type="hidden" name="leadId" value={selected.leadId} />
                <div className="flex flex-col gap-4">
                  <textarea 
                    name="notes" 
                    rows={3} 
                    placeholder="Add a closing note for this interaction..." 
                    className="bg-white/5 border border-white/10 rounded-xl p-3 text-white/90 placeholder:text-white/20 focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all resize-none text-sm"
                  />
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] text-white/30 italic">Marking as handled will remove this from the active inbox.</p>
                    <button type="submit" className="px-6 py-2 bg-brand hover:bg-brand-light text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-brand/20 active:scale-95">
                      Complete Interaction
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-white/20">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mb-4 opacity-20">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <p className="text-sm font-medium">Select a thread to start working</p>
          </div>
        )}
      </aside>
    </div>
  );
}
