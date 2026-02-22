
-- Lock the canonical 48-country order + final vault

-- SEASON 2 — FEDERAL SHADOW (13-24)
UPDATE public.countries SET season_number = 2, release_order = 13, operation_name = 'FEDERAL SHADOW', phase = 2 WHERE code = 'US';
UPDATE public.countries SET season_number = 2, release_order = 14, operation_name = 'FEDERAL SHADOW', phase = 2 WHERE code = 'CA';
UPDATE public.countries SET season_number = 2, release_order = 15, operation_name = 'FEDERAL SHADOW', phase = 2 WHERE code = 'BR';
UPDATE public.countries SET season_number = 2, release_order = 16, operation_name = 'FEDERAL SHADOW', phase = 2 WHERE code = 'AR';
UPDATE public.countries SET season_number = 2, release_order = 17, operation_name = 'FEDERAL SHADOW', phase = 2 WHERE code = 'ES';
UPDATE public.countries SET season_number = 2, release_order = 18, operation_name = 'FEDERAL SHADOW', phase = 2 WHERE code = 'PT';
UPDATE public.countries SET season_number = 2, release_order = 19, operation_name = 'FEDERAL SHADOW', phase = 2 WHERE code = 'GB';
UPDATE public.countries SET season_number = 2, release_order = 20, operation_name = 'FEDERAL SHADOW', phase = 2 WHERE code = 'NL';
UPDATE public.countries SET season_number = 2, release_order = 21, operation_name = 'FEDERAL SHADOW', phase = 2 WHERE code = 'SE';
UPDATE public.countries SET season_number = 2, release_order = 22, operation_name = 'FEDERAL SHADOW', phase = 2 WHERE code = 'PL';
UPDATE public.countries SET season_number = 2, release_order = 23, operation_name = 'FEDERAL SHADOW', phase = 2 WHERE code = 'RO';
UPDATE public.countries SET season_number = 2, release_order = 24, operation_name = 'FEDERAL SHADOW', phase = 2 WHERE code = 'IL';

-- SEASON 3 — LA FAILLE (25-36)
UPDATE public.countries SET season_number = 3, release_order = 25, operation_name = 'LA FAILLE', phase = 3 WHERE code = 'CN';
UPDATE public.countries SET season_number = 3, release_order = 26, operation_name = 'LA FAILLE', phase = 3 WHERE code = 'KR';
UPDATE public.countries SET season_number = 3, release_order = 27, operation_name = 'LA FAILLE', phase = 3 WHERE code = 'SG';
UPDATE public.countries SET season_number = 3, release_order = 28, operation_name = 'LA FAILLE', phase = 3 WHERE code = 'AU';
UPDATE public.countries SET season_number = 3, release_order = 29, operation_name = 'LA FAILLE', phase = 3 WHERE code = 'NZ';
UPDATE public.countries SET season_number = 3, release_order = 30, operation_name = 'LA FAILLE', phase = 3 WHERE code = 'ZA';
UPDATE public.countries SET season_number = 3, release_order = 31, operation_name = 'LA FAILLE', phase = 3 WHERE code = 'EG';
UPDATE public.countries SET season_number = 3, release_order = 32, operation_name = 'LA FAILLE', phase = 3 WHERE code = 'AE';
UPDATE public.countries SET season_number = 3, release_order = 33, operation_name = 'LA FAILLE', phase = 3 WHERE code = 'TH';
UPDATE public.countries SET season_number = 3, release_order = 34, operation_name = 'LA FAILLE', phase = 3 WHERE code = 'VN';
UPDATE public.countries SET season_number = 3, release_order = 35, operation_name = 'LA FAILLE', phase = 3 WHERE code = 'ID';
UPDATE public.countries SET season_number = 3, release_order = 36, operation_name = 'LA FAILLE', phase = 3 WHERE code = 'CL';

-- SEASON 4 — LE PROTOCOLE FINAL (37-48)
UPDATE public.countries SET season_number = 4, release_order = 37, operation_name = 'LE PROTOCOLE FINAL', phase = 4 WHERE code = 'NO';
UPDATE public.countries SET season_number = 4, release_order = 38, operation_name = 'LE PROTOCOLE FINAL', phase = 4 WHERE code = 'FI';
UPDATE public.countries SET season_number = 4, release_order = 39, operation_name = 'LE PROTOCOLE FINAL', phase = 4 WHERE code = 'CZ';
UPDATE public.countries SET season_number = 4, release_order = 40, operation_name = 'LE PROTOCOLE FINAL', phase = 4 WHERE code = 'HU';
UPDATE public.countries SET season_number = 4, release_order = 41, operation_name = 'LE PROTOCOLE FINAL', phase = 4 WHERE code = 'QA';
UPDATE public.countries SET season_number = 4, release_order = 42, operation_name = 'LE PROTOCOLE FINAL', phase = 4 WHERE code = 'SA';
UPDATE public.countries SET season_number = 4, release_order = 43, operation_name = 'LE PROTOCOLE FINAL', phase = 4 WHERE code = 'KZ';
UPDATE public.countries SET season_number = 4, release_order = 44, operation_name = 'LE PROTOCOLE FINAL', phase = 4 WHERE code = 'MN';
UPDATE public.countries SET season_number = 4, release_order = 45, operation_name = 'LE PROTOCOLE FINAL', phase = 4 WHERE code = 'PH';
UPDATE public.countries SET season_number = 4, release_order = 46, operation_name = 'LE PROTOCOLE FINAL', phase = 4 WHERE code = 'MY';
UPDATE public.countries SET season_number = 4, release_order = 47, operation_name = 'LE PROTOCOLE FINAL', phase = 4 WHERE code = 'BE';
UPDATE public.countries SET season_number = 4, release_order = 48, operation_name = 'LE PROTOCOLE FINAL', phase = 4 WHERE code = 'FR';

-- Mark CH as strategic final (vault scene, outside 48 index)
UPDATE public.countries SET is_strategic_final = true WHERE code = 'CH';

-- Delete all countries NOT in the canonical 48 + vault CH
DELETE FROM public.countries WHERE code NOT IN (
  'CH','GR','IN','MA','IT','JP','MX','PE','TR','ET','KH','DE',
  'US','CA','BR','AR','ES','PT','GB','NL','SE','PL','RO','IL',
  'CN','KR','SG','AU','NZ','ZA','EG','AE','TH','VN','ID','CL',
  'NO','FI','CZ','HU','QA','SA','KZ','MN','PH','MY','BE','FR'
);
