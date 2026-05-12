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
    <div className="crm-state-card overflow-hidden">
      <div className={`border-b border-white/8 ${compact ? "p-4" : "p-6"}`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">Communication draft</span>
            <strong className="mt-2 block truncate text-lg font-semibold tracking-[-0.025em] text-white">
              {subject || "New message draft"}
            </strong>
            <p className="mt-2 text-xs leading-5 text-white/45">
              Step {draft.step_number ?? "--"} | {draft.word_count ?? "--"} words | {draft.validation_passed ? "Validated" : "Pending review"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone={statusLabel === "approved" ? "success" : "warning"} className="px-2.5 py-0.5 text-[10px] uppercase">
              {statusLabel}
            </Badge>
            {draft.sent ? <Badge tone="info" className="px-2.5 py-0.5 text-[10px] uppercase">Sent</Badge> : null}
            {draft.block_reason ? <Badge tone="danger" className="px-2.5 py-0.5 text-[10px] uppercase">Blocked</Badge> : null}
          </div>
        </div>
      </div>

      {draft.block_reason ? (
        <div className="border-y border-amber-500/20 bg-amber-500/10 px-6 py-3 text-sm leading-6 text-amber-100/80">
          <div className="flex items-center gap-3">
            <div className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span>{draft.block_reason}</span>
          </div>
        </div>
      ) : null}

      <div className={compact ? "p-4" : "p-6"}>
        <form action={updateEmailDraftAction} className="space-y-5">
          <input type="hidden" name="draftId" value={draft.id ?? ""} />
          <input type="hidden" name="leadId" value={leadId} />

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40 ml-1">Subject line</span>
                <input
                  name="subject"
                  defaultValue={subject}
                  disabled={!isEditable}
                  className="field bg-white/[0.03]"
                />
              </div>
              <div className="space-y-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40 ml-1">Message body</span>
                <textarea
                  name="body"
                  rows={compact ? 8 : 14}
                  defaultValue={body}
                  disabled={!isEditable}
                  className="field min-h-[240px] resize-none bg-white/[0.03] leading-relaxed"
                />
              </div>
            </div>

            <div className="grid content-start gap-4">
              <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4">
                <h4 className="text-sm font-semibold text-white">Approval state</h4>
                <p className="mt-1 text-xs leading-5 text-white/45">
                  Approve to queue the draft for delivery, reject to archive, or request a regeneration with stronger guidance.
                </p>
              </div>
              <div className="rounded-[20px] border border-brand/15 bg-brand/10 p-4">
                <h4 className="text-sm font-semibold text-white">Editing rules</h4>
                <p className="mt-1 text-xs leading-5 text-white/50">
                  Locked once the message has been sent or approved. The writer stays honest and the workflow stays auditable.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" variant="secondary" disabled={!isEditable} className="h-10 px-6 rounded-xl font-semibold text-xs uppercase tracking-[0.18em]">
              Save content
            </Button>
          </div>
        </form>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-5">
            <div>
              <h4 className="text-sm font-semibold text-white">Approve and release</h4>
              <p className="mt-1 text-xs leading-5 text-white/45">Instantly queue this draft for delivery via WF-06.</p>
            </div>
            <form action={approveEmailDraftAction} className="mt-4">
              <input type="hidden" name="draftId" value={draft.id ?? ""} />
              <input type="hidden" name="leadId" value={leadId} />
              <Button type="submit" disabled={Boolean(draft.sent)} className="w-full h-11 rounded-xl bg-brand text-white font-semibold text-xs uppercase tracking-[0.2em] shadow-lg shadow-brand/10">
                Approve for sending
              </Button>
            </form>
          </div>

          <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-5">
            <div>
              <h4 className="text-sm font-semibold text-white">Reject draft</h4>
              <p className="mt-1 text-xs leading-5 text-white/45">Archive this draft and stop the current sequence step.</p>
            </div>
            <form action={rejectEmailDraftAction} className="mt-4 space-y-3">
              <input type="hidden" name="draftId" value={draft.id ?? ""} />
              <input type="hidden" name="leadId" value={leadId} />
              <input name="reason" placeholder="Why reject?" className="field" disabled={Boolean(draft.sent)} />
              <Button type="submit" variant="danger" disabled={Boolean(draft.sent)} className="w-full h-10 rounded-xl font-semibold text-xs uppercase tracking-[0.18em]">
                Reject draft
              </Button>
            </form>
          </div>
        </div>

        <div className="mt-4 rounded-[20px] border border-white/8 bg-white/[0.03] p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <h4 className="text-sm font-semibold text-white">Request regeneration</h4>
              <p className="mt-1 text-xs leading-5 text-white/45">Ask WF-05 to redraw the content with specific notes.</p>
            </div>
            <form action={regenerateEmailDraftAction} className="flex w-full max-w-xl items-center gap-2">
              <input type="hidden" name="draftId" value={draft.id ?? ""} />
              <input type="hidden" name="leadId" value={leadId} />
              <input name="reason" placeholder="Improvement notes..." className="field flex-1" disabled={Boolean(draft.sent)} />
              <Button type="submit" variant="secondary" disabled={Boolean(draft.sent)} className="h-10 px-4 rounded-xl font-semibold text-xs uppercase tracking-[0.18em] whitespace-nowrap">
                Regenerate
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
