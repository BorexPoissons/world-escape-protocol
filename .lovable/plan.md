
# Puzzle Pieces Uniques par Pays — Système W.E.P.

## Contexte & Analyse de l'existant

L'architecture actuelle utilise :
- **5 formes SVG génériques** (`PIECE_PATHS` dans `FragmentInventory.tsx`) assignées aléatoirement selon `fragmentIndex % 5`
- **Des couleurs par pays** (`COUNTRY_COLORS`) mais identiques quelle que soit la pièce
- **Aucun symbole central** gravé, ni gemme, ni mot-clé géopolitique

L'objectif est de créer un **système de pièces uniques par pays**, entièrement en SVG (pas d'images IA), avec une identité visuelle forte, scalable à 195 pays.

---

## Architecture de la Solution

### Principe fondamental

Chaque pièce W.E.P. partagera :
- Une **forme de base commune** (puzzle piece standard à 4 connecteurs)
- Une **profondeur 3D** via dégradés et ombres portées
- Un **contour gravé** or métallique

Et sera unique grâce à :
- Une **gemme centrale** (couleur + forme géométrique selon le pays)
- Un **symbole central gravé** (croix alpine, étoile, dragon géométrique…)
- Un **mot-clé microscopique** gravé en bas de la pièce (ex: "NEUTRALITY")
- Un **micro-motif de fond** (hachuré, triangulaire, rayé selon la région)

---

## Données par Pays — Définition statique

Un dictionnaire TypeScript `PIECE_DNA` sera créé dans un fichier `src/lib/pieceDNA.ts` :

```typescript
interface PieceDNA {
  gemColor: string;        // couleur HSL de la gemme
  gemShape: "diamond" | "hexagon" | "circle" | "star" | "octagon";
  symbolPath: string;      // SVG path du symbole central gravé
  keyword: string;         // mot gravé (max 12 chars)
  patternType: "grid" | "diagonal" | "dots" | "waves" | "triangles";
  accentColor: string;     // couleur secondaire (reflet de la gemme sur le métal)
  continentBase: string;   // couleur de base du métal selon continent
}
```

Exemples concrets :

| Pays | Gemme | Symbole | Mot-clé | Motif |
|------|-------|---------|---------|-------|
| CH (Suisse) | Bleu glacier `hsl(200 80% 65%)` | Croix alpine stylisée | NEUTRALITY | Grille suisse |
| US | Bleu-rouge `hsl(220 70% 55%)` | Étoile à 5 branches | REGULATION | Rayures |
| CN | Rouge profond `hsl(0 75% 50%)` | Dragon géométrique | INFLUENCE | Vague |
| BR | Vert émeraude `hsl(140 65% 45%)` | Croix du Sud (5 étoiles) | CHAOS | Triangles |
| EG | Or ambre `hsl(45 85% 55%)` | Pyramide / œil | ANCIENNETÉ | Points |
| JP | Rouge laqué `hsl(355 80% 50%)` | Soleil levant | TRADITION | Vague |
| IN | Orange safran `hsl(30 85% 55%)` | Roue Ashoka | DHARMA | Triangles |
| RU | Bleu impérial `hsl(215 65% 50%)` | Aigle bicéphale simplifié | EMPIRE | Grille |
| FR | Bleu roi `hsl(225 75% 55%)` | Fleur de lys | DIPLOMATIE | Diagonal |
| MA | Vert émeraude `hsl(155 55% 40%)` | Étoile à 6 branches | CARREFOUR | Points |
| GR | Bleu méditerranéen `hsl(205 70% 55%)` | Colonne grecque | DÉMOCRATIE | Vague |
| IT | Rouge terracotta `hsl(15 65% 50%)` | Louve stylisée | CULTURE | Diagonal |
| ES | Rouge-or `hsl(25 75% 50%)` | Soleil de Castille | CONQUÊTE | Rayures |

---

## Composant SVG Pièce W.E.P.

### Nouveau `WEPPuzzlePiece` — Structure SVG

La pièce sera rendue dans un `viewBox="0 0 100 100"` pour faciliter le positionnement des éléments internes :

```text
┌──────────────────────────────────────┐
│                                      │
│   [Connecteur haut — tab/blank]      │
│                                      │
│ [C]  [MOTIF DE FOND GRAVÉ]  [C]     │
│ [O]                          [O]     │
│ [N]   ┌──────────────────┐  [N]     │
│ [N]   │   [GEMME] centrale│  [N]    │
│ [E]   │   [SYMBOLE SVG]  │  [E]    │
│ [C]   └──────────────────┘  [C]    │
│ [T]                          [T]    │
│ [E]  [MOT-CLÉ gravé]        [E]    │
│ [U]                          [U]    │
│ [R]  [Connecteur bas]       [R]    │
│                                      │
└──────────────────────────────────────┘
```

### Couches de rendu (ordre) :
1. **Ombre portée** (décalée de +4px en Y, noir translucide)
2. **Corps principal** — dégradé or métallique `continentBase`
3. **Micro-motif de fond** (SVG pattern, opacité 0.08)
4. **Cadre gravé intérieur** (rect arrondi, stroke or clair, opacité 0.3)
5. **Gemme centrale** — forme géométrique avec dégradé radial + reflet blanc
6. **Halo de gemme** (feGaussianBlur autour de la gemme)
7. **Symbole gravé** (SVG path centré, fill "none", stroke or clair)
8. **Mot-clé microscopique** (text SVG en bas, font-family monospace, fill or)
9. **Reflet supérieur** (linearGradient blanc→transparent sur la moitié haute)
10. **Contour** (stroke or + strokeWidth mince)

---

## Fichiers à Créer / Modifier

### 1. `src/lib/pieceDNA.ts` — NOUVEAU
Dictionnaire statique de toutes les identités visuelles des pièces. Commence avec les 15 pays actuels, extensible à 195.

### 2. `src/components/WEPPuzzlePiece.tsx` — NOUVEAU
Composant SVG pur qui reçoit `countryCode` + `size` + `animated` et rend la pièce unique. Remplace `FragmentPiece3D` dans `FragmentInventory.tsx`.

- Props : `countryCode: string`, `size?: number`, `animated?: boolean`, `showKeyword?: boolean`
- Export réutilisable dans `FragmentInventory`, `MissionComplete`, `MissionDetailModal`, `Puzzle`

### 3. `src/components/FragmentInventory.tsx` — MODIFIÉ
- Remplacer `FragmentPiece3D` par `WEPPuzzlePiece`
- Le modal de détail `FragmentDetailModal` affiche également la grande pièce unique

### 4. `src/pages/MissionComplete.tsx` — MODIFIÉ
- La pièce animée au centre (actuellement un SVG générique doré) devient la vraie pièce unique du pays
- Affichage de la gemme + symbole lors du déverrouillage

### 5. `src/components/MissionDetailModal.tsx` — MODIFIÉ
- Remplacer l'aperçu de pièce existant par `WEPPuzzlePiece`

---

## Technique — Détails SVG Critiques

### Forme puzzle (connecteurs)

La forme de base utilise 4 connecteurs via des arcs de Bézier cubiques :
- Tab (saille) : convexe vers l'extérieur
- Blank (creux) : concave vers l'intérieur

La **géométrie des connecteurs reste identique pour tous les pays** (same viewBox, same path skeleton). Seuls les éléments internes changent.

### Gemmes — 3 formes de base
- **Diamond** : polygone 4 points, dégradé radial `gemColor → dark`
- **Hexagon** : polygone 6 points réguliers
- **Circle** : `<circle>` avec dégradé radial + reflet blanc en haut à gauche

### Patterns SVG (micro-texture de fond)
Utilisation de `<pattern>` SVG défini dans `<defs>` pour chaque type (grid, diagonal, dots, waves, triangles), avec une opacité de 6-10% pour rester subtil sur le métal.

### Animations Framer Motion
- **Inventaire** : `rotateY` oscillation lente (±12°), halo de gemme en pulse
- **MissionComplete** : drop animation depuis le haut + rotation progressive, puis stabilisation
- **Modal détail** : rotation lente continue (360° en 12s)

---

## Scalabilité vers 195 pays

Le système `pieceDNA.ts` est conçu pour :
1. Un `DEFAULT` fallback pour les pays sans DNA défini (utilise continent + couleur calculée)
2. Un utilitaire `getDefaultDNA(countryCode)` qui génère un DNA déterministe à partir du hash du code pays (gemme aléatoire mais stable, motif, couleur)
3. En saison 2+, il suffira d'ajouter l'entrée dans le dictionnaire

---

## Résultat Visuel Final

- **Inventaire** : Chaque pièce est immédiatement reconnaissable (gemme bleue = Suisse, verte = Brésil, rouge = Chine…)
- **MissionComplete** : La pièce unique du pays tombe et s'accroche avec son symbole spécifique visible
- **Modal détail** : La pièce tourne lentement, gemme scintillante, symbole gravé visible
- **Puzzle mondial** : 195 pièces distinctes forment la mosaïque finale W.E.P.

Aucune dépendance externe supplémentaire — tout en SVG pur + Framer Motion (déjà installé).
