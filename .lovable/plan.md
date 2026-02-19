
# Rendre le bonus d'échange de vie MANUEL (bouton explicite)

## Problème actuel

Quand le joueur tombe à 0 vie avec bonus >= 120s, la vie est **automatiquement** restituée, sans que le joueur ne fasse rien. C'est invisible et frustrant.

## Ce qui change

Le rescue devient un **choix conscient du joueur** : un bouton apparaît, le joueur doit cliquer pour activer l'échange.

---

## Nouveau comportement

### Quand les vies atteignent 0

Au lieu de déclencher le rescue automatiquement, on passe dans un **état intermédiaire** : `phase = "rescue_offer"`.

Sur cet écran :
- Affichage de l'état : "0 vie restante"
- Affichage du bonus actuel : "⚡ Vous avez XXXs de bonus"
- **Bouton principal** : `DÉPENSER 120s → RÉCUPÉRER 1 VIE`
- **Bouton secondaire** : `Abandonner la mission`

Si le bouton est cliqué :
- `bonusPool -= 120`
- `lives = 1`
- Retour en `phase = "enigme"` sur la question suivante
- Toast de confirmation

Si le joueur refuse (abandon) ou si `bonusPool < 120` → `phase = "failed"`.

---

## Détail technique — fichier `src/pages/Mission.tsx`

### 1. Nouveau type de phase

```
type Phase = "loading" | "intro" | "enigme" | "narrative_unlock" | "moral" | "finale" | "failed" | "rescue_offer";
```

### 2. Dans `handleAnswer` et `handleTimeOut` — remplacer le rescue auto

**Avant (auto) :**
```ts
if (newLives <= 0) {
  if (bonusPool >= 120) {
    setBonusPool(prev => prev - 120);
    setLives(1);
    toast({ title: "⚡ Bonus activé !" ... });
  } else {
    setTimeout(() => setPhase("failed"), 1400);
  }
}
```

**Après (manuel) :**
```ts
if (newLives <= 0) {
  if (bonusPool >= 120) {
    setTimeout(() => setPhase("rescue_offer"), 1400); // après révélation de la réponse
  } else {
    setTimeout(() => setPhase("failed"), 1400);
  }
}
```

### 3. Nouveau handler `handleRescue`

```ts
const handleRescue = () => {
  setBonusPool(prev => prev - 120);
  setLives(1);
  setAnswerRevealed(false);
  setSelectedAnswer(null);
  setAttemptsOnCurrent(0);
  // Avancer à la question suivante
  if (currentEnigme < mission!.enigmes.length - 1) {
    setCurrentEnigme(c => c + 1);
  }
  setPhase("enigme");
  toast({ title: "⚡ Vie récupérée !", description: "120s de bonus utilisés. Mission continue." });
};
```

### 4. Nouvel écran `rescue_offer` dans le JSX

Entre l'écran `enigme` et l'écran `failed`, ajouter :

```tsx
{phase === "rescue_offer" && (
  <motion.div key="rescue" ... className="space-y-6 text-center">
    <div className="text-6xl">💔</div>
    <h2 className="text-2xl font-display text-destructive">MISSION EN DANGER</h2>
    <p className="text-muted-foreground">Vous n'avez plus de vie.</p>
    
    {/* Bonus display */}
    <div className="bg-card border border-yellow-500/40 rounded-lg p-4">
      <p className="text-yellow-400 font-display text-lg">⚡ {bonusPool}s de bonus accumulé</p>
      <p className="text-sm text-muted-foreground mt-1">Dépensez 120s pour continuer</p>
    </div>

    {/* Exchange button */}
    <Button 
      onClick={handleRescue}
      className="w-full bg-yellow-500 text-black font-display tracking-wider hover:bg-yellow-400"
    >
      ⚡ DÉPENSER 120s → +1 VIE
    </Button>
    
    {/* Abandon button */}
    <Button 
      variant="ghost" 
      onClick={() => setPhase("failed")}
      className="w-full text-muted-foreground"
    >
      Abandonner la mission
    </Button>
  </motion.div>
)}
```

---

## Résumé des changements

| Avant | Après |
|---|---|
| Rescue automatique et invisible | Rescue explicite via bouton |
| Phase passe directement à enigme | Nouvelle phase intermédiaire `rescue_offer` |
| Toast discret | Écran dédié avec choix clair |

## Fichier modifié
- `src/pages/Mission.tsx` uniquement (ajout du type de phase, modification de `handleAnswer`/`handleTimeOut`, nouveau handler `handleRescue`, nouveau bloc JSX)
