
# Correction : Animation de pièce puzzle + reflet sur la carte mondiale

## Les 3 problèmes identifiés

### Problème 1 — Pas d'animation de pièce lors de la victoire (MissionComplete.tsx)
Sur l'écran de debriefing post-mission, la réussite affiche juste une icône `<Sparkles>` statique. Il n'y a aucune animation visuelle d'une pièce de puzzle qui apparaît et se "place" dans la collection.

### Problème 2 — La pièce du pays réussi n'est pas visible sur la Carte Mondiale (Dashboard)
Dans la `CinematicWorldMap`, les marqueurs de pays (les cercles dorés avec code pays) ne montrent pas visuellement si un pays a sa pièce collectée. Le pays réussi (ex : US) n'est pas différencié des autres pays sur la carte.

### Problème 3 — Le compteur "0/195 pièces" reste à 0
La logique dans `MissionComplete.tsx` compte les `user_fragments` correctement en DB, mais le puzzle sur le Dashboard affiche "0/195" car les données ne se rechargent pas après une mission complétée. De plus, les données `user_fragments` ne semblent pas toujours correctement insérées via la RPC `complete_country_attempt`.

---

## Changements prévus

### 1. Animation de pièce puzzle sur l'écran de victoire (`MissionComplete.tsx`)

Remplacer l'icône `<Sparkles>` statique par une vraie animation de pièce puzzle SVG :

- Une pièce SVG animée apparaît avec un effet `scale(0) → scale(1.2) → scale(1)` (spring)
- La pièce a une couleur spécifique au pays (même palette que `FragmentInventory` : or pour CH, rouge pour JP, etc.)
- Une animation de "placement" : la pièce tombe du haut et se "clique" en place avec un effet de lueur dorée
- Un badge indiquant le nom du fragment (déjà chargé depuis le JSON du pays)

```tsx
// Pièce animée — remplacement du <Sparkles>
<motion.div
  initial={{ scale: 0, y: -40, rotate: -15, opacity: 0 }}
  animate={{ scale: 1, y: 0, rotate: 0, opacity: 1 }}
  transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.3 }}
>
  <svg width="80" height="80" viewBox="0 0 24 24">
    {/* Pièce SVG avec dégradé doré */}
    <path d="M 4 4 L 16 4 Q 14 8 16 10 L 20 10 L 20 20 Q 16 18 14 20 L 4 20 Q 6 16 4 14 Z"
      fill="url(#piece-grad)" stroke="hsl(40 80% 65%)" strokeWidth="0.8" />
    <defs>
      <linearGradient id="piece-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="hsl(40 80% 65%)" />
        <stop offset="100%" stopColor="hsl(40 60% 40%)" />
      </linearGradient>
    </defs>
  </svg>
</motion.div>
```

Après l'animation principale, un texte "FRAGMENT INTÉGRÉ AU PUZZLE MONDIAL" apparaît en fondu avec un effet de lueur.

### 2. Marqueurs "pièce collectée" sur la Carte Mondiale (`CinematicWorldMap.tsx`)

Actuellement, les marqueurs de pays sur la carte cinématographique (les cercles dorés avec le code pays) n'indiquent pas si un fragment a été collecté.

**Modification :** Ajouter une prop `collectedCountryCodes: string[]` au composant `CinematicWorldMap` et afficher une icône ✓ + un halo lumineux renforcé sur les pays qui ont leur fragment collecté.

Sur le marqueur de chaque pays :
- **Pays avec fragment collecté** : cercle doré + anneau pulsant vert/doré + petite icône puzzle ✩ dans un coin
- **Pays sans fragment** : marqueur normal (comportement actuel)

```tsx
// Dans CinematicWorldMap, pour chaque marqueur de pays
const hasFragment = collectedCountryCodes.includes(marker.code);

{hasFragment && (
  <motion.div
    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center"
    animate={{ scale: [1, 1.2, 1] }}
    transition={{ repeat: Infinity, duration: 2 }}
  >
    <span className="text-[8px]">✓</span>
  </motion.div>
)}
```

**Dans `Dashboard.tsx`** : charger `user_fragments` et passer les codes de pays collectés à `CinematicWorldMap`.

### 3. Recharger le puzzle mondial après une mission (`Dashboard.tsx`)

Le composant Dashboard doit recharger ses données de fragments lors du retour depuis une mission. Ajouter un `useEffect` avec dépendance sur le focus de la fenêtre ou un paramètre URL `?refresh=1` ajouté lors de la navigation depuis `MissionComplete`.

Alternativement : dans `MissionComplete.tsx`, passer `?refreshPuzzle=1` dans la navigation vers le Dashboard, et dans `Dashboard.tsx` détecter ce paramètre pour forcer un refresh des fragments.

### 4. Vérification de l'insertion des fragments en DB

Vérifier que la RPC `complete_country_attempt` insère bien dans `user_fragments` (et pas seulement dans `user_progress`/`player_country_progress`). Si ce n'est pas le cas, ajouter l'insertion directement dans `completeMission()` de `Mission.tsx` après un succès confirmé.

---

## Fichiers modifiés

| Fichier | Modification |
|---|---|
| `src/pages/MissionComplete.tsx` | Animation pièce SVG animée à la place de `<Sparkles>` |
| `src/components/CinematicWorldMap.tsx` | Prop `collectedCountryCodes`, marqueurs ✓ sur pays avec fragment |
| `src/pages/Dashboard.tsx` | Charger `user_fragments`, passer codes au composant carte, refresh post-mission |
| `src/pages/Mission.tsx` | Vérifier/corriger l'insertion fragment dans `user_fragments` si nécessaire |

---

## Résultat attendu

1. Après une victoire, une pièce puzzle SVG animée tombe et se clique en place à l'écran
2. Sur la carte mondiale du Dashboard, les pays réussis affichent un badge ✓ lumineux
3. Le compteur "X/195 pièces" reflète le vrai nombre de fragments collectés
