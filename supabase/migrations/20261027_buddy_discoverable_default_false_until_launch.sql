-- Revert the discoverability default to false until Buddies actually launches.
--
-- 20261026 set this to true, because the product decision is that members are
-- findable by first name and city. But the "Let others find me" switch is
-- gated behind social_v1, which defaults false -- so a new account was
-- discoverable with no visible way to opt out, while any account holding the
-- flag could already find them. discover_potential_buddies() gates on this
-- column, not on anyone's flag, so that exposure was real.
--
-- Nobody should be findable before they can see the control. Flip this back to
-- true when social_v1 goes on for everyone:
--
--   alter table public.profiles alter column is_buddy_discoverable set default true;
--
-- Existing rows are untouched here, exactly as in 20261026: the two accounts
-- that are already discoverable chose that themselves.

alter table public.profiles
  alter column is_buddy_discoverable set default false;
