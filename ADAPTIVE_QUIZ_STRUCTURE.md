# Adaptive Quiz System - Complete Structure & Flow

## 📊 HIGH-LEVEL ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────┐
│ STUDENT TAKES ADAPTIVE QUIZ (Frontend: AdaptiveQuiz.jsx)        │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                    GET /api/adaptive/quiz/personalized?userId=123
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│ BACKEND: adaptive.js - /quiz/personalized Route                 │
│                                                                  │
│  1️⃣  Load ALL questions from questions_updated.json            │
│  2️⃣  Fetch user's profile from Supabase DB                     │
│  3️⃣  Get recommendation based on weak areas                    │
│  4️⃣  Call AdaptiveQuestionSelector.generatePersonalizedQuiz()  │
│      └─> Distributes questions by cognitive level              │
│      └─> Focuses on weak areas (40%) + some easy (35%)         │
│      └─> Returns 20 balanced questions                         │
│  5️⃣  Strip answer keys from quiz (security)                    │
│  6️⃣  Send quiz to frontend                                     │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                   Returns JSON Quiz
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│ FRONTEND: Student answers questions & submits                   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                    POST /api/results  (with answers)
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│ BACKEND: routes/results.js                                       │
│                                                                  │
│  1️⃣  Validate answers & user                                    │
│  2️⃣  Score the quiz locally (analyzer.js)                      │
│  3️⃣  Calculate Bloom level increments                          │
│  4️⃣  Save quiz_results to Supabase                             │
│  5️⃣  Update user_learning_profiles (cognitive_levels)          │
│  6️⃣  Optional: Call OpenAI for feedback (async)                │
│  7️⃣  Return results to frontend                                │
└──────────────────────────┬──────────────────────────────────────┘
                           │
              Results Page displays score & feedback
```

---

## 🔄 ADAPTIVE QUIZ GENERATION FLOW

### Step 1: Load Questions from JSON
**File:** `stem-project/backend/ai/loadQuestions.js`
```javascript
loadQuestionsData() 
  ├─ Try multiple filesystem paths (Vercel & local)
  └─ Returns: { chapter1: [...questions], chapter2: [...questions], ... }
```

**Questions JSON Structure:**
```json
{
  "id": "q1", 
  "topic": "Đa thức",
  "question": "Phương trình là gì?",
  "options": ["A", "B", "C", "D"],
  "difficulty": 1,  // 1=Knowledge, 2=Comprehension, 3=Application, 4=Analysis
  "answerIndex": 0,  // ← NEVER SENT TO CLIENT
  "bloomLevel": 1
}
```

### Step 2: Fetch User Profile from Supabase
**Route:** `GET /api/adaptive/profile/:userId`
```javascript
// Queries: user_learning_profiles table
Result:
{
  user_id: 123,
  cognitive_levels: {
    level1: 15,     // Points scored at Knowledge level
    level2: 8,      // Points scored at Comprehension level
    level3: 6,      // Points scored at Application level
    level4: 0       // Points scored at Analysis level
  },
  weak_areas: [
    { topic: "Đa thức", percentage: 45, priority: 1 },
    { topic: "Phương trình", percentage: 50, priority: 2 }
  ],
  strong_areas: ["Hình học"],
  proficiency_status: {
    level1: "DEVELOPING",
    level2: "BEGINNING",
    level3: "STARTING",
    level4: "NOT_STARTED"
  },
  quizzes_taken: 3
}
```

### Step 3: Identify Weak & Strong Areas
**Function:** `getQuizRecommendation(userId)` in `routes/quizResultsService.js`
```javascript
// Analyzes student's quiz history to find:
// - Most failed topics (weak_areas)
// - Most successful topics (strong_areas)
// - Recommended next difficulty level
```

### Step 4: Generate Personalized Quiz
**Class:** `AdaptiveQuestionSelector` in `backend/ai/adaptiveEngine.js`

#### Distribution Algorithm:
```javascript
// For each cognitive level (1-4):
//   - If score < 40:  35% of quiz (beginner focus)
//   - If 40 ≤ score < 60:  40% of quiz (NEEDS WORK - HIGH PRIORITY)
//   - If 60 ≤ score < 80:  15% of quiz (developing)
//   - If score ≥ 80:  10% of quiz (maintenance only)

// Example: 20-question quiz
// User scores: level1=80, level2=45, level3=20, level4=0
// Distribution:
//   level1: 2 questions (80 ≥ 80 → 10%)
//   level2: 8 questions (45→60 → 40% = needs work)
//   level3: 7 questions (20→35 % = beginner)
//   level4: 3 questions (0→35 % = beginner)
```

#### Topic Selection Strategy:
```javascript
// Within each cognitive level:
// 1. Prioritize WEAK TOPICS from user's profile
// 2. Mix in STRONG TOPICS to maintain confidence
// 3. Select random questions from each topic
// 4. Aim for balanced topic coverage
```

---

## 💾 DATABASE UPDATE FLOW (After Quiz Submission)

### Table: `user_learning_profiles`

**Before Quiz:**
```
user_id | cognitive_levels | weak_areas | proficiency_status
────────┼──────────────────┼────────────┼────────────────
  123   | {level1:10,      | [{topic:   | {level1:      
        |  level2:5,       |  "Đa thức",|  BEGINNING,
        |  level3:0,       |  score:40}]| level2:
        |  level4:0}       |            | STARTING, ...}
```

**Scoring Example:**
```
Quiz Result: 16 correct out of 20 = 80% score

Bloom Level Distribution in Quiz:
- Level 1: 5 questions → correct: 4 → +10 points (Excellent)
- Level 2: 8 questions → correct: 7 → +10 points (Excellent)
- Level 3: 4 questions → correct: 3 → +6 points (Good)
- Level 4: 3 questions → correct: 2 → +6 points (Good)
```

**After Quiz (Updates):**
```
user_id | cognitive_levels | weak_areas | proficiency_status
────────┼──────────────────┼────────────┼────────────────
  123   | {level1:20 (+10),| [{topic:   | {level1:
        |  level2:15 (+10),| "Phương    | DEVELOPING,
        |  level3:6 (+6),  | trình",    | level2:
        |  level4:6 (+6)}  | score:50}] | BEGINNING, ...}
```

### File: `routes/results.js`
```javascript
// Main flow:
1. POST /api/results receives: { userId, answers[], questions[], ... }

2. Scoring (analyzer.js):
   - Compares each answer with correct answerIndex
   - Groups results by difficulty level
   - Calculates percentage per level
   - Identifies weak topics

3. Bloom Increment (getBloomIncrement function):
   - If 80%+ correct: +10 points
   - If 60-79%: +6 points
   - If 40-59%: +2 points, etc.
   
4. Database Updates:
   a) INSERT into quiz_results table
      (user_id, quiz_id, score, answers, weak_areas, ...)
   
   b) UPDATE user_learning_profiles
      SET cognitive_levels = {
        level1: old_level1 + increment1,
        level2: old_level2 + increment2,
        ...
      }
      UPDATE weak_areas = [identified_weak_topics]
      UPDATE last_updated = now()
   
   c) INSERT into ml_performance_records
      (for analytics/trends)
```

---

## 🎯 KEY SELECTION LOGIC

### How Adaptive Quiz Picks Questions from JSON

```javascript
// In AdaptiveQuestionSelector.generatePersonalizedQuiz():

1. Calculate distribution:
   distribution = {
     level1: 2,   // 10% of 20
     level2: 8,   // 40% of 20 (WEAK AREA)
     level3: 7,   // 35% of 20
     level4: 3    // 15% of 20
   }

2. For EACH cognitive level:
   selectQuestionsForLevel(level, count, studentScore, allQuestions)
   
   a) Filter allQuestions by: question.difficulty == level
   
   b) If student is weak (score < 50):
      - Prioritize weak topics from user's profile
      - Select 70% from weak topics
      - Select 30% from random topics
   
   c) If student is developing (50 ≤ score < 80):
      - Mix weak (50%) + strong topics (50%)
   
   d) If student is strong (score ≥ 80):
      - Include mostly strong topics
      - Small sample of challenge questions

3. Return 20 questions total, shuffled
```

### Contest Selection (from Contest Menu)
```javascript
// When user manually selects "Contest 3 - Chapter 2"
// Frontend navigates to AdaptiveQuiz with:
// location.state = {
//   quiz: [questions from contest3],
//   quizType: "contest"
// }

// This BYPASSES adaptive selection
// Uses exact contest from JSON file instead
```

---

## 📁 KEY FILES LOCATIONS

```
stem-project/
├── backend/
│   ├── routes/
│   │   ├── adaptive.js              ← Quiz endpoints & weak area ranking
│   │   ├── results.js               ← Quiz submission & DB update
│   │   └── quizResultsService.js    ← getQuizRecommendation()
│   │
│   ├── ai/
│   │   ├── adaptiveEngine.js        ← AssessmentEngine & AdaptiveQuestionSelector
│   │   ├── analyzer.js              ← Scoring logic
│   │   └── loadQuestions.js         ← Load from questions_updated.json
│   │
│   ├── data/
│   │   └── questions_updated.json   ← ALL quiz questions by chapter
│   │
│   └── database.js                  ← Supabase client initialization
│
├── src/
│   ├── pages/
│   │   ├── AdaptiveQuiz.jsx        ← Frontend quiz taker
│   │   ├── LearningProfile.jsx      ← Dashboard shows bloom levels
│   │   └── ResultPage.jsx           ← Shows feedback
│   │
│   └── contexts/
│       └── AuthContext.jsx          ← User session management
│
└── api/
    └── data/
        └── questions_updated.json   ← Data source (copied to backend)
```

---

## 🔑 PROFICIENCY STAGES

```
Points Accumulated | Status
─────────────────┼──────────────────
      0          | NOT_STARTED
     1-19        | STARTING
    20-39        | BEGINNING
    40-59        | DEVELOPING
     60+         | PROFICIENT     ← Mastery achieved!
```

Each quiz can earn **1-10 points** per cognitive level depending on performance.

---

## 🚀 QUICK FLOW SUMMARY

```
Student Opens App
    ↓
Fetches /api/adaptive/profile/:userId
    ↓
Dashboard shows current Bloom levels
    ↓
Clicks "Take Adaptive Quiz"
    ↓
Calls GET /api/adaptive/quiz/personalized?userId=123
    ├─ Loads ALL questions
    ├─ Checks user's scores (level1:15, level2:8, ...)
    ├─ Identifies weak level2 (8 points < 20 threshold)
    ├─ Creates quiz: 40% level2 questions + balanced levels
    └─ Returns 20 questions WITHOUT answers
    ↓
Student answers 20 questions in AdaptiveQuiz.jsx
    ↓
Submits answers to POST /api/results
    ├─ Scores locally: 16/20 correct
    ├─ Calculates: level1: +10, level2: +6, level3: +6, level4: +2
    ├─ Updates DB: cognitive_levels to {level1: 25, level2: 14, ...}
    ├─ Identifies new weak topics
    └─ Returns results with AI feedback
    ↓
Frontend shows ResultPage with:
├─ Overall score (80%)
├─ Bloom level breakdown
├─ New proficiency status
├─ AI suggestions for next steps
└─ Option to take another quiz

Next Quiz:
    ↓
System sees level2 still needs work (14 < 40)
    ↓
Generates adaptive quiz with 40% level2 questions again
    └─ But focuses on DIFFERENT weak topics this time (variety)
```

---

## 🛠️ IMPLEMENTATION PHASE FOR YOUR PROJECT

To adapt this to your STEM project:

✅ **Done (from HocTapToanSongNguNew):**
- Question loading from JSON
- Adaptive selection algorithm
- Bloom taxonomy scoring
- Supabase database integration
- Frontend quiz taker component

📝 **Customize for Your Data:**
1. Replace `questions_updated.json` with your STEM questions
2. Ensure each question has: `difficulty` (1-4), `topic`, `options/answers`
3. Update AI prompts for your subject matter
4. Adjust point increments if needed (currently +1 to +10)

🔗 **Wire Up to Your Backend:**
1. Integrate with your authentication
2. Ensure Supabase `user_learning_profiles` table matches schema
3. Update AI endpoints for your content type
4. Customize weak area detection for your topics
