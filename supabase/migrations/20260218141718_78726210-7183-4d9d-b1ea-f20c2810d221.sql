
-- Add visibility fields to countries table
ALTER TABLE public.countries 
  ADD COLUMN IF NOT EXISTS release_order integer NOT NULL DEFAULT 999,
  ADD COLUMN IF NOT EXISTS phase integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_secret boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS visibility_level integer NOT NULL DEFAULT 1;

-- Set release_order and visibility_level for existing countries (CH=1, JP=2, EG=3)
UPDATE public.countries SET release_order = 1, phase = 1, visibility_level = 1 WHERE code = 'CH';
UPDATE public.countries SET release_order = 2, phase = 1, visibility_level = 1 WHERE code = 'JP';
UPDATE public.countries SET release_order = 3, phase = 1, visibility_level = 1 WHERE code = 'EG';

-- Add subscription_type to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_type text NOT NULL DEFAULT 'free';

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_countries_release_order ON public.countries(release_order);
CREATE INDEX IF NOT EXISTS idx_countries_visibility_level ON public.countries(visibility_level);
