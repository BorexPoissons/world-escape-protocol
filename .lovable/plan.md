

# Correction de la distribution des saisons dans la base de donnees

## Probleme

Le champ `season_number` de la table `countries` ne correspond pas aux tranches de `release_order` definies dans le modele tarifaire :
- Saison 0 : release_order 1-5 (5 pays) -- OK
- Saison 1 : release_order 6-50 (45 pays) -- DB dit 43
- Saison 2 : release_order 51-100 (50 pays) -- DB dit 72
- Saison 3 : release_order 101-150 (50 pays) -- DB dit 40
- Saison 4 : release_order 151-195 (45 pays) -- DB dit 35

## Solution

### Etape 1 : Migration SQL pour recaler les season_number

Executer une migration qui met a jour `season_number` en fonction de `release_order` :

```text
UPDATE countries SET season_number = 0 WHERE release_order BETWEEN 1 AND 5;
UPDATE countries SET season_number = 1 WHERE release_order BETWEEN 6 AND 50;
UPDATE countries SET season_number = 2 WHERE release_order BETWEEN 51 AND 100;
UPDATE countries SET season_number = 3 WHERE release_order BETWEEN 101 AND 150;
UPDATE countries SET season_number = 4 WHERE release_order BETWEEN 151 AND 195;
```

### Etape 2 : Mettre a jour les compteurs dans SeasonMapNavigator.tsx

Modifier les `countLabel` dans le fichier `src/components/SeasonMapNavigator.tsx` :
- Saison 1 : "45 PAYS"
- Saison 2 : "50 PAYS"
- Saison 3 : "50 PAYS"
- Saison 4 : "45 PAYS"

### Etape 3 : Mettre a jour la table countries_missions

La table `countries_missions` a aussi un champ `season` qui devra etre recale de la meme maniere en se basant sur le `release_order` de la table `countries` correspondante (via le code pays).

### Fichiers concernes

- **Migration SQL** : recaler `season_number` dans `countries` et `season` dans `countries_missions`
- **`src/components/SeasonMapNavigator.tsx`** : corriger les 4 valeurs `countLabel`

