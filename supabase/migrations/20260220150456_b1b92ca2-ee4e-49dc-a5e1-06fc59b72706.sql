
-- Entitlements table: server-side access control
CREATE TABLE public.entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  entitlement_key text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  source_purchase_id uuid REFERENCES public.purchases(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, entitlement_key)
);

ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own entitlements"
  ON public.entitlements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all entitlements"
  ON public.entitlements FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage entitlements"
  ON public.entitlements FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- No direct INSERT/UPDATE/DELETE for regular users — only via edge functions with service_role

-- Security logs table: anti-abuse tracking
CREATE TABLE public.security_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  user_id uuid,
  stripe_session_id text,
  stripe_customer_id text,
  ip_address text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view security logs"
  ON public.security_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- No user access to security logs at all

-- Trigger for updated_at on entitlements
CREATE TRIGGER update_entitlements_updated_at
  BEFORE UPDATE ON public.entitlements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
