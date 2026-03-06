# Quiz System Issues - Analysis & Fix Plan

**Created:** March 6, 2026  
**Status:** Critical Issues Identified & Fix Plan Ready

---

## 🔴 CRITICAL ISSUES IDENTIFIED

### Issue 1: Topic Selection Mismatch (HIGHEST PRIORITY)
**Symptom:** User selects "Phân thức đại số" but receives geometry quiz about "Tam giác, tứ giác"  
**Evidence:** User received questions like "TH - Góc Hình bình hành", "VDT - Dấu hiệu Hình thoi" (geometry) instead of algebraic fractions  
**Root Cause:** Likely incorrect topic name matching in `/api/adaptive/quiz/by-topic` endpoint or cached/stale data  

**Impact:** User gets wrong quiz content - complete system failure  

**Fix:**
1. Add validation/logging in `/api/adaptive/quiz/by-topic` to verify:
   - Received `topicName` matches a chapter in questions data
   - Filtered questions actually belong to selected topic
   - Log exact chapter match before returning
2. Add client-side topic validation
3. Clear any cached question data

---

### Issue 2: Missing ml_performance_records Saving (HIGH PRIORITY)
**Symptom:** Quiz results are NOT saved to `ml_performance_records` table  
**Expected:** After quiz submission, data should save including:
- user_id, topic, score, percentage, cognitive_breakdown, topic_mastery, weak_topics, strong_topics
  
**Current:** Results saved only to legacy `quiz_results` table, not the ML analytics table  

**Impact:** 
- ML analytics don't work
- Topic progression can't be tracked
- Topic selector can't show "Already Attempted"  
- Cumulative feedback impossible

**Fix:**
1. Add `/api/results` route handler to save to `ml_performance_records` after quiz analysis complete
2. Save fields: cognitive_breakdown, topic_mastery, weak_topics, strong_topics, trend_metrics
3. Include answer tracking for AI analysis

---

### Issue 3: No Attempted Topic Tracking (MEDIUM PRIORITY)
**Symptom:** TopicSelector doesn't show which topics user has already attempted  
**Expected:** Each topic should show:
- ✅ "Attempted 3 times - Last: 75%"
- 📊 Status: "MASTERED" / "DEVELOPING" / "NEEDS PRACTICE"

**Current:** All topics show as new/not attempted  

**Impact:**
- User can't see progress
- No motivation/feedback
- Can attempt same topic without knowing past performance

**Fix:**
1. Update `/api/adaptive/topics` to always fetch `ml_performance_records` for user
2. Calculate: attempts, last_score, average_score, status
3. Pass `userProgress` to TopicSelector component
4. Display status badges and last attempt info

---

### Issue 4: No Cumulative AI Feedback (MEDIUM PRIORITY)
**Symptom:** AI feedback is generated per-quiz but not cumulative across topics  
**Expected:** After completing Topic 1 quiz:
- Generate feedback for Topic 1 only

After completing Topic 2 quiz:
- Generate feedback for Topic 1 + Topic 2 combined
- Show improvement/decline across topics

**Current:** Only current quiz feedback is provided  

**Impact:**
- No big-picture learning insights
- Can't track overall improvement trajectory
- Recommendations not based on multi-topic performance

**Fix:**
1. Add `ai_learning_insights` table (already in migration 004)
2. After quiz submission:
   - Calculate combined performance across all topics user attempted
   - Generate cumulative insights using OpenAI
   - Save to `ai_learning_insights` table
   - Return comprehensive feedback to frontend

---

### Issue 5: No AI Insights Persistence to Supabase (LOW PRIORITY but Required)
**Symptom:** AI feedback not saved to database for later retrieval  
**Expected:** `ai_feedback` and `ai_learning_insights` tables should populate with OpenAI responses  

**Current:** Results may be sent to frontend but not saved for reports/analytics  

**Impact:**
- Can't retrieve feedback later
- No learning history/progression tracking
- Analytics based on incomplete data

**Fix:**
1. After OpenAI generates feedback, save to `ai_feedback` table
2. After cumulative analysis, save to `ai_learning_insights` table
3. Return IDs for frontend to reference

---

## 📋 DATABASE TABLES INVOLVED

| Table | Current Usage | Needed For |
|-------|---------------|-----------|
| `quiz_results` | ✅ Saves basic result | Legacy table |
| `ml_performance_records` | ❌ NOT POPULATED | **CRITICAL** - Main analytics |
| `topic_mastery` | ✅ Optional, manual | Mastery tracking |
| `ai_feedback` | ❌ NOT POPULATED | **NEEDED** - Store AI feedback |
| `ai_learning_insights` | ❌ NOT POPULATED | **NEEDED** - Cumulative insights |
| `user_learning_profiles` | ✅ Updated | Bloom levels, weak/strong areas |

---

## 🔧 FIX IMPLEMENTATION ORDER

### Phase 1: Critical Fixes (Required for basic functionality)
1. **Fix Topic Selection Mismatch** (Issue #1)
   - Add validation logging
   - Test with "Phân thức đại số" topic
   - Verify questions belong to correct chapter

2. **Save to ml_performance_records** (Issue #2)
   - Modify `/api/results` POST handler
   - Add SQL insert to `ml_performance_records`
   - Ensure all fields populated correctly

### Phase 2: User-Facing Improvements
3. **Show Attempted Status in TopicSelector** (Issue #3)
   - Update `/api/adaptive/topics` endpoint
   - Fetch user's ml_performance_records
   - Pass progress info to React component
   - Add status badges (✅ Mastered, 📚 Developing, 💪 Needs Practice)

4. **Implement Cumulative AI Feedback** (Issue #4)
   - Create function to fetch all user's previous quizzes
   - Call OpenAI with combined context
   - Generate cross-topic insights

### Phase 3: Data Persistence
5. **Save AI Feedback to Supabase** (Issue #5)
   - After OpenAI generates feedback, insert to `ai_feedback`
   - After cumulative analysis, insert to `ai_learning_insights`

---

## 📊 DATA FLOW (After Fixes)

```
User selects topic
  ↓
TopicSelector fetches topics + user's previous ml_performance_records
  ↓
Topic shows: "👀 Viewed in progress (65%)" or "✅ Mastered (90%)"
  ↓
User takes quiz
  ↓
Submit answers to /api/results
  ↓
Backend analyzes quiz (local analyzer + OpenAI)
  ↓
Save results to ml_performance_records {
  user_id, topic, score, percentage,
  cognitive_breakdown, topic_mastery, weak_topics, strong_topics
}
  ↓
Fetch all user's ml_performance_records (cumulative context)
  ↓
Generate cumulative AI insights across all topics attempted
  ↓
Save insights to ai_learning_insights table
  ↓
Save feedback to ai_feedback table
  ↓
Return comprehensive response to frontend with:
  - Current quiz results
  - Cumulative feedback
  - Learning path for next topics
  - Improvement trends
```

---

## 📁 FILES TO MODIFY

```
backend/routes/
├── results.js        → Add ml_performance_records save
├── adaptive.js       → Add validation to /quiz/by-topic
└── aiInsight.js      → Create cumulative feedback endpoint (new or extend)

frontend/src/
├── components/TopicSelector.jsx  → Display user progress
├── pages/AdaptiveQuiz.jsx        → No changes needed
└── pages/QuizResults.jsx         → Show cumulative feedback (if exists)
```

---

## 🎯 SUCCESS CRITERIA

✅ User selects "Phân thức đại số" → receives algebraic fraction questions  
✅ Quiz saved to `ml_performance_records` with all metrics  
✅ TopicSelector shows "You've attempted this 2 times - Last: 75%"  
✅ After each quiz, AI provides cumulative feedback across topics  
✅ Data persists to Supabase for analytics  

---

## ⏱️ Estimated Time to Fix

- Phase 1 (Critical): 30-45 minutes
- Phase 2 (UI): 30-40 minutes
- Phase 3 (Persistence): 20-30 minutes
- **Total: ~1.5 hours**

---

## 🚀 Testing Plan

1. **Topic Selection:**
   - Login with test user
   - Select "Phân thức đại số"
   - Verify all 10 questions have topic starting with "Nhận biết (NB)" / "Thông hiểu (TH)" etc. for algebraic fractions
   - NOT geometry topics

2. **ml_performance_records Saving:**
   - Check Supabase → ml_performance_records table after quiz submission
   - Verify fields: user_id, topic, score, percentage, cognitive_breakdown

3. **Topic Progress Display:**
   - Go back to TopicSelector
   - Verify topic now shows: "👀 Viewed 1 time - Last: 60%"

4. **Cumulative Feedback:**
   - Complete 2-3 different topics
   - Check ai_learning_insights table
   - Verify feedback mentions combined performance

---

**Next Steps:** Begin Phase 1 fixes immediately (Topic Selection Mismatch)
