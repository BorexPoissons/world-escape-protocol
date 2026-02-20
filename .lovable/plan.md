

# Fix Plan: Puzzle Counter + Hint Button

## Bug A: Puzzle counter shows 1/195 instead of 3/195

### Root Cause
The counter logic in `Puzzle.tsx` is correct -- it counts distinct countries with fragments from `user_fragments`. The real issue is that FR and EG fragment rows are missing from the database. This is a data repair + prevention issue.

### Fix
1. **Data repair** (SQL): Insert missing `user_fragments` for FR and EG for the affected user, and update `player_country_progress` to reflect `fragment_granted = true` where applicable.
2. **No code change needed** for the counter itself -- it already reads `user_fragments` correctly.

---

## Bug B: Hint button disappeared on questions

### Root Cause
The DB stores `hint: { text, cost_xp }` per question, but the data mapping in `FreeMission.tsx` (line ~266) only passes `explanation` -- it never maps `hint`. The `QBankItem` type also lacks a `hint` field, and no UI component renders hints.

### Fix (3 changes in `FreeMission.tsx`)

1. **Add `hint` to the `QBankItem` type** (in the `question_bank` array type):
   ```
   hint?: { text: string; cost_xp: number };
   ```

2. **Map `hint` from DB questions** (line ~273, in the `qbank` mapping):
   ```
   hint: q.hint,
   ```

3. **Add a `HintToggle` inline component** (similar to `ExplanationToggle`) that:
   - Only renders if `question.hint?.text` exists
   - Shows BEFORE the answer (while `answerRevealed === false`)
   - Button label: "💡 Indice ({cost_xp} XP)"
   - If player XP < cost_xp: button is disabled with tooltip "XP insuffisant"
   - On click: deduct XP from profile, reveal hint text inline (collapsible)
   - Once the answer is revealed, the hint stays visible but the button disappears

4. **Insert the HintToggle** in all 6 question phases (scene old/new, logic old/new, strategic old/new), placed between the question text and the answer choices.

5. **Track player XP**: Load current XP from profiles at mission start, store in state, deduct on hint purchase, and persist the deduction to the DB.

### Technical Details

**New state variables:**
- `playerXP: number` -- loaded from `profiles.xp` at mission start
- `hintRevealed: boolean` -- reset per question phase transition

**HintToggle component** (inline, like ExplanationToggle):
```text
function HintToggle({ hint, playerXP, revealed, onBuy }) {
  if (!hint?.text) return null;
  if revealed: show hint text
  else: show button (disabled if playerXP < hint.cost_xp)
}
```

**XP deduction on hint buy:**
- `setPlayerXP(prev => prev - cost_xp)`
- `supabase.from("profiles").update({ xp: playerXP - cost_xp }).eq("user_id", user.id)`

**Placement in each question phase:**
- After the question `<h2>` element
- Before the choices `<div className="space-y-3">`

### Files Modified
- `src/pages/FreeMission.tsx` (type update, mapping, HintToggle component, state, integration in 6 phases)

### No other files need changes
- `Puzzle.tsx` counter logic is already correct
- `HintShopModal.tsx` is unrelated (used for the classic mission format)
- No DB schema changes needed

