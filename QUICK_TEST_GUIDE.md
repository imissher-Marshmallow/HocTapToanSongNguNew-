# Quick Test Guide - All Quiz Types

## System Overview
- **Scoring**: 10-point scale with weighted questions (T/F=0.25 pts, MC=1.0 pt)
- **Roadmap Unlock**: Requires 2+ quizzes AND score ≥ 6.0/10
- **AI Generation**: Real OpenAI GPT-3.5-turbo (fallback templates available)
- **Database**: Supabase tracks `last_score`, `quizzes_taken`, `roadmap_status`

---

## Quick Test Scenarios

### Scenario 1: First Quiz - Pending Unlock
```
Action: Take adaptive quiz, score 8/10
Expected:
  ✓ scoreOutOf10 = 8.0
  ✓ quizzes_taken = 1
  ✓ roadmap_status = 'pending'
  ✓ Learning Profile shows "Complete 1 more quiz to unlock"
```

### Scenario 2: Second Quiz - Unlock Roadmap
```
Action: Take regular quiz, score 7/10
Expected:
  ✓ scoreOutOf10 = 7.0
  ✓ quizzes_taken = 2
  ✓ roadmap_status = 'generated'
  ✓ learning_path populated with AI roadmap
  ✓ Learning Profile shows 4-week roadmap
  ✓ High Application level becomes clickable
```

### Scenario 3: Score Below Threshold
```
Action: First quiz = 8/10, Second quiz = 4/10
Expected:
  ✓ quizzes_taken = 2 (condition met)
  ✓ last_score = 4.0 (condition NOT met)
  ✓ roadmap_status = 'pending' (still locked!)
  ✓ Learning Profile still shows "Unlock Progress"
  ✓ Shows "You need to score ≥ 6.0"
```

### Scenario 4: Verify Scoring Accuracy
```
Quiz 1: 10 questions (5 T/F + 5 MC)
  Correct: 4 T/F + 4 MC
  Points: (4 × 0.25) + (4 × 1.0) = 1.0 + 4.0 = 5.0
  Max: (5 × 0.25) + (5 × 1.0) = 1.25 + 5.0 = 6.25
  Score: 5.0 / 6.25 × 10 = 8.0/10 ✓

Quiz 2: 4 T/F questions only
  Correct: 3 T/F
  Points: 3 × 0.25 = 0.75
  Max: 4 × 0.25 = 1.0
  Score: 0.75 / 1.0 × 10 = 7.5/10 ✓
```

---

## Checking Supabase Data

### View User Profile
```sql
SELECT 
  user_id,
  quizzes_taken,
  last_score,
  roadmap_status,
  learning_path,
  updated_at
FROM user_learning_profiles
WHERE user_id = 123;
```

Expected After Test Scenario 2:
```
user_id    | quizzes_taken | last_score | roadmap_status | learning_path          | updated_at
-----------|---------------|-----------|-----------------|------------------------|----------
123        | 2             | 7.0       | generated       | {week 1, week 2, ...}  | 2024-12-28
```

---

## Learning Levels Unlock Rules

| Condition | High Application | Analysis Level |
|-----------|------------------|-----------------|
| activeWeek = 1 | 🔒 Locked | 🔒 Locked |
| activeWeek = 2 | ✅ Unlocked | 🔒 Locked |
| activeWeek = 3+ | ✅ Unlocked | ✅ Unlocked |

### Testing Unlocks
1. Take first quiz → activeWeek = 1 or 2 → High App locked
2. Take second quiz → activeWeek = 2 or 3 → High App unlocked, Analysis locked (or both unlocked)
3. Click unlocked level → Navigate to `/adaptive-quiz-select?level=high` or `?level=analysis`

---

## API Response Examples

### POST /api/analyze-quiz (Regular or Adaptive)
```json
{
  "score": 7,
  "scoreOutOf10": 7.0,
  "maxScore": 10,
  "totalPoints": 7.0,
  "maxPossiblePoints": 10.0,
  "performanceLabel": "Đạt",
  "weakAreas": [
    { "topic": "Algebra", "performance": "WEAK" }
  ],
  "roadmapUnlocked": false,
  "quizzesTaken": 1
}
```

### POST /api/ai/generate-insight
```json
{
  "strengths": "Bạn có nền tảng kiến thức vững chắc...",
  "bottleneck": "Hiểu biết là khoảng trống chính...",
  "primaryAction": "Low Application Practice",
  "actionDescription": "Bắt đầu với các bài tập ứng dụng cơ bản...",
  "activeWeek": 2,
  "roadmap": [
    {
      "focus": "🎯 Tuần 1: Tăng cường kiến thức...",
      "detail": "Ôn tập các khái niệm chính..."
    },
    ...
  ]
}
```

---

## Troubleshooting

### Roadmap not generating?
1. Check: `quizzesTaken >= 2`? ✓
2. Check: `last_score >= 6.0`? ✓
3. Check Supabase: Is `roadmap_status` field present?
4. Check console: Any OpenAI API errors?

### Score not correct?
1. Verify question types: `q.type === 'true_false'`?
2. Check math: `(totalPoints / maxPossiblePoints) * 10`
3. Verify answer correctness logic
4. Check for rounding issues

### Learning Levels not unlocking?
1. Check: `insight.activeWeek`value in console
2. Check CSS: `.level-card.unlocked` displaying?
3. Verify condition: `activeWeek >= 2` for High App

### AI not generating?
1. Check: OpenAI API key configured?
2. Check logs: Is OpenAI endpoint called?
3. Fallback should use templates automatically
4. Test with valid profile data

---

## Key Files to Monitor

```
Backend Scoring:
  stem-project/backend/ai/analyzer.js (lines 412-490)
  stem-project/backend/routes/adaptive.js (lines 890-925)

Roadmap Logic:
  stem-project/backend/routes/quiz.js (lines 77-155)
  stem-project/backend/routes/adaptive.js (lines 930-948)

AI Generation:
  stem-project/backend/routes/aiInsight.js (NEW FILE)

Frontend Display:
  stem-project/src/pages/LearningProfile.jsx (unlock + levels)
  stem-project/src/styles/LearningProfile.css (new styles)
```

---

## Success Criteria ✅

- [x] All quizzes (adaptive + regular) use 10-point scale
- [x] T/F = 0.25 pts, MC/SA = 1.0 pt scoring
- [x] Roadmap only generates after 2+ quizzes AND score ≥ 6.0
- [x] Real OpenAI API generates insights (not hardcoded)
- [x] Unlock progress displays before roadmap unlocks
- [x] Learning Levels interactive with unlock status
- [x] Supabase tracks roadmap_status and last_score
- [x] Complete documentation provided
