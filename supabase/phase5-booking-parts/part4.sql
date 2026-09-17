-- ============================================================================
-- PRESCOPE Phase 5 booking — PART 4 of 7: book_lab_slot() function
-- Paste this whole block into a NEW Supabase SQL Editor query and click Run
-- before moving on to part 5. Do not mix parts in one paste.
-- Full combined file: supabase/phase5-booking.sql
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 5. BOOK A SLOT ATOMICALLY
--    Re-checks availability inside the transaction and locks the slot row, so
--    two people tapping "Confirm" at the same second cannot both get it.
--    Returns JSON the app can read: { ok, booking_id, reason }.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.book_lab_slot(
  p_slot_id UUID,
  p_lab_order_id UUID DEFAULT NULL,
  p_test_order_id UUID DEFAULT NULL,
  p_prep_snapshot JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_slot public.lab_slots%ROWTYPE;
  v_booking_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_signed_in');
  END IF;

  -- Lock this one slot row until the transaction ends.
  SELECT * INTO v_slot
  FROM public.lab_slots
  WHERE id = p_slot_id
  FOR UPDATE;

  IF NOT FOUND OR v_slot.active IS NOT TRUE THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'slot_missing');
  END IF;

  IF v_slot.starts_at <= NOW() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'slot_past');
  END IF;

  IF v_slot.booked_count >= v_slot.capacity THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'slot_taken');
  END IF;

  UPDATE public.lab_slots
  SET booked_count = booked_count + 1
  WHERE id = v_slot.id;

  INSERT INTO public.bookings (
    user_id, lab_order_id, test_order_id, slot_id, clinic_id,
    kind, status, scheduled_for, prep_ack_at, prep_snapshot
  )
  VALUES (
    v_user_id, p_lab_order_id, p_test_order_id, v_slot.id, v_slot.clinic_id,
    'clinic', 'confirmed', v_slot.starts_at, NOW(), COALESCE(p_prep_snapshot, '[]'::jsonb)
  )
  RETURNING id INTO v_booking_id;

  RETURN jsonb_build_object('ok', true, 'booking_id', v_booking_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.book_lab_slot(UUID, UUID, UUID, JSONB) TO authenticated;

