

# Blocage des noms de code reserves a l'inscription

## Objectif

Empecher tout nouveau joueur de s'inscrire avec un "Nom de code" (display_name) reserve ou sensible comme "admin", "administrateur", "wep", "jasper", "valcourt", etc. -- dans toutes les langues et variantes de casse.

## Liste des mots bloques

Une liste exhaustive de termes interdits, verifies en minuscules et sans accents :

- **Admin / Systeme** : admin, administrator, administrateur, administrador, amministratore, verwaltung, moderator, moderateur, root, superuser, system, sysadmin, support, helpdesk
- **Marque / Jeu** : wep, worldexplorerprotocol, world explorer protocol, jasper, valcourt, jasper valcourt, protocole
- **Roles** : owner, creator, fondateur, founder, staff, team, official, officiel

## Implementation

### 1. Validation cote client (`src/pages/Auth.tsx`)

Avant d'appeler `signUp`, verifier le `displayName` contre la liste noire :

- Normaliser le nom : minuscule, retirer accents, retirer espaces multiples
- Verifier si le nom normalise correspond exactement ou contient un mot interdit
- Si match : afficher un toast d'erreur "Ce nom de code est reserve. Choisissez un autre identifiant." et bloquer la soumission

### 2. Validation cote serveur (trigger SQL)

Ajouter un trigger `BEFORE INSERT` sur la table `profiles` qui verifie le `display_name` et rejette l'insertion si le nom est interdit. Cela protege contre toute manipulation directe de l'API.

### 3. Fonction utilitaire

Creer une fonction `isDisplayNameForbidden(name: string): boolean` dans un fichier utilitaire pour centraliser la logique de validation.

## Details techniques

### Fichiers modifies

- `src/pages/Auth.tsx` -- ajout de la validation avant `signUp`
- `src/lib/forbiddenNames.ts` -- nouveau fichier avec la liste noire et la fonction de validation

### Migration SQL

- Creer une fonction SQL `check_display_name_allowed()` en `SECURITY DEFINER`
- Creer un trigger `BEFORE INSERT OR UPDATE` sur `profiles` qui appelle cette fonction
- Le trigger rejette avec une erreur si le `display_name` normalise contient un mot interdit

### Normalisation

La verification normalise le texte ainsi :
1. Conversion en minuscules
2. Suppression des accents (e -> e, a -> a)
3. Suppression des caracteres speciaux (tirets, underscores, points)
4. Comparaison exacte ET par inclusion (substring)

### UX

- Message d'erreur clair et immersif : "Ce nom de code est deja attribue a un agent actif. Choisissez un autre identifiant."
- Pas de revelation de la liste exacte des mots interdits (securite par opacite)
- Validation en temps reel possible (bordure rouge sur le champ si mot interdit detecte)

