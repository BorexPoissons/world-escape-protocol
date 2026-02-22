
# Audit complet : occurrences "free" / "gratuit"

## Inventaire exhaustif

### Textes visibles par les joueurs (UI)

| Fichier | Ligne | Texte actuel | Contexte |
|---|---|---|---|
| `Dashboard.tsx` | 103 | `"OP-00 · ACCÈS GRATUIT"` | Codename de la saison 0 |
| `Dashboard.tsx` | 796 | `"ESSAI GRATUIT COMPLÉTÉ"` | CTA après completion des 5 pays |
| `Seasons.tsx` | 455 | `"5 pays gratuits inclus pour tous les agents"` | Mention en bas de la page saisons |
| `Season1Unlock.tsx` | 208 | `"CONTINUER EN MODE GRATUIT"` | Bouton de refus d'achat |
| `MissionComplete.tsx` | 460 | `"Phase gratuite"` | Fallback texte next mission |
| `Puzzle.tsx` | 842 | `"ESSAI GRATUIT COMPLÉTÉ"` | Overlay post-puzzle |
| `Puzzle.tsx` | 882 | `"GRATUIT (5)"` | Legende couleur dans la carte |
| `UpgradeModal.tsx` | 224 | `"CONTINUER EN MODE GRATUIT"` | Bouton refus upgrade |
| `CountryCard.tsx` | 10-12 | `"gratuits officiels"`, `"SAISON 0 — GRATUIT"` | Commentaires + logique badge |
| `CinematicWorldMap.tsx` | 424-428 | Badge visuel "FREE" sur les noeuds S0 | Carte mondiale |
| `CentralDilemma.tsx` | 218 | `"FREE-SET-001"` | Label code dans le dilemme |

### Textes dans l'admin (visibles uniquement par l'admin)

| Fichier | Ligne | Texte actuel |
|---|---|---|
| `Admin.tsx` | 50 | `"FREE"` (label saison 0) |
| `Admin.tsx` | 65 | `"FREE"` (subscription type label) |
| `Admin.tsx` | 657 | `"gratuit(s)"` (KPI agents) |
| `Admin.tsx` | 1245 | `"gratuit(s)"` (onglet ventes) |
| `Admin.tsx` | 1419-1420 | `"jeu gratuit (S0)"` (reset options) |

### Logique interne (code, pas d'affichage direct)

| Fichier | Detail |
|---|---|
| `Dashboard.tsx` | Type `"free"` dans le Tier union, `getTier()` retourne `"free"` |
| `CountryCard.tsx` | Variable `isFree`, routing vers `/free-mission/` |
| `CinematicWorldMap.tsx` | `FREE_COUNTRY_CODES` Set, variable `isFree` pour styling |
| `Admin.tsx` | `freeUsers` / `paidUsers` filter, `is_free` dans import JSON |
| `FreeMission.tsx` | Composant entier + config `FREE_MISSION_CONFIG` |
| `App.tsx` | Route `/free-mission/:countryId` |
| Base de donnees | Colonne `is_free` dans `countries_missions` |

### Fichiers JSON statiques (public/content/countries/)

| Fichier | Champs |
|---|---|
| US.json | `mission_id: "US-S1-FREE-002"`, `format: "IMMERSIVE_FREE"`, `is_free: true`, `total_free: 5`, `FRAG-US-FREE-002` |
| CN.json | `mission_id: "CN-S1-FREE-003"`, memes champs |
| BR.json | `mission_id: "BR-S1-FREE-004"`, memes champs |
| IN.json | `mission_id: "IN-S1-FREE-005"`, memes champs |
| CH.json | `is_free: true` |

---

## Plan de remplacement propose

Remplacer la terminologie "free/gratuit" par le vocabulaire narratif du jeu : **"SIGNAL INITIAL"** (nom canon de la saison 0).

### 1. Textes joueurs -- Renommer

| Avant | Apres |
|---|---|
| `"OP-00 · ACCÈS GRATUIT"` | `"OP-00 · SIGNAL INITIAL"` |
| `"ESSAI GRATUIT COMPLÉTÉ"` | `"SIGNAL INITIAL COMPLÉTÉ"` |
| `"5 pays gratuits inclus..."` | `"SIGNAL INITIAL — 5 pays inclus pour tous les agents"` |
| `"CONTINUER EN MODE GRATUIT"` | `"CONTINUER L'OBSERVATION"` |
| `"Phase gratuite"` | `"Signal Initial"` |
| `"GRATUIT (5)"` (legende) | `"SIGNAL INITIAL (5)"` |
| Badge `"FREE"` sur la carte | Supprimer ou remplacer par `"S0"` |
| `"FREE-SET-001"` | `"SIGNAL-001"` |

### 2. Textes admin -- Renommer

| Avant | Apres |
|---|---|
| `"FREE"` (saison 0 label) | `"SIGNAL INITIAL"` ou `"S0"` |
| `"FREE"` (subscription) | `"S0"` |
| `"gratuit(s)"` (KPI) | `"S0"` |
| `"jeu gratuit (S0)"` | `"Signal Initial (S0)"` |

### 3. Code interne -- Conserver tel quel

Les variables internes (`isFree`, `is_free`, `FREE_MISSION_CONFIG`, `FreeMission`, `/free-mission/`, `freeUsers`) et la colonne DB `is_free` restent inchangees. Ce sont des identifiants techniques sans impact utilisateur.

### 4. JSON statiques -- Conserver tel quel

Les fichiers `public/content/countries/*.json` contiennent des identifiants techniques (`IMMERSIVE_FREE`, `is_free`, `FRAG-XX-FREE-XXX`) qui ne sont pas affiches aux joueurs. Pas de changement necessaire.

---

## Fichiers a modifier

1. `src/pages/Dashboard.tsx` -- 2 textes
2. `src/pages/Seasons.tsx` -- 1 texte
3. `src/pages/Season1Unlock.tsx` -- 1 texte
4. `src/pages/MissionComplete.tsx` -- 1 texte
5. `src/pages/Puzzle.tsx` -- 2 textes
6. `src/pages/Admin.tsx` -- 5 textes
7. `src/components/UpgradeModal.tsx` -- 1 texte
8. `src/components/CountryCard.tsx` -- 1 commentaire + potentiellement badge
9. `src/components/CinematicWorldMap.tsx` -- 1 badge visuel
10. `src/pages/CentralDilemma.tsx` -- 1 label

**Total : ~16 remplacements de texte dans 10 fichiers. Aucune modification de logique.**
