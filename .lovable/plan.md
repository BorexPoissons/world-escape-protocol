
# Bouton "Coller JSON" directement sur chaque carte pays

## Ce qui change

Ajout d'un bouton "coller JSON" (icone Clipboard) a cote des boutons Modifier et Supprimer sur chaque ligne de pays dans l'onglet PAYS. En cliquant dessus, une zone de texte (textarea) s'ouvre dans la section detaillee du pays pour coller le JSON, avec un bouton "ANALYSER" qui declenche le meme traitement que l'upload fichier.

## Fonctionnement

1. Sur chaque `CountryAdminRow`, un nouveau bouton icone (Clipboard) apparait entre Modifier et Supprimer
2. Cliquer dessus ouvre/ferme une textarea dans la zone "expanded" du pays
3. L'utilisateur colle son JSON depuis ChatGPT
4. Un bouton "ANALYSER" parse le JSON avec la meme logique que `handleJsonFileChange`
5. L'apercu et le bouton "IMPORTER" apparaissent comme d'habitude

L'import fichier existant reste inchange.

## Details techniques

**Fichier : `src/pages/Admin.tsx`**

### 1. Extraire la logique de parsing dans une fonction reutilisable

La logique actuellement dans `handleJsonFileChange` (lignes 313-396) sera extraite dans une fonction `parseJsonString(jsonString: string)` qui retourne le meme objet preview. Les deux entrees (fichier et coller) l'appelleront.

### 2. Ajouter des states

- `pasteTarget: string | null` — le code pays dont la textarea est ouverte
- `pasteText: string` — le contenu colle

### 3. Modifier `CountryAdminRow`

- Ajouter une prop `onPaste` et `isPasting`
- Ajouter un bouton icone Clipboard dans la barre d'actions (ligne ~1517-1523)
- Si `isPasting` est true, afficher une textarea + bouton "ANALYSER" dans la zone expanded (ligne ~1529)

### 4. Fonction d'analyse

Le bouton "ANALYSER" appelle `parseJsonString(pasteText)` et alimente `jsonImportPreview` + `setJsonImportPreview(...)`, exactement comme le mode fichier.

**Environ 50 lignes ajoutees/modifiees dans 1 fichier.**
