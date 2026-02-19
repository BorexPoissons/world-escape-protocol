
-- ══════════════════════════════════════════════════════════════
-- 1. TABLE: player_country_progress
--    Stocke le meilleur score, last_score, tentatives par pays
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.player_country_progress (
  id               uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          uuid NOT NULL,
  country_code     text NOT NULL,
  best_score       integer NOT NULL DEFAULT 0,
  last_score       integer NOT NULL DEFAULT 0,
  attempts_count   integer NOT NULL DEFAULT 0,
  fragment_granted boolean NOT NULL DEFAULT false,
  updated_at       timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT player_country_progress_unique UNIQUE (user_id, country_code)
);

-- RLS
ALTER TABLE public.player_country_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress"
  ON public.player_country_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
  ON public.player_country_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON public.player_country_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- Auto-update updated_at
CREATE TRIGGER update_player_country_progress_updated_at
  BEFORE UPDATE ON public.player_country_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ══════════════════════════════════════════════════════════════
-- 2. FUNCTION: complete_country_attempt (atomique)
--    Appelée côté client via supabase.rpc(...)
--    Returns: best_score, unlocked_next (bool), fragment_granted (bool)
-- ══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.complete_country_attempt(
  p_user_id     uuid,
  p_country_code text,
  p_score       integer,
  p_total       integer DEFAULT 10
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_threshold       integer := 8;        -- score minimum pour fragment + déblocage
  v_fragment_inserted boolean := false;
  v_best_score      integer;
  v_fragment_granted boolean;
  v_country_id      uuid;
BEGIN
  -- Fetch country_id for user_fragments insert
  SELECT id INTO v_country_id FROM public.countries WHERE code = p_country_code LIMIT 1;

  -- Upsert player_country_progress
  INSERT INTO public.player_country_progress
    (user_id, country_code, best_score, last_score, attempts_count, fragment_granted)
  VALUES
    (p_user_id, p_country_code, p_score, p_score, 1, (p_score >= v_threshold))
  ON CONFLICT (user_id, country_code) DO UPDATE SET
    last_score     = EXCLUDED.last_score,
    best_score     = GREATEST(player_country_progress.best_score, EXCLUDED.best_score),
    attempts_count = player_country_progress.attempts_count + 1,
    fragment_granted = player_country_progress.fragment_granted OR (p_score >= v_threshold),
    updated_at     = now()
  RETURNING best_score, fragment_granted
  INTO v_best_score, v_fragment_granted;

  -- Si score >= 8 ET country_id trouvé → tenter insert fragment (anti-doublon)
  IF p_score >= v_threshold AND v_country_id IS NOT NULL THEN
    INSERT INTO public.user_fragments
      (user_id, country_id, fragment_index, is_placed, obtained_at)
    VALUES
      (p_user_id, v_country_id, 0, false, now())
    ON CONFLICT DO NOTHING;

    GET DIAGNOSTICS v_fragment_inserted = ROW_COUNT;
    -- v_fragment_inserted = true uniquement si row réellement insérée
    v_fragment_inserted := (v_fragment_inserted > 0);
  END IF;

  RETURN jsonb_build_object(
    'best_score',       v_best_score,
    'fragment_granted', (p_score >= v_threshold),
    'fragment_new',     v_fragment_inserted,
    'unlocked_next',    (v_best_score >= v_threshold)
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.complete_country_attempt(uuid, text, integer, integer) TO authenticated;
