-- PRESCOPE — Accountability Buddies + Chat (feature #3)
--
-- Extends profiles with opt-in discoverability fields, adds a
-- connections table (one row per pair, symmetric), a chat_messages
-- table (scoped to an active connection), and a SECURITY DEFINER
-- discovery RPC so a user can only see minimal public fields of
-- other opt-in users — never emails or raw profile rows.

-- ========== profile opt-in fields ==========
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_buddy_discoverable BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS buddy_display_name TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS interests TEXT[] NOT NULL DEFAULT '{}';

-- ========== connections ==========
CREATE TABLE IF NOT EXISTS public.connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN (
    'requested','active','declined','inactive'
  )),
  request_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT connections_distinct CHECK (requester_id <> addressee_id)
);

-- One pending or active connection per unordered pair.
CREATE UNIQUE INDEX IF NOT EXISTS connections_pair_unique
  ON public.connections (
    LEAST(requester_id, addressee_id),
    GREATEST(requester_id, addressee_id)
  );

CREATE INDEX IF NOT EXISTS connections_requester_idx
  ON public.connections (requester_id);
CREATE INDEX IF NOT EXISTS connections_addressee_idx
  ON public.connections (addressee_id);

CREATE OR REPLACE FUNCTION public.set_connections_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := NOW(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS connections_set_updated_at ON public.connections;
CREATE TRIGGER connections_set_updated_at
  BEFORE UPDATE ON public.connections
  FOR EACH ROW EXECUTE FUNCTION public.set_connections_updated_at();

ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

-- Either party may read the row.
DROP POLICY IF EXISTS "conn_read_involved" ON public.connections;
CREATE POLICY "conn_read_involved" ON public.connections
  FOR SELECT USING (auth.uid() IN (requester_id, addressee_id));

-- Only the requester creates a request. The row must be requested,
-- addressed to another opt-in user, and no other row for the same pair
-- may be active or requested (index enforces the last part).
DROP POLICY IF EXISTS "conn_insert_requester" ON public.connections;
CREATE POLICY "conn_insert_requester" ON public.connections
  FOR INSERT WITH CHECK (
    auth.uid() = requester_id AND
    status = 'requested' AND
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = addressee_id AND p.is_buddy_discoverable = TRUE
    )
  );

-- Either party may update (accept, decline, archive).
DROP POLICY IF EXISTS "conn_update_involved" ON public.connections;
CREATE POLICY "conn_update_involved" ON public.connections
  FOR UPDATE USING (auth.uid() IN (requester_id, addressee_id))
  WITH CHECK (auth.uid() IN (requester_id, addressee_id));

-- Either party may delete (cleanup).
DROP POLICY IF EXISTS "conn_delete_involved" ON public.connections;
CREATE POLICY "conn_delete_involved" ON public.connections
  FOR DELETE USING (auth.uid() IN (requester_id, addressee_id));

DROP POLICY IF EXISTS "conn_admin_read" ON public.connections;
CREATE POLICY "conn_admin_read" ON public.connections
  FOR SELECT USING (public.is_admin_staff());

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.connections
  TO anon, authenticated;

-- ========== chat_messages ==========
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES public.connections(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (length(trim(body)) > 0 AND length(body) <= 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chat_messages_conn_idx
  ON public.chat_messages (connection_id, created_at);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Read: only the two people on that active connection.
DROP POLICY IF EXISTS "chat_read_involved" ON public.chat_messages;
CREATE POLICY "chat_read_involved" ON public.chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.connections c
      WHERE c.id = connection_id
        AND c.status = 'active'
        AND auth.uid() IN (c.requester_id, c.addressee_id)
    )
  );

-- Write: the sender must be signed in and part of an active connection.
DROP POLICY IF EXISTS "chat_write_sender" ON public.chat_messages;
CREATE POLICY "chat_write_sender" ON public.chat_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.connections c
      WHERE c.id = connection_id
        AND c.status = 'active'
        AND auth.uid() IN (c.requester_id, c.addressee_id)
    )
  );

DROP POLICY IF EXISTS "chat_admin_read" ON public.chat_messages;
CREATE POLICY "chat_admin_read" ON public.chat_messages
  FOR SELECT USING (public.is_admin_staff());

GRANT SELECT, INSERT ON TABLE public.chat_messages TO anon, authenticated;

-- ========== discovery RPC ==========
-- Returns opt-in profiles other than the caller, excluding any user the
-- caller already has an active or requested connection with. Includes
-- the caller's shared interests and a rough match score to seed a
-- "mutual match %" in the UI.
CREATE OR REPLACE FUNCTION public.discover_potential_buddies(limit_n INTEGER DEFAULT 20)
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  city TEXT,
  interests TEXT[],
  shared_interests TEXT[],
  match_score NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me_id UUID := auth.uid();
  my_interests TEXT[];
BEGIN
  IF me_id IS NULL THEN
    RETURN;
  END IF;
  SELECT p.interests INTO my_interests
  FROM public.profiles p WHERE p.id = me_id;
  my_interests := COALESCE(my_interests, '{}');

  RETURN QUERY
  SELECT
    p.id AS user_id,
    COALESCE(NULLIF(p.buddy_display_name, ''),
             SPLIT_PART(COALESCE(p.full_name, ''), ' ', 1),
             'Buddy') AS display_name,
    p.city,
    p.interests,
    ARRAY(
      SELECT UNNEST(p.interests)
      INTERSECT
      SELECT UNNEST(my_interests)
    ) AS shared_interests,
    CASE
      WHEN COALESCE(array_length(my_interests, 1), 0) = 0
        OR COALESCE(array_length(p.interests, 1), 0) = 0 THEN 0
      ELSE ROUND(
        (array_length(
          ARRAY(SELECT UNNEST(p.interests) INTERSECT SELECT UNNEST(my_interests)),
          1
        )::NUMERIC * 100) /
        GREATEST(
          array_length(
            ARRAY(SELECT UNNEST(p.interests) UNION SELECT UNNEST(my_interests)),
            1
          ),
          1
        )
      )
    END AS match_score
  FROM public.profiles p
  WHERE p.id <> me_id
    AND p.is_buddy_discoverable = TRUE
    AND NOT EXISTS (
      SELECT 1 FROM public.connections c
      WHERE c.status IN ('active','requested')
        AND ((c.requester_id = me_id AND c.addressee_id = p.id)
          OR (c.addressee_id = me_id AND c.requester_id = p.id))
    )
  ORDER BY match_score DESC NULLS LAST, p.created_at DESC
  LIMIT GREATEST(1, LEAST(limit_n, 50));
END; $$;

GRANT EXECUTE ON FUNCTION public.discover_potential_buddies(INTEGER)
  TO anon, authenticated;

-- Small view exposing only the safe columns of a connection's counterpart,
-- so the app can render "Buddy: name, city" without loading raw profile
-- rows (RLS on profiles only lets you read your own).
CREATE OR REPLACE FUNCTION public.buddy_profile(other_id UUID)
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  city TEXT,
  interests TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR other_id IS NULL THEN RETURN; END IF;
  -- Only reveal when a connection exists (active or requested) with the caller.
  IF NOT EXISTS (
    SELECT 1 FROM public.connections c
    WHERE c.status IN ('active','requested')
      AND ((c.requester_id = auth.uid() AND c.addressee_id = other_id)
        OR (c.addressee_id = auth.uid() AND c.requester_id = other_id))
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    COALESCE(NULLIF(p.buddy_display_name, ''),
             SPLIT_PART(COALESCE(p.full_name, ''), ' ', 1),
             'Buddy'),
    p.city,
    p.interests
  FROM public.profiles p WHERE p.id = other_id;
END; $$;

GRANT EXECUTE ON FUNCTION public.buddy_profile(UUID) TO anon, authenticated;

COMMENT ON TABLE public.connections IS
  'Buddy connections between users. One row per unordered pair.';
COMMENT ON TABLE public.chat_messages IS
  'Messages within an active buddy connection.';
