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
type CampaignOption = { id: string; name?: string; band?: string; email_address?: string };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="ui-button ui-button-secondary" type="submit" disabled={pending}>
      {pending ? "Saving..." : "Save changes"}
    </button>
  );
}

export function EditCampaignForm({
  campaign,
  sequences = [],
  inboxes = []
}: Readonly<{
  campaign: EditableCampaign;
  sequences?: CampaignOption[];
  inboxes?: CampaignOption[];
}>) {
  const [state, action] = useFormState(updateCampaign.bind(null, campaign.id), { error: null as string | null });

  return (
    <form action={action} className="form">
      <input name="timezone" type="hidden" value={campaign.timezone} />
      <div className="form-grid">
        <label>
          <span>Campaign name</span>
          <input name="name" required defaultValue={campaign.name} />
        </label>
        <label>
          <span>Status</span>
          <select name="status" defaultValue={campaign.status}>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <label className="form-span-2">
          <span>Description</span>
          <textarea name="description" rows={3} defaultValue={campaign.description ?? ""} />
        </label>
        <label>
          <span>Primary niche</span>
          <input name="primary_niche" required defaultValue={campaign.primary_niche ?? ""} />
        </label>
        <label>
          <span>Lead source</span>
          <select name="lead_source" defaultValue={campaign.lead_source}>
            <option value="google_maps">Google Maps</option>
            <option value="google_search">Google Search</option>
            <option value="directory">Directory</option>
            <option value="manual_import">Manual Import</option>
          </select>
        </label>
        <label className="form-span-2">
          <span>Niche keywords</span>
          <textarea name="niche_keywords" rows={3} defaultValue={campaign.niche_keywords.join("\n")} />
        </label>
        <label className="form-span-2">
          <span>Target countries</span>
          <textarea name="target_countries" rows={2} defaultValue={campaign.target_countries.join("\n")} />
        </label>
        <label>
          <span>Target cities</span>
          <textarea name="target_cities" rows={3} defaultValue={campaign.target_cities.join("\n")} />
        </label>
        <label>
          <span>Exclude cities</span>
          <textarea name="exclude_cities" rows={3} defaultValue={campaign.exclude_cities.join("\n")} />
        </label>
        <label>
          <span>Business languages</span>
          <textarea name="language_of_business" rows={3} defaultValue={campaign.language_of_business.join("\n")} />
        </label>
        <label>
          <span>Run frequency</span>
          <select name="run_frequency" defaultValue={campaign.run_frequency}>
            <option value="manual">Manual</option>
            <option value="daily">Daily</option>
            <option value="every_3_days">Every 3 days</option>
            <option value="weekly">Weekly</option>
          </select>
        </label>
        <label>
          <span>Next scheduled run</span>
          <input
            name="next_run_at"
            type="datetime-local"
            defaultValue={campaign.next_run_at ? campaign.next_run_at.slice(0, 16) : ""}
          />
        </label>
        <label>
          <span>Max leads per run</span>
          <input name="max_leads_per_run" type="number" min="1" max="1000" defaultValue={campaign.max_leads_per_run} />
        </label>
        <label>
          <span>Max candidates checked per day</span>
          <input name="max_candidates_per_day" type="number" min="1" max="75" defaultValue={campaign.max_candidates_per_day} />
        </label>
        <label>
          <span>Max Places details calls per day</span>
          <input name="max_details_calls_per_day" type="number" min="1" max="100" defaultValue={campaign.max_details_calls_per_day} />
        </label>
        <label>
          <span>Max total Places calls per day</span>
          <input name="max_total_places_calls_per_day" type="number" min="1" max="150" defaultValue={campaign.max_total_places_calls_per_day} />
        </label>
        <label>
          <span>Min Google rating</span>
          <input name="min_google_rating" type="number" min="0" max="5" step="0.1" defaultValue={campaign.min_google_rating} />
        </label>
        <label>
          <span>Min review count</span>
          <input name="min_review_count" type="number" min="0" defaultValue={campaign.min_review_count} />
        </label>
        <label>
          <span>Min score for Band A</span>
          <input name="min_score_band_a" type="number" min="0" max="100" defaultValue={campaign.min_score_band_a} />
        </label>
        <label>
          <span>Min score for Band B</span>
          <input name="min_score_band_b" type="number" min="0" max="100" defaultValue={campaign.min_score_band_b} />
        </label>
        <label>
          <span>Min automation opportunity</span>
          <input name="min_automation_opportunity" type="number" min="0" max="20" defaultValue={campaign.min_automation_opportunity} />
        </label>
        <label>
          <span>Min ability to pay</span>
          <input name="min_ability_to_pay" type="number" min="0" max="15" defaultValue={campaign.min_ability_to_pay} />
        </label>
        <label>
          <span>Min reachability</span>
          <input name="min_reachability" type="number" min="0" max="10" defaultValue={campaign.min_reachability} />
        </label>
        <label>
          <span>Confidence required</span>
          <select name="confidence_required" defaultValue={campaign.confidence_required}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
        <label>
          <span>Sequence for Band A</span>
          <select name="sequence_band_a" defaultValue={campaign.sequence_band_a ?? ""}>
            <option value="">Default workflow routing</option>
            {sequences.map((sequence) => <option key={sequence.id} value={sequence.id}>{sequence.name ?? sequence.band ?? sequence.id}</option>)}
          </select>
        </label>
        <label>
          <span>Sequence for Band B</span>
          <select name="sequence_band_b" defaultValue={campaign.sequence_band_b ?? ""}>
            <option value="">Default workflow routing</option>
            {sequences.map((sequence) => <option key={sequence.id} value={sequence.id}>{sequence.name ?? sequence.band ?? sequence.id}</option>)}
          </select>
        </label>
        <label>
          <span>Sequence for Band C</span>
          <select name="sequence_band_c" defaultValue={campaign.sequence_band_c ?? ""}>
            <option value="">Default workflow routing</option>
            {sequences.map((sequence) => <option key={sequence.id} value={sequence.id}>{sequence.name ?? sequence.band ?? sequence.id}</option>)}
          </select>
        </label>
        <label>
          <span>Assigned inbox</span>
          <select name="assigned_inbox_id" defaultValue={campaign.assigned_inbox_id ?? ""}>
            <option value="">No fixed inbox</option>
            {inboxes.map((inbox) => <option key={inbox.id} value={inbox.id}>{inbox.email_address ?? inbox.id}</option>)}
          </select>
        </label>
        <label className="form-span-2">
          <span>Tags</span>
          <textarea name="tags" rows={2} defaultValue={campaign.tags.join("\n")} />
        </label>
        <label className="form-span-2">
          <span>Notes</span>
          <textarea name="notes" rows={4} defaultValue={campaign.notes ?? ""} />
        </label>
      </div>
      <div className="toggle-grid">
        <label className="checkbox-row">
          <input name="exclude_chains" type="checkbox" defaultChecked={campaign.exclude_chains} />
          <span>Exclude chains</span>
        </label>
        <label className="checkbox-row">
          <input name="exclude_already_discovered" type="checkbox" defaultChecked={campaign.exclude_already_discovered} />
          <span>Exclude already discovered</span>
        </label>
        <label className="checkbox-row">
          <input name="auto_approve_band_b" type="checkbox" defaultChecked={campaign.auto_approve_band_b} />
          <span>Auto-approve Band B</span>
        </label>
        <label className="checkbox-row">
          <input name="require_approval_band_a" type="checkbox" defaultChecked={campaign.require_approval_band_a} />
          <span>Require Band A approval</span>
        </label>
        <label className="checkbox-row">
          <input name="crawl_website" type="checkbox" defaultChecked={campaign.crawl_website} />
          <span>Crawl website during discovery</span>
        </label>
      </div>
      {state?.error ? <p className="ui-badge ui-badge-danger">{state.error}</p> : null}
      <SubmitButton />
    </form>
  );
}
