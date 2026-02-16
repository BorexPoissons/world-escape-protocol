
-- Countries table (publicly readable)
CREATE TABLE public.countries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  monuments TEXT[] DEFAULT '{}',
  historical_events TEXT[] DEFAULT '{}',
  symbols TEXT[] DEFAULT '{}',
  difficulty_base INTEGER NOT NULL DEFAULT 1,
  description TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Countries are publicly readable" ON public.countries FOR SELECT USING (true);

-- User profiles
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT,
  level INTEGER NOT NULL DEFAULT 1,
  xp INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- User story state (narrative variables)
CREATE TABLE public.user_story_state (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  trust_level INTEGER NOT NULL DEFAULT 50,
  suspicion_level INTEGER NOT NULL DEFAULT 0,
  secrets_unlocked INTEGER NOT NULL DEFAULT 0,
  ending_path TEXT DEFAULT 'neutral',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_story_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own story state" ON public.user_story_state FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own story state" ON public.user_story_state FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own story state" ON public.user_story_state FOR UPDATE USING (auth.uid() = user_id);

-- Puzzle pieces
CREATE TABLE public.puzzle_pieces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  country_id UUID NOT NULL REFERENCES public.countries(id),
  piece_index INTEGER NOT NULL DEFAULT 0,
  unlocked BOOLEAN NOT NULL DEFAULT false,
  unlocked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.puzzle_pieces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own puzzle pieces" ON public.puzzle_pieces FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own puzzle pieces" ON public.puzzle_pieces FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own puzzle pieces" ON public.puzzle_pieces FOR UPDATE USING (auth.uid() = user_id);

-- Missions history
CREATE TABLE public.missions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  country_id UUID NOT NULL REFERENCES public.countries(id),
  mission_title TEXT NOT NULL,
  mission_data JSONB,
  completed BOOLEAN NOT NULL DEFAULT false,
  score INTEGER DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own missions" ON public.missions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own missions" ON public.missions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own missions" ON public.missions FOR UPDATE USING (auth.uid() = user_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_story_state_updated_at BEFORE UPDATE ON public.user_story_state FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed countries
INSERT INTO public.countries (name, code, monuments, historical_events, symbols, difficulty_base, description, latitude, longitude) VALUES
('Suisse', 'CH', ARRAY['Jet d''Eau', 'Chapelle du Pont', 'Château de Chillon'], ARRAY['Fondation de la Confédération 1291', 'Convention de Genève 1864', 'CERN fondé 1954'], ARRAY['Croix blanche', 'Edelweiss', 'Cor des Alpes'], 1, 'Pays des Alpes, des banques secrètes et des horloges mystérieuses.', 46.8182, 8.2275),
('Japon', 'JP', ARRAY['Mont Fuji', 'Temple Senso-ji', 'Château de Himeji'], ARRAY['Époque Edo 1603-1868', 'Restauration Meiji 1868', 'Hiroshima 1945'], ARRAY['Soleil levant', 'Sakura', 'Torii'], 2, 'Empire du soleil levant, terre de samouraïs et de technologies.', 36.2048, 138.2529),
('Égypte', 'EG', ARRAY['Pyramides de Gizeh', 'Sphinx', 'Temple de Karnak'], ARRAY['Construction des pyramides -2560', 'Règne de Cléopâtre -51', 'Découverte tombe Toutânkhamon 1922'], ARRAY['Œil d''Horus', 'Ankh', 'Scarabée'], 3, 'Terre des pharaons, des pyramides et des mystères millénaires.', 26.8206, 30.8025);
