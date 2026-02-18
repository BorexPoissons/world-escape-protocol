
## Refonte du système de timer et des vies — Mission.tsx

### Ce qui change

**1. Timer passe de 60s à 120s**
La constante `PUZZLE_TIMER_SECONDS` passe de `60` à `120`. Le timer pénalisé par la suspicion passe donc de `~51s` à `~102s` (−15%). L'affichage dans l'intro s'adapte automatiquement.

**2. Barre de bonus de temps**
Quand le joueur répond correctement avant la fin du timer, les secondes restantes s'accumulent dans un compteur `bonusSeconds`. Cette barre est affichée de façon persistante sous le header (visible pendant toute la mission) et augmente en temps réel à chaque bonne réponse rapide. Exemple : répondu en 40s → 80s restants ajoutés au bonus.

**3. Échange vie contre bonus (règle des 3 conditions)**
Si les 3 conditions suivantes sont réunies simultanément :
- Le joueur n'a plus que **1 vie sur 3** (2 vies perdues)
- Il a résolu **plus de 50% des énigmes** (ex : 2/4 ou 3/4)
- Son **bonus de temps est ≥ 60s**

Alors un bouton `ÉCHANGER 60s BONUS → +1 VIE` apparaît dans l'interface. Le joueur peut l'activer **une seule fois par mission**. Cela lui redonne 1 vie et déduit 60s de son bonus.

### Détail technique — fichier `src/pages/Mission.tsx`

**Nouveaux états à ajouter :**
```
bonusSeconds: number         // cumul des secondes économisées
lifeTradeUsed: boolean       // échange déjà fait cette mission ?
```

**Logique dans `handleAnswer` (réponse correcte) :**
```
const saved = timeLeft;      // secondes restantes sur le timer actuel
setBonusSeconds(prev => prev + saved);
```

**Condition d'affichage du bouton d'échange :**
```
lives === 1
&& currentEnigme >= Math.floor(mission.enigmes.length / 2)
&& bonusSeconds >= 60
&& !lifeTradeUsed
```

**Action du bouton d'échange :**
```
setLives(prev => prev + 1);
setBonusSeconds(prev => prev - 60);
setLifeTradeUsed(true);
toast("💛 Vie récupérée grâce à votre rapidité !");
```

**Affichage de la barre bonus :**
La barre bonus s'affiche dans le header en-dessous des cœurs, avec un label `⚡ BONUS` en jaune/doré et la valeur en secondes. Elle grandit proportionnellement (cap visuel à 120s pour la largeur max).

### Reset complet dans `retryMission`
```
setBonusSeconds(0);
setLifeTradeUsed(false);
```

### Résumé des fichiers modifiés
- `src/pages/Mission.tsx` — le seul fichier à modifier

### Ce qui NE change PAS
- La logique de suspicion (malus −15% du timer)
- Les vies initiales (3 ou 2 selon suspicion > 70)
- Le nombre max de tentatives par énigme (2)
- L'échange de vie n'augmente pas le maximum de vies — il permet juste de récupérer 1 vie perdue
