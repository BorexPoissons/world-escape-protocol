

# Toast "SIGNAL DÉTECTÉ" — Agrandissement + nouvelle photo + revue des contrastes

## 1. Remplacer la photo de Jasper

La nouvelle image uploadée (`Jasper_Valcourt_-Signal_détécté.png`) sera copiée dans `src/assets/jasper-signal.png`, remplacant l'ancienne. Elle sera utilisee automatiquement partout ou `jasperSignalImg` est importe.

## 2. Agrandir le toast et ajouter un bouton X

Le toast "SIGNAL DETECTE" (centre de l'ecran, lignes 616-679) sera modifie :

- Portrait agrandi de **64px a 96px** (w-24 h-24)
- Textes agrandis proportionnellement (titre 14px, nom 12px, citation 11px)
- Padding plus genereux (px-12 py-7)
- Ajout d'un **bouton X** en haut a droite pour fermer le toast (appelle `setMilestoneSignal(false)`)
- Le toast reste cliquable pour ouvrir la modale Jasper
- Le timer de 2.5s reste actif (mais l'utilisateur peut fermer avant)

## 3. Revoir les contrastes (toasts, textes, modales)

Certains elements ont un texte trop clair (muted-foreground sur fond sombre). Corrections :

**Toast SIGNAL DETECTE** :
- Citation : passer de `text-muted-foreground` a une couleur plus lisible (`hsl(40 15% 80%)`)
- Compteur fragments : meme traitement

**Modale MESSAGE DE JASPER** (lignes 887-917) :
- `DialogDescription` : passer de `text-muted-foreground` a `text-foreground/80` pour meilleure lisibilite
- Transmission securisee : de `text-muted-foreground` a `text-foreground/60`

**Modale MissionDetailModal** et **UpgradeModal** : ces modales utilisent deja des contrastes corrects (fond `hsl(220 25% 6%)` avec texte `foreground`), pas de changement necessaire.

## Details techniques

**Fichiers modifies** :
- `src/assets/jasper-signal.png` — remplace par la nouvelle image
- `src/pages/Puzzle.tsx` — toast agrandi, bouton X, contrastes ameliores

