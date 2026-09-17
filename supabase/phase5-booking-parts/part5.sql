-- ============================================================================
-- PRESCOPE Phase 5 booking — PART 5 of 7: cancel_booking() function
-- Paste this whole block into a NEW Supabase SQL Editor query and click Run
-- before moving on to part 6. Do not mix parts in one paste.
-- Full combined file: supabase/phase5-booking.sql
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 6. CANCEL — frees the slot back up for someone else
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancel_booking(p_booking_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_booking public.bookings%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_signed_in');
  END IF;

  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'booking_missing');
  END IF;

  IF v_booking.status IN ('cancelled', 'sample_taken') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_cancellable');
  END IF;

  UPDATE public.bookings
  SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
  WHERE id = v_booking.id;

  IF v_booking.slot_id IS NOT NULL THEN
    UPDATE public.lab_slots
    SET booked_count = GREATEST(booked_count - 1, 0)
    WHERE id = v_booking.slot_id;
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_booking(UUID) TO authenticated;

