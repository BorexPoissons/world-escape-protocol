
# Corrections multiples — Admin, Progression Free, Missions, Import JSON

## Problèmes identifiés

### 1. Tier FREE — Affiche 3 pays au lieu de 5
**Cause :** Dans `Admin.tsx` (ligne 34) et `Admin.tsx` (ligne 201), le seuil du tier FREE est `<= 3`. Or en base, CH=1, BR=2, CN=3, US=4, IN=5. Les pays US et IN ont un `release_order` de 4 et 5, ils tombent donc dans le tier AGENT.

**Fix :** Mettre le seuil FREE à `<= 5` dans Admin.tsx (2 endroits : `getTierLabel()` et `freeCountries`/`agentCountries` calculations).

### 2. Missions dupliquées / compteur 14 gonflé
**Cause :** Chaque run de quiz crée une nouvelle entrée en base. L'admin affiche toutes les tentatives, pas les missions uniques par pays. Le joueur a rejoué CH et US plusieurs fois, ce qui crée des doublons.

**Fix :** Dans l'onglet MISSIONS de l'admin, ajouter un indicateur visuel clair du pays et de la date. Ajouter aussi un filtre "UNIQUE PAR PAYS" pour voir les meilleures performances seulement. Dans l'APERÇU, afficher les "missions jouées" avec une note explicative (replays inclus).

### 3. Import JSON de contenu pays
**Besoin :** L'admin veut pouvoir importer un fichier JSON (comme BR.json, IN.json) directement depuis l'interface pour mettre à jour `/public/content/countries/`.

**Fix :** Ajouter un bouton "IMPORTER JSON" dans l'onglet PAYS de l'admin. Il lit le JSON uploadé et met à jour les métadonnées du pays dans la base de données (name, description, monuments, historical_events, symbols). Note : les fichiers JSON statiques dans `/public/content/countries/` ne peuvent pas être modifiés depuis le frontend — mais on peut extraire les métadonnées du JSON et les upsert dans la table `countries` en base. On affichera aussi un aperçu du JSON importé.

### 4. Admin — Onglet ACHATS (gestion Stripe + déblocage modules)
**Besoin :** L'admin veut voir et gérer les achats Stripe des utilisateurs, et débloquer manuellement des modules.

**Fix :** Ajouter un 5e onglet "ACHATS" dans l'admin avec :
- Liste des utilisateurs avec leur `subscription_type` actuel
- Boutons pour changer manuellement : FREE → AGENT (season1) → DIRECTOR
- Badge visuel du tier actuel (couleur-codé)
- Statistiques : combien d'agents/directors actifs
- Section "déblocage manuel" avec confirmation

## Plan technique détaillé

### Fichier : `src/pages/Admin.tsx`

#### Fix 1 — Seuil tier FREE : 3 → 5
- Ligne 34 : `if (order <= 3)` → `if (order <= 5)`
- Ligne 201-203 : `release_order <= 3` → `<= 5`, et `> 3 && <= 50` → `> 5 && <= 50`
- Ligne 294 : Label "Pays 1–3" → "Pays 1–5"
- Ligne 431 : Label "TIER FREE (1–3)" → "TIER FREE (1–5)"
- Ligne 441 : filtre `> 3` → `> 5`
- Ligne 448 : filtre `> 3` → `> 5`

#### Fix 2 — Missions : meilleur affichage + filtre unique
- Ajouter une colonne `country_code` en récupérant le pays via `country_id`
- Ajouter bouton filtre "PAR PAYS" pour dédupliquer (garder le meilleur score)
- Afficher un sous-titre avec la date + nombre de tentatives pour chaque mission unique

#### Fix 3 — Import JSON pays
Ajouter dans l'onglet PAYS :
- Bouton `IMPORTER JSON` avec `<input type="file" accept=".json">`
- Parsing du JSON uploadé (format country mission JSON)
- Extraction : `country.code`, `mission.mission_title`, `quiz_rules`, `question_bank` length
- Upsert en base : met à jour `name`, `description` du pays dans la table `countries`
- Feedback visuel : affichage des métadonnées extraites du JSON

#### Fix 4 — Nouvel onglet ACHATS
Ajouter un 5e onglet dans l'admin :
```
tabs = [...existants, { key: "purchases", label: "ACHATS", icon: CreditCard }]
```

Contenu de l'onglet ACHATS :
- KPI cards : nb FREE / AGENT / DIRECTOR
- Liste agents avec subscription_type actuel + boutons de changement manuel
- Fonction `handleSubscriptionChange(userId, newType)` qui fait un UPDATE sur `profiles.subscription_type`
- Confirmation avant changement ("Confirmer le déblocage AGENT pour [nom] ?")
- Log des changements (timestamp affiché)

## Fichiers modifiés

- `src/pages/Admin.tsx` — corrections des seuils + nouvel onglet ACHATS + import JSON + fix missions

## Ce qui n'est PAS modifié
- Les fichiers JSON statiques dans `/public/content/countries/` (impossible depuis le frontend, c'est normal)
- La logique Stripe existante
- Le Dashboard et les autres pages

## Ordre d'implémentation
1. Fix seuil FREE (1–5) — simple, 1 minute
2. Fix affichage missions admin — amélioration UX
3. Ajout import JSON
4. Nouvel onglet ACHATS avec déblocage manuel
