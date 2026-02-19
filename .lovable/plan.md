
# Déverrouillage automatique du pays suivant après réussite de mission

## Problème identifié

Il y a une incohérence entre deux systèmes :

**Dashboard** (ligne 807) : débloque le pays N+1 si `best_score >= 8`
**Quiz** : score sur 6 questions, victoire à 5/6 — le `best_score` en base sera donc au maximum **6**

Résultat : même après avoir réussi la Suisse, l'USA reste bloqué pour toujours car `signalProgress["CH"] < 8`.

---

## Ce qui doit changer

### 1. Corriger le seuil de déverrouillage dans le Dashboard

**Fichier :** `src/pages/Dashboard.tsx` — ligne 807

Remplacer :
```ts
const seqLocked = isSignalInitial && seqIdx > 0 && prevBestScore < 8;
```
Par :
```ts
const seqLocked = isSignalInitial && seqIdx > 0 && prevBestScore < 5;
```

La valeur `5` correspond au `min_correct_to_win` officiel (5/6 pour gagner). Le pays suivant s'ouvre dès qu'un `best_score >= 5` est enregistré.

Le message d'indication verouillé sera aussi mis à jour :
```
RÉUSSIS {prevCode} AVEC 5/6
```

### 2. S'assurer que le `complete_country_attempt` RPC enregistre bien le score sur 6

La RPC reçoit `p_score` et `p_total` depuis `Mission.tsx` (ligne 572-578). Il faut vérifier que le score passé est bien le score sur 6 (pas transformé). C'est déjà le cas (`score` = nombre de bonnes réponses).

### 3. MissionComplete — le bouton "POURSUIVRE L'ENQUÊTE" fonctionne déjà

Le bouton sur `MissionComplete.tsx` navigue directement vers `/mission/${nextCountry.id}`. C'est déjà implémenté correctement. Aucun changement nécessaire ici.

### 4. Comportement pour les clients payants (Saison 1+)

Pour les clients payants, le déverrouillage est géré par `subscription_type` dans le profil. La logique `getCountryState()` et `getMaxPlayableSeason()` fonctionne déjà correctement — si `tier === "season1"`, tous les pays de `season_number <= 1` sont accessibles.

La seule correction nécessaire reste le seuil de séquence pour les pays gratuits (Signal Initial).

---

## Résumé des changements

| Fichier | Changement | Impact |
|---|---|---|
| `src/pages/Dashboard.tsx` | Seuil `< 8` → `< 5` sur `seqLocked` | Pays suivant s'ouvre après réussite |
| `src/pages/Dashboard.tsx` | Texte du verrou mis à jour : `5/6` | Cohérence UI |

## Fichier non modifié (déjà correct)
- `src/pages/MissionComplete.tsx` — Le bouton "POURSUIVRE L'ENQUÊTE" navigue bien vers la prochaine mission
- `src/pages/Mission.tsx` — Le RPC envoie le bon score

---

## Flux complet après correction

```text
Joueur réussit CH (5/6 ou 6/6)
  → complete_country_attempt RPC : best_score = 5 ou 6
  → MissionComplete s'affiche avec bouton "POURSUIVRE L'ENQUÊTE"
  → Joueur clique → navigue vers /mission/[id_US]
  
  OU
  
  Joueur retourne au Dashboard
  → seqLocked check : signalProgress["CH"] = 5 >= 5 → FALSE (déverrouillé)
  → USA s'affiche comme jouable
```

Pour les clients payants :
```text
Joueur avec subscription_type = "agent" ou "season1"
  → getTier() → "season1"
  → getMaxPlayableSeason() → 1
  → getCountryState() → "playable" pour tous les pays season_number <= 1
  → Aucune restriction supplémentaire, accès direct à tous les 43 pays OP-01
```
