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

  return (
    <div className="record-card">
      <div className="button-row">
        <strong>{subject || "Email draft"}</strong>
        <span className="ui-badge ui-badge-info">{draft.approval_status ?? "pending"}</span>
        {draft.sent ? <span className="ui-badge ui-badge-success">Sent</span> : null}
      </div>
      {draft.block_reason ? <p className="muted">{draft.block_reason}</p> : null}
      <form action={updateEmailDraftAction} className="form mt-4">
        <input type="hidden" name="draftId" value={draft.id ?? ""} />
        <input type="hidden" name="leadId" value={leadId} />
        <label>
          <span>Subject</span>
          <input name="subject" defaultValue={subject} disabled={!isEditable} />
        </label>
        <label>
          <span>Body</span>
          <textarea name="body" rows={compact ? 8 : 12} defaultValue={body} disabled={!isEditable} />
        </label>
        <div className="button-row">
          <Button type="submit" variant="secondary" disabled={!isEditable}>Save changes</Button>
        </div>
      </form>
      <div className="button-row mt-4">
        <form action={approveEmailDraftAction}>
          <input type="hidden" name="draftId" value={draft.id ?? ""} />
          <input type="hidden" name="leadId" value={leadId} />
          <Button type="submit" disabled={Boolean(draft.sent)}>Approve draft</Button>
        </form>
        <form action={rejectEmailDraftAction} className="flex flex-col gap-2">
          <input type="hidden" name="draftId" value={draft.id ?? ""} />
          <input type="hidden" name="leadId" value={leadId} />
          <input name="reason" placeholder="Rejection reason" className="field" />
          <Button type="submit" variant="danger" disabled={Boolean(draft.sent)}>Reject draft</Button>
        </form>
      </div>
      <form action={regenerateEmailDraftAction} className="form mt-4">
        <input type="hidden" name="draftId" value={draft.id ?? ""} />
        <input type="hidden" name="leadId" value={leadId} />
        <label>
          <span>Regeneration note</span>
          <input name="reason" placeholder="What should WF-05 improve?" disabled={Boolean(draft.sent)} />
        </label>
        <Button type="submit" variant="secondary" disabled={Boolean(draft.sent)}>Request regenerate</Button>
      </form>
    </div>
  );
}
