import { getCampaignDashboard } from "@/lib/dashboard/queries";
import { CreateCampaignForm } from "./create-campaign-form";
import { EditCampaignForm } from "./edit-campaign-form";
import { updateCampaignStatus } from "./actions";

export default async function CampaignsPage() {
  const dashboard = await getCampaignDashboard();

  return (
    <>
      <section className="section">
        <h1>Campaigns</h1>
        <p className="muted">Google Places-only discovery campaigns with hard daily usage caps.</p>
      </section>

      <section className="section">
        <h2>Create Campaign</h2>
        <CreateCampaignForm />
      </section>

      <section className="section">
        <h2>Active Configuration</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Niche</th>
              <th>Region</th>
              <th>Caps</th>
              <th>Crawl</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {dashboard.campaigns.map((campaign) => (
              <tr key={campaign.id}>
                <td>{campaign.name}</td>
                <td>{campaign.niche}</td>
                <td>{campaign.region}</td>
                <td>
                  {campaign.maxLeadsPerDay} leads / {campaign.maxCandidatesPerDay} candidates /{" "}
                  {campaign.maxDetailsCallsPerDay} details
                </td>
                <td>{campaign.crawlWebsite ? "websiteUri only" : "off"}</td>
                <td>
                  <span className="badge">{campaign.status}</span>
                </td>
                <td>
                  <div className="button-row">
                    {campaign.status !== "active" ? (
                      <form action={updateCampaignStatus.bind(null, campaign.id, "active")}>
                        <button className="button secondary" type="submit">Activate</button>
                      </form>
                    ) : (
                      <form action={updateCampaignStatus.bind(null, campaign.id, "paused")}>
                        <button className="button secondary" type="submit">Pause</button>
                      </form>
                    )}
                    <form action={updateCampaignStatus.bind(null, campaign.id, "archived")}>
                      <button className="button danger-button" type="submit">Archive</button>
                    </form>
                  </div>
                  <details className="inline-details">
                    <summary>Edit filters</summary>
                    <EditCampaignForm campaign={campaign} />
                  </details>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="section">
        <h2>Candidate Manual Review</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Campaign</th>
              <th>Business</th>
              <th>Niche</th>
              <th>Location</th>
              <th>Phone</th>
              <th>Reason</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {dashboard.manualCandidates.map((candidate) => (
              <tr key={candidate.id}>
                <td>{candidate.campaignName}</td>
                <td>{candidate.businessName}</td>
                <td>{candidate.niche ?? "-"}</td>
                <td>{candidate.location}</td>
                <td>{candidate.phone ?? "-"}</td>
                <td>{candidate.reason}</td>
                <td>
                  {candidate.googleMapsUrl ? (
                    <a href={candidate.googleMapsUrl} rel="noreferrer" target="_blank">
                      Google Maps
                    </a>
                  ) : (
                    "-"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="section">
        <h2>Discovery Runs</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Campaign</th>
              <th>Status</th>
              <th>Checked</th>
              <th>Details</th>
              <th>Total Places</th>
              <th>Promoted</th>
              <th>Manual Review</th>
              <th>Duplicates</th>
              <th>Error</th>
            </tr>
          </thead>
          <tbody>
            {dashboard.recentRuns.map((run) => (
              <tr key={run.id}>
                <td>{run.campaignName}</td>
                <td>{run.status}</td>
                <td>{run.candidatesChecked}</td>
                <td>{run.detailsCalls}</td>
                <td>{run.totalPlacesCalls}</td>
                <td>{run.promoted}</td>
                <td>{run.manualReview}</td>
                <td>{run.duplicatesSkipped}</td>
                <td>{run.errorMessage ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
