-- Module B: Sequence Settings Closure.
-- Add soft-archive/editing fields without dropping seeded sequence data, and
-- keep WF-04/WF-05 selection aligned to active, non-archived sequence records.

alter table public.outreach_sequences
  add column if not exists description text,
  add column if not exists archived boolean not null default false,
  add column if not exists updated_at timestamptz default now();

alter table public.outreach_steps
  add column if not exists prompt_guidance text,
  add column if not exists archived boolean not null default false,
  add column if not exists updated_at timestamptz default now();

update public.outreach_sequences
set archived = false
where archived is null;

update public.outreach_steps
set archived = false
where archived is null;

update public.outreach_steps
set prompt_guidance = 'Legacy sequence step; add CRM guidance before changing template behavior.'
where active = true
  and archived = false
  and nullif(btrim(coalesce(template_type, '')), '') is null
  and nullif(btrim(coalesce(prompt_guidance, '')), '') is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'outreach_steps_delay_days_nonnegative'
      and conrelid = 'public.outreach_steps'::regclass
  ) then
    alter table public.outreach_steps
      add constraint outreach_steps_delay_days_nonnegative check (delay_days >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'outreach_steps_active_content_check'
      and conrelid = 'public.outreach_steps'::regclass
  ) then
    alter table public.outreach_steps
      add constraint outreach_steps_active_content_check check (
        active is not true
        or archived is true
        or nullif(btrim(coalesce(template_type, '')), '') is not null
        or nullif(btrim(coalesce(prompt_guidance, '')), '') is not null
      );
  end if;
end;
$$;

drop trigger if exists outreach_sequences_touch_updated_at on public.outreach_sequences;
create trigger outreach_sequences_touch_updated_at before update on public.outreach_sequences
for each row execute function public.touch_updated_at();

drop trigger if exists outreach_steps_touch_updated_at on public.outreach_steps;
create trigger outreach_steps_touch_updated_at before update on public.outreach_steps
for each row execute function public.touch_updated_at();

create index if not exists outreach_sequences_active_band_idx
on public.outreach_sequences (band, created_at)
where active = true and archived = false;

create index if not exists outreach_steps_active_sequence_step_idx
on public.outreach_steps (sequence_id, step_number)
where active = true and archived = false;

do $$
declare
  v_definition text;
begin
  select pg_get_functiondef('public.route_scored_lead(uuid, text, text)'::regprocedure)
  into v_definition;

  if position('and archived = false' in v_definition) = 0 then
    v_definition := replace(
      v_definition,
      'where active = true
      and band = v_band',
      'where active = true
      and archived = false
      and band = v_band'
    );
    execute v_definition;
  end if;

  select pg_get_functiondef('public.load_draft_context(uuid)'::regprocedure)
  into v_definition;

  if position('and archived = false' in v_definition) = 0 then
    v_definition := replace(
      v_definition,
      'and active = true
  limit 1',
      'and active = true
    and archived = false
  limit 1'
    );
    execute v_definition;
  end if;
end;
$$;

grant execute on function public.route_scored_lead(uuid, text, text) to authenticated;
grant execute on function public.route_scored_lead(uuid, text, text) to service_role;
grant execute on function public.load_draft_context(uuid) to service_role;
