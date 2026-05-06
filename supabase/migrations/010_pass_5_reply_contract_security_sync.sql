-- Pass 5 NO-GO gap closure.
-- Canonical reply intents are owned by WF-07 + Supabase. WF-06 remains the only sender.

alter table public.reply_events
  add column if not exists summary text,
  add column if not exists suggested_next_action text,
  add column if not exists suggested_reply_draft text,
  add column if not exists raw_classifier_response jsonb;

alter table public.email_drafts
  add column if not exists provider_thread_id text;

alter table public.outreach_events
  add column if not exists provider_thread_id text;

create index if not exists outreach_events_provider_thread_id_idx
  on public.outreach_events (provider_thread_id)
  where provider_thread_id is not null;

drop function if exists public.pause_queue_after_reply(uuid, text, text, boolean, uuid);
drop function if exists public.update_email_send_state(uuid, uuid, uuid, uuid, text);
drop function if exists public.queue_manual_review_item(uuid, text, text, text, jsonb);

create or replace function public.normalize_reply_intent(raw_intent text)
returns text
language sql
immutable
as $$
  select case lower(nullif(btrim(coalesce(raw_intent, '')), ''))
    when 'positive_interest' then 'positive_interest'
    when 'interested' then 'positive_interest'
    when 'pricing_request' then 'positive_interest'
    when 'call_request' then 'positive_interest'
    when 'demo_request' then 'positive_interest'
    when 'meeting_request' then 'positive_interest'
    when 'high_intent' then 'positive_interest'
    when 'neutral_question' then 'neutral_question'
    when 'question' then 'neutral_question'
    when 'objection' then 'objection'
    when 'not_interested' then 'not_interested'
    when 'negative' then 'not_interested'
    when 'rejection' then 'not_interested'
    when 'no_interest' then 'not_interested'
    when 'unsubscribe' then 'unsubscribe'
    when 'opt_out' then 'unsubscribe'
    when 'do_not_contact' then 'unsubscribe'
    when 'remove_me' then 'unsubscribe'
    when 'out_of_office' then 'out_of_office'
    when 'wrong_person' then 'wrong_person'
    when 'bounce' then 'bounce'
    when 'bounce_or_noise' then 'bounce'
    when 'manual_review_required' then 'manual_review_required'
    when 'ambiguous' then 'manual_review_required'
    else 'manual_review_required'
  end;
$$;

create or replace function public.queue_manual_review_item(
  p_lead_id uuid,
  p_reason text,
  p_priority text default 'normal'
)
returns table(id uuid, lead_id uuid, review_status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reason text := lower(trim(coalesce(p_reason, 'manual_review_required')));
  v_priority text := lower(trim(coalesce(p_priority, 'normal')));
  v_item public.manual_review_queue%rowtype;
begin
  if v_priority not in ('low', 'normal', 'high', 'urgent') then
    v_priority := 'normal';
  end if;

  select *
  into v_item
  from public.manual_review_queue mrq
  where mrq.lead_id = p_lead_id
    and mrq.reason is not distinct from v_reason
    and mrq.review_status = 'pending'
  order by mrq.created_at asc
  limit 1;

  if v_item.id is null then
    insert into public.manual_review_queue (
      lead_id,
      reason,
      priority,
      review_status,
      created_at,
      updated_at
    )
    values (
      p_lead_id,
      v_reason,
      v_priority,
      'pending',
      now(),
      now()
    )
    returning * into v_item;
  else
    update public.manual_review_queue
    set priority = v_priority,
        updated_at = now()
    where manual_review_queue.id = v_item.id
    returning * into v_item;
  end if;

  update public.leads l
  set status = case
      when l.status in ('closed_won', 'closed_lost', 'archived', 'unsubscribed') then l.status
      when v_reason like 'reply_%' and l.status like 'replied%' then l.status
      when v_reason like 'reply_%' then 'replied_needs_review'
      when v_reason in ('band_a_approval', 'band_b_approval', 'email_draft_pending_approval', 'draft_pending_approval') then 'pending_approval'
      else 'review_pending'
    end,
    last_activity_at = now(),
    updated_at = now()
  where l.id = p_lead_id;

  insert into public.workflow_events (
    workflow_name,
    lead_id,
    event_type,
    status,
    payload,
    created_at
  )
  values (
    'WF-07 Reply Detection',
    p_lead_id,
    'manual_review_queued',
    'completed',
    jsonb_build_object('reason', v_reason, 'priority', v_priority, 'manual_review_queue_id', v_item.id),
    now()
  );

  return query select v_item.id, v_item.lead_id, v_item.review_status;
end;
$$;

create or replace function public.queue_manual_review_item(
  target_lead_id uuid,
  review_reason text,
  review_priority text,
  assigned_founder text,
  review_metadata jsonb
)
returns table(id uuid, lead_id uuid, review_status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
begin
  select *
  into v_item
  from public.queue_manual_review_item(target_lead_id, review_reason, review_priority)
  limit 1;

  if assigned_founder is not null or review_metadata <> '{}'::jsonb then
    update public.manual_review_queue mrq
    set assigned_to = coalesce(assigned_founder, mrq.assigned_to),
        review_notes = case
          when review_metadata = '{}'::jsonb then mrq.review_notes
          else review_metadata::text
        end,
        updated_at = now()
    where mrq.id = v_item.id;
  end if;

  return query select v_item.id::uuid, v_item.lead_id::uuid, v_item.review_status::text;
end;
$$;

create or replace function public.pause_queue_after_reply(
  p_lead_id uuid,
  p_intent_classification text,
  p_sentiment text,
  p_requires_human_review boolean default true,
  p_reply_event_id uuid default null,
  p_summary text default null,
  p_suggested_next_action text default null,
  p_suggested_reply_draft text default null,
  p_raw_classifier_response jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_intent text := public.normalize_reply_intent(p_intent_classification);
  v_sentiment text := lower(nullif(btrim(coalesce(p_sentiment, 'neutral')), ''));
  v_requires_human_review boolean;
  v_lead_status text;
  v_priority text;
  v_review_reason text;
  v_review_id uuid;
begin
  if v_sentiment not in ('positive', 'neutral', 'negative') then
    v_sentiment := 'neutral';
  end if;

  v_requires_human_review := coalesce(
    p_requires_human_review,
    v_intent in ('positive_interest', 'neutral_question', 'objection', 'wrong_person', 'manual_review_required')
  );

  v_lead_status := case v_intent
    when 'positive_interest' then 'replied_interested'
    when 'not_interested' then 'replied_not_interested'
    when 'unsubscribe' then 'unsubscribed'
    when 'bounce' then 'bounced'
    when 'out_of_office' then 'replied_needs_review'
    else 'replied_needs_review'
  end;

  if p_reply_event_id is not null then
    update public.reply_events
    set intent_classification = v_intent,
        sentiment = v_sentiment,
        requires_human_review = v_requires_human_review,
        summary = coalesce(p_summary, summary),
        suggested_next_action = coalesce(p_suggested_next_action, suggested_next_action),
        suggested_reply_draft = coalesce(p_suggested_reply_draft, suggested_reply_draft),
        raw_classifier_response = coalesce(p_raw_classifier_response, raw_classifier_response),
        updated_at = now()
    where id = p_reply_event_id
      and lead_id = p_lead_id;
  end if;

  update public.outreach_queue
  set status = 'replied',
      pause_reason = 'reply_' || v_intent,
      updated_at = now()
  where lead_id = p_lead_id
    and status in ('queued', 'drafted', 'paused', 'in_sequence', 'blocked');

  update public.leads
  set status = case
      when status in ('closed_won', 'closed_lost', 'archived') then status
      else v_lead_status
    end,
    last_activity_at = now(),
    updated_at = now()
  where id = p_lead_id;

  insert into public.outreach_events (
    lead_id,
    event_type,
    metadata,
    created_at
  )
  select
    p_lead_id,
    'reply_received',
    jsonb_build_object(
      'reply_event_id', p_reply_event_id,
      'intent_classification', v_intent,
      'sentiment', v_sentiment,
      'requires_human_review', v_requires_human_review,
      'lead_status', v_lead_status,
      'workflow', 'WF-07'
    ),
    now()
  where not exists (
    select 1
    from public.outreach_events oe
    where oe.lead_id = p_lead_id
      and oe.event_type = 'reply_received'
      and oe.metadata->>'reply_event_id' = coalesce(p_reply_event_id::text, '')
  );

  if v_intent = 'unsubscribe' then
    insert into public.outreach_events (lead_id, event_type, metadata, created_at)
    values (
      p_lead_id,
      'opt_out',
      jsonb_build_object('reply_event_id', p_reply_event_id, 'intent_classification', v_intent, 'workflow', 'WF-07'),
      now()
    );
  end if;

  if v_requires_human_review then
    v_review_reason := 'reply_' || v_intent;
    v_priority := case
      when v_intent in ('positive_interest', 'neutral_question', 'manual_review_required') then 'high'
      else 'normal'
    end;

    select q.id
    into v_review_id
    from public.queue_manual_review_item(p_lead_id, v_review_reason, v_priority) q
    limit 1;
  end if;

  insert into public.workflow_events (
    workflow_name,
    lead_id,
    event_type,
    status,
    payload,
    created_at
  )
  values (
    'WF-07 Reply Detection',
    p_lead_id,
    'pause_queue_after_reply',
    'completed',
    jsonb_build_object(
      'reply_event_id', p_reply_event_id,
      'intent_classification', v_intent,
      'sentiment', v_sentiment,
      'requires_human_review', v_requires_human_review,
      'manual_review_queue_id', v_review_id,
      'lead_status', v_lead_status,
      'queue_status', 'replied'
    ),
    now()
  );

  return jsonb_build_object(
    'status', 'queue_paused_after_reply',
    'lead_id', p_lead_id,
    'lead_status', v_lead_status,
    'reply_event_id', p_reply_event_id,
    'intent_classification', v_intent,
    'requires_human_review', v_requires_human_review,
    'manual_review_queue_id', v_review_id
  );
end;
$$;

create or replace function public.update_email_send_state(
  p_draft_id uuid,
  p_queue_id uuid,
  p_lead_id uuid,
  p_inbox_id uuid,
  p_gmail_message_id text default null,
  p_gmail_thread_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_draft record;
  v_queue record;
  v_current_step integer;
  v_sequence_id uuid;
  v_next_step record;
  v_stop_exists boolean;
  v_event_id uuid;
begin
  select * into v_draft
  from public.email_drafts
  where id = p_draft_id
  for update;

  if not found then
    raise exception 'Draft not found: %', p_draft_id;
  end if;

  if coalesce(v_draft.sent, false) then
    return jsonb_build_object(
      'status', 'already_sent_noop',
      'lead_id', p_lead_id,
      'queue_id', p_queue_id,
      'draft_id', p_draft_id,
      'provider_message_id', v_draft.provider_message_id,
      'provider_thread_id', v_draft.provider_thread_id
    );
  end if;

  select * into v_queue
  from public.outreach_queue
  where id = p_queue_id
  for update;

  if not found then
    raise exception 'Queue item not found: %', p_queue_id;
  end if;

  if v_queue.lead_id is distinct from p_lead_id then
    raise exception 'Queue lead mismatch. queue_id %, queue.lead_id %, p_lead_id %', p_queue_id, v_queue.lead_id, p_lead_id;
  end if;

  if v_draft.lead_id is distinct from p_lead_id then
    raise exception 'Draft lead mismatch. draft_id %, draft.lead_id %, p_lead_id %', p_draft_id, v_draft.lead_id, p_lead_id;
  end if;

  v_current_step := coalesce(v_queue.current_step, 1);
  v_sequence_id := v_queue.sequence_id;

  select exists (select 1 from public.reply_events re where re.lead_id = p_lead_id)
    or exists (
      select 1
      from public.outreach_events oe
      where oe.lead_id = p_lead_id
        and oe.event_type in ('reply_received', 'manual_takeover', 'unsubscribed', 'opt_out', 'bounce', 'bounced')
    )
  into v_stop_exists;

  insert into public.outreach_events (
    lead_id,
    queue_id,
    sequence_id,
    step_number,
    channel,
    event_type,
    status,
    provider_message_id,
    provider_thread_id,
    sent_at,
    metadata,
    created_at
  )
  values (
    p_lead_id,
    p_queue_id,
    v_sequence_id,
    v_current_step,
    'email',
    'email_sent',
    'sent',
    p_gmail_message_id,
    p_gmail_thread_id,
    now(),
    jsonb_build_object(
      'draft_id', p_draft_id,
      'inbox_id', p_inbox_id,
      'gmail_message_id', p_gmail_message_id,
      'gmail_thread_id', p_gmail_thread_id,
      'sequence_id', v_sequence_id,
      'step_number', v_current_step
    ),
    now()
  )
  returning id into v_event_id;

  update public.email_drafts
  set sent = true,
      sent_at = now(),
      provider_message_id = p_gmail_message_id,
      provider_thread_id = p_gmail_thread_id,
      updated_at = now()
  where id = p_draft_id;

  update public.inboxes
  set current_daily_sent = coalesce(current_daily_sent, 0) + 1,
      last_sent_at = now(),
      updated_at = now()
  where id = p_inbox_id;

  if v_stop_exists then
    update public.outreach_queue
    set status = 'paused',
        pause_reason = 'reply_or_stop_exists_after_send',
        updated_at = now()
    where id = p_queue_id;

    insert into public.workflow_events (workflow_name, lead_id, event_type, status, payload, created_at)
    values (
      'WF-06 Sending Scheduler',
      p_lead_id,
      'update_email_send_state',
      'completed',
      jsonb_build_object('result', 'sent_recorded_but_queue_paused', 'queue_id', p_queue_id, 'draft_id', p_draft_id, 'inbox_id', p_inbox_id, 'outreach_event_id', v_event_id, 'gmail_message_id', p_gmail_message_id, 'gmail_thread_id', p_gmail_thread_id),
      now()
    );

    return jsonb_build_object('status', 'sent_recorded_but_queue_paused', 'lead_id', p_lead_id, 'queue_id', p_queue_id, 'draft_id', p_draft_id, 'outreach_event_id', v_event_id);
  end if;

  select *
  into v_next_step
  from public.outreach_steps os
  where os.sequence_id = v_sequence_id
    and os.step_number = v_current_step + 1
    and coalesce(os.active, true) = true
  limit 1;

  if v_next_step.id is not null then
    update public.outreach_queue
    set current_step = v_next_step.step_number,
        next_send_at = now() + make_interval(days => coalesce(v_next_step.delay_days, 2)),
        status = 'queued',
        last_sent_at = now(),
        updated_at = now()
    where id = p_queue_id;

    update public.leads
    set status = 'in_sequence',
        last_activity_at = now(),
        updated_at = now()
    where id = p_lead_id
      and status not in ('replied', 'replied_interested', 'replied_not_interested', 'replied_needs_review', 'closed_won', 'closed_lost', 'unsubscribed', 'bounced', 'not_interested', 'archived');

    insert into public.workflow_events (workflow_name, lead_id, event_type, status, payload, created_at)
    values (
      'WF-06 Sending Scheduler',
      p_lead_id,
      'update_email_send_state',
      'completed',
      jsonb_build_object('result', 'sent_and_queued_next_step', 'queue_id', p_queue_id, 'draft_id', p_draft_id, 'inbox_id', p_inbox_id, 'outreach_event_id', v_event_id, 'gmail_message_id', p_gmail_message_id, 'gmail_thread_id', p_gmail_thread_id, 'sent_step', v_current_step, 'next_step', v_next_step.step_number),
      now()
    );

    return jsonb_build_object('status', 'sent_and_queued_next_step', 'lead_id', p_lead_id, 'queue_id', p_queue_id, 'draft_id', p_draft_id, 'outreach_event_id', v_event_id, 'next_step', v_next_step.step_number);
  end if;

  update public.outreach_queue
  set status = 'completed',
      last_sent_at = now(),
      updated_at = now()
  where id = p_queue_id;

  update public.leads
  set status = 'completed',
      last_activity_at = now(),
      updated_at = now()
  where id = p_lead_id
    and status not in ('replied', 'replied_interested', 'replied_not_interested', 'replied_needs_review', 'closed_won', 'closed_lost', 'unsubscribed', 'bounced', 'not_interested', 'archived');

  insert into public.workflow_events (workflow_name, lead_id, event_type, status, payload, created_at)
  values (
    'WF-06 Sending Scheduler',
    p_lead_id,
    'update_email_send_state',
    'completed',
    jsonb_build_object('result', 'sent_and_sequence_completed', 'queue_id', p_queue_id, 'draft_id', p_draft_id, 'inbox_id', p_inbox_id, 'outreach_event_id', v_event_id, 'gmail_message_id', p_gmail_message_id, 'gmail_thread_id', p_gmail_thread_id, 'sent_step', v_current_step),
    now()
  );

  return jsonb_build_object('status', 'sent_and_sequence_completed', 'lead_id', p_lead_id, 'queue_id', p_queue_id, 'draft_id', p_draft_id, 'outreach_event_id', v_event_id);
end;
$$;

comment on function public.pause_queue_after_reply(uuid, text, text, boolean, uuid, text, text, text, jsonb) is
'WF-07 Reply Detection contract. Do not change argument names without updating n8n workflow JSON.';

comment on function public.update_email_send_state(uuid, uuid, uuid, uuid, text, text) is
'WF-06 Sending Scheduler contract. Persists Gmail message and thread identifiers.';

comment on function public.queue_manual_review_item(uuid, text, text) is
'Workflow manual review queue contract using legacy p_* parameter names.';

comment on function public.queue_manual_review_item(uuid, text, text, text, jsonb) is
'Workflow manual review queue contract using expanded review metadata parameters.';

do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as signature, p.proname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'insert_reply_event',
        'match_reply_to_lead',
        'pause_queue_after_reply',
        'queue_manual_review_item',
        'select_approved_due_email_draft',
        'select_available_sending_inbox',
        'sending_global_outreach_allowed',
        'update_email_send_state',
        'weekly_founder_report_metrics',
        'route_scored_lead',
        'load_draft_context',
        'persist_draft_or_block',
        'reserve_places_quota',
        'dashboard_update_lead_status'
      )
  loop
    execute format('revoke all on function %s from public', r.signature);
    execute format('revoke all on function %s from anon', r.signature);
    execute format('revoke all on function %s from authenticated', r.signature);
    execute format('grant execute on function %s to service_role', r.signature);
  end loop;
end;
$$;

grant execute on function public.dashboard_update_lead_status(uuid, text) to authenticated;
grant execute on function public.dashboard_approve_lead_for_outreach(uuid) to authenticated;
