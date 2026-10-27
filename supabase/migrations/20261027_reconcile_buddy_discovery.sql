-- Reconcile buddy discovery.
--
-- WHY THIS EXISTS: the previous migration (20261026) added search_buddies()
-- without noticing that discover_potential_buddies() already existed and
-- already did discovery -- better, with shared-interest matching and a match
-- score. The oversight was a too-narrow catalogue grep ('%buddy%' does not
-- match 'buddies'). Two discovery functions is worse than either one.
--
-- This drops the duplicate and folds the safety properties it had into the
-- function that was already here.
--
-- NOT YET APPLIED. 20261026 IS applied, so the live database currently has
-- BOTH functions. Applying this file resolves that.

drop function if exists public.search_buddies(text);

create or replace function public.discover_potential_buddies(
  search text default null,
  limit_n integer default 20
)
returns table (
  user_id uuid,
  display_name text,
  city text,
  interests text[],
  shared_interests text[],
  match_score numeric
)
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  me_id uuid := auth.uid();
  my_interests text[];
  q text;
begin
  if me_id is null then return; end if;

  select p.interests into my_interests from public.profiles p where p.id = me_id;
  my_interests := coalesce(my_interests, '{}');

  q := nullif(btrim(coalesce(search, '')), '');

  -- A one-character query is not a search, it is an enumeration. Browsing with
  -- no query at all is intentional -- the Buddies board shows a populated list
  -- before you type -- and stays capped by limit_n.
  if q is not null and length(q) < 2 then
    return;
  end if;

  -- Escape ILIKE metacharacters so '%' and '_' match literally instead of
  -- turning a search into a wildcard over every discoverable row.
  if q is not null then
    q := replace(replace(replace(q, '\', '\\'), '%', '\%'), '_', '\_');
  end if;

  return query
  select
    p.id as user_id,
    coalesce(nullif(p.buddy_display_name, ''),
             nullif(split_part(coalesce(p.full_name, ''), ' ', 1), ''),
             'Buddy') as display_name,
    p.city,
    p.interests,
    array(
      select unnest(p.interests)
      intersect
      select unnest(my_interests)
    ) as shared_interests,
    case
      when coalesce(array_length(my_interests, 1), 0) = 0
        or coalesce(array_length(p.interests, 1), 0) = 0 then 0
      else round(
        (array_length(
          array(select unnest(p.interests) intersect select unnest(my_interests)),
          1
        )::numeric * 100) /
        greatest(
          array_length(
            array(select unnest(p.interests) union select unnest(my_interests)),
            1
          ),
          1
        )
      )
    end as match_score
  from public.profiles p
  where p.id <> me_id
    and p.is_buddy_discoverable = true
    and not public.is_blocked_pair(p.id, me_id)
    and not exists (
      select 1 from public.connections c
      where c.status in ('active','requested')
        and ((c.requester_id = me_id and c.addressee_id = p.id)
          or (c.addressee_id = me_id and c.requester_id = p.id))
    )
    and (
      q is null
      -- Match the name members actually show each other, not the surname.
      -- The design is explicit: buddies see first name, city and goals.
      or coalesce(nullif(p.buddy_display_name, ''),
                  split_part(coalesce(p.full_name, ''), ' ', 1)) ilike '%' || q || '%' escape '\'
      or coalesce(p.city, '') ilike '%' || q || '%' escape '\'
      or exists (select 1 from unnest(p.interests) t where t ilike '%' || q || '%' escape '\')
    )
  order by match_score desc nulls last, p.created_at desc
  limit greatest(1, least(limit_n, 50));
end;
$function$;

comment on function public.discover_potential_buddies is
  'Buddy discovery. Returns display name, city, interests and a shared-interest match score - never email, never a surname, never anything from the assessment. Requires two characters when searching, escapes ILIKE metacharacters, and excludes the caller, existing connections, blocked pairs and anyone not discoverable.';

-- Neither discovery nor the block helper should be reachable without a session.
-- The database linter flags every SECURITY DEFINER function the anon role can
-- call; these three are ours to close.
revoke all on function public.discover_potential_buddies(text, integer) from public, anon;
grant execute on function public.discover_potential_buddies(text, integer) to authenticated;

revoke all on function public.is_blocked_pair(uuid, uuid) from public, anon;
grant execute on function public.is_blocked_pair(uuid, uuid) to authenticated;

revoke all on function public.buddy_profile(uuid) from public, anon;
grant execute on function public.buddy_profile(uuid) to authenticated;
