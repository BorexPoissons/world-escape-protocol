
# Securisation de l'authentification pour la production

## Objectif
Rendre la connexion obligatoire pour toutes les pages protegees et supprimer le mode "demo" / "Explorer sans compte". L'admin conserve son acces via le role existant en base.

## Etat actuel
- Le Dashboard fonctionne sans compte (`isDemo = !user`) avec des donnees limitees
- La page Auth propose un bouton "EXPLORER SANS COMPTE" qui mene directement au Dashboard
- Les pages Mission, FreeMission, MissionComplete, Puzzle, CentralDilemma fonctionnent partiellement sans authentification (mode demo avec localStorage)
- L'admin est deja correctement securise cote serveur (table `user_roles`, fonction `has_role`)
- Votre compte admin existe : `70ec2098-060c-4af7-82db-e520df6dd046`

## Changements prevus

### 1. Creer un composant `ProtectedRoute`
Un wrapper qui verifie l'authentification et redirige vers `/auth` si l'utilisateur n'est pas connecte. Affiche un ecran de chargement pendant la verification.

### 2. Proteger toutes les routes dans `App.tsx`
Encapsuler les routes suivantes avec `ProtectedRoute` :
- `/dashboard`
- `/mission/:countryId`
- `/free-mission/:countryId`
- `/mission/:countryId/complete`
- `/puzzle`
- `/admin`
- `/dilemme-central`
- `/leaderboard`
- `/season1`

Les routes publiques restent accessibles : `/` (Landing) et `/auth`.

### 3. Supprimer le mode demo
- **Auth.tsx** : Retirer le bloc "MODE DECOUVERTE" / "EXPLORER SANS COMPTE"
- **Dashboard.tsx** : Supprimer la logique `isDemo = !user` et le fallback sans authentification. Rediriger vers `/auth` si pas connecte.
- **Mission.tsx** : Supprimer `DEMO_USER_ID` et la logique localStorage pour les utilisateurs non connectes
- **FreeMission.tsx** : Supprimer le mode demo similaire
- **MissionComplete.tsx** : Supprimer le parametre `demo=1` et la logique associee

### 4. Securiser la page Admin
La verification admin est deja en place (requete `user_roles`). Le `ProtectedRoute` garantira en plus qu'un utilisateur est connecte avant meme d'atteindre la page.

## Details techniques

```text
Routes publiques          Routes protegees (ProtectedRoute)
+-----------+             +----------------------------+
| /         |             | /dashboard                 |
| /auth     |             | /mission/:id               |
+-----------+             | /free-mission/:id          |
                          | /mission/:id/complete      |
                          | /puzzle                    |
                          | /admin                     |
                          | /dilemme-central           |
                          | /leaderboard               |
                          | /season1                   |
                          +----------------------------+
```

### Fichiers modifies
1. **Nouveau** : `src/components/ProtectedRoute.tsx` - composant de garde d'authentification
2. **`src/App.tsx`** - encapsuler les routes protegees
3. **`src/pages/Auth.tsx`** - supprimer le bouton "Explorer sans compte"
4. **`src/pages/Dashboard.tsx`** - supprimer `isDemo` et le mode non-authentifie
5. **`src/pages/Mission.tsx`** - supprimer `DEMO_USER_ID` et la logique demo
6. **`src/pages/FreeMission.tsx`** - supprimer le mode demo
7. **`src/pages/MissionComplete.tsx`** - supprimer le parametre `demo=1`

### Impact
- Tout utilisateur non connecte sera redirige vers `/auth`
- Le leaderboard reste accessible uniquement aux utilisateurs connectes (securise par RLS)
- Votre compte admin existant continue de fonctionner normalement
- Les RLS policies existantes protegent deja correctement les donnees par `user_id`
