
-- Create user_fragments table to store collectible puzzle fragments
CREATE TABLE IF NOT EXISTS public.user_fragments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  country_id UUID NOT NULL REFERENCES public.countries(id),
  fragment_index INTEGER NOT NULL DEFAULT 0,
  is_placed BOOLEAN NOT NULL DEFAULT false,
  placed_at TIMESTAMP WITH TIME ZONE,
  obtained_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_fragments ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own fragments"
  ON public.user_fragments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own fragments"
  ON public.user_fragments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own fragments"
  ON public.user_fragments FOR UPDATE
  USING (auth.uid() = user_id);

-- Enable realtime for fragments
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_fragments;
