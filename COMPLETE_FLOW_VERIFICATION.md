# Complete Flow Verification Guide
## Test: Quiz Completion → Supabase Save → TopicSelector Update → AI Chatbot Access

---

## Step 1: Monitor Console During Quiz Completion

When you complete the quiz on topic **"Phân thức đại số"**, watch for these log messages:

### A. Quiz Submission Logs
```
[AdaptiveQuiz] Quiz submission details: {totalQuestions: 10, answeredQuestions: 10, ...}
[AdaptiveQuiz] Sending payload: {userId: 51559, quizId: 'personalized', ...}
[AdaptiveQuiz] Response status: 200
```

### B. Backend Processing Logs
```
[Results] ✅ Saved to Supabase quiz_results for user 51559
[Results] ✅ Saved to ml_performance_records for user 51559 - topic: Phân thức đại số
[Results] 📊 Updated user_learning_profiles with Bloom levels
```

### C. Refresh Signal
```
[AdaptiveQuiz] ✅ Successfully saved to Supabase with Bloom levels and weak/strong areas
[AdaptiveQuiz] ✅ Fetched updated profile: {scores: {...}, proficiency: {...}, ...}
sessionStorage.profileRefreshNeeded = 'true'
```

### D. TopicSelector Auto-Refresh (Automatic)
```
[TopicSelector] Detected profile refresh signal, refetching topics...
[TopicSelector] Topics fetched: 5 topics
  📊 Phân thức đại số: Score 75%, Attempts 2, Status developing
```

---

## Step 2: Manual Verification - Check TopicSelector UI

**Expected Changes on Topic Card:**

### Before Quiz:
```
Status Badge: "Mới" (Not Attempted)
Stats: "Chưa thử" (Not attempted)
(no attempts, score, or average shown)
```

### After Quiz Completion:
```
Status Badge: "Đang học" (Developing) - if score 60-79%
             OR "Thành thạo" (Mastered) - if score ≥80%

Stats:
  Lần cố (Attempts): 2
  Điểm (Score): 75%
  Trung bình (Avg): 68.5%
```

---

## Step 3: Verify Supabase Data - Check All Tables

### A. **quiz_results** Table
```sql
SELECT * FROM quiz_results 
WHERE user_id = 51559 
ORDER BY created_at DESC 
LIMIT 1;
```

Expected columns populated:
- `user_id`: 51559
- `overall_score`: 6 (out of 10)
- `correct_answers`: 6
- `total_questions`: 10
- `topic_performance`: {"Phân thức đại số": {"score": 75, ...}, ...}
- `cognitive_breakdown`: {"level1": {...}, "level2": {...}, ...}
- `created_at`: Current timestamp

### B. **ml_performance_records** Table
```sql
SELECT * FROM ml_performance_records 
WHERE user_id = 51559 AND topic = 'Phân thức đại số'
ORDER BY created_at DESC 
LIMIT 2;
```

Expected data:
- `user_id`: 51559
- `topic`: "Phân thức đại số"
- `percentage`: 75.00 (or similar)
- `score`: 6 (out of 10)
- `quiz_type`: "adaptive"
- `cognitive_breakdown`: {level1: {correct: X, total: Y}, ...}
- `weak_topics`: ["NB - Định nghĩa...", "VDT - Góc..."]
- `strong_topics`: ["VDT - Tứ giác...", ...]
- Multiple rows if user attempted this topic before

### C. **user_learning_profiles** Table
```sql
SELECT * FROM user_learning_profiles 
WHERE user_id = 51559;
```

Expected data:
- `cognitive_levels`: 
  ```json
  {
    "level1": 3,    // Cumulative points, not percentage
    "level2": 6,
    "level3": 75,   // Increased from previous quiz
    "level4": 0
  }
  ```
- `proficiency_status`:
  ```json
  {
    "level1": "NOT_STARTED",
    "level2": "NOT_STARTED", 
    "level3": "DEVELOPING",     // Based on cumulative score
    "level4": "NOT_STARTED"
  }
  ```
- `weak_areas`: ["NB - Định nghĩa...", "VDT - Góc..."]
- `strong_areas`: ["VDT - Tứ giác..."]
- `quizzes_taken`: 5 (or incremented from before)

### D. **ai_feedback** Table (Optional but recommended)
```sql
SELECT * FROM ai_feedback 
WHERE user_id = 51559 
AND quiz_id LIKE '%adaptive%'
ORDER BY created_at DESC 
LIMIT 1;
```

Expected data:
- `summary`: "Chúc mừng em đã hoàn thành bài kiểm tra..."
- `recommended_level`: "normal" or "hard"
- `suggested_topics`: ["NB - Định nghĩa...", "TH - Tính cạnh..."]
- `study_plan`: Personalized learning path
- `explainability`: {reason: "You did well in...", ...}

---

## Step 4: Verify API Responses

### A. Check `/api/adaptive/topics` Response
```javascript
// Open browser console and run:
fetch('/api/adaptive/topics?userId=51559')
  .then(r => r.json())
  .then(data => {
    const phanThucAlgebraTopic = data.find(t => t.name === 'Phân thức đại số');
    console.log('📊 Topic Status:', {
      name: phanThucAlgebraTopic.name,
      userProgress: phanThucAlgebraTopic.userProgress,
      // Should show:
      // userProgress: {
      //   attempts: 2,
      //   lastScore: 75,
      //   averageScore: 68.5,
      //   status: 'developing'
      // }
    });
  });
```

### B. Check `/api/adaptive/profile/{userId}` Response
```javascript
fetch('/api/adaptive/profile/51559')
  .then(r => r.json())
  .then(profile => {
    console.log('🎓 User Profile:', {
      scores: profile.scores,
      // Should show: {level1: 3, level2: 6, level3: 75, level4: 0}
      
      proficiency: profile.proficiency,
      // Should show status mapped from scores
      
      weakAreas: profile.weakAreas,
      strongAreas: profile.strongAreas,
      
      quizzesTaken: profile.quizzesTaken
    });
  });
```

---

## Step 5: Verify AI Chatbot Can Access Data

### A. Chatbot API Endpoint
When chatbot makes request, it fetches:
```javascript
// Backend gets:
1. user_learning_profiles → Bloom levels & proficiency
2. ml_performance_records → Detailed performance history  
3. quiz_results → Specific quiz details
4. ai_feedback → Previous AI insights

// Then creates context like:
{
  "studentContext": {
    "currentLevel": "DEVELOPING",
    "bloomScores": {level1: 3, level2: 6, level3: 75, level4: 0},
    "weakAreas": ["NB - Định nghĩa...", "VDT - Góc..."],
    "strongAreas": ["VDT - Tứ giác đặc biệt..."],
    "recentQuizzes": [
      {
        "topic": "Phân thức đại số",
        "attempts": 2,
        "lastScore": 75,
        "averageScore": 68.5,
        "date": "2026-03-12T10:45:00Z"
      }
    ]
  }
}
```

### B. Test Chatbot Messages
Open chat and ask:
- "Tôi vừa làm bài kiểm tra, kết quả thế nào?"
  - Should mention: Phân thức đại số, 75%, attempts = 2
- "Điểm Bloom của tôi hiện tại là bao nhiêu?"
  - Should show: Level 1-4 scores from user_learning_profiles
- "Tôi yếu chỗ nào nhất?"
  - Should list weak_areas from user_learning_profiles
- "Hôm nay tôi học được gì?"
  - Should reference recent quiz from ml_performance_records

---

## Step 6: Console Logs Checklist

After completing quiz, verify you see:

- [ ] `[TopicSelector] Detected profile refresh signal, refetching topics...`
- [ ] `[TopicSelector] Topics fetched: 5 topics`
- [ ] `[TopicSelector] 📊 Phân thức đại số: Score 75%, Attempts 2, Status developing`
- [ ] Backend logs show: `✅ Saved to ml_performance_records`
- [ ] Backend logs show: `✅ Saved to Supabase quiz_results`
- [ ] No error messages like "Failed to fetch topics"

---

## Step 7: Full End-to-End Test Checklist

- [ ] **Quiz Completion**: Complete Phân thức đại số quiz with 60-80% score
- [ ] **Supabase Save**: Verify data in 4 tables (quiz_results, ml_performance_records, user_learning_profiles, ai_feedback)
- [ ] **Console Logs**: See refresh signal and topic refetch
- [ ] **UI Update**: Topic card now shows "Đang học", attempts, score, average
- [ ] **API Response**: `/api/adaptive/topics` shows userProgress with attempts & scores
- [ ] **Chatbot Access**: Ask chatbot about recent quiz - it mentions the topic and score
- [ ] **Cumulative Progress**: Bloom levels increased (check cognitive_levels in user_learning_profiles)

---

## Troubleshooting

### If TopicSelector Still Shows "Chưa thử" (Not Attempted):

1. **Clear Browser Cache**
   ```javascript
   sessionStorage.clear();
   localStorage.clear();
   // Refresh page
   ```

2. **Verify Supabase Data**
   ```sql
   -- Check if ml_performance_records was actually inserted
   SELECT COUNT(*) FROM ml_performance_records 
   WHERE user_id = 51559 AND topic = 'Phân thức đại số';
   
   -- Should return: 2 (or more if attempted before)
   ```

3. **Check Backend Logs**
   - Look for: `[Results] ✅ Saved to ml_performance_records`
   - If not there, quiz data didn't reach backend

4. **Manual Refresh**
   - Press F5 to reload TopicSelector
   - Data should appear after backend returns fresh data

### If Chatbot Doesn't Know About Quiz:

1. **Verify ChatBot Backend**
   - Check if it calls `/api/adaptive/profile/{userId}`
   - Ensure Supabase fetch succeeds

2. **Check Student Context**
   - View browser Network tab → chat request
   - Look for `student_context_used` in request/response

3. **Verify Data in Tables**
   - Ensure user_learning_profiles row exists
   - Ensure ml_performance_records has recent entry

---

## Expected Data Flow Timeline

```
T=0s   Quiz Complete → User clicks "Submit"
T=1s   POST /api/results called
T=2s   Backend analyzes answers
T=3s   ✅ quiz_results inserted
T=4s   ✅ ml_performance_records inserted  
T=5s   ✅ user_learning_profiles updated with new Bloom points
T=6s   ✅ ai_feedback generated (OpenAI call)
T=7s   sessionStorage.profileRefreshNeeded = 'true'
T=8s   TopicSelector detects signal
T=9s   TopicSelector calls GET /api/adaptive/topics
T=10s  ✅ Fresh topics returned with updated userProgress
T=11s  UI Updates: Topic card shows new attempts/scores
T=12s  ✅ Chatbot can now access all data for context
```

