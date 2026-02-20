

# Verification en temps reel de la disponibilite du nom de code

## Objectif

Ajouter un indicateur visuel (checkmark vert / croix rouge) a cote du champ "Nom de code" sur la page d'inscription, qui verifie en temps reel si le nom est deja pris dans la base de donnees.

## Comportement

- Le joueur tape son nom de code
- Apres un debounce de 500ms (pour eviter trop de requetes), une verification est lancee contre la table `profiles` dans la base
- 3 etats possibles :
  - **Vide / trop court** (moins de 2 caracteres) : pas d'icone affichee
  - **Nom interdit** (liste noire existante) : croix rouge + texte "Nom reserve"
  - **Nom deja pris** (existe dans `profiles.display_name`) : croix rouge + texte "Deja pris"
  - **Nom disponible** : checkmark vert + texte "Disponible"
- Un petit spinner s'affiche pendant la verification

## Details techniques

### Fichier modifie : `src/pages/Auth.tsx`

- Ajouter des states : `nameStatus` (`idle` | `checking` | `available` | `taken` | `forbidden`), `nameCheckTimeout`
- Sur chaque changement de `displayName` :
  1. Verifier d'abord cote client si le nom est dans la liste interdite (`isDisplayNameForbidden`)
  2. Si OK, lancer un debounce de 500ms puis faire un `select` sur `profiles` via une requete RPC ou directe
- Requete Supabase : appel a une nouvelle fonction RPC `check_display_name_available(p_name text)` qui retourne `true/false`
  - Cette fonction compare le `display_name` normalise dans la table `profiles` sans exposer la liste des noms existants
- Afficher l'icone correspondante a droite du champ Input (CheckCircle vert, XCircle rouge, ou Loader spinner)

### Migration SQL

Creer une fonction RPC `check_display_name_available(p_name text)` :
- Normalise le nom (lowercase, unaccent, trim)
- Verifie s'il existe un profil avec ce `display_name` normalise
- Retourne `true` si disponible, `false` si pris
- `SECURITY DEFINER` pour permettre l'acces sans authentification (le joueur n'est pas encore connecte)

### UX

- Icone a droite du champ "Nom de code" (dans le meme `relative` container)
- Couleurs : vert (`text-green-500`) pour disponible, rouge (`text-red-500`) pour pris/reserve
- Petit texte sous le champ indiquant le statut
- Spinner discret (`Loader2` avec animation `animate-spin`) pendant la verification

### Fichiers concernes

- `src/pages/Auth.tsx` -- logique debounce + affichage icone/statut
- Migration SQL -- nouvelle fonction RPC `check_display_name_available`

