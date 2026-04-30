export const icpConfig = {
  totalMaxScore: 100,
  metrics: [
    { key: "automation_opportunity", label: "Automation Opportunity", max: 20 },
    { key: "lead_customer_volume", label: "Lead / Customer Volume", max: 15 },
    { key: "digital_workflow_gap", label: "Digital & Workflow Gap", max: 15 },
    { key: "revenue_ability_to_pay", label: "Revenue / Ability to Pay", max: 15 },
    { key: "niche_fit", label: "Niche Fit", max: 10 },
    { key: "reachability", label: "Reachability", max: 10 },
    { key: "operational_complexity", label: "Operational Complexity", max: 10 },
    { key: "growth_activity", label: "Growth / Activity Signals", max: 5 }
  ] as const
};

export type IcpMetricKey = (typeof icpConfig.metrics)[number]["key"];
