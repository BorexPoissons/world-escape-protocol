
# Affichage horizontal "gauche à droite" + pays complété grisé + pays suivant qui clignote

## Ce que l'utilisateur veut (référence image)

1. **Layout horizontal** : les pays du Signal Initial s'affichent en ligne, de gauche à droite, dans l'ordre de la séquence (CH → US → CN → BR → EG)
2. **Pays réussi** : grisé visuellement (overlay semi-transparent), mais toujours cliquable pour rejouer — avec une icône ✓ visible
3. **Pays suivant** (le premier non-complété) : animation de pulsation/clignotement pour attirer l'attention

---

## Changements prévus

### 1. Layout du groupe Signal Initial — de grille à ligne horizontale

**Fichier :** `src/pages/Dashboard.tsx` — section grille (lignes 794–856)

Au lieu de `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3`, on utilise une ligne scrollable horizontalement pour la saison 0 :

```tsx
// Pour seasonNum === 0 (Signal Initial)
<div className="flex flex-row gap-4 overflow-x-auto pb-2">
  {/* cartes de pays dans l'ordre */}
</div>
```

Chaque carte aura une largeur fixe (`min-w-[260px] w-[260px]`) pour que l'alignement horizontal soit net.

L'ordre est garanti par `SIGNAL_INITIAL_SEQUENCE` déjà en place — il suffit de trier les pays du groupe 0 dans cet ordre avant rendu.

### 2. Pays complété — grisé mais rejouable

**Fichier :** `src/components/CountryCard.tsx`

Quand `completed === true`, on ajoute un overlay gris semi-transparent sur la carte :

```tsx
{completed && (
  <div className="absolute inset-0 bg-background/50 rounded-xl pointer-events-none z-10" />
)}
```

La carte reste cliquable (le `<Link>` encapsule toujours tout). On affiche clairement "REJOUER" et le badge ✓ reste visible.

Adaptation du style de la carte complétée : `opacity-70` sur le contenu principal (texte), et la bande dorée du haut reste pour indiquer la réussite.

### 3. Pays suivant à jouer — animation de pulsation

**Fichier :** `src/pages/Dashboard.tsx`

On calcule `nextUnlockedCode` : le premier pays de `SIGNAL_INITIAL_SEQUENCE` qui n'est pas encore complété et n'est pas verrouillé.

On passe une prop `isNext` au `CountryCard` ou on enveloppe la carte dans un `motion.div` avec une animation de ring pulsant :

```tsx
// Ring pulsant autour de la prochaine carte
<motion.div
  animate={{ boxShadow: [
    "0 0 0px hsl(40 80% 55% / 0)",
    "0 0 20px hsl(40 80% 55% / 0.6)",
    "0 0 0px hsl(40 80% 55% / 0)",
  ]}}
  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
  className="rounded-xl"
>
  <CountryCard ... />
</motion.div>
```

---

## Détail des modifications fichier par fichier

### `src/pages/Dashboard.tsx`

1. **Trier les pays de la saison 0** dans l'ordre `SIGNAL_INITIAL_SEQUENCE` avant affichage
2. **Changer le conteneur** de grille en flex-row pour `seasonNum === 0`
3. **Identifier `isNextCountry`** : premier code dans `SIGNAL_INITIAL_SEQUENCE` qui n'est pas complété et dont `seqLocked === false`
4. **Envelopper la carte suivante** dans un `motion.div` avec animation de halo pulsant

### `src/components/CountryCard.tsx`

1. **Overlay grisé** sur les cartes complétées (overlay `bg-background/50` + `pointer-events-none`)
2. **Badge "COMPLÉTÉ"** plus visible (déjà présent via `CheckCircle`, on peut le renforcer)
3. **Texte REJOUER** toujours visible (pas seulement au hover) quand `completed === true`

---

## Comportement final attendu

```
[🇨🇭 SUISSE ✓] → [🇺🇸 ÉTATS-UNIS ✨ pulsant] → [🔒 verrouillé] → [🔒 verrouillé] → [🔒 verrouillé]
  grisé, rejouable     prochain à jouer            flou CN               flou BR               flou EG
```

Pour les clients payants (saison 1+), la même logique s'applique mais sans verrouillage séquentiel.

---

## Résumé

| Fichier | Modification |
|---|---|
| `src/pages/Dashboard.tsx` | Layout flex-row pour saison 0, tri séquentiel, halo pulsant sur pays suivant |
| `src/components/CountryCard.tsx` | Overlay gris sur pays complétés, REJOUER toujours visible |
