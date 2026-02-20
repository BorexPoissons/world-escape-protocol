

# Intro Cinématique "Première Visite" sur la Carte Puzzle

## Concept

Lors de la toute premiere visite du joueur sur la page `/puzzle`, une sequence cinematique se declenche :

1. **Phase 1 (0-10s)** -- La carte s'affiche entierement illuminee : tous les 195 pays sont visibles, brillants, avec une luminosite et saturation maximales. Les connexions dorees scintillent. Le joueur decouvre l'ampleur du monde.

2. **Phase 2 (10s)** -- Fondu progressif : les pays s'eteignent un par un (ou en vague), la carte retrouve son etat sombre normal.

3. **Phase 3 (apres le fondu)** -- Un overlay cinematique avec la photo de Jasper Valcourt apparait avec un message style typewriter : *"Agent... Voici l'etendue du Protocole. 195 pays. 195 fragments. L'aventure commence maintenant."* + bouton "COMMENCER L'ENQUETE".

4. **Apres validation** -- La carte revient a son etat normal (seuls les pays debloques sont actifs). Le flag `localStorage` empeche la sequence de se rejouer.

## Details Techniques

### Stockage "premiere visite"
- Cle localStorage : `wep_puzzle_first_visit_done`
- Verifiee au mount de `Puzzle.tsx`
- Mise a `true` quand le joueur ferme l'overlay Jasper

### Modifications dans `Puzzle.tsx`
- Ajouter un state `showFirstVisitIntro` (true si localStorage vide)
- Pendant la phase 1 : passer `forceFullReveal={true}` a `CinematicWorldMap` pour illuminer toute la carte
- Apres 10 secondes : transition vers phase 2 (fondu des pays, `forceFullReveal` repasse a false)
- Phase 3 : afficher un overlay plein ecran avec portrait Jasper + texte typewriter + CTA

### Modifications dans `CinematicWorldMap.tsx`
- Ajouter une prop `introPhase?: "full_reveal" | "fading" | "normal"` pour controler visuellement les 3 etats
- En mode `full_reveal` : tous les noeuds (y compris les locked) s'affichent en mode lumineux (bordure doree, drapeaux visibles, opacite pleine)
- En mode `fading` : animation de disparition progressive (scale down + opacity 0 avec stagger)

### Nouveau composant `PuzzleFirstVisitOverlay.tsx`
- Overlay glass/dark plein ecran avec :
  - Portrait de Jasper (`jasper-signal.png`)
  - Texte avec composant `TypewriterText` existant
  - Bouton "COMMENCER L'ENQUETE" en jaune
  - Badge "TRANSMISSION INITIALE"
- Animation d'entree avec `framer-motion`

### Sequence temporelle

```text
t=0s     Carte illuminee (tous pays visibles, brillants)
t=10s    Debut du fondu (pays s'eteignent progressivement)
t=12s    Carte sombre, overlay Jasper apparait
t=...    Joueur clique "COMMENCER" -> etat normal, localStorage flag
```

### Fichiers concernes
- `src/pages/Puzzle.tsx` -- logique de la sequence + integration overlay
- `src/components/CinematicWorldMap.tsx` -- prop `introPhase` pour les 3 etats visuels
- `src/components/PuzzleFirstVisitOverlay.tsx` -- nouveau composant overlay Jasper
- Reutilisation de `src/components/TypewriterText.tsx` (existant)
- Reutilisation de `src/assets/jasper-signal.png` (existant)
