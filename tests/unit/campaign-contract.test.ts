import { describe, expect, it } from "vitest";
import { assertCampaignConfigInput } from "@/lib/contracts";

function validCampaign() {
  return {
    name: "Dubai Dental Clinics - May",
    status: "draft" as const,
    description: "High-priority founder campaign",
    primary_niche: "Dental Clinics",
    niche_keywords: ["dentist", "orthodontist"],
    target_countries: ["UAE"],
    target_cities: ["Dubai"],
    exclude_cities: [],
    language_of_business: ["English", "Arabic"],
    max_leads_per_run: 100,
    lead_source: "google_places" as const,
    min_google_rating: 3.5,
    min_review_count: 5,
    exclude_chains: false,
    exclude_already_discovered: true,
    run_frequency: "manual" as const,
    min_score_band_a: 76,
    min_score_band_b: 51,
    min_automation_opportunity: 13,
    min_ability_to_pay: 9,
    min_reachability: 6,
    confidence_required: "medium" as const,
    auto_approve_band_b: false,
    require_approval_band_a: true,
    tags: ["Q2 push"],
    notes: null,
    timezone: "Asia/Karachi",
    crawl_website: true,
    max_candidates_per_day: 75,
    max_details_calls_per_day: 100,
    max_total_places_calls_per_day: 150
  };
}

describe("assertCampaignConfigInput", () => {
  it("accepts the PRD campaign contract", () => {
    expect(() => assertCampaignConfigInput(validCampaign())).not.toThrow();
  });

  it("rejects a campaign without target countries", () => {
    expect(() => assertCampaignConfigInput({ ...validCampaign(), target_countries: [] })).toThrow(
      "at least one target country is required"
    );
  });

  it("rejects inverted score thresholds", () => {
    expect(() =>
      assertCampaignConfigInput({ ...validCampaign(), min_score_band_a: 60, min_score_band_b: 70 })
    ).toThrow("min score for Band B cannot exceed Band A");
  });
});
