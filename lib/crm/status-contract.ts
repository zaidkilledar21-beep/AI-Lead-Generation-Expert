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

export const POSITIVE_REPLY_INTENTS = [
  "interested",
  "pricing_request",
  "call_request",
  "demo_request",
  "meeting_request",
  "high_intent"
] as const;

export const NEUTRAL_REPLY_INTENTS = [
  "question",
  "neutral_question",
  "ambiguous",
  "out_of_office"
] as const;

export const NEGATIVE_REPLY_INTENTS = [
  "not_interested",
  "negative",
  "rejection",
  "unsubscribe",
  "opt_out"
] as const;

export const OBJECTION_REPLY_INTENTS = [
  ...NEGATIVE_REPLY_INTENTS,
  "objection",
  "wrong_person",
  "ambiguous",
  "manual_review_required"
] as const;

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
