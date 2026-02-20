
-- Create the master countries_missions table
CREATE TABLE public.countries_missions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  country text NOT NULL,
  season integer NOT NULL DEFAULT 0,
  difficulty integer NOT NULL DEFAULT 1,
  is_free boolean NOT NULL DEFAULT false,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.countries_missions ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "countries_missions_public_read" ON public.countries_missions
  FOR SELECT USING (true);

-- Admin write access
CREATE POLICY "countries_missions_admin_insert" ON public.countries_missions
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "countries_missions_admin_update" ON public.countries_missions
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "countries_missions_admin_delete" ON public.countries_missions
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Auto-update timestamp
CREATE TRIGGER update_countries_missions_updated_at
  BEFORE UPDATE ON public.countries_missions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
