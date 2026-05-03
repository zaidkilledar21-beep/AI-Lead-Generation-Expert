"use client";

import { useFormState, useFormStatus } from "react-dom";
import { updateCampaign } from "./actions";

type EditableCampaign = {
  id: string;
  name: string;
  status: string;
  description: string | null;
  primary_niche: string | null;
  niche_keywords: string[];
  target_countries: string[];
  target_cities: string[];
  exclude_cities: string[];
  language_of_business: string[];
  max_leads_per_run: number;
  lead_source: string;
  min_google_rating: number;
  min_review_count: number;
  exclude_chains: boolean;
  exclude_already_discovered: boolean;
  run_frequency: string;
  next_run_at: string | null;
  min_score_band_a: number;
  min_score_band_b: number;
  min_automation_opportunity: number;
  min_ability_to_pay: number;
  min_reachability: number;
  confidence_required: string;
  sequence_band_a: string | null;
  sequence_band_b: string | null;
  sequence_band_c: string | null;
  auto_approve_band_b: boolean;
  require_approval_band_a: boolean;
  assigned_inbox_id: string | null;
  tags: string[];
  notes: string | null;
  timezone: string;
  crawl_website: boolean;
  max_candidates_per_day: number;
  max_details_calls_per_day: number;
  max_total_places_calls_per_day: number;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="ui-button ui-button-secondary" type="submit" disabled={pending}>
      {pending ? "Saving..." : "Save changes"}
    </button>
  );
}

export function EditCampaignForm({ campaign }: { campaign: EditableCampaign }) {
  const [state, action] = useFormState(updateCampaign.bind(null, campaign.id), { error: null as string | null });

  return (
    <form action={action} className="form">
      <input name="timezone" type="hidden" value={campaign.timezone} />
      <div className="form-grid">
        <label>
          Campaign name
          <input name="name" required defaultValue={campaign.name} />
        </label>
        <label>
          Status
          <select name="status" defaultValue={campaign.status}>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <label className="form-span-2">
          Description
          <textarea name="description" rows={3} defaultValue={campaign.description ?? ""} />
        </label>
        <label>
          Primary niche
          <input name="primary_niche" required defaultValue={campaign.primary_niche ?? ""} />
        </label>
        <label>
          Lead source
          <select name="lead_source" defaultValue={campaign.lead_source}>
            <option value="google_maps">Google Maps</option>
            <option value="google_search">Google Search</option>
            <option value="directory">Directory</option>
            <option value="manual_import">Manual Import</option>
          </select>
        </label>
        <label className="form-span-2">
          Niche keywords
          <textarea name="niche_keywords" rows={3} defaultValue={campaign.niche_keywords.join("\n")} />
        </label>
        <label className="form-span-2">
          Target countries
          <textarea name="target_countries" rows={2} defaultValue={campaign.target_countries.join("\n")} />
        </label>
        <label>
          Target cities
          <textarea name="target_cities" rows={3} defaultValue={campaign.target_cities.join("\n")} />
        </label>
        <label>
          Exclude cities
          <textarea name="exclude_cities" rows={3} defaultValue={campaign.exclude_cities.join("\n")} />
        </label>
        <label>
          Business languages
          <textarea name="language_of_business" rows={3} defaultValue={campaign.language_of_business.join("\n")} />
        </label>
        <label>
          Run frequency
          <select name="run_frequency" defaultValue={campaign.run_frequency}>
            <option value="manual">Manual</option>
            <option value="daily">Daily</option>
            <option value="every_3_days">Every 3 days</option>
            <option value="weekly">Weekly</option>
          </select>
        </label>
        <label>
          Next scheduled run
          <input
            name="next_run_at"
            type="datetime-local"
            defaultValue={campaign.next_run_at ? campaign.next_run_at.slice(0, 16) : ""}
          />
        </label>
        <label>
          Max leads per run
          <input name="max_leads_per_run" type="number" min="1" max="1000" defaultValue={campaign.max_leads_per_run} />
        </label>
        <label>
          Max candidates checked per day
          <input name="max_candidates_per_day" type="number" min="1" max="75" defaultValue={campaign.max_candidates_per_day} />
        </label>
        <label>
          Max Places details calls per day
          <input name="max_details_calls_per_day" type="number" min="1" max="100" defaultValue={campaign.max_details_calls_per_day} />
        </label>
        <label>
          Max total Places calls per day
          <input name="max_total_places_calls_per_day" type="number" min="1" max="150" defaultValue={campaign.max_total_places_calls_per_day} />
        </label>
        <label>
          Min Google rating
          <input name="min_google_rating" type="number" min="0" max="5" step="0.1" defaultValue={campaign.min_google_rating} />
        </label>
        <label>
          Min review count
          <input name="min_review_count" type="number" min="0" defaultValue={campaign.min_review_count} />
        </label>
        <label>
          Min score for Band A
          <input name="min_score_band_a" type="number" min="0" max="100" defaultValue={campaign.min_score_band_a} />
        </label>
        <label>
          Min score for Band B
          <input name="min_score_band_b" type="number" min="0" max="100" defaultValue={campaign.min_score_band_b} />
        </label>
        <label>
          Min automation opportunity
          <input name="min_automation_opportunity" type="number" min="0" max="20" defaultValue={campaign.min_automation_opportunity} />
        </label>
        <label>
          Min ability to pay
          <input name="min_ability_to_pay" type="number" min="0" max="15" defaultValue={campaign.min_ability_to_pay} />
        </label>
        <label>
          Min reachability
          <input name="min_reachability" type="number" min="0" max="10" defaultValue={campaign.min_reachability} />
        </label>
        <label>
          Confidence required
          <select name="confidence_required" defaultValue={campaign.confidence_required}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
        <label>
          Sequence for Band A
          <input name="sequence_band_a" defaultValue={campaign.sequence_band_a ?? ""} />
        </label>
        <label>
          Sequence for Band B
          <input name="sequence_band_b" defaultValue={campaign.sequence_band_b ?? ""} />
        </label>
        <label>
          Sequence for Band C
          <input name="sequence_band_c" defaultValue={campaign.sequence_band_c ?? ""} />
        </label>
        <label>
          Assigned inbox
          <input name="assigned_inbox_id" defaultValue={campaign.assigned_inbox_id ?? ""} />
        </label>
        <label className="form-span-2">
          Tags
          <textarea name="tags" rows={2} defaultValue={campaign.tags.join("\n")} />
        </label>
        <label className="form-span-2">
          Notes
          <textarea name="notes" rows={4} defaultValue={campaign.notes ?? ""} />
        </label>
      </div>
      <div className="toggle-grid">
        <label className="checkbox-row">
          <input name="exclude_chains" type="checkbox" defaultChecked={campaign.exclude_chains} />
          Exclude chains
        </label>
        <label className="checkbox-row">
          <input name="exclude_already_discovered" type="checkbox" defaultChecked={campaign.exclude_already_discovered} />
          Exclude already discovered
        </label>
        <label className="checkbox-row">
          <input name="auto_approve_band_b" type="checkbox" defaultChecked={campaign.auto_approve_band_b} />
          Auto-approve Band B
        </label>
        <label className="checkbox-row">
          <input name="require_approval_band_a" type="checkbox" defaultChecked={campaign.require_approval_band_a} />
          Require Band A approval
        </label>
        <label className="checkbox-row">
          <input name="crawl_website" type="checkbox" defaultChecked={campaign.crawl_website} />
          Crawl website during discovery
        </label>
      </div>
      {state?.error ? <p className="ui-badge ui-badge-danger">{state.error}</p> : null}
      <SubmitButton />
    </form>
  );
}
