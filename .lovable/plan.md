# WORLD ESCAPE PROTOCOL — PLAN DE REFONTE 48 PAYS

## Status: Phase 0 ✅ (PWA fix) → Phase 1 next

## Vision canonique
- **48 pays** répartis en **4 saisons de 12**
- Saison 1 ordre : CH → GR → IN → MA → IT → JP → MX → PE → TR → ET → KH → DE
- Gameplay S1 : 120s timer, 3 vies, gate 6/7, Prison Break recovery
- Fragments V-01 à V-12 → Clé "WATCHER — ACCESS LEVEL 1"
- Mini-jeu final π (314159)

## Phase 1 — DB Cleanup & Schema
- [ ] Supprimer les pays hors scope des tables `countries` et `countries_missions`
- [ ] Ne garder que les 48 pays (S1: 12 définis, S2-S4: 36 placeholders)
- [ ] Mettre à jour `release_order`, `season_number`, `order_index`
- [ ] Adapter `complete_country_attempt` RPC pour 7 questions / gate 6/7
- [ ] Ajouter colonnes si nécessaire: `bonus_seconds_banked`, `lives_banked`

## Phase 2 — Season 1 Content Injection
- [ ] Injecter les 12 JSON canoniques S1 dans `countries_missions.content`
- [ ] Nouveaux pays : MX, PE, TR, ET, KH, DE
- [ ] Mettre à jour : CH, GR, IN, MA, IT, JP

## Phase 3 — Mission Engine Refonte
- [ ] Moteur S1 : 120s timer, 3 vies, 7 questions
- [ ] Bonus seconds + bouton échange 60s → +1 vie
- [ ] Gate 80% (6/7) + écran "Accès refusé"

## Phase 4 — Prison Break Mini-game
- [ ] 5 templates rotatifs
- [ ] Succès → pays suivant, Échec → nouveau template

## Phase 5 — Season End: Key Assembly + π
- [ ] Assemblage V-01..V-12 → "CLÉ DU VEILLEUR"
- [ ] Mini-jeu π : saisir 314159

## Phase 6 — Map/Puzzle/UI 48 pays
- [ ] Carte mondiale 48 pays
- [ ] IntroScreen : nouveau texte Jasper

## Phase 7 — Stripe/Admin alignment
- [ ] Tiers/entitlements 4 saisons × 12 pays

## Phase 8 — Carry-over & Polish
- [ ] Vies S1 → bonus S2
- [ ] Tests end-to-end
