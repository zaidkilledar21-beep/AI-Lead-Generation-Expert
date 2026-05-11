import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  approveEmailDraftAction,
  regenerateEmailDraftAction,
  rejectEmailDraftAction,
  updateEmailDraftAction
} from "@/lib/crm/actions";

type DraftLike = {
  id?: string;
  subject?: string | null;
  subject_line?: string | null;
  body?: string | null;
  message_body?: string | null;
  approval_status?: string | null;
  sent?: boolean | null;
  step_number?: number | null;
  validation_passed?: boolean | null;
  word_count?: number | null;
  block_reason?: string | null;
};

export function DraftReviewEditor({
  draft,
  leadId,
  compact = false
}: Readonly<{
  draft: DraftLike;
  leadId: string;
  compact?: boolean;
}>) {
  const subject = draft.subject ?? draft.subject_line ?? "";
  const body = draft.body ?? draft.message_body ?? "";
  const isEditable = !draft.sent && (draft.approval_status ?? "pending") !== "approved";
  const statusLabel = draft.approval_status ?? "pending";

  return (
    <div className={`crm-state-card overflow-hidden bg-black/10 border-white/5 ${compact ? "p-0" : "p-0"}`}>
      <div className={`flex items-start justify-between gap-4 border-b border-white/5 ${compact ? "p-4" : "p-6"}`}>
        <div className="min-w-0">
          <span className="metric-label text-brand-light/70 uppercase tracking-widest text-[10px]">Communication Draft</span>
          <strong className="mt-1.5 block truncate text-lg text-white/90 tracking-tight">{subject || "New Message Draft"}</strong>
          <p className="mt-1 text-xs text-white/40 font-medium">
            Step {draft.step_number ?? "--"} · {draft.word_count ?? "--"} words · {draft.validation_passed ? "Validated" : "Pending review"}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          <Badge tone={statusLabel === "approved" ? "success" : "warning"} className="px-2.5 py-0.5 text-[10px] uppercase">{statusLabel}</Badge>
          {draft.sent ? <Badge tone="info" className="px-2.5 py-0.5 text-[10px] uppercase">Sent</Badge> : null}
        </div>
      </div>

      {draft.block_reason ? (
        <div className="bg-amber-500/10 border-y border-amber-500/20 px-6 py-3 text-sm text-amber-200/80 flex items-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          {draft.block_reason}
        </div>
      ) : null}

      <div className={compact ? "p-4" : "p-6"}>
        <form action={updateEmailDraftAction} className="space-y-5">
          <input type="hidden" name="draftId" value={draft.id ?? ""} />
          <input type="hidden" name="leadId" value={leadId} />
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase tracking-wider text-white/30 font-bold ml-1">Subject Line</span>
            <input name="subject" defaultValue={subject} disabled={!isEditable} className="w-full bg-white/[0.03] border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-brand/50 transition-colors" />
          </div>
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase tracking-wider text-white/30 font-bold ml-1">Message Body</span>
            <textarea name="body" rows={compact ? 8 : 14} defaultValue={body} disabled={!isEditable} className="w-full bg-white/[0.03] border-white/10 rounded-xl p-4 text-sm focus:border-brand/50 transition-colors resize-none leading-relaxed" />
          </div>
          <div className="flex justify-end">
            <Button type="submit" variant="secondary" disabled={!isEditable} className="h-10 px-6 rounded-xl font-bold text-xs uppercase tracking-tight">
              Save Content
            </Button>
          </div>
        </form>

        <div className="grid gap-6 md:grid-cols-2 mt-8 pt-8 border-t border-white/5">
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-bold text-white/80 tracking-tight">Approve & Release</h4>
              <p className="mt-1 text-xs text-white/40 leading-relaxed">Instantly queue this draft for delivery via WF-06.</p>
            </div>
            <form action={approveEmailDraftAction}>
              <input type="hidden" name="draftId" value={draft.id ?? ""} />
              <input type="hidden" name="leadId" value={leadId} />
              <Button type="submit" disabled={Boolean(draft.sent)} className="w-full h-11 rounded-xl bg-brand text-white font-bold text-xs uppercase tracking-widest shadow-lg shadow-brand/10">
                Approve for Sending
              </Button>
            </form>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-bold text-white/80 tracking-tight">Reject Draft</h4>
              <p className="mt-1 text-xs text-white/40 leading-relaxed">Archive this draft and stop the current sequence step.</p>
            </div>
            <form action={rejectEmailDraftAction} className="space-y-3">
              <input type="hidden" name="draftId" value={draft.id ?? ""} />
              <input type="hidden" name="leadId" value={leadId} />
              <input name="reason" placeholder="Why reject?" className="w-full bg-white/[0.03] border-white/10 rounded-xl px-4 py-2.5 text-xs" disabled={Boolean(draft.sent)} />
              <Button type="submit" variant="danger" disabled={Boolean(draft.sent)} className="w-full h-10 rounded-xl font-bold text-xs uppercase tracking-tight">
                Reject Draft
              </Button>
            </form>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-white/5">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h4 className="text-sm font-bold text-white/80 tracking-tight">Request Regeneration</h4>
              <p className="mt-1 text-xs text-white/40 leading-relaxed">Ask WF-05 to redraw the content with specific notes.</p>
            </div>
            <form action={regenerateEmailDraftAction} className="flex items-center gap-2 flex-1 max-w-sm">
              <input type="hidden" name="draftId" value={draft.id ?? ""} />
              <input type="hidden" name="leadId" value={leadId} />
              <input name="reason" placeholder="Improvement notes..." className="flex-1 bg-white/[0.03] border-white/10 rounded-xl px-4 py-2.5 text-xs" disabled={Boolean(draft.sent)} />
              <Button type="submit" variant="secondary" disabled={Boolean(draft.sent)} className="h-10 px-4 rounded-xl font-bold text-xs uppercase tracking-tight whitespace-nowrap">
                Regenerate
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
