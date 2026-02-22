# WORLD ESCAPE PROTOCOL — PLAN DE REFONTE 48 PAYS

## Vision canonique
- **48 pays** répartis en **4 saisons de 12**
- S1: CH→GR→IN→MA→IT→JP→MX→PE→TR→ET→KH→DE
- S2: US→CA→BR→AR→ES→PT→GB→NL→SE→PL→RO→IL
- S3: CN→KR→SG→AU→NZ→ZA→EG→AE→TH→VN→ID→CL
- S4: NO→FI→CZ→HU→QA→SA→KZ→MN→PH→MY→BE→FR
- **France = pays 48** (dernier jouable)
- **Suisse = coffre final** (hors index, `is_strategic_final=true`)
- Fragments V-01 à V-12 → Clé "WATCHER — ACCESS LEVEL 1"
- Mini-jeu final π (314159)

## Phase 0 — PWA fix ✅
## Phase 1 — DB Cleanup & Schema ✅
- [x] 48 pays verrouillés, 147 supprimés
- [x] Season numbers + release_order recalés
- [x] `bonus_seconds_banked`, `lives_banked` ajoutés aux profils
- [x] RPC `complete_country_attempt` → gate CEIL(80%) + champ `passed_gate`

## Phase 2 — Season 1 Content Injection ✅
- [x] 12 JSON canoniques S1 injectés (84 questions total)
- [x] Intros Jasper, scénarios, 7 Q/R par pays
- [x] Slots images vides modifiables via admin
- [x] Chaîne next_country complète
- [x] DB nettoyée (anciennes missions hors scope supprimées)

## Phase 3 — Mission Engine Refonte ✅
- [x] Nouveau composant `SeasonMission.tsx` (route `/season-mission/:countryCode`)
- [x] 120s timer par pays, 3 vies, 7 questions séquentielles
- [x] Bonus seconds accumulées + bouton échange 60s → +1 vie
- [x] Gate 6/7 : "ACCÈS AUTORISÉ" / "ACCÈS REFUSÉ"
- [x] Support MCQ + text_input (Q7 continuité)
- [x] Rescue offer si bonus dispo à la mort
- [x] Sauvegarde : RPC + token + XP + fragment + lives_banked

## Phase 4 — Prison Break Mini-game ✅
- [x] 5 templates rotatifs (code 4 chiffres, suite math, grille 3×3, anagramme, horloge)
- [x] Route `/prison-break/:countryCode`
- [x] Succès → retour mission, Échec → nouveau template aléatoire

## Phase 5 — Season End: Key Assembly + π ✅
- [x] Assemblage V-01..V-12 → "CLÉ DU VEILLEUR"
- [x] Mini-jeu π : saisir 314159
- [x] Route `/season1-complete`, redirection auto depuis dernière mission S1

## Phase 6 — Map/Puzzle/UI 48 pays ✅
- [x] SeasonMapNavigator : 12 pays/saison, labels corrigés
- [x] IntroScreen : nouveau texte Jasper canonique (48 pays, 4 saisons, 4 clés)
- [x] MissionComplete.tsx : total 48 pays
- [x] Puzzle.tsx : TOTAL_COUNTRIES_IN_WORLD = 48
- [x] Seasons.tsx : descriptions 12 pays/saison, bundle 48 pays
- [x] Season1Unlock.tsx : 12 pays

## Phase 7 — Stripe/Admin alignment ✅
- [x] Admin overview : 4 saisons × 12 pays (S1/S2/S3/S4) au lieu de FREE/AGENT/DIRECTOR
- [x] Admin pays : groupement par saison avec badge couleur et compteur /12
- [x] Admin gestion accès : 6 boutons (FREE, S1, S2, S3, S4, FULL_BUNDLE)
- [x] UpgradeModal : textes mis à jour (12 pays/saison, 48 total)
- [x] FLAG_EMOJI étendu aux 48 codes pays
- [x] getSubscriptionBadge aligné sur season_1..4 + full_bundle

## Phase 8 — Carry-over & Polish ✅
- [x] Vies S1 → bonus S2 (chaque vie = 60s bonus, reset lives_banked à 0)
- [x] Tests end-to-end : XP, level, gate, bonus exchange, carry-over, π validation (21 tests)
