# Supabase Schema Cache Error Fix

## Problem
Error when user signs up:
```
Could not find the 'quiz_type' column of 'ml_performance_records' in the schema cache
(Code: PGRST204)
```

## Root Cause
- **Column exists** in the schema: `quiz_type VARCHAR(50)` (line 67 of 003_create_ml_performance_records_enhanced.sql)
- **Supabase schema cache** is stale and hasn't detected the new column
- This happens when migrations are run manually in SQL Editor without refreshing the cache

## Solutions

### ✅ Solution 1: Clear Supabase Cache (FASTEST)

**In Supabase Dashboard:**
1. Go to **Database > Tables > ml_performance_records**
2. Click the table name to view columns
3. If `quiz_type` column is not visible:
   - This confirms the cache is stale
   
**Clear the cache:**
1. Go to **Settings > API**
2. Copy your `anon key`
3. In your application, make a test query:
   ```javascript
   // This forces Supabase to refresh schema
   const { data, error } = await supabase
     .from('ml_performance_records')
     .insert([{ user_id: 1, quiz_id: 'test', quiz_type: 'test' }])
     .select();
   ```
4. **Delete the test row** afterward if needed

**OR restart your Supabase project** (faster):
1. Supabase Dashboard > Settings > Restart project
2. Takes ~2 minutes

### ✅ Solution 2: Re-run Migration

If column still missing after cache clear:

**In Supabase SQL Editor:**
```sql
-- Check if column exists
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'ml_performance_records' 
AND column_name = 'quiz_type';

-- If empty result, add the column:
ALTER TABLE ml_performance_records 
ADD COLUMN IF NOT EXISTS quiz_type VARCHAR(50);

-- Verify it exists now:
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'ml_performance_records' 
ORDER BY ordinal_position;
```

### ✅ Solution 3: Update initializeUserMLPerformance

**Workaround in code** (if you can't restart Supabase):

File: `stem-project/backend/services/mlPerformanceService.js`

Replace the insert to skip `quiz_type` until cache is fixed:
```javascript
// Temporary workaround - remove quiz_type from insert
const record = {
  user_id: userId,
  quiz_id: 'initial',
  score: 0,
  percentage: 0,
  // quiz_type: 'initial',  // <- COMMENT OUT temporarily
  cognitive_breakdown: {
    level1: { correct: 0, total: 0, points: 0 },
    level2: { correct: 0, total: 0, points: 0 },
    level3: { correct: 0, total: 0, points: 0 },
    level4: { correct: 0, total: 0, points: 0 }
  },
  // ... rest of fields
};
```

**Then restore it after cache clears**

---

## Status After Each Solution

### After Solution 1 (Clear Cache):
- ✅ New signups should work
- ✅ `ml_performance_records` table gets initial entry with all fields
- ✅ ChatBot has full context from all 5 tables

### After Solution 2 (Re-run Migration):
- ✅ Column definitely exists
- ✅ Immediate fix verification available

### After Solution 3 (Code Workaround):
- ✅ Signups work (missing one field temporarily)
- ⚠️ Need to restore code after cache clears
- ⚠️ ChatBot context may be missing quiz_type in early records

---

## Verification After Fix

**Test signup with new user:**
```bash
# Check if new user's ml_performance_record has all fields
SELECT * FROM ml_performance_records WHERE user_id = 51555;
```

Expected output:
```
user_id | quiz_id | quiz_type | cognitive_breakdown | topic_mastery | ... (all fields present)
51555   | initial | initial   | {...}               | {...}         | ...
```

---

## Prevention for Future Migrations

**Better workflow:**
1. Run migration in SQL Editor: `003_create_ml_performance_records_enhanced.sql`
2. **Immediately test in app** to trigger schema refresh
3. **Wait 30 seconds** for cache invalidation
4. Run subsequent migrations

**Or use Supabase migrations feature:**
- Upload `.sql` files to `supabase/migrations/`
- Supabase auto-runs and manages schema cache

---

## Current Status

| Component | Status |
|-----------|--------|
| Schema (DB) | ✅ Column exists in PostgreSQL |
| Column Definition | ✅ `quiz_type VARCHAR(50)` defined |
| Supabase Cache | ❌ Stale (not showing column) |
| New Signups | ❌ Failing due to cached schema |
| ChatBot Context | ⚠️ Partial (missing quiz_type in early records) |

**Action:** Apply Solution 1 (Clear Cache) or Solution 2 (Re-run Migration)
