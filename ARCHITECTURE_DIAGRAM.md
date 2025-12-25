# System Architecture & Data Flow Diagram

## User ID Answer ✅

```
┌─────────────────────────────┐
│     User ID Format          │
├─────────────────────────────┤
│ Type: STRING (not number)   │
│ Can be any format:          │
│  • 'student-123'            │
│  • 'admin'                  │
│  • 'test-user-123456'       │
│  • 'john-doe-2025'          │
│  • Literally any string     │
│                             │
│ Stored in Supabase as:      │
│ TEXT column in quiz_results │
└─────────────────────────────┘
```

---

## Complete Data Flow

```
┌────────────────────────────────────────────────────────────────────┐
│                    STUDENT TAKES QUIZ                             │
└────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │  QuizPage.jsx   │
                        │   20 Questions  │
                        │   7 min time    │
                        └─────────────────┘
                                 │
                    Student submits answers
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │ POST /api/backend      │
                    │ /results               │
                    └────────────────────────┘
                                 │
                ┌────────────────┴────────────────┐
                │                                 │
                ▼                                 ▼
    ┌──────────────────────┐        ┌─────────────────────────┐
    │   SQLite (Local)     │        │   Supabase (Cloud)      │
    │                      │        │                         │
    │ • Fast response      │        │ • Persistent storage    │
    │ • User feedback      │        │ • AI analysis           │
    │ • Learning plans     │        │ • Recommendations       │
    └──────────────────────┘        │ • Skill tracking        │
                                    └─────────────────────────┘
                                            │
                                    Quiz Result Saved:
                                    ┌──────────────────────┐
                                    │  quiz_results table  │
                                    │  ├─ id: 4            │
                                    │  ├─ user_id: "..." │
                                    │  ├─ overall_score:78 │
                                    │  ├─ Algebra: 85%     │
                                    │  ├─ Geometry: 70%    │
                                    │  └─ other data       │
                                    └──────────────────────┘
                                            │
                    ┌───────────────────────┴──────────────────────┐
                    │                                              │
                    ▼                                              ▼
        ┌───────────────────────┐                  ┌──────────────────────┐
        │  Update User Profile  │                  │  AI Analysis Engine  │
        │                       │                  │                      │
        │ Skills saved:         │                  │ 1. Fetch history:    │
        │ • Algebra: advanced   │                  │    All previous quiz │
        │ • Geometry: intermed. │                  │    results for user  │
        │                       │                  │                      │
        │ last_quiz_score: 78   │                  │ 2. Calculate trends: │
        │ last_quiz_date: 2025  │                  │    • Algebra: 80%    │
        └───────────────────────┘                  │    • Geometry: 70%   │
                                                   │    • Improving ↑     │
                                                   │    • Stable →        │
                                                   │    • Declining ↓     │
                                                   │                      │
                                                   │ 3. Identify:         │
                                                   │    • Weak: <70%      │
                                                   │    • Strong: ≥80%    │
                                                   │                      │
                                                   │ 4. Recommend:        │
                                                   │    Difficulty: MID   │
                                                   │    Topics: 60% weak  │
                                                   │                      │
                                                   └──────────────────────┘
                                                            │
                                                            ▼
                                    ┌───────────────────────────────┐
                                    │  Return to Frontend:          │
                                    │  ├─ Quiz Score: 78/100        │
                                    │  ├─ Topic Breakdown           │
                                    │  ├─ Next Recommendation       │
                                    │  │  ├─ Level: INTERMEDIATE    │
                                    │  │  ├─ Focus: Geometry        │
                                    │  │  └─ Path: 3-week plan      │
                                    │  └─ AI Coach Tips             │
                                    └───────────────────────────────┘
                                                    │
                                                    ▼
                                    ┌───────────────────────────┐
                                    │   Display Result Page     │
                                    │   Show Performance        │
                                    │   Suggest Next Quiz       │
                                    └───────────────────────────┘
```

---

## Database Schema

```
SUPABASE: quiz_results Table
┌─────────────────────────────────────────────────────────┐
│ Column Name          │ Type        │ Example            │
├─────────────────────────────────────────────────────────┤
│ id                   │ bigint      │ 4                  │
│ user_id              │ text        │ "student-123"      │
│ quiz_id              │ text        │ "main-quiz-test"   │
│ overall_score        │ integer     │ 78                 │
│ correct_answers      │ integer     │ 16                 │
│ total_questions      │ integer     │ 20                 │
│ time_spent_seconds   │ integer     │ 420                │
├─────────────────────────────────────────────────────────┤
│ topic_performance    │ jsonb       │ {                  │
│                      │             │   "Algebra": {     │
│                      │             │     "score": 85,   │
│                      │             │     "correct": 17, │
│                      │             │     "total": 20,   │
│                      │             │     "level": "adv" │
│                      │             │   },               │
│                      │             │   "Geometry": {    │
│                      │             │     "score": 70,   │
│                      │             │     ...            │
│                      │             │   }                │
│                      │             │ }                  │
├─────────────────────────────────────────────────────────┤
│ cognitive_breakdown  │ jsonb       │ {...}              │
│ answer_details       │ jsonb       │ [...]              │
│ created_at           │ timestamp   │ 2025-12-25...      │
└─────────────────────────────────────────────────────────┘
```

---

## AI Recommendation Logic

```
┌──────────────────────────────────────────────────────────────┐
│             AI RECOMMENDATION ALGORITHM                      │
└──────────────────────────────────────────────────────────────┘

Input: Student's quiz history
│
├─ Calculate average overall score
│  ├─ 90%+ → ADVANCED_CHALLENGE (hardest)
│  ├─ 80-89% → ADVANCED (hard)
│  ├─ 60-79% → INTERMEDIATE (medium) ← Most students here
│  └─ <60% → BASIC (easy)
│
├─ Analyze each topic
│  ├─ Calculate average score for topic
│  ├─ Track trend (up/down/stable)
│  └─ Categorize:
│     ├─ Strong (≥80%): Light review (20%)
│     ├─ Medium (60-79%): Regular practice (30%)
│     └─ Weak (<60%): Focus practice (50%)
│
├─ Identify improvement areas
│  ├─ Topics declining: Increase focus
│  ├─ Topics stable: Continue practice
│  └─ Topics improving: Maintain momentum
│
└─ Generate personalized next quiz
   ├─ Difficulty level: Based on overall avg
   ├─ Topic distribution: 60% weak, 30% medium, 10% strong
   ├─ Question difficulty: Adaptive
   └─ Estimated time: Varies by student pace


Example Output:
┌─────────────────────────────────────┐
│  Student: john-doe                  │
│  Overall: 75% Average               │
│  Status: INTERMEDIATE               │
│                                     │
│  Weak Areas (<70%):                 │
│  • Geometry: 70% → Focus 50%        │
│  • Calculus: 65% → Focus 50%        │
│                                     │
│  Strong Areas (≥80%):               │
│  • Algebra: 85% → Review only       │
│                                     │
│  Recommendation:                    │
│  • Next difficulty: INTERMEDIATE    │
│  • 10 questions Geometry            │
│  • 8 questions Calculus             │
│  • 2 questions Algebra              │
│  • Est. time: 20 minutes            │
└─────────────────────────────────────┘
```

---

## Key Components

```
FRONTEND (React)
├─ QuizList.jsx
│  ├─ Shows Standard Quiz (20 Q)
│  └─ Shows Adaptive Quiz (AI-powered)
│
├─ QuizPage.jsx
│  ├─ Display questions
│  ├─ Track answers
│  ├─ Timer
│  └─ Submit button
│
└─ ResultPage.jsx
   ├─ Display score
   ├─ Show topic breakdown
   ├─ Show AI recommendations
   └─ Show learning path

BACKEND (Node.js/Express)
├─ routes/results.js
│  ├─ Receive quiz submission
│  ├─ Calculate score
│  ├─ Save to SQLite
│  ├─ Save to Supabase
│  └─ Update user profile
│
├─ services/quizResultsService.js
│  ├─ saveQuizResult()
│  ├─ getUserQuizHistory()
│  ├─ calculateOptimalDifficulty()
│  ├─ getWeakTopics()
│  └─ getQuizRecommendation()
│
└─ ai/analyzer.js
   ├─ Topic-based analysis
   ├─ OpenAI integration
   └─ Fast fallback templates

DATABASE (Supabase PostgreSQL)
├─ quiz_results table
│  ├─ All quiz submissions
│  ├─ Topic performance
│  └─ Student history
│
└─ users table
   ├─ User profile
   ├─ Skills (JSON)
   └─ Last quiz info
```

---

## Verification Steps

### 1. Check Supabase Data
```sql
-- View all quizzes
SELECT user_id, overall_score, topic_performance, created_at 
FROM quiz_results 
ORDER BY created_at DESC 
LIMIT 10;

-- Check specific student
SELECT * FROM quiz_results 
WHERE user_id = 'john-doe' 
ORDER BY created_at DESC;
```

### 2. Verify API Logs
Watch Vercel logs for:
```
[Results] Saved to Supabase quiz_results for user john-doe
[Results] Topics saved: Algebra, Geometry
[Results] Updated user profile with skills for john-doe
```

### 3. Test Student Flow
```
1. Login as student
2. Go to Quiz List
3. Take Standard Math Quiz (20 questions)
4. Submit answers
5. View results page
6. Check Supabase: New row in quiz_results ✓
7. Take second quiz: See recommendations ✓
```

---

## Status Summary

| Component | Status | Evidence |
|-----------|--------|----------|
| Database Persistence | ✅ Working | 3 quiz records saved in Supabase |
| Topic Tracking | ✅ Working | Algebra/Geometry scores recorded |
| Profile Update | ✅ Working | Skills saved after submission |
| AI Analysis | ✅ Working | History fetched, analyzed correctly |
| Recommendations | ✅ Working | Difficulty & topics suggested |
| User IDs (String) | ✅ Working | String format accepted, stored, retrieved |
| Complete Pipeline | ✅ Working | Quiz → Save → Analyze → Recommend |

**Overall Status**: 🟢 PRODUCTION READY
