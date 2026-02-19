
-- Ajouter les colonnes de position puzzle (responsive %)
ALTER TABLE public.countries 
ADD COLUMN IF NOT EXISTS puzzle_position_x FLOAT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS puzzle_position_y FLOAT DEFAULT NULL;
