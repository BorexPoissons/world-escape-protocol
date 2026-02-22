
# Correction : Support des questions "text_input" dans FreeMission

## Probleme identifie

La mission Suisse (CH) a une question finale (CH-Q7) de type `text_input` qui demande au joueur de taper "W.E.P". Mais le composant `FreeMission.tsx` ne gere que les questions a choix multiples (MCQ). Resultat : aucun champ de saisie ni bouton n'apparait a l'etape 3 "Decision Strategique".

## Donnees DB pour CH-Q7

- Type: `text_input`
- Prompt: "Note le sigle vu sur le fragment (il reviendra). Saisissez-le sans faute."
- Reponse correcte: `W.E.P`
- Reponses acceptees: `["W.E.P", "W.E.P.", "WEP", "wep", "w.e.p", "w.e.p."]`
- Pas de tableau `options`

## Solution

Ajouter le support des questions `text_input` dans le composant FreeMission, specifiquement pour la phase "strategic" (ancien format, car CH utilise le `question_bank`).

### Modifications

**Fichier : `src/pages/FreeMission.tsx`**

1. **Enrichir le type `QBankItem`** pour inclure les champs `text_input` :
   - Ajouter `input_type?: string` (pour detecter "text_input")
   - Ajouter `accepted_answers?: string[]` (liste de reponses valides)
   - Ajouter `correct_answer?: string` (reponse principale)

2. **Modifier le mapping des questions DB** (lignes 252-278) :
   - Quand `q.type === "text_input"`, conserver le type original dans `input_type`
   - Transmettre `q.accepted_answers` et `q.correct_answer` dans l'objet question

3. **Ajouter un state `textInput`** pour stocker la saisie du joueur

4. **Ajouter un bloc de rendu "strategic text_input"** (dans la phase `strategic`, ancien format) :
   - Detecter si `strategicQuestion.input_type === "text_input"`
   - Afficher un champ de saisie texte (input) au lieu des boutons MCQ
   - Bouton "VALIDER" pour soumettre la reponse
   - Validation insensible a la casse via `accepted_answers`
   - Meme logique de vies/timer/bonus que les MCQ
   - Feedback correct/incorrect avec le meme style visuel

### Comportement attendu

- Le joueur voit la question "Note le sigle vu sur le fragment..."
- Un champ de saisie texte apparait avec un placeholder "Votre reponse..."
- Le joueur tape sa reponse (ex: "WEP", "W.E.P", etc.)
- Clic sur "VALIDER" → comparaison avec `accepted_answers`
- Si correct : bonus pool + transition vers `letter_reveal`
- Si incorrect : perte d'une vie, possibilite de reessayer

### Details techniques

Le rendu conditionnel dans la section "strategic ancien format" sera :

```text
if strategicQuestion has input_type === "text_input"
  -> render text input + validate button
else
  -> render MCQ buttons (comportement actuel)
```

La validation normalisera la saisie (trim + lowercase) et comparera avec chaque element de `accepted_answers` (aussi normalise).

**Total : ~60 lignes ajoutees/modifiees dans 1 seul fichier (`FreeMission.tsx`). Aucun changement de schema DB.**
