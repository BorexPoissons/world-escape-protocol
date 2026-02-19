-- Étape 1: Ajouter leaderboard_visible à profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS leaderboard_visible boolean NOT NULL DEFAULT true;

-- Étape 2: Créer une vue publique leaderboard (triée par XP desc)
CREATE OR REPLACE VIEW public.leaderboard AS
  SELECT
    display_name,
    xp,
    level,
    subscription_type
  FROM public.profiles
  WHERE leaderboard_visible = true
    AND display_name IS NOT NULL
    AND display_name != ''
  ORDER BY xp DESC;

-- Étape 3: Policy SELECT publique sur la vue
-- Les vues héritent par défaut des policies des tables sous-jacentes.
-- On crée une policy SELECT publique sur profiles pour la lecture leaderboard
-- via une fonction security definer pour éviter tout conflit RLS

CREATE OR REPLACE FUNCTION public.get_leaderboard(p_limit integer DEFAULT 50)
RETURNS TABLE (
  display_name text,
  xp integer,
  level integer,
  subscription_type text,
  rank bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.display_name,
    p.xp,
    p.level,
    p.subscription_type,
    ROW_NUMBER() OVER (ORDER BY p.xp DESC) AS rank
  FROM public.profiles p
  WHERE p.leaderboard_visible = true
    AND p.display_name IS NOT NULL
    AND p.display_name != ''
  ORDER BY p.xp DESC
  LIMIT p_limit;
$$;