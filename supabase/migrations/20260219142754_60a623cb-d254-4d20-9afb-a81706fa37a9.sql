-- Add central dilemma state fields to user_story_state
ALTER TABLE public.user_story_state
  ADD COLUMN IF NOT EXISTS central_dilemma_unlocked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS central_word_validated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS central_word_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS central_calcul_step integer NOT NULL DEFAULT 0;
