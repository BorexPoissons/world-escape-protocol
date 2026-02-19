
-- 1. Add season_number to countries table
ALTER TABLE public.countries ADD COLUMN IF NOT EXISTS season_number INTEGER NOT NULL DEFAULT 1;

-- 2. Update existing countries with correct season/free status based on release_order
-- Countries 1-5: Free (season 0 = gratuit)
-- Countries 6-43: Season 1
-- Countries 44-93: Season 2
-- Countries 94-143: Season 3
-- Countries 144-195: Season 4
UPDATE public.countries SET season_number = 0 WHERE release_order <= 5;
UPDATE public.countries SET season_number = 1 WHERE release_order > 5 AND release_order <= 43;
UPDATE public.countries SET season_number = 2 WHERE release_order > 43 AND release_order <= 93;
UPDATE public.countries SET season_number = 3 WHERE release_order > 93 AND release_order <= 143;
UPDATE public.countries SET season_number = 4 WHERE release_order > 143;

-- 3. Create questions table
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  country_id UUID NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  answer_options JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_answer TEXT NOT NULL,
  difficulty_level INTEGER NOT NULL DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 5),
  category TEXT NOT NULL DEFAULT 'culture',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on questions
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- Questions are publicly readable (needed for gameplay)
CREATE POLICY "Questions are publicly readable"
  ON public.questions FOR SELECT
  USING (true);

-- Only admins can manage questions
CREATE POLICY "Admins can insert questions"
  ON public.questions FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update questions"
  ON public.questions FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete questions"
  ON public.questions FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. Create user_progress table (separate from missions, tracks per-country attempts)
CREATE TABLE IF NOT EXISTS public.user_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  country_id UUID NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
  attempts INTEGER NOT NULL DEFAULT 0,
  best_score INTEGER NOT NULL DEFAULT 0,
  success BOOLEAN NOT NULL DEFAULT false,
  fragment_unlocked BOOLEAN NOT NULL DEFAULT false,
  last_attempt_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, country_id)
);

-- Enable RLS on user_progress
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress"
  ON public.user_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
  ON public.user_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON public.user_progress FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all progress"
  ON public.user_progress FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger to update updated_at
CREATE TRIGGER update_user_progress_updated_at
  BEFORE UPDATE ON public.user_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
