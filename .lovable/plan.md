
# Système d'Indices XP + Classement Public des Agents

## Vue d'ensemble des deux fonctionnalités

### 1. Boutique d'Indices (dépenser des XP)
Les joueurs pourront dépenser leurs XP pendant une mission pour révéler un indice — soit un **texte narratif** (50 XP), soit une **photo d'archive** (100 XP) si le JSON du pays en contient une.

### 2. Classement Public (Leaderboard)
Un classement des agents visible par tous, basé sur les XP totaux. Le joueur doit avoir un pseudo public (display_name) pour y apparaître. Option de se rendre visible ou invisible dans le classement.

---

## Analyse de l'existant

### Système d'indices actuel (Mission.tsx)
- Un indice gratuit existe déjà via `ArchiveHintModal` mais **seulement si trust_level > 70**
- `usedHint` est tracké (badge "Esprit Pur" = zéro indice)
- Les JSON pays ont un champ `hint_image?: { url, caption }` sur certaines questions
- Il n'existe pas de "texte indice" structuré — on le créera comme le texte de `narrative_unlock` ou d'`explanation`

### Profils (profiles table)
- Champ `xp` (integer) ✅
- Champ `display_name` ✅ — déjà saisi à l'inscription ("Nom de code")
- Pas de champ `leaderboard_visible` → **migration nécessaire**

### XP (Mission.tsx, completeMission)
- XP calculé mais mis à jour en DB dans `completeMission()` → déjà en base
- L'achat d'indice devra **déduire les XP immédiatement** via un update Supabase

---

## Ce qui est nécessaire

### Migration base de données
Ajouter une seule colonne à `profiles` :
```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS leaderboard_visible boolean NOT NULL DEFAULT true;
```

### Nouvelles RLS policies pour leaderboard
Le leaderboard doit être lisible publiquement (mais seulement les display_name + xp + level des profils qui ont `leaderboard_visible = true`).

Option A : vue publique filtrée (la plus propre)
```sql
CREATE VIEW public.leaderboard AS
  SELECT display_name, xp, level, subscription_type
  FROM public.profiles
  WHERE leaderboard_visible = true
  ORDER BY xp DESC;
```

---

## Plan d'implémentation

### Étape 1 — Migration DB
- Ajouter `leaderboard_visible boolean DEFAULT true` à `profiles`
- Créer une vue `leaderboard` publiquement lisible (SELECT seul, pas d'auth)

### Étape 2 — Boutique d'Indices dans Mission.tsx
Ajouter un bouton "ACHETER INDICE" visible pendant la phase `enigme`, au-dessus du timer ou dans la barre de header.

**Logique :**
- Si XP joueur >= 50 → bouton actif
- Clic → modal de choix :
  - **INDICE TEXTE** (50 XP) : affiche le texte `explanation` de la question courante, ou un texte narratif générique basé sur le type A/B/C
  - **INDICE PHOTO** (100 XP) : disponible seulement si la question a un `hint_image`. Ouvre l'`ArchiveHintModal` existant.
- Après achat : déduire les XP de `profiles` en DB, `setUsedHint(true)` (pénalise le badge "Esprit Pur")
- Affichage du coût XP dans le header (solde XP courant)

**Modal d'achat d'indice :**
```
╔══════════════════════════════════════╗
║  BOUTIQUE D'ARCHIVES — W.E.P.       ║
║  Solde : 340 XP                     ║
╠══════════════════════════════════════╣
║  📄 INDICE TEXTE         [ 50 XP ] ║
║  "Révèle un élément narratif"       ║
║                                     ║
║  📷 ARCHIVE PHOTO       [100 XP ]  ║
║  (non disponible pour cette énigme) ║
╚══════════════════════════════════════╝
```

### Étape 3 — Classement Public (nouvelle page /leaderboard)
Nouvelle page accessible depuis le Dashboard, affichant :
- Top 20 agents par XP
- Nom de code (display_name)
- Niveau + titre (Explorateur / Agent / Stratège / Architecte / Maître)
- XP total
- Abonnement type (badge FREE / AGENT / DIRECTOR)
- Rang (1er, 2e, 3e avec médaille 🥇🥈🥉)

**Option de visibilité :**
- Dans le profil Dashboard : toggle "APPARAÎTRE DANS LE CLASSEMENT" (met à jour `leaderboard_visible`)
- Si display_name est vide → incité à en définir un

### Étape 4 — Intégration Dashboard
- Ajouter un bouton "CLASSEMENT" dans la nav/header du Dashboard
- Afficher le rang du joueur actuel dans sa fiche profil ("Votre rang : #12")

---

## Fichiers à modifier / créer

| Fichier | Changement |
|---|---|
| `src/pages/Mission.tsx` | Ajout boutique d'indices XP (modal + logique achat) |
| `src/pages/Dashboard.tsx` | Ajout toggle leaderboard_visible + lien vers classement + rang affiché |
| `src/pages/Leaderboard.tsx` | **NOUVEAU** — page classement public |
| `src/App.tsx` | Route `/leaderboard` |
| Migration SQL | `leaderboard_visible` + vue `leaderboard` |

---

## Règles importantes
- **Pas de pénalité de score** pour l'achat d'indice (les XP sont déjà gagnés)
- Seul le **badge "Esprit Pur"** (no_hints) est impacté → `setUsedHint(true)`
- Le joueur doit avoir au moins **50 XP** pour acheter un indice texte (pas de dette XP)
- Si le joueur n'a pas de display_name, un message l'invite à en créer un pour le classement
- Le classement est visible même sans compte (lecture publique via la vue)
- La position du joueur connecté est mise en évidence dans la liste

---

## Textes d'indices par type de question
Puisque les questions A/B/C n'ont pas toutes un champ `explanation`, on génère un texte selon le type :
- **Type A** (factuel) → "Cette information est vérifiable directement dans les données géographiques ou économiques du pays."
- **Type B** (analytique) → "Réfléchissez à l'impact systémique de chaque réponse sur l'équilibre mondial."
- **Type C** (narratif) → révèle le `narrative_unlock` s'il existe, sinon texte générique.
- Si `hint_image` existe → propose l'archive photo en supplément.

