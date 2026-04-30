import { forbiddenPhrases, safeLeadStatuses, wordLimits } from "@/lib/config/outreach";
import type { Band, EmailGenerationOutput, LeadStatus } from "@/lib/types";

export type EmailValidationContext = {
  band: Band;
  stepNumber: number;
  prospectEmail: string | null;
  leadStatus: LeadStatus;
  replyExists: boolean;
  inboxDailyLimitReached: boolean;
};

export function validateEmailDraft(output: EmailGenerationOutput, context: EmailValidationContext) {
  const failures: string[] = [];
  const fullText = `${output.subject_line}\n${output.message_body}`.toLowerCase();
  const wordLimit = wordLimits[`${context.band}:${context.stepNumber}`];

  if (!output.subject_line.trim()) failures.push("subject_line_empty");
  if (!output.message_body.trim()) failures.push("message_body_empty");
  if (wordLimit && output.word_count > wordLimit) failures.push("word_count_exceeded");
  if (!output.validation.has_specific_observation) failures.push("missing_specific_observation");
  if (!output.validation.has_one_automation_idea) failures.push("missing_single_automation_idea");
  if (!output.validation.has_one_cta && output.cta_type !== "none") failures.push("missing_single_cta");
  if (!output.validation.no_false_claims) failures.push("false_claim_risk");
  if (context.stepNumber === 1 && output.validation.link_count > 0) failures.push("step_1_links_not_allowed");
  if (context.stepNumber > 1 && output.validation.link_count > 2) failures.push("too_many_links");
  if (!context.prospectEmail) failures.push("prospect_email_missing");
  if (safeLeadStatuses.includes(context.leadStatus)) failures.push(`lead_status_${context.leadStatus}`);
  if (context.replyExists) failures.push("reply_exists");
  if (context.inboxDailyLimitReached) failures.push("inbox_daily_limit_reached");

  for (const phrase of forbiddenPhrases) {
    if (fullText.includes(phrase)) failures.push(`forbidden_phrase:${phrase}`);
  }

  return {
    passed: failures.length === 0,
    failures
  };
}
