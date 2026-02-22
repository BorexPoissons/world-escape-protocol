

# Nettoyage complet : suppression du contenu legacy CH/US/CN

## Objectif

Supprimer tout le contenu legacy des 3 premiers pays (CH, US, CN) et s'assurer que le systeme lit exclusivement le contenu canonique depuis la base de donnees.

---

## Etat actuel

| Element | CH | US | CN |
|---------|----|----|-----|
| DB `is_free` | false (corrige) | **true** | false |
| DB content JSONB | Canonique v3.4.0 (7Q) | Legacy free format | Legacy free format |
| Static JSON | **Legacy 10Q** | Legacy free format | Legacy free format |
| Prison Break DB | Present (3 templates) | Absent | Absent |

**Probleme principal** : Le fichier `CH.json` contient encore l'ancien format (10 questions, pas de Prison Break, ancienne intro avec "BIS Basel"). `Mission.tsx` charge ce fichier statique **en priorite** (ligne 210-283) avant de consulter la DB.

---

## Actions

### 1. Supprimer les fichiers JSON statiques legacy

Supprimer les 3 fichiers qui ne sont plus la source de verite :
- `public/content/countries/CH.json` (10 questions legacy)
- `public/content/countries/US.json` (format free legacy)
- `public/content/countries/CN.json` (format free legacy)

### 2. Corriger `is_free` pour US dans la DB

Mettre `is_free = false` pour US dans `countries_missions` (actuellement `true`).

### 3. Mettre a jour le flag `is_free` dans le JSONB content de CH

Dans le contenu JSONB de CH en DB, `meta.availability.is_free` est encore `true`. Le mettre a `false` pour coherence.

### 4. Modifier le chargement dans `Mission.tsx`

Actuellement le flux est :
1. Check DB `is_free` → redirect free-mission
2. Fetch static JSON → si present, l'utiliser
3. Fallback DB questions
4. Fallback AI

**Nouveau flux** (DB-first, conforme a la regle d'or) :
1. Check DB `is_free` → redirect free-mission
2. Charger le contenu depuis `countries_missions.content` (JSONB) → si `question_bank` present avec 7 questions, l'utiliser
3. Fallback static JSON (pour les pays pas encore migres)
4. Fallback DB `questions` table
5. Fallback AI

Cela garantit que CH lira le contenu canonique v3.4.0 depuis la DB.

### 5. Integrer Prison Break dans `Mission.tsx`

Quand le score est < 80% (moins de 6/7), rediriger vers `/prison-break/:countryId` au lieu d'afficher l'ecran "failed" classique. Le composant `PrisonBreak.tsx` existe deja avec 5 templates rotatifs.

### 6. Mettre a jour la config mission par defaut

Aligner `DEFAULT_MISSION_CONFIG` dans `Mission.tsx` sur les regles canoniques :
- `total_questions: 7` (au lieu de 6)
- `min_correct_to_win: 6` (au lieu de 5)
- `lives: 3` (au lieu de 2)
- `time_per_question_sec: 120` (deja correct)

### 7. Retirer CH de la liste `STATIC_CONTENT_CODES` dans l'edge function

Dans `supabase/functions/generate-mission/index.ts`, retirer CH (et US, CN) de `STATIC_CONTENT_CODES` car ces fichiers n'existeront plus.

### 8. Supprimer les anciennes questions CH dans la table `questions`

Les 7 questions dans la table `questions` pour CH (id `05674046...`) sont des copies importees via l'admin. Elles ne sont plus necessaires car le contenu vient du JSONB. Les supprimer pour eviter toute confusion.

---

## Details techniques

### Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `public/content/countries/CH.json` | Supprime |
| `public/content/countries/US.json` | Supprime |
| `public/content/countries/CN.json` | Supprime |
| `src/pages/Mission.tsx` | DB-first loading, Prison Break redirect, config 7/6/3/120 |
| `supabase/functions/generate-mission/index.ts` | Retirer CH/US/CN de STATIC_CONTENT_CODES |

### Migration DB

```text
1. UPDATE countries_missions SET is_free = false WHERE code = 'US';
2. UPDATE countries_missions SET content = jsonb_set(content, '{meta,availability,is_free}', 'false') WHERE code = 'CH';
3. DELETE FROM questions WHERE country_id = '05674046-c9c9-4b4b-9fcb-f715e94ae2e0';
```

### Flux de chargement Mission.tsx (apres)

```text
loadMission()
  |
  +-- DB: countries_missions.is_free? --> oui --> /free-mission/
  |
  +-- DB: countries_missions.content.question_bank? (7Q format)
  |     |
  |     +-- oui --> construire enigmes, appliquer quiz_rules, demarrer
  |     |           si echec < 80% --> /prison-break/:countryId
  |     |
  |     +-- non --> fallback static JSON
  |                 --> fallback DB questions table
  |                 --> fallback AI generation
```

### Verification post-implementation

- CH charge 7 questions depuis la DB (pas le fichier statique)
- Timer = 120s, 3 vies, seuil 6/7
- Echec < 6/7 redirige vers Prison Break
- Aucune question legacy (BIS Basel, cantons, etc.) n'apparait
- US et CN ne redirigent plus vers free-mission

