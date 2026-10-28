-- APPLIED to the LifeShield database on 2026-10-28.
--
-- Moderation: staff need to see blocks, not only reports. A person who has been
-- blocked by many members is the clearest signal there is, and the reports
-- queue alone cannot show it because most people block instead of reporting.
-- Read-only, owner/admin staff only. Members still see only their own blocks.

drop policy if exists blocks_admin_read on public.blocks;
create policy blocks_admin_read on public.blocks
  for select using (public.is_admin_staff());
