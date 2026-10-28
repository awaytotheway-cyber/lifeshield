-- APPLIED to the LifeShield database on 2026-10-28.
-- Fix: nobody could send a buddy request.
--
-- conn_insert_requester checked that the addressee is discoverable with an
-- inline `exists (select 1 from profiles ...)`. That subquery runs as the
-- caller, and the profiles policy lets a user read only their own row, so the
-- check was false for every other person and every insert was rejected.
-- Found by an impersonated end-to-end test on 2026-10-28.
--
-- The check moves into a SECURITY DEFINER helper that answers only yes/no,
-- so it reveals nothing about the other profile beyond what search already
-- shows. A request to yourself is also refused.

create or replace function public.is_buddy_discoverable(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_buddy_discoverable from public.profiles p where p.id = uid),
    false
  );
$$;

revoke all on function public.is_buddy_discoverable(uuid) from public, anon;
grant execute on function public.is_buddy_discoverable(uuid) to authenticated;

drop policy if exists conn_insert_requester on public.connections;
create policy conn_insert_requester on public.connections
  for insert
  with check (
    auth.uid() = requester_id
    and requester_id <> addressee_id
    and status = 'requested'
    and public.is_buddy_discoverable(addressee_id)
    and not public.is_blocked_pair(requester_id, addressee_id)
  );

-- Fix: a requester could accept their own request.
--
-- conn_update_involved lets either party update the row, and RLS cannot
-- compare old and new values, so the requester could set status = 'active'
-- on their own request and open a chat with someone who never agreed. The app
-- only offers accept to the addressee, but the database must hold the rule.
--
-- Allowed: the addressee moves requested -> active or declined; either party
-- ends a connection (-> inactive). The two ids never change. Staff and
-- server-side contexts (no end-user session) are unrestricted.

create or replace function public.guard_connection_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is null or public.is_admin_staff() then
    return new;
  end if;

  if new.requester_id <> old.requester_id or new.addressee_id <> old.addressee_id then
    raise exception 'A connection cannot change who it is between.'
      using errcode = '42501';
  end if;

  if new.status is distinct from old.status then
    if old.status = 'requested' and new.status in ('active', 'declined') then
      if auth.uid() <> old.addressee_id then
        raise exception 'Only the person who was asked can answer a buddy request.'
          using errcode = '42501';
      end if;
    elsif new.status = 'inactive' then
      null; -- either party may end it
    else
      raise exception 'That status change is not allowed.'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists guard_connection_update on public.connections;
create trigger guard_connection_update
  before update on public.connections
  for each row execute function public.guard_connection_update();
