-- Module G: Settings Completion.
-- Add safe inbox archival/display fields without touching historical send data.

alter table public.inboxes
  add column if not exists archived boolean not null default false,
  add column if not exists display_label text;

update public.inboxes
set archived = false
where archived is null;

create index if not exists inboxes_active_unarchived_capacity_idx
on public.inboxes (active, current_daily_sent, daily_send_limit)
where archived = false;

create or replace function public.select_available_sending_inbox()
returns table(id uuid, email_address text, provider text, daily_send_limit integer, current_daily_sent integer)
language sql
security definer
set search_path = public
as $$
  select i.id, i.email_address, i.provider, i.daily_send_limit, i.current_daily_sent
  from public.inboxes i
  where i.active = true
    and i.archived = false
    and coalesce(i.current_daily_sent, 0) < coalesce(i.daily_send_limit, 0)
  order by i.last_sent_at nulls first, i.created_at asc
  limit 1;
$$;

grant execute on function public.select_available_sending_inbox() to service_role;
