# Quiz Topic Mismatch Bug Report

## Problem
User selects "Đại số" (Algebra) topic → Receives "Hình học" (Geometry/Shapes) questions

**Example Screenshot Context:**
- User selected: Algebra/Đại số
- Questions received: Hình thang cân, Hình chữ nhật, Hình thoi, Hình vuông (all geometry)
- Expected: Algebra questions

---

## Root Cause Analysis

The bug flow is:

```
TopicSelector (sends "Đại số")  
  ↓
POST /api/adaptive/quiz/by-topic
  ↓
loadQuestionsData() gets questions from JSON file
  ↓
Filter by chapter.chapterName === "Đại số"
  ↓
But questions.chapters might contain:
  - { chapterName: "Đại số", questions: [...] }
  - { chapterName: "Hình học", questions: [...] }
  ↓
🐛 BUG: Either the filtering returns wrong chapter OR
  the JSON data has topic names that don't match exactly
```

---

## Debugging Steps

### Step 1: Check Topic Names Match

**In Supabase or your questions data file:**

```sql
-- Check what chapter names exist in your data
SELECT DISTINCT topic FROM quiz_results;
-- Check what topic names are being sent:
SELECT DISTINCT topicName FROM questions_data;
```

**Issue Signs:**
- ❌ Naming mismatch: "Đại Số" vs "Đại số" (capitalization)
- ❌ Extra spaces: "Đại số " vs "Đại số"
- ❌ Different transliterations

### Step 2: Enable Debug Logging

Check browser console and backend logs:

**Frontend (AIChat.jsx):**
```
[AdaptiveQuiz] Sample questions: [{id, type, cognitiveLevel}]
→ Check if questions match selected topic
```

**Backend (adaptive.js line 2480):**
```
[Adaptive] 📋 Starting quiz generation for topic: {requestedTopic: "Đại số"}
[Adaptive] 📚 Available chapters in questions data: [...]
[Adaptive] 🔍 Processing chapter: [name]
[Adaptive] 📊 Filtering results: {totalFiltered, topicsInFiltered}
```

👉 **Action:** Run a quiz selection, check console logs to see:
1. What topic name was requested
2. What chapter names are available in data
3. Whether the chapter was found or not

---

## Potential Causes

### Cause 1: Topic Name Mismatch in Data
**File:** `stem-project/backend/data/questions_updated.json` (or wherever questions are loaded)

**Check if topics match between:**
- `topics.json` (topic list for TopicSelector)
- `questions_data.json` (questions file)

Example mismatch:
```json
// topics.json
{ "name": "Đại số" }

// questions_data.json  
{ "chapterName": "Đại Số" }  // Different capitalization!
```

**Fix:** Normalize all topic names to match exactly

---

### Cause 2: Questions Fetched from Wrong Source
**File:** `stem-project/backend/routes/adaptive.js` line 2480+

The endpoint might be:
1. ✅ Fetching from the wrong source
2. ✅ Not filtering correctly
3. ✅ Returning cached questions from previous request

**Debug code to add:**
```javascript
// After filtering, verify the questions
const verifyTopics = [...new Set(selectedQuestions.map(q => q.topic))];
console.log('[Adaptive] ⚠️  VERIFY:', {
  requested: topicName,
  actualTypics: verifyTopics,
  match: verifyTopics.length === 1 && verifyTopics[0] === topicName
});

if (verifyTopics[0] !== topicName) {
  console.error('[Adaptive] 🚨 CRITICAL: Returning questions from WRONG topic!');
  // Return error instead of wrong questions
  return res.status(500).json({ 
    error: 'Question topic mismatch detected',
    requested: topicName,
    actual: verifyTopics
  });
}
```

---

### Cause 3: Frontend Not Passing Topic Correctly
**File:** `stem-project/src/components/TopicSelector.jsx` line 68

The POST body should have:
```javascript
{
  userId: 1,
  topicName: "Đại số",  // ← Must match exactly
  examIds: [1, 2, 3],
  numQuestions: 10
}
```

**Debug:**
Add console.log before the POST:
```javascript
console.log('[TopicSelector] Sending quiz request:', {
  topicName: topic.name,
  bodyTopicName: topic.name  // Verify it matches
});
```

---

### Cause 4: Supabase RLS or Data Corruption
If questions are stored in Supabase (not JSON file), check:

```sql
-- Check quiz_results table for topic consistency
SELECT DISTINCT topic FROM quiz_results;

-- Check if topics match between tables
SELECT topic FROM quiz_results WHERE user_id = 51555;
```

---

## Immediate Workaround (Until Root Cause is Fixed)

### Add Client-Side Validation

**In AdaptiveQuiz.jsx** (after receiving questions):

```javascript
// Verify questions match selected topic
const selectedTopic = location.state.topic || location.state.topicName;
const questionsTopics = [...new Set(quizData.map(q => q.topic))];

if (questionsTopics[0] !== selectedTopic) {
  console.error('🚨 TOPIC MISMATCH DETECTED!', {
    selected: selectedTopic,
    received: questionsTopics,
    questionCount: quizData.length
  });
  
  // Show error to user
  setError(`Topic mismatch: Selected "${selectedTopic}" but got "${questionsTopics[0]}"`);
  setShowTopicSelector(true);  // Go back to selector
  return;
}
```

**Result:** Prevents wrong questions from being shown

---

## Long-Term Fix Checklist

- [ ] **Verify data consistency**
  - Dump `questions_data.json` chapters list
  - Cross-reference with `topics.json`
  - Ensure exact name matching (case-sensitive)

- [ ] **Add server-side validation**
  - After filtering, verify `selectedQuestions[0].topic === topicName`
  - Log warning if mismatch detected
  - Return 500 error instead of wrong questions

- [ ] **Add client-side validation**
  - AdaptiveQuiz verifies received questions match selected topic
  - Shows error and prevents quiz start if mismatch

- [ ] **Add test case**
  - Select each topic (Đại số, Hình học, etc)
  - Verify first 3 questions match the selected topic
  - Log results to console for verification

- [ ] **Set up monitoring**
  - Log topicDistribution in response (already done at line 2585)
  - Alert if any question's topic ≠ requested topic
  - Email admin if mismatch > 1% of requests

---

## Files to Check

1. **Question Data:**
   - `stem-project/backend/data/questions_updated.json` (chapter.chapterName values)
   - `stem-project/backend/ai/loadQuestions.js` (how it loads chapters)

2. **Topic List:**
   - `/api/adaptive/topics` endpoint (what topics it returns)
   - Database table tracking topics

3. **Quiz Generation:**
   - `stem-project/backend/routes/adaptive.js` line 2468+ (`/quiz/by-topic` endpoint)
   - Filtering logic on line 2520+

4. **Frontend:**
   - `stem-project/src/components/TopicSelector.jsx` (topic selection)
   - `stem-project/src/pages/AdaptiveQuiz.jsx` (question rendering)

---

## Logs to Check

**Browser DevTools Console:**
```
[AdaptiveQuiz] ✅ Using quiz from location state
[AdaptiveQuiz] Quiz data received: {topicsInFiltered: [...]}
```

**Backend Logs (Vercel/server):**
```
[Adaptive] 📋 Starting quiz generation for topic: {requestedTopic}
[Adaptive] 📚 Available chapters in questions data: [...]
[Adaptive] 📊 Filtering results: {topicsInFiltered: [...]}
```

👉 **Critical:** If `topicsInFiltered` includes geometry topics but you selected algebra, the bug is in the filtering logic or data file.

---

## Report Format for Next Test

When retesting, please provide:
```
1. Selected topic: [topic name in Vietnamese]
2. Number of questions received: [number]
3. Topics in received questions: [list from console]
4. Backend log excerpt: [paste from server logs]
5. Expected vs actual: [comparison]
```

This will help pinpoint whether the bug is in:
- ❌ Topic name matching (data inconsistency)
- ❌ Filtering logic (wrong code)
- ❌ Frontend passing (wrong data sent)
- ❌ Data loading (wrong source)
