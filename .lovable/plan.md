
# La Révélation Finale — 195 Pièces : Expérience Cinématique Complète

## Ce qui existe déjà

L'architecture actuelle prépare déjà plusieurs éléments pour ce moment :
- `RevealOverlay` avec des seuils narratifs progressifs (0% → 100%)
- `CinematicWorldMap` avec un zoom lent déjà codé à 99%
- Le message final de Jasper Velcourt : *"Le Cercle n'est pas une organisation. C'est une architecture."*
- La luminosité de la carte qui évolue avec `mapBrightness`

Ce qui manque : une **séquence cinématique dédiée** pour le moment exact où la 195e pièce est placée.

---

## La Séquence Complète — 7 Actes

### ACTE 1 — Le "Snap" final (0s → 3s)
La 195e pièce est glissée sur la carte. Au lieu du simple snap normal :

- Toutes les 195 gemmes sur la carte **pulsent simultanément** (flash blanc)
- Un son de "verrouillage" (vibration CSS)
- Le message HUD change : `"⬢ CONVERGENCE COMPLÈTE — ANALYSE EN COURS…"`
- Écran **freeze pendant 0.8s** — silence total

### ACTE 2 — L'Onde de Choc (3s → 6s)
Une onde circulaire se propage depuis le dernier pays placé vers les bords de la carte :

- Anneau SVG animé (`r` de 0 → 200, opacity 1 → 0, durée 2s)
- Couleur : blanc pur puis or `hsl(40 90% 72%)`
- Tous les nœuds de pays **s'illuminent dans l'ordre de l'onde**
- Les lignes intercontinentales deviennent **toutes dorées** simultanément

### ACTE 3 — La Révélation de la Carte (6s → 12s)
La carte se révèle progressivement :

- `brightness` passe de la valeur courante → `1.0` en 4s (transition fluide)
- `saturate` monte → `1.8` (couleurs éclatantes)
- `scale` : zoom lent 1.0 → 1.08 → retour à 1.0
- Le fond sombre disparaît progressivement (vignette opacity → 0)
- Les scanlines s'effacent

### ACTE 4 — Le Symbole Central (8s → 14s)
Le symbole central (déjà présent à 75%) se **cristallise** :

- Le cercle flou se rend net et lumineux (feGaussianBlur stdDeviation : 2.5 → 0)
- Les 5 nœuds stratégiques (α, β, γ, δ, ε) convergent visuellement vers le centre avec des traits
- Le symbole tourne lentement une fois (360° en 3s) puis se stabilise

### ACTE 5 — Le Message de Jasper (12s → 20s)
**Plein écran avec fond semi-transparent** :

```
TRANSMISSION CHIFFRÉE — NIVEAU DIRECTEUR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

"Le Cercle n'est pas une organisation.
 C'est une architecture."
                        — JASPER VELCOURT
                          AGENT PRINCIPAL W.E.P.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROTOCOLE OMÉGA : COMPLÉTÉ
195 TERRITOIRES · 975 FRAGMENTS · 1 VÉRITÉ
```

Chaque ligne apparaît avec un effet typing (délai 0.5s entre chaque ligne).

### ACTE 6 — Le Badge "MAÎTRE DU PROTOCOLE" (18s → 22s)
Un badge unique se révèle au centre :

- Fond noir avec cadre or animé
- Icône : symbole W.E.P. central (Ω doré)
- Titre : `MAÎTRE DU PROTOCOLE`
- Sous-titre : `AGENT #00195 · RÉVÉLATION TOTALE`
- Bouton : `[ENREGISTRER MON TITRE]` → sauvegarde en BDD dans `profiles`

### ACTE 7 — État Final Permanent (après 22s)
La carte reste dans son état "révélé" pour toujours :

- Toutes les connexions actives et dorées
- Carte à pleine luminosité
- HUD permanent : `✦ RÉVÉLATION TOTALE · LE PLAN EST COMPLET`
- Un bouton discret `[VOIR MON PALMARÈS]` mène vers une page de galerie

---

## Ce que je propose de construire

### Composant `FinalRevealSequence.tsx` — NOUVEAU
Un overlay plein écran (z-index 100) déclenché quand `globalProgress >= 100` pour la première fois (flag `has_completed_puzzle` en BDD pour ne le jouer qu'une fois).

Props : `onDismiss: () => void`

Séquence contrôlée par un `step` state (0→7) avancé via `setTimeout` chainés.

### Améliorations de `RevealOverlay.tsx`
- Ajouter l'**onde de choc circulaire** au step 2
- Renforcer l'animation du **symbole central** à 100%
- Supprimer la vignette à 100% (fond entièrement visible)

### Améliorations de `CinematicWorldMap.tsx`
- Au step 3, forcer `mapBrightness = 1.0` et `saturate = 1.8`
- Déclencher le zoom via un state externe passé en prop

### Colonne BDD `has_completed_puzzle` dans `profiles`
Pour ne jamais rejouer la séquence si l'utilisateur rafraîchit la page après avoir complété le puzzle.

---

## Détails Techniques

### Fichiers à créer / modifier

| Fichier | Action |
|---|---|
| `src/components/FinalRevealSequence.tsx` | NOUVEAU — séquence 7 actes |
| `src/components/RevealOverlay.tsx` | Onde de choc + symbole net à 100% |
| `src/components/CinematicWorldMap.tsx` | Props `forceFullReveal` |
| `src/pages/Puzzle.tsx` | Détecter 100%, afficher la séquence |
| Migration BDD | Colonne `has_completed_puzzle boolean` dans `profiles` |

### Gestion du "une seule fois"

```typescript
// Dans Puzzle.tsx
const [showFinalReveal, setShowFinalReveal] = useState(false);

useEffect(() => {
  if (globalProgressOn195 >= 100 && !profile?.has_completed_puzzle) {
    setShowFinalReveal(true);
    // Marquer comme vu en BDD
    supabase.from("profiles")
      .update({ has_completed_puzzle: true })
      .eq("user_id", user.id);
  }
}, [globalProgressOn195]);
```

### Animation onde de choc (SVG)

```text
<circle cx={lastCountry.x} cy={lastCountry.y} r={0}
  stroke="gold" strokeWidth={0.8} fill="none"
  animate={{ r: [0, 200], opacity: [1, 0] }}
  transition={{ duration: 2.5, ease: "easeOut" }}
/>
```

---

## Résultat pour le Joueur

Ce moment sera **unique et inoubliable** :
1. Il ressent la puissance du "snap" final différemment des 194 autres
2. L'onde de choc lui montre visuellement que "quelque chose vient de changer"
3. La révélation de la carte est un moment de beauté pure
4. Le message de Jasper donne un frisson narratif
5. Le badge est un objet de fierté (il peut le partager)
6. L'état permanent de la carte est sa récompense visuelle quotidienne

Aucune dépendance supplémentaire — tout en Framer Motion + SVG + CSS déjà installés.
