"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { markReplyHandledAction } from "@/lib/crm/actions";

interface InboxThread {
  id: string;
  leadId: string;
  businessName: string;
  fromEmail: string;
  receivedAt: string | null;
  intent: string | null;
  isUnhandled: boolean;
  body: string | null;
  excerpt: string | null;
  summary: string | null;
  suggestedNextAction: string | null;
  aiDraftReply: string | null;
}

export function InboxView({ 
  filtered, 
  selected, 
  tab 
}: Readonly<{ 
  filtered: InboxThread[]; 
  selected: InboxThread | null; 
  tab: string;
}>) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[75vh] min-h-[600px] mt-6">
      {/* Left Pane: Thread List */}
      <section className="lg:col-span-5 flex flex-col glass-panel overflow-hidden group">
        <div className="p-4 border-b border-white/5 shrink-0 flex justify-between items-center bg-black/10">
          <h2 className="font-medium text-white/90">Replies</h2>
          <Badge tone="muted">{filtered.length} visible</Badge>
        </div>
        
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <div className="flex flex-col">
            {filtered.map((thread, i) => {
              const isSelected = selected?.id === thread.id;
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
                  <div className="flex justify-between items-start mb-2">
                    <strong className={`font-medium ${isSelected ? "text-brand" : "text-white/90"}`}>
                      {thread.businessName}
                    </strong>
                    <span className="text-xs font-mono text-white/40">
                      {thread.receivedAt ? new Date(thread.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--"}
                    </span>
                  </div>
                  <div className="text-sm text-white/50 truncate mb-3">
                    {thread.fromEmail ?? "Unknown sender"}
                  </div>
                  <div className="flex justify-between items-center">
                    <Badge tone="info">{thread.intent ?? "unclassified"}</Badge>
                    {thread.isUnhandled ? <Badge tone="warning">Open</Badge> : <Badge tone="success">Handled</Badge>}
                  </div>
                </motion.a>
              );
            })}
          </div>
        </div>
      </section>

      {/* Right Pane: Thread Workspace */}
      <aside className="lg:col-span-7 flex flex-col glass-panel overflow-hidden group">
        <div className="p-4 border-b border-white/5 shrink-0 bg-black/10">
          <h2 className="font-medium text-white/90">Thread workspace</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          <AnimatePresence mode="wait">
            {selected ? (
              <motion.div
                key={selected.id}
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.98 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="flex flex-col gap-6"
              >
                {/* Original Reply Message */}
                <div className="relative">
                  <div className="absolute -left-3 top-0 bottom-0 w-px bg-white/10" />
                  <div className="absolute -left-[15px] top-6 w-2 h-2 rounded-full bg-white/20 border border-white/10" />
                  
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6 relative group-hover:border-white/20 transition-colors">
                    <div className="flex justify-between items-start mb-4 border-b border-white/5 pb-4">
                      <div>
                        <h3 className="text-lg font-medium text-white/90">{selected.businessName}</h3>
                        <div className="text-sm text-white/50">{selected.fromEmail}</div>
                      </div>
                      <div className="flex gap-2">
                        <Badge tone="info">{selected.intent ?? "unclassified"}</Badge>
                        <Badge tone={selected.isUnhandled ? "warning" : "success"}>{selected.isUnhandled ? "Open" : "Handled"}</Badge>
                      </div>
                    </div>
                    
                    <div className="prose prose-invert max-w-none text-white/80 whitespace-pre-wrap leading-relaxed text-sm">
                      {selected.body || selected.excerpt || "No reply body stored."}
                    </div>
                    
                    <div className="mt-6 p-4 bg-brand/10 border border-brand/20 rounded-xl">
                      <div className="text-sm font-medium text-brand/80 mb-1">AI Summary</div>
                      <div className="text-sm text-brand/60">{selected.summary ?? "No AI summary available."}</div>
                    </div>
                    
                    <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                      <div className="text-sm font-medium text-blue-400 mb-1">Suggested Next Action</div>
                      <div className="text-sm text-blue-300/80">{selected.suggestedNextAction ?? "No suggestion yet."}</div>
                    </div>
                  </div>
                </div>

                {/* AI Draft Reply */}
                <div className="relative mt-4">
                  <div className="absolute -left-3 top-0 bottom-0 w-px bg-brand/20" />
                  <div className="absolute -left-[15px] top-6 w-2 h-2 rounded-full bg-brand/50 border border-brand/20" />
                  
                  <div className="bg-brand/5 border border-brand/20 rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-4 pb-4 border-b border-brand/10">
                      <div className="w-6 h-6 rounded bg-brand/20 flex items-center justify-center">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand">
                          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                        </svg>
                      </div>
                      <h3 className="font-medium text-brand">AI Draft Reply</h3>
                    </div>
                    <div className="prose prose-invert max-w-none text-brand/80 whitespace-pre-wrap text-sm leading-relaxed">
                      {selected.aiDraftReply ?? "No draft reply available yet."}
                    </div>
                  </div>
                </div>

                {/* Action Area */}
                <form action={markReplyHandledAction} className="mt-6 flex flex-col gap-4 bg-black/20 border border-white/5 p-6 rounded-2xl">
                  <input type="hidden" name="replyEventId" value={selected.id} />
                  <input type="hidden" name="leadId" value={selected.leadId} />
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-white/60">Handling notes</span>
                    <textarea 
                      name="notes" 
                      rows={4} 
                      placeholder="Outcome, pricing sent, booked call, objection noted..." 
                      className="bg-white/5 border border-white/10 rounded-xl p-3 text-white/90 placeholder:text-white/20 focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all resize-none text-sm"
                    />
                  </label>
                  <button type="submit" className="self-end px-6 py-2.5 bg-brand hover:bg-brand-light text-white font-medium rounded-xl transition-colors shadow-lg shadow-brand/20">
                    Mark Handled
                  </button>
                </form>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex flex-col items-center justify-center text-white/30"
              >
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mb-4 opacity-50">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <p>Select a thread to view details</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </aside>
    </div>
  );
}
