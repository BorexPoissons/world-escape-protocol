-- Recompact Season 1 release_order: remove gaps at 9-10
-- Current: BR=6, CN=7, IN=8, [gap], ES=11, GR=12, IT=13, MA=14, RU=15
-- Target:  BR=6, CN=7, IN=8, ES=9, GR=10, IT=11, MA=12, RU=13

UPDATE public.countries SET release_order = 9 WHERE code = 'ES';
UPDATE public.countries SET release_order = 10 WHERE code = 'GR';
UPDATE public.countries SET release_order = 11 WHERE code = 'IT';
UPDATE public.countries SET release_order = 12 WHERE code = 'MA';
UPDATE public.countries SET release_order = 13 WHERE code = 'RU';

-- Also shift any countries that were at 9-13 and aren't ES/GR/IT/MA/RU
-- (safety: there shouldn't be any, but just in case)
