
# Correction : Modal pays + Inventaire fragments améliorés

## Problème 1 — Modal "Pièces : 1/5" confus et pas de rendu visuel de la pièce

### Ce qui se passe
Quand l'utilisateur clique sur CH (Suisse) sur la carte, le modal `MissionDetailModal` affiche :
- **"PIÈCES : 1/5"** — cela vient du fait que `TOTAL_PIECES_PER_COUNTRY = 5`, mais le joueur ne collecte qu'**1 fragment par pays** (1 mission = 1 fragment). Afficher "1/5" est donc trompeur et ne veut rien dire dans le gameplay actuel.
- **Aucune pièce SVG visible** dans le modal — juste le texte "PIÈCES: 1/5" en tout petit sous le nom du pays.

### Ce qui va changer
**Dans `MissionDetailModal.tsx` :**

1. **Remplacer "PIÈCES: 1/5" par un affichage binaire clair :**
   - Si le fragment est collecté : afficher **"FRAGMENT COLLECTÉ ✓"** avec une pièce SVG animée (doré, style identique à `FragmentInventory`)
   - Si non collecté : afficher **"FRAGMENT NON OBTENU"** avec une pièce en silhouette grisée
   - Supprimer la barre de progression inutile (20% pour 1/5 n'a pas de sens)

2. **Ajouter la pièce SVG visuelle dans le modal** — une version plus grande (80×80px) de la pièce avec son dégradé doré et animation spring, centrée dans le header

3. **Afficher l'indice narratif lié au fragment** — depuis les données `fragment_reward` du JSON du pays :
   - Nom du fragment : "Fragment de la Croix Alpine"
   - Concept : "NŒUD_FINANCIER"
   - Message débloqué : "Les flux sont le premier mécanisme."

**Pour accéder aux données JSON du pays depuis le modal**, `MissionDetailModal` va charger dynamiquement `public/content/countries/{CODE}.json` via un `useEffect` + `fetch` au montage.

**Nouvelle prop transmise :** `hasFragment: boolean` (si l'utilisateur possède déjà le fragment du pays)

---

## Problème 2 — Inventaire des fragments peu réaliste + pas de clic pour voir la pièce

### Ce qui se passe
Les pièces dans `FragmentInventory` sont :
- Cliquables via drag-and-drop uniquement
- Pas d'action "clic" pour ouvrir un détail
- Design SVG basique (pas assez 3D/réaliste)

### Ce qui va changer
**Dans `FragmentInventory.tsx` :**

1. **Amélioration visuelle des pièces SVG** — effet 3D plus prononcé :
   - Ombre portée plus marquée (translateY)
   - Reflet de lumière sur le bord supérieur (stroke blanc semi-transparent)
   - Lueur colorée animée en `pulse` (halo)
   - Légère rotation 3D CSS (`rotateX(12deg) rotateY(-8deg)`) via `perspective`

2. **Clic sur une pièce = ouverture d'un modal de détail** — un nouveau composant `FragmentDetailModal` (ou état inline) qui affiche :
   - La pièce en grand (120×120px) avec animation d'entrée
   - Le nom du pays + drapeau
   - **Le nom du fragment** (ex: "Fragment de la Croix Alpine")
   - **Le concept géopolitique** (ex: "NŒUD_FINANCIER")
   - **L'indice narratif** (ex: "Les flux sont le premier mécanisme.") — le message `unlocked_message` du `fragment_reward` dans le JSON
   - **La narrative_unlock** des questions Type C réussies (ex: "Ce pays ne dirige pas. Il canalise." et "Un modèle n'a pas besoin d'un chef. Il a besoin de passages.")
   - Un bouton "PLACER SUR LA CARTE" qui ferme le modal et scrolle vers la carte

**Chargement des données narratives :** fetch dynamique sur `public/content/countries/{countryCode}.json` au clic, avec gestion du loading.

---

## Fichiers modifiés

| Fichier | Modification |
|---|---|
| `src/components/MissionDetailModal.tsx` | Affichage fragment binaire (collecté/non), pièce SVG visible, données narratives depuis JSON |
| `src/components/FragmentInventory.tsx` | Pièces SVG améliorées 3D, clic pour modal de détail avec indice narratif |
| `src/pages/Puzzle.tsx` | Passer `hasFragment` prop au `MissionDetailModal` |

---

## Résultat attendu

1. En cliquant sur CH → modal clair : pièce SVG dorée visible + "FRAGMENT COLLECTÉ ✓" + nom du fragment + indice narratif
2. En cliquant sur une pièce dans l'inventaire → modal plein de détails : nom, concept, indice, narrative_unlock des questions Type C
3. Les pièces dans l'inventaire semblent plus réalistes (3D, lumière, halo pulsant)
