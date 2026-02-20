
-- ==========================================
-- PURCHASES TABLE — Stripe receipt tracking
-- ==========================================
CREATE TABLE public.purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  stripe_session_id text UNIQUE NOT NULL,
  stripe_customer_id text,
  stripe_payment_intent_id text,
  tier text NOT NULL DEFAULT 'agent',
  amount integer NOT NULL,
  currency text NOT NULL DEFAULT 'chf',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own purchases"
  ON public.purchases FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all purchases"
  ON public.purchases FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_purchases_updated_at
  BEFORE UPDATE ON public.purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ==========================================
-- ADD season_1_unlocked TO profiles
-- ==========================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS season_1_unlocked boolean NOT NULL DEFAULT false;
