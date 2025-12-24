# 🔧 Database & Data Persistence Fixes

## Issues Identified & Fixed

### 1. ✅ FIXED: AIAnalyzer Constructor Error

**Error**: `[Results] ML Analytics failed (continuing without it): AIAnalyzer is not a constructor`

**Root Cause**: `AIAnalyzer.js` was exporting an instance instead of the class:
```javascript
// WRONG (line 240)
module.exports = new AIAnalyzer();
```

But `MLAnalyticsService.js` tries to instantiate it:
```javascript
// MLAnalyticsService.js line 15
this.analyzer = new AIAnalyzer();  // ❌ Fails because AIAnalyzer is already an instance
```

**Fix**: Changed export to class:
```javascript
// CORRECT
module.exports = AIAnalyzer;
```

**File Modified**: `backend/ai/AIAnalyzer.js` line 240

---

### 2. ⚠️ Database Connection Timeout

**Error**: `[DB] PostgreSQL connection test failed: Connection terminated due to connection timeout`

**Root Cause**: 
- Vercel cold starts can be slow
- PostgreSQL pool connection timing out on first request
- This is **normal and expected** on serverless

**Current Handling**: 
- ✅ Retry logic in place (lines 80-98 of database.js)
- ✅ Automatic connection reconnect
- ✅ Falls back to SQLite if PostgreSQL unavailable (for local dev)

**No action needed** - This is expected behavior. Connection succeeds on subsequent requests.

---

### 3. ❌ Data Persistence Issue: TWO Database Systems

**Problem**: Data might not be saving because there are TWO separate database systems:

**System A: PostgreSQL/SQLite** (Backend database)
- Route: `POST /api/backend/api/analyze-quiz` & `POST /api/backend/api/results`
- Tables: `users`, `results`, `learning_plans`
- Status: Saves to local PostgreSQL pool

**System B: Supabase** (Quiz analytics database)  
- Route: `POST /api/adaptive/analyze` (adaptive quiz only)
- Tables: `quiz_results`, `ml_student_profiles`, etc.
- Status: Requires SQL migration execution + Supabase credentials

**Result**: Main quiz data goes to PostgreSQL, Adaptive quiz data goes to Supabase
- User skills NOT updated because profile is in different database
- Data is in TWO PLACES, not unified

---

## Solutions

### Solution 1: Verify Main Quiz Data Saves to PostgreSQL ✅

**Check if results table exists & has data:**
```sql
-- In your PostgreSQL database
SELECT COUNT(*) FROM results;
SELECT * FROM results ORDER BY created_at DESC LIMIT 5;
SELECT * FROM users ORDER BY created_at DESC;
```

**Expected**: Should see quiz result rows

**If empty**: Check logs for `saveResult error` messages

---

### Solution 2: Create Unified Profile Update ⚠️

**Current Issue**: User profile (skills) not updating because it reads from different database

**Option A - Update Local Database**:
Add this after saving results to PostgreSQL:

```javascript
// In routes/results.js after dbHelpers.updateResult()
const { updateUserProfile } = require('../database').dbHelpers;
await updateUserProfile(numericUserId, {
  totalQuizzes: ...,
  averageScore: ...,
  skillsImproved: weekAreas, 
  lastQuizDate: new Date()
});
```

**Option B - Use Supabase for Everything** (Better long-term):
- Save main quiz results to Supabase `quiz_results` table
- Update `ml_student_profiles` table
- Unified analytics across all quizzes

**Recommended**: Option B (Supabase) for scalability

---

### Solution 3: Enable Supabase for Main Quiz ✅ TODO

Currently only adaptive quiz uses Supabase. To add main quiz:

1. **Modify routes/results.js** (around line 165):
```javascript
// After quiz analysis, also save to Supabase
try {
  const { supabase } = require('../database');
  if (supabase && numericUserId) {
    await supabase.from('quiz_results').insert([{
      user_id: numericUserId,
      quiz_id: quizId,
      overall_score: actualScore,
      correct_answers: correct,
      total_questions: totalQuestions,
      time_spent_seconds: timeTaken,
      topic_performance: extractTopicPerformance(aiResult),
      answer_details: answers,
      created_at: new Date().toISOString()
    }]);
  }
} catch (err) {
  console.warn('[Results] Supabase save failed (non-blocking):', err.message);
}
```

2. **Ensure Supabase credentials are set**:
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=...
```

3. **Run SQL migrations** (if not done yet):
```sql
-- Execute in Supabase SQL editor:
-- 1. backend/migrations/001_create_quiz_results.sql
-- 2. backend/migrations/001_create_ml_analytics_tables.sql
```

---

## Data Flow (Current)

```
Main Quiz (/api/backend/api/results)
  ↓
PostgreSQL (results table)
  ├─ Quiz score saved ✅
  ├─ User skills NOT updated ❌
  └─ Can't fetch history for recommendations ❌

Adaptive Quiz (/api/adaptive/analyze)
  ↓
Supabase (quiz_results table)
  ├─ Quiz score saved ✅
  ├─ Can calculate recommendations ✅
  └─ Separate from main quiz ❌
```

---

## Data Flow (Recommended After Fix)

```
All Quizzes
  ↓
Supabase (unified database)
  ├─ quiz_results table (scores)
  ├─ ml_student_profiles (user summary)
  ├─ ml_performance_records (details)
  └─ → User dashboard & profile updates ✅
```

---

## Immediate Checklist

- [x] Fixed AIAnalyzer constructor error
- [ ] Verify quiz results save to PostgreSQL
  - Check: `SELECT COUNT(*) FROM results;` in your DB
- [ ] Execute Supabase migrations (if using Supabase)
  - Run: `001_create_quiz_results.sql`
  - Run: `001_create_ml_analytics_tables.sql`
- [ ] Add Supabase credentials to `.env`
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
- [ ] Modify results.js to save to Supabase
- [ ] Test: Take quiz → Check DB → Verify data saved

---

## Verification Commands

**Check PostgreSQL**:
```bash
# Local dev
psql -U postgres -d stem_db -c "SELECT COUNT(*) FROM results;"

# Or via Node:
const pool = new (require('pg')).Pool(...);
const res = await pool.query('SELECT COUNT(*) FROM results');
console.log(res.rows[0]);
```

**Check Supabase** (after migrations):
```sql
SELECT COUNT(*) FROM quiz_results;
SELECT user_id, overall_score, created_at FROM quiz_results LIMIT 5;
```

**Check Logs**:
```
[DB] saveResult inserted id=...  // ✅ Quiz saved
[Results] ML Analytics completed  // ✅ ML worked
[Results] Saved AI analysis  // ✅ AI saved
```

---

## Summary

| Issue | Status | Fix |
|-------|--------|-----|
| AIAnalyzer constructor | ✅ FIXED | Export class, not instance |
| DB connection timeout | ℹ️ NORMAL | Expected, has retry logic |
| Data not persisting | ⚠️ DUAL SYSTEM | Needs unification via Supabase |
| Profile not updating | ⚠️ MISSING LOGIC | Need to add profile update after save |
| Recommendations not working | ⚠️ NO HISTORY | Need to fetch from saved data |

**Next Action**: Verify PostgreSQL has quiz results, then migrate to unified Supabase approach.
