export default function Loading() {
  return (
    <main className="crm-state-shell">
      <section className="crm-state-panel">
        <div className="crm-state-badge">Loading workspace</div>
        <div className="crm-state-hero">
          <h1>Preparing the CRM control center</h1>
          <p>Loading live routes, navigation state, and operational data so the workspace opens with the correct context.</p>
        </div>

        <div className="crm-state-skeleton" aria-hidden="true">
          <div className="crm-state-row" />
          <div className="crm-state-row" />
          <div className="crm-state-row" />
        </div>

        <div className="crm-state-actions">
          <div className="ui-button ui-button-secondary">Syncing navigation</div>
          <div className="ui-button ui-button-ghost">Restoring session</div>
        </div>

        <p className="crm-state-meta">Operational surfaces load in the background.</p>
      </section>
    </main>
  );
}
