import { PageHeader } from "@/components/crm/page-header";

export default function SequencesSettingsPage() {
  return (
    <>
      <PageHeader title="Sequences" description="Review active outreach sequences, step delays, channel rules, and per-band assignment." />
      <section className="panel">
        <div className="panel-header"><h2>Sequence library</h2></div>
        <div className="panel-body">
          <div className="empty-state">Sequence CRUD should remain founder-controlled and audited before activating edits here.</div>
        </div>
      </section>
    </>
  );
}
