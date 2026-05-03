"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createCampaign } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="ui-button ui-button-primary" type="submit" disabled={pending}>
      {pending ? "Saving..." : "Create campaign"}
    </button>
  );
}

export function CreateCampaignForm() {
  const [state, action] = useFormState(createCampaign, { error: null as string | null });

  return (
    <form action={action} className="form">
      <input name="timezone" type="hidden" value="Asia/Karachi" />
      <div className="form-grid">
        <label>
          Campaign name
          <input name="name" required placeholder="Dubai Dental Clinics - May" />
        </label>
        <label>
          Status
          <select name="status" defaultValue="draft">
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
          </select>
        </label>
        <label className="form-span-2">
          Description
          <textarea name="description" rows={3} placeholder="Internal notes, campaign intent, exclusions." />
        </label>
        <label>
          Primary niche
          <input name="primary_niche" required placeholder="Dental Clinics" />
        </label>
        <label>
          Lead source
          <select name="lead_source" defaultValue="google_maps">
            <option value="google_maps">Google Maps</option>
            <option value="google_search">Google Search</option>
            <option value="directory">Directory</option>
            <option value="manual_import">Manual Import</option>
          </select>
        </label>
        <label className="form-span-2">
          Niche keywords
          <textarea name="niche_keywords" rows={3} placeholder="dentist&#10;dental surgery&#10;orthodontist" />
        </label>
        <label className="form-span-2">
          Target countries
          <textarea name="target_countries" rows={2} required placeholder="UAE&#10;Saudi Arabia" />
        </label>
        <label>
          Target cities
          <textarea name="target_cities" rows={3} placeholder="Dubai&#10;Abu Dhabi" />
        </label>
        <label>
          Exclude cities
          <textarea name="exclude_cities" rows={3} placeholder="Sharjah" />
        </label>
        <label>
          Business languages
          <textarea name="language_of_business" rows={3} placeholder="English&#10;Arabic" />
        </label>
        <label>
          Run frequency
          <select name="run_frequency" defaultValue="manual">
            <option value="manual">Manual</option>
            <option value="daily">Daily</option>
            <option value="every_3_days">Every 3 days</option>
            <option value="weekly">Weekly</option>
          </select>
        </label>
        <label>
          Next scheduled run
          <input name="next_run_at" type="datetime-local" />
        </label>
        <label>
          Max leads per run
          <input name="max_leads_per_run" type="number" min="1" max="1000" defaultValue="100" />
        </label>
        <label>
          Max candidates checked per day
          <input name="max_candidates_per_day" type="number" min="1" max="75" defaultValue="75" />
        </label>
        <label>
          Max Places details calls per day
          <input name="max_details_calls_per_day" type="number" min="1" max="100" defaultValue="100" />
        </label>
        <label>
          Max total Places calls per day
          <input name="max_total_places_calls_per_day" type="number" min="1" max="150" defaultValue="150" />
        </label>
        <label>
          Min Google rating
          <input name="min_google_rating" type="number" min="0" max="5" step="0.1" defaultValue="3.5" />
        </label>
        <label>
          Min review count
          <input name="min_review_count" type="number" min="0" defaultValue="5" />
        </label>
        <label>
          Min score for Band A
          <input name="min_score_band_a" type="number" min="0" max="100" defaultValue="76" />
        </label>
        <label>
          Min score for Band B
          <input name="min_score_band_b" type="number" min="0" max="100" defaultValue="51" />
        </label>
        <label>
          Min automation opportunity
          <input name="min_automation_opportunity" type="number" min="0" max="20" defaultValue="13" />
        </label>
        <label>
          Min ability to pay
          <input name="min_ability_to_pay" type="number" min="0" max="15" defaultValue="9" />
        </label>
        <label>
          Min reachability
          <input name="min_reachability" type="number" min="0" max="10" defaultValue="6" />
        </label>
        <label>
          Confidence required
          <select name="confidence_required" defaultValue="medium">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
        <label>
          Sequence for Band A
          <input name="sequence_band_a" placeholder="UUID or leave blank" />
        </label>
        <label>
          Sequence for Band B
          <input name="sequence_band_b" placeholder="UUID or leave blank" />
        </label>
        <label>
          Sequence for Band C
          <input name="sequence_band_c" placeholder="UUID or leave blank" />
        </label>
        <label>
          Assigned inbox
          <input name="assigned_inbox_id" placeholder="Inbox UUID or leave blank" />
        </label>
        <label className="form-span-2">
          Internal tags
          <textarea name="tags" rows={2} placeholder="Q2 push&#10;high priority" />
        </label>
        <label className="form-span-2">
          Notes
          <textarea name="notes" rows={4} placeholder="Anything the founders need to remember about this campaign." />
        </label>
      </div>
      <div className="toggle-grid">
        <label className="checkbox-row">
          <input name="exclude_chains" type="checkbox" />
          Exclude chains
        </label>
        <label className="checkbox-row">
          <input name="exclude_already_discovered" type="checkbox" defaultChecked />
          Exclude already discovered
        </label>
        <label className="checkbox-row">
          <input name="auto_approve_band_b" type="checkbox" />
          Auto-approve Band B
        </label>
        <label className="checkbox-row">
          <input name="require_approval_band_a" type="checkbox" defaultChecked />
          Require Band A approval
        </label>
        <label className="checkbox-row">
          <input name="crawl_website" type="checkbox" defaultChecked />
          Crawl website during discovery
        </label>
      </div>
      {state?.error ? <p className="ui-badge ui-badge-danger">{state.error}</p> : null}
      <SubmitButton />
    </form>
  );
}
