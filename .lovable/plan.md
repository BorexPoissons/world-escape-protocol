
# Correction : Score objectif visible en permanence pendant la mission

## Le problème identifié

Le joueur ne comprend pas pourquoi il échoue avec 4/6 alors qu'il avait encore des vies et du bonus.

La raison : **les vies et le bonus pool protègent seulement contre l'élimination prématurée** (si on perd toutes ses vies en cours de route). Mais la règle finale est indépendante : il faut atteindre **5 bonnes réponses sur 6** pour obtenir le fragment.

Actuellement, cet objectif n'est visible qu'à l'écran d'intro (dans le panneau de règles) et dans l'écran d'échec. Pendant le quiz lui-même, le joueur voit seulement :
- Sa question actuelle (ex : `3/6`)
- Ses vies (2 cœurs)
- Son timer
- Son bonus pool

Il ne voit **pas** son score actuel en temps réel ni la cible à atteindre.

## Ce qui va changer

### 1. Affichage du score en temps réel dans le header pendant l'enigme

Dans le header (top bar), à côté du compteur `3/6`, ajouter un indicateur de score :

```
[❤️❤️]  Question 3/6  |  ✓ 2/5
```

Concrètement : à droite du compteur de questions, afficher `✓ X/5` (score actuel / objectif) qui se met à jour à chaque bonne réponse. Il devient vert quand atteint.

**Fichier :** `src/pages/Mission.tsx` — section header (lignes 753–758)

### 2. Indicateur de score sous les boutons de réponse

Sous les choix de réponse, à côté des cœurs, ajouter une ligne :

```
[❤️❤️  2 VIES]     [✓ 2 bonnes réponses — Objectif : 5/6]
```

Cela permet au joueur de voir à tout moment où il en est par rapport à l'objectif, pas seulement ses vies.

**Fichier :** `src/pages/Mission.tsx` — section enigme (ligne 964–973)

### 3. Améliorer le message d'échec "score insuffisant"

L'écran d'échec actuel dit "Il faut 5/6 minimum" mais sans rappeler clairement que les vies ne compensent pas le score.

Ajouter une ligne explicative :

> "Vous aviez encore des vies restantes, mais le score minimum de 5/6 n'a pas été atteint. Les vies protègent contre l'élimination en cours de mission — l'objectif final reste de répondre correctement à au moins 5 questions."

**Fichier :** `src/pages/Mission.tsx` — section `failed` (lignes 1126–1135)

### 4. Bannière d'objectif persistante sous le timer

Sous la barre de progression des questions (les points), ajouter une ligne discrète :

```
Objectif : ✓ 2 / 5 bonnes réponses
```

Cette ligne devient dorée et affiche ✅ quand l'objectif est atteint (= mission gagnée instantanément à ce moment-là).

**Fichier :** `src/pages/Mission.tsx` — section enigme (lignes 923–928)

## Résumé des modifications

| Fichier | Section | Modification |
|---|---|---|
| `src/pages/Mission.tsx` | Header top bar | Score actuel `✓ X/Y` à côté du compteur de questions |
| `src/pages/Mission.tsx` | Sous les réponses | Score en temps réel + objectif affiché avec les vies |
| `src/pages/Mission.tsx` | Sous les dots de progression | Barre "Objectif : X/5" mise à jour en live |
| `src/pages/Mission.tsx` | Écran d'échec | Message clarifiant que les vies ≠ score final |

Aucune règle de jeu ne change — seulement la communication visuelle est améliorée pour que le joueur comprenne exactement pourquoi il a échoué et ce qu'il doit faire.
