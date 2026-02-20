
-- Function to check if a display_name is forbidden
CREATE OR REPLACE FUNCTION public.check_display_name_allowed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_normalized text;
  v_no_spaces text;
  forbidden text[] := ARRAY[
    'admin','administrator','administrateur','administrador','amministratore',
    'verwaltung','moderator','moderateur','root','superuser','system',
    'sysadmin','support','helpdesk',
    'wep','worldexplorerprotocol','jasper','valcourt','protocole',
    'owner','creator','fondateur','founder','staff','team','official','officiel'
  ];
  f text;
BEGIN
  IF NEW.display_name IS NULL OR NEW.display_name = '' THEN
    RETURN NEW;
  END IF;

  -- Normalize: lowercase, strip accents, remove non-alphanumeric except spaces
  v_normalized := lower(unaccent(NEW.display_name));
  v_normalized := regexp_replace(v_normalized, '[^a-z0-9 ]', '', 'g');
  v_normalized := regexp_replace(v_normalized, '\s+', ' ', 'g');
  v_normalized := trim(v_normalized);
  v_no_spaces := replace(v_normalized, ' ', '');

  FOREACH f IN ARRAY forbidden LOOP
    IF v_normalized = f OR v_no_spaces = f
       OR v_normalized LIKE '%' || f || '%'
       OR v_no_spaces LIKE '%' || f || '%' THEN
      RAISE EXCEPTION 'Ce nom de code est réservé. Choisissez un autre identifiant.'
        USING ERRCODE = 'P0001';
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Make sure unaccent extension is available
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Create the trigger
DROP TRIGGER IF EXISTS trg_check_display_name ON public.profiles;
CREATE TRIGGER trg_check_display_name
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_display_name_allowed();
