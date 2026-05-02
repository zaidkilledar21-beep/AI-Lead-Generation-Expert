import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type { DiscoverLeadsInput, DiscoverLeadsOutput, GooglePlacesLeadInput } from "@/lib/contracts";
import { assertDiscoverInput } from "@/lib/contracts";

export type RawLeadInput = GooglePlacesLeadInput & {
  business_name: string;
  linkedin_url?: string | null;
};

function normalizeUrl(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function normalizeEmail(value?: string | null) {
  return value?.trim().toLowerCase() || null;
}

function normalizeDomain(value?: string | null) {
  const normalized = normalizeUrl(value);
  if (!normalized) return null;

  try {
    return new URL(normalized).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return null;
  }
}

type DuplicateReason = "google_place_id" | "domain" | "phone" | "name_location";

export function buildLeadDedupeKey(lead: Pick<RawLeadInput, "business_name" | "website" | "phone" | "city" | "country" | "address" | "google_place_id">) {
  if (lead.google_place_id) return `place:${lead.google_place_id}`;

  const domain = normalizeDomain(lead.website);
  if (domain) return `domain:${domain}`;

  if (lead.phone) return `phone:${lead.phone.replace(/\D/g, "")}`;

  return `name:${lead.business_name.trim().toLowerCase()}|${(lead.city ?? "").trim().toLowerCase()}|${(lead.country ?? lead.address ?? "").trim().toLowerCase()}`;
}

async function findDuplicateReason(lead: ReturnType<typeof normalizeLead>): Promise<DuplicateReason | null> {
  const supabase = createSupabaseServiceClient();
  const domain = normalizeDomain(lead.website);
  const normalizedPhone = lead.phone?.replace(/\D/g, "") || null;

  if (lead.google_place_id) {
    const { count } = await supabase.from("leads").select("id", { count: "exact", head: true }).eq("google_place_id", lead.google_place_id);
    if ((count ?? 0) > 0) return "google_place_id";
  }

  if (domain) {
    const { count } = await supabase.from("leads").select("id", { count: "exact", head: true }).ilike("website", `%${domain}%`);
    if ((count ?? 0) > 0) return "domain";
  }

  if (lead.phone) {
    const { count } = await supabase.from("leads").select("id", { count: "exact", head: true }).eq("phone", lead.phone);
    if ((count ?? 0) > 0) return "phone";
  }

  if (normalizedPhone && normalizedPhone !== lead.phone) {
    const { data } = await supabase.from("leads").select("id,phone").not("phone", "is", null).limit(200);
    if ((data ?? []).some((row) => String(row.phone ?? "").replace(/\D/g, "") === normalizedPhone)) return "phone";
  }

  let nameLocationQuery = supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("business_name", lead.business_name);

  nameLocationQuery = lead.city ? nameLocationQuery.eq("city", lead.city) : nameLocationQuery.is("city", null);
  nameLocationQuery = lead.country ? nameLocationQuery.eq("country", lead.country) : nameLocationQuery.is("country", null);

  const { count } = await nameLocationQuery;
  return (count ?? 0) > 0 ? "name_location" : null;
}

function normalizeLead(raw: RawLeadInput, defaults?: Partial<DiscoverLeadsInput>) {
  const website = normalizeUrl(raw.website);

  return {
    business_name: raw.business_name.trim(),
    website,
    country: raw.country?.trim() || defaults?.location || null,
    city: raw.city?.trim() || null,
    niche: raw.niche?.trim() || defaults?.niche || null,
    source: raw.source?.trim() || "manual_import",
    google_maps_url: raw.google_maps_url?.trim() || null,
    linkedin_url: raw.linkedin_url?.trim() || null,
    phone: raw.phone?.trim() || null,
    email: normalizeEmail(raw.email),
    whatsapp: raw.whatsapp?.trim() || null,
    rating: raw.rating ?? null,
    review_count: raw.review_count ?? null,
    address: raw.address?.trim() || null,
    campaign_id: raw.campaign_id ?? null,
    candidate_id: raw.candidate_id ?? null,
    discovery_run_id: raw.discovery_run_id ?? null,
    google_place_id: raw.google_place_id?.trim() || null,
    dedupe_key: raw.dedupe_key?.trim() || buildLeadDedupeKey(raw),
    source_attribution: raw.source_attribution ?? {},
    status: "new"
  };
}

export async function importDiscoveredLeads(input: DiscoverLeadsInput, leads: RawLeadInput[]): Promise<DiscoverLeadsOutput> {
  assertDiscoverInput(input);

  const supabase = createSupabaseServiceClient();
  const errors: string[] = [];
  const createdLeadIds: string[] = [];
  const duplicateReasonCounts: Record<string, number> = {};
  const failureReasonCounts: Record<string, number> = {};
  let created = 0;
  let duplicates = 0;
  const firstLead = leads[0];

  for (const raw of leads.slice(0, input.max_results)) {
    try {
      if (!raw.business_name?.trim()) {
        errors.push("Skipped lead without business_name");
        continue;
      }

      const lead = normalizeLead(raw, input);
      const duplicateReason = await findDuplicateReason(lead);
      if (duplicateReason) {
        duplicates += 1;
        duplicateReasonCounts[duplicateReason] = (duplicateReasonCounts[duplicateReason] ?? 0) + 1;
        continue;
      }

      const { data: insertedLead, error } = await supabase.from("leads").insert(lead).select("id").single();

      if (error) {
        if (error.code === "23505") {
          duplicates += 1;
          duplicateReasonCounts.database_constraint = (duplicateReasonCounts.database_constraint ?? 0) + 1;
        } else {
          errors.push(`${lead.business_name}: ${error.message}`);
          failureReasonCounts.database_error = (failureReasonCounts.database_error ?? 0) + 1;
        }
      } else {
        if (raw.candidate_id && insertedLead?.id) {
          await supabase
            .from("lead_candidates")
            .update({ final_lead_id: insertedLead.id, candidate_status: "promoted" })
            .eq("id", raw.candidate_id);
        }
        if (insertedLead?.id) {
          createdLeadIds.push(insertedLead.id);
        }
        created += 1;
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Unknown import error");
      failureReasonCounts.exception = (failureReasonCounts.exception ?? 0) + 1;
    }
  }

  await supabase.from("workflow_events").insert({
    workflow_name: "WF-01 Lead Intake",
    campaign_id: firstLead?.campaign_id ?? null,
    discovery_run_id: firstLead?.discovery_run_id ?? null,
    event_type: "lead_intake",
    status: errors.length > 0 ? "failed" : "completed",
    error_message: errors[0] ?? null,
    payload: {
      received: Math.min(leads.length, input.max_results),
      created,
      duplicates,
      errors_count: errors.length,
      duplicate_reason_counts: duplicateReasonCounts,
      failure_reason_counts: failureReasonCounts
    }
  });

  return { created, duplicates, errors, created_lead_ids: createdLeadIds };
}
