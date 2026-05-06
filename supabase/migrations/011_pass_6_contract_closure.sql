-- Pass 6 production-readiness closure.
-- Reproducible definitions for workflow RPCs that n8n imports call directly.

alter table public.reply_events
  add column if not exists ai_draft_reply text,
  add column if not exists summary text,
  add column if not exists suggested_next_action text,
  add column if not exists raw_classifier_response jsonb;

update public.reply_events
set ai_draft_reply = coalesce(ai_draft_reply, suggested_reply_draft)
where ai_draft_reply is null
  and suggested_reply_draft is not null;

drop function if exists public.dashboard_update_lead_status(uuid, text);
drop function if exists public.route_scored_lead(uuid, text, text);
drop function if exists public.load_draft_context(uuid);
drop function if exists public.persist_draft_or_block(uuid, uuid, boolean, text, text, text, text, text, jsonb);
drop function if exists public.weekly_founder_report_metrics();
drop function if exists public.weekly_founder_report_metrics(timestamptz, timestamptz);

create or replace function public.dashboard_update_lead_status(
  target_lead_id uuid,
  next_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next_status text := lower(trim(coalesce(next_status, '')));
  v_old_status text;
begin
  if v_next_status not in (
    'new',
    'enriched',
    'scored',
    'review_pending',
    'pending_approval',
    'queued',
    'drafted',
    'in_sequence',
    'replied',
    'replied_needs_review',
    'replied_interested',
    'replied_not_interested',
    'closed_won',
    'closed_lost',
    'not_interested',
    'paused',
    'blocked',
    'archived',
    'unsubscribed',
    'bounced',
    'completed'
  ) then
    raise exception 'Unsupported lead status: %', next_status;
  end if;

  select status into v_old_status
  from public.leads
  where id = target_lead_id
  for update;

  if not found then
    raise exception 'Lead not found: %', target_lead_id;
  end if;

  update public.leads
  set status = v_next_status,
      last_activity_at = now(),
      updated_at = now(),
      closed_at = case when v_next_status in ('closed_won', 'closed_lost') then now() else closed_at end
  where id = target_lead_id;

  if v_next_status in ('closed_won', 'closed_lost', 'not_interested', 'archived', 'unsubscribed', 'bounced') then
    update public.manual_review_queue
    set review_status = 'approved',
        review_notes = coalesce(review_notes, 'Closed by dashboard status transition.'),
        completed_at = coalesce(completed_at, now()),
        updated_at = now()
    where lead_id = target_lead_id
      and review_status = 'pending';
  end if;

  insert into public.workflow_events (workflow_name, lead_id, event_type, status, payload, created_at)
  values (
    'CRM Dashboard',
    target_lead_id,
    'dashboard_update_lead_status',
    'completed',
    jsonb_build_object('old_status', v_old_status, 'new_status', v_next_status),
    now()
  );

  return jsonb_build_object(
    'lead_id', target_lead_id,
    'old_status', v_old_status,
    'new_status', v_next_status,
    'status', 'updated'
  );
end;
$$;

create or replace function public.route_scored_lead(
  p_lead_id uuid,
  p_band text default null,
  p_niche text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_band text := upper(nullif(trim(coalesce(p_band, '')), ''));
  v_lead record;
  v_sequence_id uuid;
  v_queue_id uuid;
  v_status text;
begin
  select * into v_lead
  from public.leads
  where id = p_lead_id
  for update;

  if not found then
    raise exception 'Lead not found: %', p_lead_id;
  end if;

  if v_band is null then
    select upper(band) into v_band
    from public.lead_scores
    where lead_id = p_lead_id
    order by created_at desc
    limit 1;
  end if;

  v_band := coalesce(nullif(v_band, ''), 'C');

  if v_band = 'A' then
    update public.leads
    set status = 'pending_approval',
        last_activity_at = now(),
        updated_at = now()
    where id = p_lead_id;

    perform public.queue_manual_review_item(p_lead_id, 'band_a_approval', 'high');
    v_status := 'pending_approval';
  elsif v_band in ('B', 'C') then
    select id into v_sequence_id
    from public.outreach_sequences
    where active = true
      and band = v_band
    order by created_at asc
    limit 1;

    if v_sequence_id is null then
      update public.leads
      set status = 'blocked',
          last_activity_at = now(),
          updated_at = now()
      where id = p_lead_id;

      perform public.queue_manual_review_item(p_lead_id, 'missing_outreach_sequence', 'high');
      v_status := 'blocked';
    else
      insert into public.outreach_queue (lead_id, sequence_id, current_step, next_send_at, status, created_at, updated_at)
      values (p_lead_id, v_sequence_id, 1, now(), 'queued', now(), now())
      on conflict (lead_id, sequence_id) do update
      set status = case when outreach_queue.status in ('replied', 'completed') then outreach_queue.status else 'queued' end,
          next_send_at = coalesce(outreach_queue.next_send_at, now()),
          updated_at = now()
      returning id into v_queue_id;

      update public.leads
      set status = 'queued',
          last_activity_at = now(),
          updated_at = now()
      where id = p_lead_id
        and status not in ('replied', 'replied_interested', 'replied_not_interested', 'closed_won', 'closed_lost', 'unsubscribed', 'bounced', 'archived');

      v_status := 'queued';
    end if;
  else
    update public.leads
    set status = 'review_pending',
        last_activity_at = now(),
        updated_at = now()
    where id = p_lead_id;

    perform public.queue_manual_review_item(p_lead_id, 'low_score_or_band_d_review', 'normal');
    v_status := 'review_pending';
  end if;

  insert into public.workflow_events (workflow_name, lead_id, event_type, status, payload, created_at)
  values (
    'WF-04 Routing',
    p_lead_id,
    'route_scored_lead',
    'completed',
    jsonb_build_object('band', v_band, 'niche', p_niche, 'queue_id', v_queue_id, 'lead_status', v_status),
    now()
  );

  return jsonb_build_object('lead_id', p_lead_id, 'band', v_band, 'queue_id', v_queue_id, 'status', v_status);
end;
$$;

create or replace function public.load_draft_context(p_queue_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_queue record;
  v_lead record;
  v_step record;
  v_score jsonb;
  v_evidence jsonb;
  v_hypothesis jsonb;
  v_campaign jsonb;
begin
  select * into v_queue from public.outreach_queue where id = p_queue_id;
  if not found then
    raise exception 'Queue item not found: %', p_queue_id;
  end if;

  select * into v_lead from public.leads where id = v_queue.lead_id;
  select * into v_step
  from public.outreach_steps
  where sequence_id = v_queue.sequence_id
    and step_number = coalesce(v_queue.current_step, 1)
  limit 1;

  select to_jsonb(ls.*) into v_score
  from public.lead_scores ls
  where ls.lead_id = v_queue.lead_id
  order by ls.created_at desc
  limit 1;

  select coalesce(jsonb_agg(to_jsonb(se.*) order by se.created_at desc), '[]'::jsonb) into v_evidence
  from public.score_evidence se
  where se.lead_id = v_queue.lead_id;

  select to_jsonb(ah.*) into v_hypothesis
  from public.automation_hypotheses ah
  where ah.lead_id = v_queue.lead_id
  order by ah.created_at desc
  limit 1;

  select to_jsonb(c.*) into v_campaign
  from public.campaigns c
  where c.id = v_lead.campaign_id;

  return jsonb_build_object(
    'queue', to_jsonb(v_queue),
    'lead', to_jsonb(v_lead),
    'step', coalesce(to_jsonb(v_step), '{}'::jsonb),
    'score', coalesce(v_score, '{}'::jsonb),
    'evidence', coalesce(v_evidence, '[]'::jsonb),
    'hypothesis', coalesce(v_hypothesis, '{}'::jsonb),
    'campaign', coalesce(v_campaign, '{}'::jsonb)
  );
end;
$$;

create or replace function public.persist_draft_or_block(
  p_queue_id uuid,
  p_lead_id uuid,
  p_is_valid boolean,
  p_subject text default null,
  p_body text default null,
  p_channel text default 'email',
  p_approval_status text default null,
  p_block_reason text default null,
  p_raw_draft jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_queue record;
  v_status text := lower(coalesce(p_approval_status, case when p_is_valid then 'auto_approved' else 'blocked' end));
  v_draft_id uuid;
begin
  if v_status not in ('pending', 'approved', 'auto_approved', 'rejected', 'blocked', 'regeneration_requested') then
    v_status := case when p_is_valid then 'auto_approved' else 'blocked' end;
  end if;

  select * into v_queue
  from public.outreach_queue
  where id = p_queue_id
  for update;

  if not found then
    raise exception 'Queue item not found: %', p_queue_id;
  end if;

  if p_is_valid then
    insert into public.email_drafts (
      lead_id,
      queue_id,
      sequence_id,
      step_number,
      channel,
      subject_line,
      message_body,
      subject,
      body,
      word_count,
      validation_passed,
      validation_failures,
      approval_status,
      block_reason,
      raw_draft,
      created_at,
      updated_at
    )
    values (
      p_lead_id,
      p_queue_id,
      v_queue.sequence_id,
      coalesce(v_queue.current_step, 1),
      coalesce(p_channel, 'email'),
      coalesce(p_subject, ''),
      coalesce(p_body, ''),
      p_subject,
      p_body,
      cardinality(regexp_split_to_array(coalesce(p_body, ''), '\s+')),
      true,
      '[]'::jsonb,
      v_status,
      null,
      coalesce(p_raw_draft, '{}'::jsonb),
      now(),
      now()
    )
    on conflict (lead_id, sequence_id, step_number) do update
    set queue_id = excluded.queue_id,
        channel = excluded.channel,
        subject_line = excluded.subject_line,
        message_body = excluded.message_body,
        subject = excluded.subject,
        body = excluded.body,
        word_count = excluded.word_count,
        validation_passed = true,
        approval_status = excluded.approval_status,
        block_reason = null,
        raw_draft = excluded.raw_draft,
        updated_at = now()
    returning id into v_draft_id;

    update public.outreach_queue
    set status = 'drafted',
        updated_at = now()
    where id = p_queue_id;

    update public.leads
    set status = case when v_status = 'pending' then 'pending_approval' else 'drafted' end,
        last_activity_at = now(),
        updated_at = now()
    where id = p_lead_id
      and status not in ('replied', 'replied_interested', 'replied_not_interested', 'closed_won', 'closed_lost', 'unsubscribed', 'bounced', 'archived');
  else
    update public.outreach_queue
    set status = 'blocked',
        pause_reason = coalesce(p_block_reason, 'draft_validation_failed'),
        updated_at = now()
    where id = p_queue_id;

    update public.leads
    set status = 'blocked',
        last_activity_at = now(),
        updated_at = now()
    where id = p_lead_id;

    perform public.queue_manual_review_item(p_lead_id, 'draft_generation_blocked', 'high');
  end if;

  insert into public.workflow_events (workflow_name, lead_id, event_type, status, payload, created_at)
  values (
    'WF-05 Draft Generation',
    p_lead_id,
    'persist_draft_or_block',
    case when p_is_valid then 'completed' else 'blocked' end,
    jsonb_build_object('queue_id', p_queue_id, 'draft_id', v_draft_id, 'approval_status', v_status, 'block_reason', p_block_reason),
    now()
  );

  return jsonb_build_object(
    'status', case when p_is_valid then 'draft_persisted' else 'draft_blocked' end,
    'queue_id', p_queue_id,
    'lead_id', p_lead_id,
    'draft_id', v_draft_id,
    'approval_status', v_status,
    'block_reason', p_block_reason
  );
end;
$$;

create or replace function public.weekly_founder_report_metrics(
  p_start_at timestamptz default now() - interval '7 days',
  p_end_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_global_pause boolean;
begin
  select coalesce((value->>'paused')::boolean, true)
  into v_global_pause
  from public.app_settings
  where key = 'global_outreach';

  return jsonb_build_object(
    'period', jsonb_build_object('start_at', p_start_at, 'end_at', p_end_at),
    'leads', (
      select jsonb_build_object(
        'total_created', count(*) filter (where created_at between p_start_at and p_end_at),
        'new', count(*) filter (where status = 'new'),
        'enriched', count(*) filter (where status = 'enriched'),
        'scored', count(*) filter (where status = 'scored'),
        'queued', count(*) filter (where status = 'queued'),
        'drafted', count(*) filter (where status = 'drafted'),
        'in_sequence', count(*) filter (where status = 'in_sequence'),
        'replied', count(*) filter (where status like 'replied%'),
        'blocked_or_paused', count(*) filter (where status in ('blocked', 'paused'))
      )
      from public.leads
    ),
    'bands', (
      select coalesce(jsonb_agg(jsonb_build_object('band', band, 'count', lead_count, 'avg_score', avg_score)), '[]'::jsonb)
      from (
        select coalesce(band, 'unknown') as band, count(*) as lead_count, round(avg(total_score)::numeric, 1) as avg_score
        from public.lead_scores
        where created_at between p_start_at and p_end_at
        group by coalesce(band, 'unknown')
      ) s
    ),
    'outreach', jsonb_build_object(
      'sent', (select count(*) from public.outreach_events where event_type = 'email_sent' and created_at between p_start_at and p_end_at),
      'failed', (select count(*) from public.outreach_events where status = 'failed' and created_at between p_start_at and p_end_at),
      'replies', (select count(*) from public.reply_events where reply_received_at between p_start_at and p_end_at),
      'manual_review_created', (select count(*) from public.manual_review_queue where created_at between p_start_at and p_end_at),
      'manual_review_pending', (select count(*) from public.manual_review_queue where review_status = 'pending')
    ),
    'draft_breakdown', (
      select coalesce(jsonb_agg(jsonb_build_object('approval_status', approval_status, 'count', count)), '[]'::jsonb)
      from (select approval_status, count(*) from public.email_drafts group by approval_status) d
    ),
    'queue_breakdown', (
      select coalesce(jsonb_agg(jsonb_build_object('status', status, 'count', count)), '[]'::jsonb)
      from (select status, count(*) from public.outreach_queue group by status) q
    ),
    'reply_breakdown', (
      select coalesce(jsonb_agg(jsonb_build_object('intent', public.normalize_reply_intent(intent_classification), 'count', count)), '[]'::jsonb)
      from (
        select intent_classification, count(*)
        from public.reply_events
        where reply_received_at between p_start_at and p_end_at
        group by intent_classification
      ) r
    ),
    'top_niches', (
      select coalesce(jsonb_agg(jsonb_build_object('niche', niche, 'count', count)), '[]'::jsonb)
      from (
        select coalesce(niche, 'Unknown') as niche, count(*)
        from public.leads
        where created_at between p_start_at and p_end_at
        group by coalesce(niche, 'Unknown')
        order by count(*) desc
        limit 5
      ) n
    ),
    'top_regions', (
      select coalesce(jsonb_agg(jsonb_build_object('region', region, 'count', count)), '[]'::jsonb)
      from (
        select coalesce(country, 'Unknown') as region, count(*)
        from public.leads
        where created_at between p_start_at and p_end_at
        group by coalesce(country, 'Unknown')
        order by count(*) desc
        limit 5
      ) rg
    ),
    'blockers', jsonb_build_object(
      'global_outreach_paused', coalesce(v_global_pause, true),
      'pending_draft_approvals', (select count(*) from public.email_drafts where approval_status = 'pending' and coalesce(sent, false) = false),
      'pending_manual_reviews', (select count(*) from public.manual_review_queue where review_status = 'pending'),
      'blocked_queue_items', (select count(*) from public.outreach_queue where status = 'blocked'),
      'paused_queue_items', (select count(*) from public.outreach_queue where status = 'paused'),
      'unhandled_replies', (select count(*) from public.reply_events where handled_at is null)
    ),
    'workflow_health', (
      select coalesce(jsonb_agg(jsonb_build_object('workflow_name', workflow_name, 'status', status, 'count', count, 'last_seen_at', last_seen_at)), '[]'::jsonb)
      from (
        select workflow_name, status, count(*), max(created_at) as last_seen_at
        from public.workflow_events
        where created_at between p_start_at and p_end_at
        group by workflow_name, status
      ) wh
    )
  );
end;
$$;

drop function if exists public.pause_queue_after_reply(uuid, text, text, boolean, uuid, text, text, text, jsonb);

create or replace function public.pause_queue_after_reply(
  p_lead_id uuid,
  p_intent_classification text,
  p_sentiment text,
  p_requires_human_review boolean default true,
  p_reply_event_id uuid default null,
  p_summary text default null,
  p_suggested_next_action text default null,
  p_ai_draft_reply text default null,
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
    else 'replied_needs_review'
  end;

  if p_reply_event_id is not null then
    update public.reply_events
    set intent_classification = v_intent,
        sentiment = v_sentiment,
        requires_human_review = v_requires_human_review,
        summary = coalesce(p_summary, summary),
        suggested_next_action = coalesce(p_suggested_next_action, suggested_next_action),
        ai_draft_reply = coalesce(p_ai_draft_reply, ai_draft_reply),
        suggested_reply_draft = coalesce(p_ai_draft_reply, suggested_reply_draft),
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
  set status = case when status in ('closed_won', 'closed_lost', 'archived') then status else v_lead_status end,
      last_activity_at = now(),
      updated_at = now()
  where id = p_lead_id;

  if v_requires_human_review then
    select q.id into v_review_id
    from public.queue_manual_review_item(
      p_lead_id,
      'reply_' || v_intent,
      case when v_intent in ('positive_interest', 'neutral_question', 'manual_review_required') then 'high' else 'normal' end
    ) q
    limit 1;
  end if;

  insert into public.workflow_events (workflow_name, lead_id, event_type, status, payload, created_at)
  values (
    'WF-07 Reply Detection',
    p_lead_id,
    'pause_queue_after_reply',
    'completed',
    jsonb_build_object('reply_event_id', p_reply_event_id, 'intent_classification', v_intent, 'manual_review_queue_id', v_review_id, 'lead_status', v_lead_status),
    now()
  );

  return jsonb_build_object('status', 'queue_paused_after_reply', 'lead_id', p_lead_id, 'lead_status', v_lead_status, 'intent_classification', v_intent, 'manual_review_queue_id', v_review_id);
end;
$$;

comment on function public.pause_queue_after_reply(uuid, text, text, boolean, uuid, text, text, text, jsonb) is
'WF-07 Reply Detection canonical contract. p_ai_draft_reply stores reply_events.ai_draft_reply.';

do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as signature
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
        'reserve_places_quota'
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
grant execute on function public.dashboard_update_lead_status(uuid, text) to service_role;
