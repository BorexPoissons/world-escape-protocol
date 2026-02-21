

# Carte du Puzzle par Saison -- Navigation par Slides

## Concept

Remplacer la carte unique affichant tous les 195 pays par un systeme de 5 cartes separees, une par saison. Le joueur navigue entre les cartes comme des slides (swipe ou onglets). Seules les cartes des saisons deverrouillees sont accessibles ; les autres affichent un ecran verrouille avec teaser.

## Structure des 5 cartes

| Slide | Saison | Pays | Acces |
|-------|--------|------|-------|
| 1 | Signal Initial (Gratuit) | CH, US, CN, BR, IN | Toujours visible |
| 2 | Les Observateurs (S1) | Pays 6-50 | Apres achat S1 |
| 3 | Les Architectes (S2) | Pays 51-100 | Apres achat S2 |
| 4 | La Faille (S3) | Pays 101-150 | Apres achat S3 |
| 5 | Le Protocole Final (S4) | Pays 151-195 | Apres achat S4 |

## Comportement

- Par defaut, le joueur voit la carte gratuite (Slide 1)
- Des indicateurs de navigation (dots ou onglets) en bas/haut de la carte permettent de passer d'une saison a l'autre
- Cliquer sur une saison non achetee affiche un overlay verrouille avec le nom de la saison, le nombre de pays, et un bouton "Debloquer"
- Une saison achetee affiche sa carte avec uniquement les pays de cette saison
- Le joueur peut revenir librement entre les cartes deverrouillees (swipe ou boutons precedent/suivant)
- La carte de fond (`carte-wep.png`) reste identique sur toutes les slides, seuls les noeuds de pays changes
- La barre de progression globale en haut reste visible et aggrege toutes les saisons

## Details techniques

### Nouveau composant : `src/components/SeasonMapNavigator.tsx`

- Wrapper autour de `CinematicWorldMap` qui gere l'etat de la saison active
- Props : `puzzleData`, `tier`, `entitlements`, `fragments`, etc.
- State : `activeSeason` (0-4)
- Filtre les pays par `season_number` avant de les passer a `CinematicWorldMap`
- Affiche les indicateurs de navigation (dots colores par saison)
- Gere le swipe tactile (touch events) et les fleches clavier

### Modification : `src/components/CinematicWorldMap.tsx`

- Accepte une nouvelle prop optionnelle `seasonFilter?: number` pour ne rendre que les pays de cette saison
- Si `seasonFilter` est defini, filtrer `playableNodes` et `lockedNodes` par `seasonNumber`
- Les connexions SVG (FREE_CONNECTIONS) ne s'affichent que sur la slide de la saison 0

### Modification : `src/pages/Puzzle.tsx`

- Remplacer l'appel direct a `CinematicWorldMap` par `SeasonMapNavigator`
- Passer les entitlements du joueur pour determiner quelles saisons sont deverrouillees
- Recuperer les entitlements depuis la table `entitlements` (cles : `season_1`, `season_2`, `season_3`, `season_4`)

### Overlay saison verrouillee

- Quand le joueur navigue vers une saison non achetee, un overlay semi-transparent s'affiche par-dessus la carte (fond sombre)
- Contenu : icone cadenas, nom de l'operation (ex: "LES OBSERVATEURS"), nombre de pays, prix, et bouton "Debloquer cette saison" qui ouvre le `UpgradeModal`

### Navigation visuelle

- 5 dots en bas de la carte, colores selon la palette de chaque saison (`SEASON_CONFIG`)
- Le dot actif est plus grand et lumineux
- Fleches gauche/droite sur les cotes de la carte (style cinematique, semi-transparentes)
- Animation de transition : fade + leger slide horizontal entre les cartes
- Sur mobile : support du swipe gauche/droite via touch events

### Fichiers concernes

1. **Creer** `src/components/SeasonMapNavigator.tsx` -- composant wrapper avec navigation
2. **Modifier** `src/components/CinematicWorldMap.tsx` -- ajouter prop `seasonFilter`
3. **Modifier** `src/pages/Puzzle.tsx` -- integrer `SeasonMapNavigator`, charger les entitlements

