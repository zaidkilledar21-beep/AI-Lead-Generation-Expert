export default function Loading() {
  return (
    <div className="crm-state-shell">
      <div className="crm-state-panel">
        <div className="crm-state-badge">Campaigns</div>
        <div className="crm-state-hero">
          <h1>Loading campaigns...</h1>
          <p>Preparing the discovery control center, campaign roster, and operational status panels.</p>
        </div>
        <div className="crm-state-skeleton">
          <div className="crm-state-row" />
          <div className="crm-state-row" />
          <div className="crm-state-row" />
        </div>
      </div>
    </div>
  );
}
