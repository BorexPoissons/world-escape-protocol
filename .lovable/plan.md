

# Remplacement de "195" par "48" — Audit et plan

## Occurrences trouvees

### Textes visibles par les joueurs (UI)

| Fichier | Ligne | Texte actuel | Remplacement |
|---|---|---|---|
| `PuzzleFirstVisitOverlay.tsx` | 83 | `"195 pays. 195 fragments."` | `"48 pays. 48 fragments."` |
| `Landing.tsx` | 63 | `"195 pays"` | `"48 pays"` |
| `Puzzle.tsx` | 870 | `"50 PAYS · MISSIONS NARRATIVES..."` | `"12 PAYS · MISSIONS NARRATIVES..."` |

### Constantes internes (affectent les calculs de progression)

| Fichier | Ligne | Valeur actuelle | Remplacement |
|---|---|---|---|
| `Dashboard.tsx` | 87 | `TOTAL_COUNTRIES = 195` | `TOTAL_COUNTRIES = 48` |
| `Dashboard.tsx` | 338 | Commentaire `"out of 195 total"` | `"out of 48 total"` |
| `Leaderboard.tsx` | 25 | `TOTAL_COUNTRIES = 195` | `TOTAL_COUNTRIES = 48` |
| `Leaderboard.tsx` | 28 | Commentaire `"completedCountries/195*100"` | `"completedCountries/48*100"` |

### Saison metadata (compteurs de pays incorrects)

| Fichier | Ligne | Texte actuel | Remplacement |
|---|---|---|---|
| `Dashboard.tsx` | 113 | `"45 pays · L'interférence commence"` | `"12 pays · L'interférence commence"` |
| `Dashboard.tsx` | 124 | `"50 pays · L'origine du Protocole"` | `"12 pays · L'origine du Protocole"` |
| `Dashboard.tsx` | 135 | `"50 pays · La réalité se déstabilise"` | `"12 pays · La réalité se déstabilise"` |
| `Dashboard.tsx` | 146 | `"45 pays · Tout converge"` | `"12 pays · Tout converge"` |
| `CinematicWorldMap.tsx` | 76 | `"43 pays"` | `"12 pays"` |
| `CinematicWorldMap.tsx` | 77 | `"50 pays"` | `"12 pays"` |
| `CinematicWorldMap.tsx` | 78 | `"50 pays"` | `"12 pays"` |
| `CinematicWorldMap.tsx` | 79 | `"47 pays"` | `"12 pays"` |

### Nom de la Saison 4

| Fichier | Ligne | Texte actuel | Remplacement |
|---|---|---|---|
| `CinematicWorldMap.tsx` | 72 | `"CONVERGENCE 195"` | `"CONVERGENCE FINALE"` |
| `CinematicWorldMap.tsx` | 79 | `"CONVERGENCE 195"` | `"CONVERGENCE FINALE"` |

### Commentaires de code (pas d'impact utilisateur, mais a corriger)

| Fichier | Ligne | Texte actuel | Remplacement |
|---|---|---|---|
| `WEPPuzzlePiece.tsx` | 17 | `"all 195 pieces"` | `"all 48 pieces"` |
| `pieceDNA.ts` | 3 | `"all 195 pieces"` | `"all 48 pieces"` |

### Variable interne a renommer

| Fichier | Variable | Action |
|---|---|---|
| `Puzzle.tsx` | `globalProgressOn195` (lignes 391-656) | Renommer en `globalProgress` — variable interne utilisee ~15 fois |

---

## Fichiers a modifier

1. `src/pages/Dashboard.tsx` — constante + commentaire + 4 subtitles saisons (6 changements)
2. `src/pages/Leaderboard.tsx` — constante + commentaire (2 changements)
3. `src/pages/Puzzle.tsx` — renommer variable + texte "50 PAYS" (16+ changements)
4. `src/pages/Landing.tsx` — texte "195 pays" (1 changement)
5. `src/components/PuzzleFirstVisitOverlay.tsx` — texte "195 pays. 195 fragments" (1 changement)
6. `src/components/CinematicWorldMap.tsx` — "CONVERGENCE 195" + 4 tooltips saisons (6 changements)
7. `src/components/WEPPuzzlePiece.tsx` — commentaire (1 changement)
8. `src/lib/pieceDNA.ts` — commentaire (1 changement)

**Total : ~34 remplacements dans 8 fichiers. Aucune modification de logique, seulement des valeurs et textes.**

