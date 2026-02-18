
-- Create badges table
CREATE TABLE public.badges (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL DEFAULT '🏅',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create user_badges table
CREATE TABLE public.user_badges (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  badge_key text NOT NULL REFERENCES public.badges(key) ON DELETE CASCADE,
  awarded_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_key)
);

-- Enable RLS
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- Badges are publicly readable
CREATE POLICY "Badges are publicly readable"
ON public.badges FOR SELECT USING (true);

-- user_badges: users can view own
CREATE POLICY "Users can view own badges"
ON public.user_badges FOR SELECT USING (auth.uid() = user_id);

-- user_badges: users can insert own
CREATE POLICY "Users can insert own badges"
ON public.user_badges FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can view all user_badges
CREATE POLICY "Admins can view all user_badges"
ON public.user_badges FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Add streak column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS streak integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS longest_streak integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_mission_at timestamp with time zone;

-- Seed badges
INSERT INTO public.badges (key, name, description, icon) VALUES
  ('first_mission', 'Premier Contact', 'Complétez votre première mission', '🎯'),
  ('perfect_run', 'Course Parfaite', 'Obtenez 4/4 à une mission sans erreur', '⭐'),
  ('no_hints', 'Esprit Pur', 'Complétez une mission sans utiliser d''indice', '🧠'),
  ('speed_runner', 'Éclair', 'Complétez une mission en moins de 90 secondes', '⚡'),
  ('streak_5', 'Sur la Lancée', '5 missions consécutives sans échec', '🔥'),
  ('truth_seeker', 'Détecteur de Mensonges', 'Ignorez le faux indice et réussissez quand même', '🔍'),
  ('high_trust', 'Agent de Confiance', 'Atteignez un niveau de confiance de 80+', '🤝'),
  ('most_wanted', 'Ennemi Public', 'Atteignez un niveau de suspicion de 80+', '⚠️'),
  ('world_10', 'Globe-Trotter', 'Complétez 10 pays différents', '🌍'),
  ('xp_1000', 'Expert Terrain', 'Atteignez 1000 XP', '💎')
ON CONFLICT (key) DO NOTHING;
