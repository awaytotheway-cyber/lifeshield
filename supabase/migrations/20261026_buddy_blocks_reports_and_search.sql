-- Buddy feature: blocking, reporting, and discovery search.
--
-- ADDITIVE ONLY. This adopts the existing design already present in the
-- LifeShield database rather than replacing it:
--   * profiles.is_buddy_discoverable / buddy_display_name / city / interests
--   * connections (requester_id, addressee_id, status, request_note)
--   * chat_messages (connection_id, sender_id, body)
--   * buddy_profile(other_id)  -- view ONE buddy you are already connected to
--   * is_admin_staff()         -- admin read hook
--
-- Nothing above is dropped or altered in shape. Three existing policies are
-- REPLACED with equivalents that additionally exclude blocked pairs.

-- ---------------------------------------------------------------- blocks ----
create table if not exists public.blocks (
  id          uuid primary key default gen_random_uuid(),
  blocker_id  uuid not null references public.profiles(id) on delete cascade,
  blocked_id  uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  constraint blocks_not_self check (blocker_id <> blocked_id),
  constraint blocks_unique_pair unique (blocker_id, blocked_id)
);
comment on table public.blocks is
  'One row per block. Enforced inside the connections and chat_messages RLS policies, not only in the UI.';

alter table public.blocks enable row level security;

drop policy if exists blocks_own_read on public.blocks;
create policy blocks_own_read on public.blocks
  for select using (auth.uid() = blocker_id);

drop policy if exists blocks_own_insert on public.blocks;
create policy blocks_own_insert on public.blocks
  for insert with check (auth.uid() = blocker_id);

drop policy if exists blocks_own_delete on public.blocks;
create policy blocks_own_delete on public.blocks
  for delete using (auth.uid() = blocker_id);

create index if not exists blocks_blocker_idx on public.blocks(blocker_id);
create index if not exists blocks_blocked_idx on public.blocks(blocked_id);

-- --------------------------------------------------------------- reports ----
create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_kind text not null check (target_kind in ('user','message')),
  target_id   uuid not null,
  reason      text not null,
  status      text not null default 'open'
                check (status in ('open','reviewing','actioned','dismissed')),
  created_at  timestamptz not null default now()
);
comment on table public.reports is
  'Moderation queue. Reporters insert; only admin staff read and triage.';

alter table public.reports enable row level security;

drop policy if exists reports_insert_own on public.reports;
create policy reports_insert_own on public.reports
  for insert with check (auth.uid() = reporter_id);

drop policy if exists reports_admin_read on public.reports;
create policy reports_admin_read on public.reports
  for select using (public.is_admin_staff());

drop policy if exists reports_admin_update on public.reports;
create policy reports_admin_update on public.reports
  for update using (public.is_admin_staff())
  with check (public.is_admin_staff());

create index if not exists reports_status_idx on public.reports(status, created_at desc);

-- ------------------------------------------- helper: is the pair blocked? ----
create or replace function public.is_blocked_pair(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b)
       or (blocker_id = b and blocked_id = a)
  );
$$;
comment on function public.is_blocked_pair is
  'True when either party has blocked the other. Used by the connections and chat_messages policies so a block is enforced in the database, not merely hidden in the UI.';

-- ------------------------------ fold blocking into the existing policies ----
-- Each of these is the policy that already exists, plus the block exclusion.
-- The involved-parties and active-status conditions are preserved verbatim.

drop policy if exists conn_read_involved on public.connections;
create policy conn_read_involved on public.connections
  for select using (
    (auth.uid() = requester_id or auth.uid() = addressee_id)
    and not public.is_blocked_pair(requester_id, addressee_id)
  );

drop policy if exists conn_insert_requester on public.connections;
create policy conn_insert_requester on public.connections
  for insert with check (
    auth.uid() = requester_id
    and status = 'requested'
    and exists (
      select 1 from public.profiles p
      where p.id = connections.addressee_id
        and p.is_buddy_discoverable = true
    )
    and not public.is_blocked_pair(requester_id, addressee_id)
  );

drop policy if exists chat_read_involved on public.chat_messages;
create policy chat_read_involved on public.chat_messages
  for select using (
    exists (
      select 1 from public.connections c
      where c.id = chat_messages.connection_id
        and c.status = 'active'
        and (auth.uid() = c.requester_id or auth.uid() = c.addressee_id)
        and not public.is_blocked_pair(c.requester_id, c.addressee_id)
    )
  );

drop policy if exists chat_write_sender on public.chat_messages;
create policy chat_write_sender on public.chat_messages
  for insert with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.connections c
      where c.id = chat_messages.connection_id
        and c.status = 'active'
        and (auth.uid() = c.requester_id or auth.uid() = c.addressee_id)
        and not public.is_blocked_pair(c.requester_id, c.addressee_id)
    )
  );

-- ------------------------------------------------------ discovery search ----
-- buddy_profile() only serves people you are ALREADY connected to. This is the
-- discovery path: finding someone by first name or city before any connection
-- exists. It is the only route by which one user learns another exists.
create or replace function public.search_buddies(q text)
returns table (user_id uuid, display_name text, city text, interests text[])
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  needle text;
begin
  if auth.uid() is null or q is null then
    return;
  end if;

  needle := btrim(q);

  -- Two-character minimum: stops the entire user table being paged out with an
  -- empty or one-letter query.
  if length(needle) < 2 then
    return;
  end if;

  -- Escape ILIKE metacharacters so they match literally. Without this, a query
  -- of '%' turns a prefix search into a wildcard over every discoverable row.
  needle := replace(replace(replace(needle, '\', '\\'), '%', '\%'), '_', '\_');

  return query
  select
    p.id,
    coalesce(nullif(p.buddy_display_name, ''),
             nullif(split_part(coalesce(p.full_name, ''), ' ', 1), ''),
             'Buddy'),
    p.city,
    p.interests
  from public.profiles p
  where p.is_buddy_discoverable = true
    and p.id <> auth.uid()
    and not public.is_blocked_pair(p.id, auth.uid())
    and not exists (
      select 1 from public.connections c
      where (c.requester_id = auth.uid() and c.addressee_id = p.id)
         or (c.addressee_id = auth.uid() and c.requester_id = p.id)
    )
    and (
      coalesce(nullif(p.buddy_display_name, ''),
               split_part(coalesce(p.full_name, ''), ' ', 1)) ilike needle || '%' escape '\'
      or p.city ilike needle || '%' escape '\'
    )
  order by 2
  limit 50;
end;
$$;
comment on function public.search_buddies is
  'Buddy discovery. Returns display name, city and interests only - never email, never anything from the assessment. Requires a 2-character query, escapes ILIKE metacharacters, and excludes the caller, existing connections, blocked pairs and anyone not discoverable.';

revoke all on function public.search_buddies(text) from public;
grant execute on function public.search_buddies(text) to authenticated;

-- -------------------------------------------------------------- realtime ----
-- Chat needs live delivery. Guarded so a re-run is harmless.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'chat_messages'
  ) then
    alter publication supabase_realtime add table public.chat_messages;
  end if;
end $$;

-- ------------------------------------------- discoverable: new users only ----
-- The product decision is that members are discoverable by first name and city,
-- so new accounts start discoverable.
alter table public.profiles
  alter column is_buddy_discoverable set default true;

-- EXISTING ROWS ARE DELIBERATELY NOT BACKFILLED.
--
-- Every account that predates this migration stays is_buddy_discoverable =
-- false until its owner turns discovery on themselves, via the "Let others
-- find me" switch in Settings. Those people signed up under an opt-in default;
-- flipping them here would make real users findable by strangers without ever
-- asking them, which is not a schema decision to take on their behalf.
--
-- Do not "tidy this up" with an UPDATE. The asymmetry is the point.
