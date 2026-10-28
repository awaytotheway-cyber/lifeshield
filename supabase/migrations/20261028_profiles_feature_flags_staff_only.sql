-- Feature flags are a rollout control, not a patient setting.
--
-- profiles.feature_flags was added to the LifeShield database on 2026-10-28.
-- The own_profile policy lets a signed-in user write their whole row, so
-- without this guard anyone could switch on a governance-gated flag for
-- themselves (for example tier1_ordering_v1, which the protocol says needs
-- governance review before use with patients).
--
-- Only staff, or a server-side context with no end-user session (SQL editor,
-- service role), may change the column. A patient's attempt is ignored, not an
-- error, so a normal profile save that happens to include the column still works.
--
-- APPLIED to the LifeShield database on 2026-10-28.

create or replace function public.guard_profile_feature_flags()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is null or public.is_admin_staff() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.feature_flags := '{}'::jsonb;
  elsif new.feature_flags is distinct from old.feature_flags then
    new.feature_flags := old.feature_flags;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_profile_feature_flags on public.profiles;
create trigger guard_profile_feature_flags
  before insert or update on public.profiles
  for each row execute function public.guard_profile_feature_flags();
