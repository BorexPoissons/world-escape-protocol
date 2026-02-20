
CREATE OR REPLACE FUNCTION public.check_display_name_available(p_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_normalized text;
BEGIN
  IF p_name IS NULL OR trim(p_name) = '' THEN
    RETURN false;
  END IF;

  v_normalized := lower(trim(unaccent(p_name)));

  RETURN NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE lower(trim(unaccent(COALESCE(display_name, '')))) = v_normalized
  );
END;
$$;
