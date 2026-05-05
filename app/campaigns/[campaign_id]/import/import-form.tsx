"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { manualImportLeadsAction } from "../../actions";

function ImportSubmitButton() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? "Importing..." : "Import leads"}</Button>;
}

export function ManualImportForm({ campaignId }: Readonly<{ campaignId: string }>) {
  const [state, action] = useFormState(manualImportLeadsAction.bind(null, campaignId), {
    inserted: 0,
    skipped: 0,
    errors: [] as string[]
  });

  return (
    <form action={action} className="form">
      <label>
        <span>CSV rows</span>
        <textarea
          name="csv"
          rows={16}
          required
          placeholder={"business_name,website,email,phone,country,city,niche,google_maps_url,linkedin_url,address\nExample Clinic,https://example.com,hello@example.com,+971500000000,UAE,Dubai,Dental Clinics,,,"}
        />
      </label>
      <ImportSubmitButton />
      {state.inserted || state.skipped || state.errors.length > 0 ? (
        <div className="record-card">
          <strong>Import result</strong>
          <p className="muted">{state.inserted} inserted, {state.skipped} skipped.</p>
          {state.errors.length > 0 ? (
            <ul className="mt-3 space-y-1 text-sm text-red-300">
              {state.errors.slice(0, 20).map((error) => <li key={error}>{error}</li>)}
            </ul>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
