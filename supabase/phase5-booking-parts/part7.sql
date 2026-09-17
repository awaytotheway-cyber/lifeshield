-- ============================================================================
-- PRESCOPE Phase 5 booking — PART 7 of 7: updated_at trigger
-- Paste this whole block into a NEW Supabase SQL Editor query and click Run
-- before moving on to part 8. Do not mix parts in one paste.
-- Full combined file: supabase/phase5-booking.sql
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 8. Keep updated_at honest on bookings
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_bookings_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_touch_updated_at ON public.bookings;
CREATE TRIGGER bookings_touch_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.touch_bookings_updated_at();
