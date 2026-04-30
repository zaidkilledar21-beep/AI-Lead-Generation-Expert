insert into app_settings (key, value)
values
  ('icp_config', '{
    "total_max_score": 100,
    "metrics": [
      {"key": "automation_opportunity", "label": "Automation Opportunity", "max": 20},
      {"key": "lead_customer_volume", "label": "Lead / Customer Volume", "max": 15},
      {"key": "digital_workflow_gap", "label": "Digital & Workflow Gap", "max": 15},
      {"key": "revenue_ability_to_pay", "label": "Revenue / Ability to Pay", "max": 15},
      {"key": "niche_fit", "label": "Niche Fit", "max": 10},
      {"key": "reachability", "label": "Reachability", "max": 10},
      {"key": "operational_complexity", "label": "Operational Complexity", "max": 10},
      {"key": "growth_activity", "label": "Growth / Activity Signals", "max": 5}
    ]
  }'::jsonb),
  ('routing_config', '{
    "bands": {
      "A": {"min_score": 76, "max_score": 100, "requires_review": true},
      "B": {"min_score": 51, "max_score": 75, "requires_review": false},
      "C": {"min_score": 26, "max_score": 50, "requires_review": false},
      "D": {"min_score": 0, "max_score": 25, "requires_review": false}
    },
    "manual_review_triggers": [
      "band_a_first_email",
      "low_confidence",
      "missing_contact",
      "generic_hypothesis",
      "regulated_or_ambiguous"
    ],
    "band_b_approval_required": false
  }'::jsonb),
  ('outreach_validation', '{
    "global_outreach_paused_default": true,
    "forbidden_phrases": [
      "I hope this email finds you well",
      "I wanted to reach out",
      "Just following up",
      "Touching base",
      "Circling back",
      "As per my last email",
      "I know you are busy",
      "I will keep this brief",
      "I came across your business",
      "We help businesses like yours",
      "Our AI-powered solution",
      "Revolutionary",
      "Game-changing",
      "Synergy",
      "Value proposition",
      "At the end of the day",
      "Do not miss out",
      "Limited time",
      "Act now"
    ],
    "step_1_max_links": 0,
    "later_step_max_links": 2
  }'::jsonb),
  ('global_outreach', '{
    "paused": true,
    "reason": "Default safe state until founders explicitly enable live outreach."
  }'::jsonb)
on conflict (key) do update set value = excluded.value;

with inserted_sequences as (
  insert into outreach_sequences (name, band, active)
  values
    ('Band A - Specific Automation Opportunity', 'A', true),
    ('Band B - Consultative Workflow Angle', 'B', true),
    ('Band C - Light Awareness Nurture', 'C', false),
    ('Band D - Informational Nurture', 'D', false)
  on conflict (name) do update
  set band = excluded.band,
      active = excluded.active
  returning id, band
),
all_sequences as (
  select id, band from inserted_sequences
  union
  select id, band from outreach_sequences where name in (
    'Band A - Specific Automation Opportunity',
    'Band B - Consultative Workflow Angle',
    'Band C - Light Awareness Nurture',
    'Band D - Informational Nurture'
  )
)
insert into outreach_steps (sequence_id, step_number, delay_days, channel, template_type, requires_ai_personalization)
select id, step_number, delay_days, 'email', template_type, true
from all_sequences
cross join lateral (
  values
    (1, 0, 'first_touch'),
    (2, 4, 'follow_up'),
    (3, 7, 'soft_close'),
    (4, 14, 'soft_intro_call'),
    (5, 21, 'low_pressure_close')
) as steps(step_number, delay_days, template_type)
where
  (band = 'A' and step_number <= 3)
  or (band = 'B' and step_number <= 4)
  or (band = 'C' and step_number <= 5)
  or (band = 'D' and step_number in (1, 2, 3))
on conflict (sequence_id, step_number) do nothing;
