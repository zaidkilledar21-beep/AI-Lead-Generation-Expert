export const LEAD_STATUSES = [
  "new",
  "enriched",
  "scored",
  "review_pending",
  "pending_approval",
  "queued",
  "drafted",
  "in_sequence",
  "completed",
  "paused",
  "blocked",
  "replied_needs_review",
  "replied_interested",
  "replied_not_interested",
  "unsubscribed",
  "bounced",
  "not_interested",
  "closed_won",
  "closed_lost",
  "archived"
] as const;

export type LeadLifecycleStatus = typeof LEAD_STATUSES[number];

export const QUEUE_STATUSES = ["queued", "drafted", "paused", "blocked", "replied", "completed"] as const;

export const DRAFT_APPROVAL_STATUSES = ["pending", "approved", "auto_approved", "rejected", "blocked", "regeneration_requested"] as const;

export const MANUAL_REVIEW_STATUSES = ["pending", "approved", "rejected"] as const;

export const TERMINAL_LEAD_STATUSES = [
  "unsubscribed",
  "archived",
  "closed_won",
  "closed_lost",
  "not_interested",
  "replied_not_interested",
  "bounced"
] as const;

export const REPLY_INTENTS = [
  "positive_interest",
  "neutral_question",
  "objection",
  "not_interested",
  "unsubscribe",
  "out_of_office",
  "wrong_person",
  "bounce",
  "manual_review_required"
] as const;

export type ReplyIntent = typeof REPLY_INTENTS[number];

export const POSITIVE_REPLY_INTENTS = [
  "positive_interest"
] as const satisfies readonly ReplyIntent[];

export const NEUTRAL_REPLY_INTENTS = [
  "neutral_question",
  "out_of_office"
] as const satisfies readonly ReplyIntent[];

export const NEGATIVE_REPLY_INTENTS = [
  "not_interested",
  "unsubscribe",
  "bounce"
] as const satisfies readonly ReplyIntent[];

export const OBJECTION_REPLY_INTENTS = [
  "objection",
  "wrong_person",
  "manual_review_required"
] as const satisfies readonly ReplyIntent[];

export const HUMAN_REVIEW_REPLY_INTENTS = [
  "positive_interest",
  "neutral_question",
  "objection",
  "wrong_person",
  "manual_review_required"
] as const satisfies readonly ReplyIntent[];

export const REPLY_INTENT_LABELS: Record<ReplyIntent, string> = {
  positive_interest: "Positive interest",
  neutral_question: "Neutral question",
  objection: "Objection",
  not_interested: "Not interested",
  unsubscribe: "Unsubscribe",
  out_of_office: "Out of office",
  wrong_person: "Wrong person",
  bounce: "Bounce",
  manual_review_required: "Manual review required"
};

export function isCanonicalReplyIntent(intent: string | null | undefined): intent is ReplyIntent {
  return Boolean(intent && (REPLY_INTENTS as readonly string[]).includes(intent));
}

export function normalizeReplyIntent(intent: string | null | undefined): ReplyIntent {
  switch (intent) {
    case "interested":
    case "pricing_request":
    case "call_request":
    case "demo_request":
    case "meeting_request":
    case "high_intent":
      return "positive_interest";
    case "question":
      return "neutral_question";
    case "negative":
    case "rejection":
    case "no_interest":
      return "not_interested";
    case "opt_out":
    case "do_not_contact":
    case "remove_me":
      return "unsubscribe";
    case "ambiguous":
      return "manual_review_required";
    case "bounce_or_noise":
      return "bounce";
    default:
      return isCanonicalReplyIntent(intent) ? intent : "manual_review_required";
  }
}

export function normalizeReplyReviewReason(reason: string | null | undefined): string {
  if (!reason?.startsWith("reply_")) return reason ?? "manual_review_required";
  return `reply_${normalizeReplyIntent(reason.slice("reply_".length))}`;
}

export function formatReplyIntentLabel(intent: string | null | undefined) {
  const normalized = normalizeReplyIntent(intent);
  return REPLY_INTENT_LABELS[normalized];
}

export const MANUAL_BOARD_MOVE_STATUSES = [
  "paused",
  "archived",
  "review_pending",
  "pending_approval",
  "closed_won",
  "closed_lost",
  "not_interested"
] as const;

export type ManualBoardMoveStatus = typeof MANUAL_BOARD_MOVE_STATUSES[number];

export const LEAD_STATUS_LABELS: Record<LeadLifecycleStatus, string> = {
  new: "New",
  enriched: "Enriched",
  scored: "Scored",
  review_pending: "Review pending",
  pending_approval: "Pending approval",
  queued: "Queued",
  drafted: "Drafted",
  in_sequence: "In sequence",
  completed: "Completed",
  paused: "Paused",
  blocked: "Blocked",
  replied_needs_review: "Reply needs review",
  replied_interested: "Interested reply",
  replied_not_interested: "Not interested",
  unsubscribed: "Unsubscribed",
  bounced: "Bounced",
  not_interested: "Not interested",
  closed_won: "Closed won",
  closed_lost: "Closed lost",
  archived: "Archived"
};

export function formatStatusLabel(status: string | null | undefined) {
  if (!status) return "Unknown";
  return (LEAD_STATUS_LABELS as Record<string, string>)[status] ?? status.replaceAll("_", " ");
}

export function isTerminalLeadStatus(status: string | null | undefined) {
  return Boolean(status && (TERMINAL_LEAD_STATUSES as readonly string[]).includes(status));
}
