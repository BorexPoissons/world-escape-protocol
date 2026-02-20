

# Bouton Debug — Toast "SIGNAL DÉTECTÉ"

Ajout d'un bouton temporaire sur la page Puzzle pour déclencher manuellement le toast avec le portrait de Jasper.

## Ce qui sera fait

Un bouton "DEBUG: Signal" sera ajouté en bas à droite de l'écran (position fixe), visible uniquement pour les tests. En cliquant dessus, le toast "SIGNAL DÉTECTÉ" avec le portrait de Jasper apparaîtra exactement comme s'il se déclenchait naturellement après le placement d'un 5e fragment.

## Détails techniques

**Fichier modifié** : `src/pages/Puzzle.tsx`

- Ajout d'un bouton fixe en `bottom-4 right-4` avec le texte "DEBUG: Signal"
- Au clic, le bouton active l'état `showSignalToast` à `true` (le même état qui contrôle l'affichage du toast Jasper)
- Le bouton sera stylé de manière discrète (petit, semi-transparent) pour ne pas gêner l'interface
- Facile à supprimer ensuite (une seule ligne JSX à retirer)

