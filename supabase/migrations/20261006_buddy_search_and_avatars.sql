-- Buddy search + avatar storage.
--
-- Context: supabase/migrations/20260928_buddies_chat.sql declares
-- discover_potential_buddies(limit_n INTEGER) with no search argument, but the
-- app has always called it with { search, limit_n }. A searching version was
-- added directly to the database at some point and never written back here, so
-- the repo and the live schema had drifted. This file is the current truth.

-- 1. Discovery with search over display name, full name, city and interests.
CREATE OR REPLACE FUNCTION public.discover_potential_buddies(
  search TEXT DEFAULT NULL,
  limit_n INTEGER DEFAULT 20
)
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
  q TEXT;
BEGIN
  IF me_id IS NULL THEN RETURN; END IF;
  SELECT p.interests INTO my_interests FROM public.profiles p WHERE p.id = me_id;
  my_interests := COALESCE(my_interests, '{}');
  q := NULLIF(TRIM(COALESCE(search, '')), '');

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
    AND (
      q IS NULL
      OR COALESCE(p.buddy_display_name, '') ILIKE '%' || q || '%'
      OR COALESCE(p.full_name, '') ILIKE '%' || q || '%'
      OR COALESCE(p.city, '') ILIKE '%' || q || '%'
      OR EXISTS (SELECT 1 FROM UNNEST(p.interests) t WHERE t ILIKE '%' || q || '%')
    )
  ORDER BY match_score DESC NULLS LAST, p.created_at DESC
  LIMIT GREATEST(1, LEAST(limit_n, 50));
END; $$;

GRANT EXECUTE ON FUNCTION public.discover_potential_buddies(TEXT, INTEGER)
  TO anon, authenticated;

-- Drop the original single-argument overload. Both versions declare defaults,
-- so PostgREST can fail to choose between them (PGRST203) depending on which
-- arguments the client sends. Nothing calls the no-search version.
DROP FUNCTION IF EXISTS public.discover_potential_buddies(INTEGER);

-- 2. Avatar storage. Public read so <Image> can load without a signed URL;
--    writes are confined to a folder named after the user's own id.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', TRUE, 5242880,
        ARRAY['image/jpeg','image/png','image/webp','image/heic'])
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies
                 WHERE schemaname='storage' AND tablename='objects'
                   AND policyname='avatars_public_read') THEN
    CREATE POLICY avatars_public_read ON storage.objects
      FOR SELECT USING (bucket_id = 'avatars');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies
                 WHERE schemaname='storage' AND tablename='objects'
                   AND policyname='avatars_owner_insert') THEN
    CREATE POLICY avatars_owner_insert ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'avatars'
                  AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies
                 WHERE schemaname='storage' AND tablename='objects'
                   AND policyname='avatars_owner_update') THEN
    CREATE POLICY avatars_owner_update ON storage.objects
      FOR UPDATE TO authenticated
      USING (bucket_id = 'avatars'
             AND (storage.foldername(name))[1] = auth.uid()::text)
      WITH CHECK (bucket_id = 'avatars'
                  AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies
                 WHERE schemaname='storage' AND tablename='objects'
                   AND policyname='avatars_owner_delete') THEN
    CREATE POLICY avatars_owner_delete ON storage.objects
      FOR DELETE TO authenticated
      USING (bucket_id = 'avatars'
             AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;
