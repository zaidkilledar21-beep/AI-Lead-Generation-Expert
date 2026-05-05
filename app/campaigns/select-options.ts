import type { CrmSelectOption } from "@/components/ui/crm-select";

type SequenceLike = {
  id: string;
  name?: string | null;
  band?: string | null;
  active?: boolean;
};

type InboxLike = {
  id: string;
  email_address?: string | null;
  provider?: string | null;
  active?: boolean;
};

export function toInboxOptions(inboxes: InboxLike[]): CrmSelectOption[] {
  return inboxes.map((inbox) => ({
    value: inbox.id,
    label: inbox.email_address ?? inbox.id,
    description: inbox.provider ? String(inbox.provider).toUpperCase() : undefined
  }));
}

export function toBandSequenceOptions(sequences: SequenceLike[], band: "A" | "B" | "C"): CrmSelectOption[] {
  const bandMatched = sequences.filter((sequence) => sequence.band === band);
  const source = bandMatched.length > 0 ? bandMatched : sequences;

  return source.map((sequence) => ({
    value: sequence.id,
    label: sequence.name ?? `Sequence ${sequence.id.slice(0, 8)}`,
    description: sequence.band
      ? bandMatched.length > 0
        ? `Band ${sequence.band}`
        : `Band ${sequence.band} active fallback`
      : bandMatched.length > 0
        ? "Active sequence"
        : "Active fallback"
  }));
}
