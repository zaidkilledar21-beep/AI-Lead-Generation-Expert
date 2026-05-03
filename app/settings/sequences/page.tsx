import { PageHeader } from "@/components/crm/page-header";
import { getSettingsData } from "@/lib/crm/queries";

export default async function SequencesSettingsPage() {
  const settings = await getSettingsData();

  return (
    <>
      <PageHeader title="Sequences" description="Active outreach sequences, steps, delays, and per-band assignment references." />
      <section className="panel">
        <div className="panel-header"><h2>Sequence library</h2></div>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Name</th><th>Band</th><th>Active</th><th>Steps</th></tr></thead>
            <tbody>
              {settings.sequences.map((sequence: any) => (
                <tr key={sequence.id}>
                  <td>{sequence.name}</td>
                  <td>{sequence.band ?? "--"}</td>
                  <td>{sequence.active ? "Yes" : "No"}</td>
                  <td>
                    <div className="stack-list">
                      {(sequence.outreach_steps ?? []).map((step: any) => (
                        <div key={step.id} className="record-card">
                          Step {step.step_number} - {step.delay_days}d - {step.template_type ?? "template"}
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
