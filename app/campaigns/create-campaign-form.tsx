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
          <span>Campaign name</span>
          <input name="name" required placeholder="Dubai Dental Clinics - May" />
        </label>
        <label>
          <span>Status</span>
          <select name="status" defaultValue="draft">
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
          </select>
        </label>
        <label className="form-span-2">
          <span>Description</span>
          <textarea name="description" rows={3} placeholder="Internal notes, campaign intent, exclusions." />
        </label>
        <label>
          <span>Primary niche</span>
          <input name="primary_niche" required placeholder="Dental Clinics" />
        </label>
        <label>
          <span>Lead source</span>
          <select name="lead_source" defaultValue="google_maps">
            <option value="google_maps">Google Maps</option>
            <option value="google_search">Google Search</option>
            <option value="directory">Directory</option>
            <option value="manual_import">Manual Import</option>
          </select>
        </label>
        <label className="form-span-2">
          <span>Niche keywords</span>
          <textarea name="niche_keywords" rows={3} placeholder={"dentist\ndental surgery\northodontist"} />
        </label>
        <label className="form-span-2">
          <span>Target countries</span>
          <textarea name="target_countries" rows={2} required placeholder={"UAE\nSaudi Arabia"} />
        </label>
        <label>
          <span>Target cities</span>
          <textarea name="target_cities" rows={3} placeholder={"Dubai\nAbu Dhabi"} />
        </label>
        <label>
          <span>Exclude cities</span>
          <textarea name="exclude_cities" rows={3} placeholder="Sharjah" />
        </label>
        <label>
          <span>Business languages</span>
          <textarea name="language_of_business" rows={3} placeholder={"English\nArabic"} />
        </label>
        <label>
          <span>Run frequency</span>
          <select name="run_frequency" defaultValue="manual">
            <option value="manual">Manual</option>
            <option value="daily">Daily</option>
            <option value="every_3_days">Every 3 days</option>
            <option value="weekly">Weekly</option>
          </select>
        </label>
        <label>
          <span>Next scheduled run</span>
          <input name="next_run_at" type="datetime-local" />
        </label>
        <label>
          <span>Max leads per run</span>
          <input name="max_leads_per_run" type="number" min="1" max="1000" defaultValue="100" />
        </label>
        <label>
          <span>Max candidates checked per day</span>
          <input name="max_candidates_per_day" type="number" min="1" max="75" defaultValue="75" />
        </label>
        <label>
          <span>Max Places details calls per day</span>
          <input name="max_details_calls_per_day" type="number" min="1" max="100" defaultValue="100" />
        </label>
        <label>
          <span>Max total Places calls per day</span>
          <input name="max_total_places_calls_per_day" type="number" min="1" max="150" defaultValue="150" />
        </label>
        <label>
          <span>Min Google rating</span>
          <input name="min_google_rating" type="number" min="0" max="5" step="0.1" defaultValue="3.5" />
        </label>
        <label>
          <span>Min review count</span>
          <input name="min_review_count" type="number" min="0" defaultValue="5" />
        </label>
        <label>
          <span>Min score for Band A</span>
          <input name="min_score_band_a" type="number" min="0" max="100" defaultValue="76" />
        </label>
        <label>
          <span>Min score for Band B</span>
          <input name="min_score_band_b" type="number" min="0" max="100" defaultValue="51" />
        </label>
        <label>
          <span>Min automation opportunity</span>
          <input name="min_automation_opportunity" type="number" min="0" max="20" defaultValue="13" />
        </label>
        <label>
          <span>Min ability to pay</span>
          <input name="min_ability_to_pay" type="number" min="0" max="15" defaultValue="9" />
        </label>
        <label>
          <span>Min reachability</span>
          <input name="min_reachability" type="number" min="0" max="10" defaultValue="6" />
        </label>
        <label>
          <span>Confidence required</span>
          <select name="confidence_required" defaultValue="medium">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
        <label>
          <span>Sequence for Band A</span>
          <input name="sequence_band_a" placeholder="UUID or leave blank" />
        </label>
        <label>
          <span>Sequence for Band B</span>
          <input name="sequence_band_b" placeholder="UUID or leave blank" />
        </label>
        <label>
          <span>Sequence for Band C</span>
          <input name="sequence_band_c" placeholder="UUID or leave blank" />
        </label>
        <label>
          <span>Assigned inbox</span>
          <input name="assigned_inbox_id" placeholder="Inbox UUID or leave blank" />
        </label>
        <label className="form-span-2">
          <span>Internal tags</span>
          <textarea name="tags" rows={2} placeholder={"Q2 push\nhigh priority"} />
        </label>
        <label className="form-span-2">
          <span>Notes</span>
          <textarea name="notes" rows={4} placeholder="Anything the founders need to remember about this campaign." />
        </label>
      </div>
      <div className="toggle-grid">
        <label className="checkbox-row">
          <input name="exclude_chains" type="checkbox" />
          <span>Exclude chains</span>
        </label>
        <label className="checkbox-row">
          <input name="exclude_already_discovered" type="checkbox" defaultChecked />
          <span>Exclude already discovered</span>
        </label>
        <label className="checkbox-row">
          <input name="auto_approve_band_b" type="checkbox" />
          <span>Auto-approve Band B</span>
        </label>
        <label className="checkbox-row">
          <input name="require_approval_band_a" type="checkbox" defaultChecked />
          <span>Require Band A approval</span>
        </label>
        <label className="checkbox-row">
          <input name="crawl_website" type="checkbox" defaultChecked />
          <span>Crawl website during discovery</span>
        </label>
      </div>
      {state?.error ? <p className="ui-badge ui-badge-danger">{state.error}</p> : null}
      <SubmitButton />
    </form>
  );
}
