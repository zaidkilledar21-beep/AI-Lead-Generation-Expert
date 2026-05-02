alter table lead_scores add column if not exists prompt_version text;
alter table lead_scores add column if not exists model text;
alter table lead_scores add column if not exists scoring_metadata jsonb not null default '{}'::jsonb;
