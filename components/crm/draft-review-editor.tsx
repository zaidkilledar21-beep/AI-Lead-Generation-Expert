import { Button } from "@/components/ui/button";
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
    <div className={`crm-state-card space-y-4 ${compact ? "p-4" : "p-5"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="metric-label">Email draft</span>
          <strong className="mt-1 block truncate text-white/90">{subject || "Email draft"}</strong>
          <p className="mt-2 text-sm text-white/55">
            Step {draft.step_number ?? "--"} · {draft.word_count ?? "--"} words
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          <span className="ui-badge ui-badge-info">{statusLabel}</span>
          {draft.sent ? <span className="ui-badge ui-badge-success">Sent</span> : null}
        </div>
      </div>

      {draft.block_reason ? (
        <div className="crm-state-card border border-amber-500/20 bg-amber-500/[0.04] px-4 py-3 text-sm text-amber-100">
          {draft.block_reason}
        </div>
      ) : null}

      <form action={updateEmailDraftAction} className="form">
        <input type="hidden" name="draftId" value={draft.id ?? ""} />
        <input type="hidden" name="leadId" value={leadId} />
        <label>
          <span>Subject</span>
          <input name="subject" defaultValue={subject} disabled={!isEditable} />
        </label>
        <label>
          <span>Body</span>
          <textarea name="body" rows={compact ? 7 : 11} defaultValue={body} disabled={!isEditable} />
        </label>
        <div className="button-row">
          <Button type="submit" variant="secondary" disabled={!isEditable}>
            Save changes
          </Button>
        </div>
      </form>

      <div className="grid gap-3 md:grid-cols-2">
        <form action={approveEmailDraftAction} className="crm-state-card form">
          <input type="hidden" name="draftId" value={draft.id ?? ""} />
          <input type="hidden" name="leadId" value={leadId} />
          <div>
            <span className="metric-label">Approve</span>
            <p className="mt-2 text-sm text-white/55">Release the draft to WF-06 without changing the content again.</p>
          </div>
          <Button type="submit" disabled={Boolean(draft.sent)}>
            Approve draft
          </Button>
        </form>

        <form action={rejectEmailDraftAction} className="crm-state-card form">
          <input type="hidden" name="draftId" value={draft.id ?? ""} />
          <input type="hidden" name="leadId" value={leadId} />
          <label>
            <span>Rejection reason</span>
            <input name="reason" placeholder="Rejection reason" className="field" disabled={Boolean(draft.sent)} />
          </label>
          <Button type="submit" variant="danger" disabled={Boolean(draft.sent)}>
            Reject draft
          </Button>
        </form>
      </div>

      <form action={regenerateEmailDraftAction} className="crm-state-card form">
        <input type="hidden" name="draftId" value={draft.id ?? ""} />
        <input type="hidden" name="leadId" value={leadId} />
        <label>
          <span>Regeneration note</span>
          <input name="reason" placeholder="What should WF-05 improve?" disabled={Boolean(draft.sent)} />
        </label>
        <Button type="submit" variant="secondary" disabled={Boolean(draft.sent)}>
          Request regenerate
        </Button>
      </form>
    </div>
  );
}
