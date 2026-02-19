
# Diagnostic et Correction de l'Import JSON Admin

## Problème identifié

Le parser JSON dans `Admin.tsx` (`handleJsonFileChange`) cherche des clés précises dans la structure JSON, mais nos fichiers pays utilisent des noms de clés différents :

| Ce que le parser cherche | Ce qu'il y a dans CH.json | Résultat |
|---|---|---|
| `json.country.name` | `json.country.name_fr` | `undefined` |
| `json.country.description` | Inexistant | `undefined` |
| `json.country.monuments` | Inexistant | `[]` |
| `json.country.historical_events` | Inexistant | `[]` |
| `json.country.symbols` | Inexistant | `[]` |

Comme `payload` est quasi vide, l'update en base ne change rien et le preview affiche des zéros.

## Deux axes de correction

### Axe 1 — Enrichir les fichiers JSON pays (structure complète)

Ajouter dans chaque JSON (CH, US, CN, BR, IN...) les champs manquants directement dans la clé `country` :

```json
"country": {
  "code": "CH",
  "name": "Suisse",
  "description": "Pays des Alpes, des banques secrètes et des horloges mystérieuses.",
  "monuments": ["Jet d'Eau", "Chapelle du Pont", "Château de Chillon"],
  "historical_events": ["Fondation de la Confédération 1291", "Convention de Genève 1864", "CERN fondé 1954"],
  "symbols": ["Croix blanche", "Edelweiss", "Cor des Alpes"]
}
```

### Axe 2 — Rendre le parser plus intelligent (résolution des alias)

Modifier `handleJsonFileChange` dans `Admin.tsx` pour qu'il accepte aussi `name_fr`, `name_en`, et cherche dans des emplacements alternatifs du JSON (ex: `mission.mission_title` pour le nom) :

```js
// Avant (fragile)
const name = json.country?.name || json.name;

// Après (robuste)
const name = json.country?.name 
  || json.country?.name_fr 
  || json.country?.name_en 
  || json.name;
```

## Plan d'implémentation

### Étape 1 — Corriger le parser Admin (Axe 2)

Dans `src/pages/Admin.tsx`, fonction `handleJsonFileChange` (lignes ~204-213) :

- Ajouter les alias `name_fr`, `name_en` pour le nom
- Chercher `monuments` aussi dans `json.scene` ou d'autres endroits si nécessaire
- Afficher dans le preview le `missionTitle` même quand les autres champs sont vides, pour confirmer que le bon fichier est chargé
- Afficher un avertissement visible si `monuments/events/symbols` sont absents du JSON chargé

### Étape 2 — Enrichir les 5 JSON pays (Axe 1)

Mettre à jour les 5 fichiers JSON `public/content/countries/` (CH, US, CN, BR, IN) pour inclure dans la clé `country` :
- `name` (alias de `name_fr`)
- `description`
- `monuments` (liste)
- `historical_events` (liste)
- `symbols` (liste)

Ces données correspondent à ce qui est déjà visible dans les cards admin (Jet d'Eau, Chapelle du Pont...) donc on les retrouve dans la base — il s'agit juste de les intégrer dans le JSON pour que le round-trip import/export fonctionne.

### Étape 3 — Vérification visuelle

Après correction, le preview admin devrait afficher :
- Le nom du pays correctement extrait
- Le nombre réel de monuments/événements/symboles
- Le titre de mission (déjà fonctionnel)

Et le bouton "IMPORTER CH" devrait mettre à jour ces données en base.

## Fichiers modifiés

1. `src/pages/Admin.tsx` — Correction du parser JSON (alias `name_fr`, messages d'avertissement)
2. `public/content/countries/CH.json` — Ajout des champs manquants dans `country`
3. `public/content/countries/US.json` — Ajout des champs manquants dans `country`
4. `public/content/countries/CN.json` — Ajout des champs manquants dans `country`
5. `public/content/countries/BR.json` — Ajout des champs manquants dans `country`
6. `public/content/countries/IN.json` — Ajout des champs manquants dans `country`
