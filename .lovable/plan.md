

# Fix: Fragments manquants US/JP + Progression linaire + Dilemme Central

## Problemes identifies (3 bugs lies)

### 1. Fragments US et JP absents de la base de donnees
La base contient 5 tokens (CH, FR, EG, US, JP) mais seulement 3 fragments (CH, FR, EG). Les lignes `player_country_progress` pour US et JP sont egalement absentes. Le RPC `complete_country_attempt` a probablement echoue silencieusement lors de ces missions.

**Impact** : compteur affiche 3/195 au lieu de 5/195, inventaire montre 3 pieces au lieu de 5, routes sur la carte ne s'allument pas pour EG-US et US-JP.

### 2. "Prochaine destination" affiche France au lieu du Dilemme Central
La logique (ligne 410 de Puzzle.tsx) cherche le premier pays du Signal Initial sans fragment. Comme US n'a pas de fragment, il affiche US (ou France dans certains cas). Apres les 5 missions, il devrait afficher le Dilemme Central.

### 3. Routes incompletes sur la carte
Les lignes de connexion s'allument quand `from.unlockedPieces > 0`. Comme US et JP n'ont pas de fragments, les segments EG-US et US-JP restent eteints. Corriger les donnees corrige automatiquement les routes.

---

## Plan de correction

### Etape 1 — Reparation des donnees (SQL)

Inserer les fragments et progres manquants pour US et JP :

```text
INSERT INTO user_fragments (user_id, country_id, fragment_index, is_placed)
  VALUES ('70ec...', 'fa71...(US)', 0, false),
         ('70ec...', '4fe4...(JP)', 0, false)
  ON CONFLICT DO NOTHING;

INSERT INTO player_country_progress (user_id, country_code, best_score, last_score, attempts_count, fragment_granted)
  VALUES ('70ec...', 'US', 3, 3, 2, true),
         ('70ec...', 'JP', 3, 3, 1, true)
  ON CONFLICT DO NOTHING;
```

### Etape 2 — Logique "Prochaine destination" (Puzzle.tsx)

Modifier les lignes 406-426 pour gerer le cas "Signal Initial termine" :

- Si les 5 pays CH/FR/EG/US/JP ont tous un fragment --> `nextSequenceCode = null`
- Si `nextSequenceCode === null` ET `tier === "free"` : afficher un CTA vers le Dilemme Central (`/central-dilemma`) au lieu du bloc upgrade
- Texte : "DILEMME CENTRAL" / "Resolvez l'enigme finale du Signal Initial"
- Bouton : "ACCEDER AU DILEMME" redirige vers `/central-dilemma`
- Le bloc upgrade (19.90 CHF) ne s'affiche qu'apres validation du Dilemme Central (basee sur `user_story_state.central_word_validated`)

### Etape 3 — Meme logique sur Dashboard.tsx

Verifier que le Dashboard utilise la meme detection "5 pays completes" pour afficher le bon widget de progression.

---

## Details techniques

### Fichiers modifies
- `src/pages/Puzzle.tsx` : logique "continueCountry" + nouveau bloc CTA Dilemme Central
- Aucune modification de `CinematicWorldMap.tsx` (les routes se corrigent automatiquement avec les donnees)

### Nouveau flux apres correction

```text
Puzzle avec 5/5 fragments
  --> Routes toutes allumees (CH-FR-EG-US-JP)
  --> Inventaire : 5 pieces disponibles
  --> Widget bas : "DILEMME CENTRAL" au lieu de "Prochaine destination"
  --> Clic --> /central-dilemma --> SWISS --> Revelation OPEN --> CTA Saison 1
```

### Pas de modification de schema
Toutes les tables necessaires existent deja. Seule une reparation de donnees + un ajustement de logique front-end sont requis.
