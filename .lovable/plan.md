

# Responsive et Adaptatif -- Audit complet et corrections

## Problemes identifies

### 1. Conteneurs trop etroits — le site ne prend pas tout l'ecran
- **Dashboard** : `max-w-7xl` (1280px max) avec `px-4` — laisse beaucoup d'espace vide sur les grands ecrans
- **Mission** : `max-w-3xl` (768px max) — tres etroit meme sur un ecran 1080p
- **Puzzle** : `max-w-7xl` — meme probleme que Dashboard
- **Leaderboard, Auth, MissionComplete** : containers limites aussi

### 2. Elements masques sur mobile
- Agent info, niveau, serie, stats : `hidden sm:block` — invisibles sur mobile
- Boutons header : textes masques sur mobile, seules les icones restent
- Barre de stats du Dashboard (NIVEAU, SERIE, XP) : entierement cachee sur mobile

### 3. Toast "SIGNAL DETECTE"
- Taille fixe (px-12 py-7 + portrait 96px) — deborde sur ecrans < 400px
- Pas de classes responsive

### 4. Mission — layout rigide
- Grille `grid-cols-3` dans l'intro (Vies/Timer/Objectif) sans breakpoint mobile
- Timer bar et bonus pool bar : compactes mais certains textes tronques

### 5. Carte mondiale (CinematicWorldMap)
- Ratio fixe `16/9` — trop petit sur mobile portrait
- Noeuds de pays : taille fixe, pas de scaling responsive

### 6. FragmentInventory
- Drag-and-drop uniquement (souris) — pas de support tactile (tap-to-place)

---

## Plan de corrections

### Phase 1 — Containers et pleine largeur

**Fichiers** : `Dashboard.tsx`, `Puzzle.tsx`, `Mission.tsx`, `FreeMission.tsx`, `Leaderboard.tsx`, `MissionComplete.tsx`

- Remplacer `max-w-7xl` par `max-w-[1600px] xl:max-w-[1800px]` pour etendre le contenu sur grands ecrans
- Mission : passer de `max-w-3xl` a `max-w-4xl lg:max-w-5xl` pour mieux occuper l'espace
- Ajouter un padding adaptatif : `px-4 sm:px-6 lg:px-8`

### Phase 2 — Stats et infos mobiles

**Fichier** : `Dashboard.tsx`

- Rendre visible les stats agent (Niveau, Serie, XP) sur mobile via une barre compacte sous le header
- Remplacer les `hidden sm:block` par un layout responsive en ligne sur mobile (icones + valeurs compactes)

### Phase 3 — Toast "SIGNAL DETECTE" responsive

**Fichier** : `Puzzle.tsx`

- Ajouter des classes responsive au toast : `px-6 py-4 sm:px-12 sm:py-7`
- Portrait : `w-16 h-16 sm:w-24 sm:h-24`
- Textes : `text-[10px] sm:text-sm`, etc.
- `max-w-[92vw] sm:max-w-none` pour eviter le debordement

### Phase 4 — Mission intro responsive

**Fichier** : `Mission.tsx`

- Grille intro : `grid-cols-3` → `grid-cols-1 sm:grid-cols-3` avec une presentation empilee sur mobile

### Phase 5 — Carte mondiale mobile

**Fichier** : `CinematicWorldMap.tsx`

- Ratio adaptatif : `aspect-ratio: 16/9` → sur mobile `aspect-ratio: 4/3` ou `aspect-ratio: 3/2` via classes Tailwind
- Augmenter legerement la taille des noeuds sur mobile pour faciliter le tap

### Phase 6 — FragmentInventory tap-to-place

**Fichier** : `FragmentInventory.tsx`

- Ajouter un mode "tap-to-place" sur mobile : au lieu de drag, un tap selectionne le fragment, puis un tap sur le pays cible le place
- Detecter mobile via `useIsMobile()` et basculer automatiquement

---

## Resume des fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `Dashboard.tsx` | Containers elargis, stats mobiles visibles |
| `Puzzle.tsx` | Container elargi, toast responsive |
| `Mission.tsx` | Container elargi, grille intro responsive |
| `FreeMission.tsx` | Container elargi |
| `MissionComplete.tsx` | Container elargi |
| `Leaderboard.tsx` | Container elargi |
| `CinematicWorldMap.tsx` | Ratio adaptatif, noeuds plus grands sur mobile |
| `FragmentInventory.tsx` | Mode tap-to-place sur mobile |

