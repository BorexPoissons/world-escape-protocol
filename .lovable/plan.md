

# Ajouter les vies, le timer, le bonus et la seconde chance aux missions gratuites

## Probleme actuel

La page `FreeMission.tsx` (missions gratuites CH, US, CN, BR, IN) ne comporte pas :
- Les **vies** (coeurs) affichees dans le header
- La **barre de temps** (countdown par etape)
- La **barre bonus** (secondes accumulees)
- La mecanique de **seconde chance** (le joueur peut se tromper 1 fois avant l'echec)

Ces elements existent deja dans `Mission.tsx` (missions payantes) et doivent etre reproduits dans `FreeMission.tsx`.

## Plan d'implementation

### 1. Ajouter les etats de jeu manquants dans FreeMission.tsx

Ajouter les variables d'etat suivantes (calquees sur Mission.tsx) :
- `lives` (demarre a 2) et `maxLives` (2)
- `timeLeft` et `timerRef` pour le countdown (ex: 60s par etape pour les missions gratuites)
- `bonusPool` pour accumuler les secondes restantes sur bonne reponse
- `firstMistakeWarning` pour afficher l'avertissement "derniere vie"

### 2. Implementer le timer par etape

- Demarrer un countdown quand le joueur entre dans `scene_choice`, `logic_puzzle`, ou `strategic`
- Arreter le timer quand la reponse est revelee
- Si le temps expire : perdre 1 vie (comme dans Mission.tsx)
- Afficher la barre de temps animee (couleur verte > jaune > rouge)

### 3. Implementer la mecanique des vies et seconde chance

- **2 vies au depart**
- **Mauvaise reponse = -1 vie** (au lieu de l'echec immediat actuel)
- Si `lives > 0` apres erreur : toast d'avertissement, le joueur continue a l'etape suivante
- Si `lives === 0` : verifier le bonus pool pour rescue, sinon phase "failed"
- La scene immersive (etape 1) ne fait PAS perdre de vie (comme actuellement, elle est narrative)

### 4. Implementer le bonus pool

- Chaque bonne reponse ajoute `timeLeft` restant au `bonusPool`
- Si `lives === 0` et `bonusPool >= 60` (seuil adapte pour 3 etapes vs 6) : proposer un rescue
- Ajouter la phase `rescue_offer` avec un ecran de sauvetage manuel

### 5. Modifier le header de FreeMission

Ajouter dans le header sticky (entre la barre de navigation et le contenu) :
- **Coeurs de vie** : icones Heart remplies/vides (comme Mission.tsx)
- **Barre bonus** : barre doree avec indicateur secondes/seuil
- **Bandeau d'avertissement** "derniere vie" (conditionnel)

### 6. Ajouter la barre timer dans chaque etape de question

Afficher au-dessus des choix :
- Le label de l'etape (SCENE / ENIGME / STRATEGIQUE)
- Le countdown en secondes
- La barre de progression coloree

---

## Details techniques

**Fichier modifie** : `src/pages/FreeMission.tsx`

**Config pour missions gratuites** :
```text
lives: 2
time_per_step: 90s (plus genereux car 3 etapes seulement)
bonus_rescue_threshold: 60s
```

**Logique de seconde chance** :
- Etape scene_choice : pas de penalite vie (reste narrative)
- Etape logic_puzzle : mauvaise reponse = -1 vie
- Etape strategic : mauvaise reponse = -1 vie
- Timeout sur n'importe quelle etape = -1 vie

**Elements UI a reprendre de Mission.tsx** :
- Composant coeurs (Heart icon avec fill conditionnel)
- Barre bonus doree avec animation framer-motion
- Bandeau warning "derniere vie" avec AlertTriangle
- Ecran rescue_offer quand bonus suffisant

