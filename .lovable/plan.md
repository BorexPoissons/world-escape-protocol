

# Corrections Admin : donnees justes + bouton "Reinitialiser le jeu"

## Probleme 1 : Score Moyen affiche "3.0/6" alors que les missions free sont sur 3

Les 5 missions gratuites (CH, FR, EG, US, JP) ont 3 questions chacune, pas 6. Le score moyen dans l'onglet APERCU divise toujours par 6 (`avgScore/6`), ce qui est faux.

**Correction** : Calculer le score moyen reel en tenant compte du total par mission. Les missions free (saison 0) ont un total de 3, les missions standard ont un total de 6. L'affichage deviendra `3.0/3` ou un pourcentage.

**Fichier** : `src/pages/Admin.tsx`
- Ligne ~474 : remplacer le calcul `avgScore/6` par un calcul dynamique
- Croiser avec `countries_missions` ou `countries` pour determiner le total par mission
- Afficher le score sous forme de pourcentage (`100%`) ou ratio dynamique

## Probleme 2 : Missions recentes affichent "3/6" au lieu de "3/3"

Dans la section "MISSIONS RECENTES" de l'apercu et dans l'onglet MISSIONS, chaque mission affiche `score/6` en dur.

**Correction** :
- Ligne ~654 et ~1109 : remplacer `{m.score ?? 0}/6` par un ratio dynamique base sur le type de mission
- Charger les donnees `countries_missions` pour connaitre le nombre de questions par pays
- Afficher `3/3` pour les missions free et `X/6` pour les missions standard

## Probleme 3 : Progression pays affiche "best_score/6" pour tous

Dans le panneau agent expanse (ligne ~974), le score affiche `{pr.best_score}/6` en dur.

**Correction** : Meme logique — utiliser le total reel par pays.

## Nouvelle fonctionnalite : Bouton "Reinitialiser le jeu"

Ajouter un bouton **visible uniquement par l'admin** dans l'onglet AGENTS (panneau expanse d'un utilisateur) permettant de reinitialiser la progression d'un joueur.

### Fonctionnement

Un dropdown ou dialog avec choix :
- **Reinitialiser tout** : supprime toutes les donnees de progression du joueur
- **Depuis Saison 0 (jeu gratuit)** : supprime tout et repart de zero
- **Depuis Saison 1** : conserve la progression gratuite (S0), supprime S1+
- **Depuis Saison 2** : conserve S0 et S1, supprime S2+

### Tables a nettoyer selon le choix

| Table | Donnee supprimee |
|-------|-----------------|
| `missions` | Toutes les missions du joueur (filtrees par saison si partiel) |
| `player_country_progress` | Progression pays (filtree par country_code) |
| `user_fragments` | Fragments collectes (filtres par country_id) |
| `user_tokens` | Tokens/lettres (filtres par country_code) |
| `user_progress` | Progression alternative (si utilisee) |
| `profiles` | Remettre XP, level, streak a zero (ou recalculer si partiel) |
| `user_story_state` | Reinitialiser l'etat narratif |

### Implementation technique

- Creer une **edge function** `reset-player-progress` qui recoit `{ user_id, reset_from: "all" | "season0" | "season1" | "season2" }`
- L'edge function utilise le service role key pour supprimer les donnees (les RLS empechent un admin de supprimer les donnees d'un autre utilisateur via le client)
- Elle verifie que l'appelant est admin via `has_role()`
- Bouton dans le panneau expanse de chaque agent avec confirmation modale

### UI dans l'onglet AGENTS

- Bouton rouge "REINITIALISER" dans le panneau expanse de chaque agent
- Clic ouvre une modale de confirmation avec le choix du point de depart
- Apres confirmation, appel de l'edge function et rafraichissement des donnees

## Resume des fichiers

| Fichier | Modification |
|---------|-------------|
| `src/pages/Admin.tsx` | Correction scores dynamiques, ajout bouton reinitialisation, modale de confirmation |
| `supabase/functions/reset-player-progress/index.ts` | Nouvelle edge function pour reinitialiser la progression |

