
# Indice Archive : Photo du Pays, Sans Révéler la Réponse

## Objectif

Remplacer le toast "Bonne réponse : [texte]" par un **modal cinématique** qui affiche une vraie photo ou archive du pays, liée à la question en cours, sans donner la réponse en clair. Le joueur doit interpréter l'image pour trouver la bonne réponse.

## Ce que verra le joueur

Quand il clique "UTILISER" dans la bannière CONFIANCE ÉLEVÉE :

```text
┌──────────────────────────────────────────────────────┐
│  📁 DOSSIER D'ARCHIVE — CLASSIFIÉ W.E.P.         [X] │
│──────────────────────────────────────────────────────│
│  ┌────────────────────────────────────────────────┐  │
│  │  [Vraie photo : ex. Palais des Nations, Genève]│  │
│  │  Caption : "Genève, siège de l'ONU, 1945"      │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  TRANSMISSION CRYPTÉE DE JASPER VALCOURT             │
│  ──────────────────────────────────────────────────  │
│  "L'image parle. Laissez-la vous guider."            │
│                                                      │
│  [FERMER — CONTINUER LA MISSION]                     │
└──────────────────────────────────────────────────────┘
```

La réponse n'est pas écrite — la photo est l'indice.

## Architecture technique

### 1. Ajout d'un champ `hint` dans les JSON par pays

Chaque question dans le `question_bank` peut avoir un champ optionnel `hint_image` :

```json
{
  "id": "CH_Q3",
  "question": "Dans quelle ville siège la BRI ?",
  "hint_image": {
    "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/.../Basel_Muenster.jpg/640px-Basel_Muenster.jpg",
    "caption": "Vue de Bâle depuis le Rhin, Suisse"
  }
}
```

Ou un champ `hint` global au niveau mission pour les pays qui n'ont pas d'image par question.

### 2. Nouveau composant `ArchiveHintModal.tsx`

Un modal Framer Motion stylisé W.E.P. avec :
- Overlay sombre + flou
- Header "DOSSIER D'ARCHIVE CLASSIFIÉ" avec bordure dorée animée
- Image de la photo avec overlay gradient et caption
- Texte narratif de Jasper Valcourt (jamais la réponse)
- Bouton "FERMER"
- Fallback si pas d'image : icône document + texte "Aucune archive disponible"

### 3. Modification de `Mission.tsx`

- Ajouter `showHintModal: boolean` dans les states
- Charger le JSON du pays complet (déjà fait dans `loadMission`) pour lire `question_bank[i].hint_image`
- Au clic "UTILISER" : ouvrir `showHintModal = true` (plus de toast avec la réponse)
- Passer au modal : l'image hint de la question courante + caption

### 4. Mise à jour des JSON pays

Ajouter `hint_image` pour chaque question des pays CH et US en priorité, avec des URLs Wikimedia Commons (domaine public) :

**CH.json** :
- CH_Q3 (BRI → Bâle) : Photo de Bâle / Tour de la BRI
- CH_Q4 (ONU → Genève) : Palais des Nations Genève
- CH_Q2 (langues) : Carte linguistique Suisse

**US.json** :
- US_Q3 (Fed Reserve 1913) : Photo historique Wall Street 1913
- US_Q4 (Bretton Woods 1944) : Photo conférence Bretton Woods
- US_Q5 (dollar) : Billet dollar historique

## Fichiers modifiés

| Fichier | Action |
|---|---|
| `src/components/ArchiveHintModal.tsx` | Créé — modal cinématique |
| `src/pages/Mission.tsx` | Modifié — remplace toast par modal, lit hint_image de la question courante |
| `public/content/countries/CH.json` | Ajout `hint_image` sur les questions clés |
| `public/content/countries/US.json` | Ajout `hint_image` sur les questions clés |

## Comportement de fallback

Si une question n'a pas de `hint_image`, le modal s'ouvre quand même avec un texte narratif générique de Jasper Valcourt (sans révéler la réponse). Jamais de crash, jamais la réponse en clair.
