# User Signup & Table Auto-Initialization

## Overview
When a user registers, the system automatically creates initial records in multiple tables to support AI learning features and analytics.

## Signup Process Flow

### 1. **Registration** (auth.js - POST /auth/signup)
User submits:
- Email
- Username  
- Password

### 2. **Auto-Table Initialization** (happens immediately after user creation)

The following tables are populated automatically:

#### **Table 1: `user_learning_profiles`**
- **Status**: ✅ AUTO-CREATED
- **When**: During signup (auth.js line 75)
- **Data**:
  ```json
  {
    "user_id": 1,
    "cognitive_levels": {"level1": 0, "level2": 0, "level3": 0, "level4": 0},
    "proficiency_status": {"level1": "NOT_STARTED", "level2": "NOT_STARTED", ...},
    "weak_areas": [],
    "strong_areas": [],
    "topics_attempted": [],
    "recommendations": [],
    "quizzes_taken": 0
  }
  ```
- **Used by**: TopicSelector, ChatBot context, Learning Dashboard

#### **Table 2: `ai_feedback`**
- **Status**: ✅ AUTO-CREATED
- **When**: During signup (auth.js line 95)
- **Data**:
  ```json
  {
    "user_id": 1,
    "quiz_id": "initial",
    "topic": "Getting Started",
    "summary": "Welcome! Complete your first quiz to receive personalized AI coaching.",
    "recommended_level": "normal",
    "suggested_topics": [],
    "study_plan": []
  }
  ```
- **Used by**: ChatBot for recommendations, Dashboard for coaching tips

#### **Table 3: `ai_learning_insights`**
- **Status**: ✅ AUTO-CREATED
- **When**: During signup (auth.js line 119)
- **Data**:
  ```json
  {
    "user_id": 1,
    "quiz_id": "initial",
    "topic": "Getting Started",
    "ai_summary": "New student profile created. Start learning!",
    "recommended_topics": [],
    "difficulty_adjustment": "normal",
    "learning_plan": "",
    "strong_areas": [],
    "weak_areas": [],
    "confidence_score": 0.0
  }
  ```
- **Used by**: ChatBot for learning insights, Progress tracking

#### **Table 4: `ml_performance_records`** (via initializeUserMLPerformance)
- **Status**: ✅ AUTO-CREATED
- **When**: During signup (auth.js line 54)
- **Used by**: Topic performance tracking, ML analytics

---

## What Happens Next (After User Takes First Quiz)

### Quiz Completion → results.js
Saves to 2 additional tables:

#### **Table 5: `quiz_results`**
- Created after first quiz completion
- Stores: score, answers, topic, difficulty, bloom_breakdown

#### **Table 6: `ml_performance_records`** (updated)
- Updates topic-specific performance metrics
- Tracks: percentage score, bloom levels, topics_attempted array

---

## Chatbot Context Assembly

When user sends a message, chatbot.js fetches from **all 5 tables**:

```javascript
// Lines 44-117 in chatbot.js
1. user_learning_profiles   → Profile status, weak/strong areas
2. quiz_results             → Recent exam history  
3. ai_feedback              → Recent coaching recommendations
4. ml_performance_records   → Topic-specific scores
5. ai_learning_insights     → Cumulative learning insights
```

Result: Comprehensive student context sent to GPT-4

---

## Verification Checklist

### ✅ For New User Registration

1. **User Created**
   - Query: `SELECT * FROM users WHERE email = 'new_user@example.com'`
   - Should return: user record with id=X

2. **Learning Profile Created**
   - Query: `SELECT * FROM user_learning_profiles WHERE user_id = X`
   - Should return: 1 row with default values

3. **AI Feedback Initialized**
   - Query: `SELECT * FROM ai_feedback WHERE user_id = X`
   - Should return: 1 row with welcome message

4. **AI Learning Insights Initialized**
   - Query: `SELECT * FROM ai_learning_insights WHERE user_id = X`
   - Should return: 1 row with initial insights

5. **ML Performance Initialized**
   - Query: `SELECT * FROM ml_performance_records WHERE user_id = X`
   - Should return: ≥1 row (depends on implementation)

---

## Error Handling

If any table creation fails during signup:
- **Behavior**: ⚠️ Warning logged, but signup **succeeds**
- **Reason**: User can still take quizzes without pre-existing records
- **ChatBot**: Will fetch only available data

Example warning log:
```
⚠️ Warning: Could not create learning profile: <error details>
```

---

## Database Migration Required

Before signup works, run this SQL in Supabase:
```sql
-- Step 1: Run 006_chat_conversations_final.sql 
-- (Creates chat_conversations table + RLS policies)

-- Already exist:
-- - user_learning_profiles (migration 001)
-- - ai_feedback (migration 001)
-- - ai_learning_insights (migration 001)
-- - ml_performance_records (migration 003)
-- - quiz_results (migration 001)
```

---

## Summary

| Table | Auto-Created | Created When | Used By |
|-------|-------------|--------------|---------|
| user_learning_profiles | ✅ Yes | Signup | Dashboard, ChatBot |
| ai_feedback | ✅ Yes | Signup | ChatBot, Dashboard |
| ai_learning_insights | ✅ Yes | Signup | ChatBot, Dashboard |
| ml_performance_records | ✅ Yes | Signup | ChatBot, Analytics |
| quiz_results | ❌ No | After 1st Quiz | ChatBot, Results |
| chat_conversations | ❌ No | After 1st Chat | ChatBot History |

**User can start learning immediately after signup without errors.** ✅
