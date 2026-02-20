CREATE OR REPLACE FUNCTION public.complete_country_attempt(
  p_user_id uuid, p_country_code text, p_score integer, p_total integer DEFAULT 6
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_threshold         integer;
  v_fragment_inserted  boolean := false;
  v_best_score         integer;
  v_fragment_granted   boolean;
  v_country_id         uuid;
BEGIN
  v_threshold := GREATEST(COALESCE(p_total, 1) - 1, 1);

  SELECT id INTO v_country_id FROM public.countries WHERE code = p_country_code LIMIT 1;

  INSERT INTO public.player_country_progress
    (user_id, country_code, best_score, last_score, attempts_count, fragment_granted)
  VALUES
    (p_user_id, p_country_code, p_score, p_score, 1, (p_score >= v_threshold))
  ON CONFLICT (user_id, country_code) DO UPDATE SET
    last_score       = EXCLUDED.last_score,
    best_score       = GREATEST(player_country_progress.best_score, EXCLUDED.best_score),
    attempts_count   = player_country_progress.attempts_count + 1,
    fragment_granted = player_country_progress.fragment_granted OR (p_score >= v_threshold),
    updated_at       = now()
  RETURNING best_score, fragment_granted
  INTO v_best_score, v_fragment_granted;

  IF p_score >= v_threshold AND v_country_id IS NOT NULL THEN
    INSERT INTO public.user_fragments
      (user_id, country_id, fragment_index, is_placed, obtained_at)
    VALUES
      (p_user_id, v_country_id, 0, false, now())
    ON CONFLICT (user_id, country_id) DO NOTHING;
    GET DIAGNOSTICS v_fragment_inserted = ROW_COUNT;
    v_fragment_inserted := (v_fragment_inserted > 0);
  END IF;

  RETURN jsonb_build_object(
    'best_score',       v_best_score,
    'fragment_granted', v_fragment_granted,
    'fragment_new',     v_fragment_inserted,
    'unlocked_next',    v_fragment_granted
  );
END;
$$;