# Fix: Fragment Persistence and Unlock Chain

## Problem Summary

Three issues prevent the Puzzle page from reflecting mission completion:

1. **Score/threshold mismatch** -- The `complete_country_attempt` database function requires score >= 5 (out of 6) to grant a fragment. But `FreeMission.tsx` always passes `score = 3, total = 3` (3 correct questions out of 3 steps). Since 3 < 5, no fragment is ever inserted into `user_fragments`.
2. **Broken DB chain** -- `next_country_code` is `null` for CH and FR in the `countries_missions` table. Only EG and US have correct values.
3. **Existing progress stuck** -- The user has `player_country_progress` for CH with `fragment_granted: false` and `best_score: 3`. This needs to be repaired.

## Fix Plan

### Step 1: Fix the RPC threshold logic

Modify the `complete_country_attempt` function to use a dynamic threshold based on `p_total`:

```
v_threshold := GREATEST(p_total - 1, 1)
```

This way:

- For `p_total = 6` (classic missions): threshold = 5 (same as before)
- For `p_total = 3` (free missions): threshold = 2 (need 2/3 correct)

This is done via a SQL migration (ALTER FUNCTION).

### Step 2: Fix the DB unlock chain

Update `countries_missions` to set:

- CH: `next_country_code = "FR"`
- FR: `next_country_code = "EG"`  
  
Important:
  Ensure the JSON path updated is:
  [content.completion.unlock.next](http://content.completion.unlock.next)_country_code
  The frontend reads this JSON path as the source of truth.
  Do not update a separate SQL column.

(EG->US and US->JP are already correct. JP stays null as end of chain.)

### Step 3: Repair existing player data

Since CH was completed with score 3/3 but fragment was denied:

- Update `player_country_progress` for CH: set `fragment_granted = true`
- Insert into `user_fragments` for CH (country_id = `05674046-...`)

### Step 4: Code change in FreeMission.tsx

No code change needed -- `FreeMission.tsx` already passes `p_score: 3, p_total: 3` which will work correctly with the new dynamic threshold.

## Technical Details

### Migration SQL (Step 1)

Replace the hardcoded threshold in `complete_country_attempt`:

```text
v_threshold := LEAST(
  COALESCE(p_total, 1),
  GREATEST(COALESCE(p_total, 1) - 1, 1)
);
```

Instead of the current:

```text
v_threshold := 5;
```

### Data fixes (Steps 2-3)

- UPDATE `countries_missions` SET content = jsonb_set(...) for CH and FR
- UPDATE `player_country_progress` SET `fragment_granted = true` WHERE country_code = 'CH'
- INSERT INTO `user_fragments` for CH

### Expected result after fix

- Puzzle page shows CH fragment in inventory
- "Prochaine destination" shows FRANCE (reads from DB chain)
- Gold line glows from CH to FR
- Future mission completions automatically grant fragments