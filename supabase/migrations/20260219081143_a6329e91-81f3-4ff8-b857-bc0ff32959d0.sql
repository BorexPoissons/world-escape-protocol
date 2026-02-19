
-- Add operation fields to countries table
ALTER TABLE public.countries
  ADD COLUMN IF NOT EXISTS operation_number integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS operation_name text NOT NULL DEFAULT 'Signal Initial',
  ADD COLUMN IF NOT EXISTS is_strategic_final boolean NOT NULL DEFAULT false;

-- Operation 0 — SIGNAL INITIAL (season 0, free)
UPDATE public.countries
SET operation_number = 0, operation_name = 'SIGNAL INITIAL'
WHERE season_number = 0;

-- Operation I — PROTOCOLE OMÉGA (season 1)
UPDATE public.countries
SET operation_number = 1, operation_name = 'PROTOCOLE OMÉGA'
WHERE season_number = 1;

-- Operation II — RÉSEAU ATLAS (season 2)
UPDATE public.countries
SET operation_number = 2, operation_name = 'RÉSEAU ATLAS'
WHERE season_number = 2;

-- Operation III — DOMINION SHADOW (season 3)
UPDATE public.countries
SET operation_number = 3, operation_name = 'DOMINION SHADOW'
WHERE season_number = 3;

-- Operation IV — CONVERGENCE 195 (season 4)
UPDATE public.countries
SET operation_number = 4, operation_name = 'CONVERGENCE 195'
WHERE season_number = 4;

-- Mark countries 191–195 (release_order 191–195) as strategic finals
UPDATE public.countries
SET is_strategic_final = true
WHERE release_order >= 191 AND release_order <= 195;
