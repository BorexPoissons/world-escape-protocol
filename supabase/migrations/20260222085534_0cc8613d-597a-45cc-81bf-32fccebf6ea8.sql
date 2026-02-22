
-- Phase 1: DB Cleanup & Schema for 48-country canonical scope

-- Step 1: Reset all countries to season 0 (inactive)
UPDATE public.countries SET season_number = 0, phase = 0;

-- Step 2: Set Season 1 canonical order (12 countries)
UPDATE public.countries SET season_number = 1, release_order = 1, operation_name = 'SIGNAL INITIAL', phase = 1 WHERE code = 'CH';
UPDATE public.countries SET season_number = 1, release_order = 2, operation_name = 'MÉMOIRE DES PIERRES', phase = 1 WHERE code = 'GR';
UPDATE public.countries SET season_number = 1, release_order = 3, operation_name = 'CYCLE', phase = 1 WHERE code = 'IN';
UPDATE public.countries SET season_number = 1, release_order = 4, operation_name = 'PASSAGE', phase = 1 WHERE code = 'MA';
UPDATE public.countries SET season_number = 1, release_order = 5, operation_name = 'ARCHIVES', phase = 1 WHERE code = 'IT';
UPDATE public.countries SET season_number = 1, release_order = 6, operation_name = 'DISCRÉTION', phase = 1 WHERE code = 'JP';
UPDATE public.countries SET season_number = 1, release_order = 7, operation_name = 'TRANSMISSION', phase = 1 WHERE code = 'MX';
UPDATE public.countries SET season_number = 1, release_order = 8, operation_name = 'ALTITUDE', phase = 1 WHERE code = 'PE';
UPDATE public.countries SET season_number = 1, release_order = 9, operation_name = 'JONCTION', phase = 1 WHERE code = 'TR';
UPDATE public.countries SET season_number = 1, release_order = 10, operation_name = 'SOURCE', phase = 1 WHERE code = 'ET';
UPDATE public.countries SET season_number = 1, release_order = 11, operation_name = 'ARCHITECTURE', phase = 1 WHERE code = 'KH';
UPDATE public.countries SET season_number = 1, release_order = 12, operation_name = 'DÉCLIC', phase = 1 WHERE code = 'DE';

-- Step 3: Add gameplay columns to profiles for carry-over mechanics
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS bonus_seconds_banked integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lives_banked integer NOT NULL DEFAULT 0;

-- Step 4: Update complete_country_attempt RPC for 7 questions / gate 6/7
CREATE OR REPLACE FUNCTION public.complete_country_attempt(
  p_user_id uuid, 
  p_country_code text, 
  p_score integer, 
  p_total integer DEFAULT 7
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_threshold         integer;
  v_fragment_inserted  boolean := false;
  v_best_score         integer;
  v_fragment_granted   boolean;
  v_country_id         uuid;
BEGIN
  -- 80% gate: for 7 questions, threshold = 6
  v_threshold := CEIL(COALESCE(p_total, 7) * 0.8);

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
    'passed_gate',      (p_score >= v_threshold),
    'threshold',        v_threshold,
    'fragment_granted', v_fragment_granted,
    'fragment_new',     v_fragment_inserted,
    'unlocked_next',    v_fragment_granted
  );
END;
$function$;
