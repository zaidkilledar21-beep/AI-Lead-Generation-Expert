"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createCampaign } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="button" type="submit" disabled={pending}>
      {pending ? "Saving..." : "Create campaign"}
    </button>
  );
}

export function CreateCampaignForm() {
  const [state, action] = useFormState(createCampaign, { error: null as string | null });

  return (
    <form action={action} className="form card">
      <div className="form-grid">
        <label>
          Campaign name
          <input name="name" required placeholder="Dubai dental clinics" />
        </label>
        <label>
          Niche
          <input name="niche" required placeholder="dental clinics" />
        </label>
        <label>
          Region
          <input name="region" required placeholder="Dubai, UAE" />
        </label>
        <label>
          Target business types
          <input name="target_business_types" placeholder="orthodontist, cosmetic dentist" />
        </label>
        <label>
          Keywords
          <input name="keywords" placeholder="appointments, implants, whitening" />
        </label>
        <label>
          Excluded keywords
          <input name="excluded_keywords" placeholder="jobs, school, supplier" />
        </label>
        <label>
          Max leads/day
          <input name="max_leads_per_day" type="number" min="1" max="30" defaultValue="30" />
        </label>
        <label>
          Max candidates/day
          <input name="max_candidates_per_day" type="number" min="1" max="75" defaultValue="75" />
        </label>
        <label>
          Max Details calls/day
          <input name="max_details_calls_per_day" type="number" min="1" max="100" defaultValue="100" />
        </label>
        <label>
          Max total Places calls/day
          <input name="max_total_places_calls_per_day" type="number" min="1" max="150" defaultValue="150" />
        </label>
        <label>
          Schedule
          <select name="schedule" defaultValue="daily">
            <option value="manual">Manual</option>
            <option value="daily">Daily</option>
          </select>
        </label>
        <label>
          Status
          <select name="status" defaultValue="paused">
            <option value="paused">Paused</option>
            <option value="active">Active</option>
          </select>
        </label>
      </div>
      <label className="checkbox-row">
        <input name="crawl_website" type="checkbox" defaultChecked />
        Crawl Google Places websiteUri
      </label>
      {state?.error ? <p className="error">{state.error}</p> : null}
      <SubmitButton />
    </form>
  );
}
