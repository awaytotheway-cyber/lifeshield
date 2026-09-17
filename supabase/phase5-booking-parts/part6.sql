-- ============================================================================
-- PRESCOPE Phase 5 booking — PART 6 of 7: clinics_with_next_slot() function
-- Paste this whole block into a NEW Supabase SQL Editor query and click Run
-- before moving on to part 7. Do not mix parts in one paste.
-- Full combined file: supabase/phase5-booking.sql
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 7. NEARBY CLINICS — what the "choose a lab" screen reads
--    Matches on postcode area when we have no coordinates, and always returns
--    the next available slot time so the card can show it.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.clinics_with_next_slot(p_postcode_area TEXT DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  name TEXT,
  address TEXT,
  city TEXT,
  postcode TEXT,
  postcode_area TEXT,
  offers_home_collection BOOLEAN,
  operating_hours TEXT,
  next_slot_at TIMESTAMPTZ,
  open_slot_count BIGINT,
  from_price_cents INT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.name,
    c.address,
    c.city,
    c.postcode,
    c.postcode_area,
    COALESCE(c.offers_home_collection, FALSE) AS offers_home_collection,
    c.operating_hours,
    MIN(s.starts_at) AS next_slot_at,
    COUNT(s.id) AS open_slot_count,
    MIN(s.price_cents) AS from_price_cents
  FROM public.clinics c
  LEFT JOIN public.lab_slots s
    ON s.clinic_id = c.id
   AND s.active IS TRUE
   AND s.starts_at > NOW()
   AND s.booked_count < s.capacity
  WHERE c.active IS TRUE
    AND (
      p_postcode_area IS NULL
      OR c.postcode_area IS NULL
      OR UPPER(c.postcode_area) = UPPER(p_postcode_area)
    )
  GROUP BY c.id
  ORDER BY (MIN(s.starts_at) IS NULL), MIN(s.starts_at) ASC, c.name ASC;
$$;

GRANT EXECUTE ON FUNCTION public.clinics_with_next_slot(TEXT) TO authenticated;

