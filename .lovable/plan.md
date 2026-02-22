

# Fix du mapping des reponses MCQ dans FreeMission

## Bug identifie

Deux problemes lies dans le mapping des questions DB :

1. **Mauvais chemin d'acces** : Le code cherche `q.answer?.value` (ligne 256), mais la DB stocke `q.correct_answer` (ex: `"B"`). Resultat : `ansIdx` vaut toujours 0.

2. **Shuffle casse l'index** : Les choix sont melanges (lignes 381-383) avec `shuffle([...sq.choices])`, mais `answer_index` pointe toujours sur la position originale. Apres le shuffle, la "bonne reponse" affichee est fausse.

## Solution

**Fichier : `src/pages/FreeMission.tsx`**

### Etape 1 — Corriger le calcul de `ansIdx` (lignes 255-259)

Remplacer :
```
let ansIdx = 0;
if (q.answer?.value) {
  const idx = (q.options ?? []).findIndex((o: any) => (o.id ?? o) === q.answer.value);
  ansIdx = idx >= 0 ? idx : 0;
}
```

Par :
```
let ansIdx = 0;
if (q.correct_answer) {
  const idx = (q.options ?? []).findIndex((o: any) => (o.id ?? o) === q.correct_answer);
  ansIdx = idx >= 0 ? idx : 0;
}
```

### Etape 2 — Recalculer `answer_index` apres le shuffle (lignes 381-383)

Actuellement :
```
if (sq) setSceneChoices(shuffle([...sq.choices]));
if (lq) setLogicChoices(shuffle([...lq.choices]));
if (stq) setStrategicChoices(shuffle([...stq.choices]));
```

Remplacer par une logique qui :
1. Retrouve le texte de la bonne reponse AVANT le shuffle
2. Shuffle les choix
3. Recalcule `answer_index` dans le tableau shuffle
4. Met a jour la question avec le nouvel index

```
if (sq) {
  const correctText = sq.choices[sq.answer_index];
  const shuffled = shuffle([...sq.choices]);
  sq.answer_index = shuffled.indexOf(correctText);
  setSceneChoices(shuffled);
}
// Idem pour lq et stq
```

### Impact

- Les 3 phases (Scene, Logique, Strategique) identifieront correctement la bonne reponse
- Le shuffle continuera de fonctionner normalement
- Aucun changement de schema DB

**Total : ~15 lignes modifiees dans 1 fichier.**
