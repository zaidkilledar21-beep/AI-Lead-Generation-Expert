"use client";

import { useFormState, useFormStatus } from "react-dom";
import { updateCampaign } from "./actions";

type EditableCampaign = {
  id: string;
  name: string;
  niche: string;
  region: string;
  keywords: string[];
  excludedKeywords: string[];
  targetBusinessTypes: string[];
  maxLeadsPerDay: number;
  maxCandidatesPerDay: number;
  maxDetailsCallsPerDay: number;
  maxTotalPlacesCallsPerDay: number;
  crawlWebsite: boolean;
  schedule: string;
  timezone: string;
  status: string;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="button secondary" type="submit" disabled={pending}>
      {pending ? "Saving..." : "Save changes"}
    </button>
  );
}

export function EditCampaignForm({ campaign }: { campaign: EditableCampaign }) {
  const [state, action] = useFormState(updateCampaign.bind(null, campaign.id), { error: null as string | null });

  return (
    <form action={action} className="form compact-form">
      <div className="form-grid">
        <label>
          Campaign name
          <input name="name" required defaultValue={campaign.name} />
        </label>
        <label>
          Niche
          <input name="niche" required defaultValue={campaign.niche} />
        </label>
        <label>
          Region
          <input name="region" required defaultValue={campaign.region} />
        </label>
        <label>
          Target business types
          <input name="target_business_types" defaultValue={campaign.targetBusinessTypes.join(", ")} />
        </label>
        <label>
          Keywords
          <input name="keywords" defaultValue={campaign.keywords.join(", ")} />
        </label>
        <label>
          Excluded keywords
          <input name="excluded_keywords" defaultValue={campaign.excludedKeywords.join(", ")} />
        </label>
        <label>
          Max leads/day
          <input name="max_leads_per_day" type="number" min="1" max="30" defaultValue={campaign.maxLeadsPerDay} />
        </label>
        <label>
          Max candidates/day
          <input name="max_candidates_per_day" type="number" min="1" max="75" defaultValue={campaign.maxCandidatesPerDay} />
        </label>
        <label>
          Max Details calls/day
          <input name="max_details_calls_per_day" type="number" min="1" max="100" defaultValue={campaign.maxDetailsCallsPerDay} />
        </label>
        <label>
          Max total Places calls/day
          <input name="max_total_places_calls_per_day" type="number" min="1" max="150" defaultValue={campaign.maxTotalPlacesCallsPerDay} />
        </label>
        <label>
          Schedule
          <select name="schedule" defaultValue={campaign.schedule}>
            <option value="manual">Manual</option>
            <option value="daily">Daily</option>
          </select>
        </label>
        <label>
          Status
          <select name="status" defaultValue={campaign.status}>
            <option value="paused">Paused</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </label>
      </div>
      <input name="timezone" type="hidden" value={campaign.timezone} />
      <label className="checkbox-row">
        <input name="crawl_website" type="checkbox" defaultChecked={campaign.crawlWebsite} />
        Crawl Google Places websiteUri
      </label>
      {state?.error ? <p className="error">{state.error}</p> : null}
      <SubmitButton />
    </form>
  );
}
