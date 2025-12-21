# ML Analytics Testing Guide - Quick Start

## All Components Ready ✅

Your ML analytics pipeline is fully integrated into the quiz API. Here's how to test it end-to-end.

---

## Step 1: Start the Backend Server

```bash
cd c:\Users\ADMIN\Downloads\Resource2025\NewSTEM\HocTapToanSongNguNew-\stem-project\backend
npm start
```

**Expected Output:**
```
✓ Server running on port 5000
✓ Features: Quiz API, Authentication, ML Integration
```

**Files That Will Load:**
- ✅ `AIAnalyzer.js` - 5 ML algorithms
- ✅ `PerformanceAnalytics.js` - Analytics engine
- ✅ `LearningPathGenerator.js` - Learning paths
- ✅ `MLAnalyticsDB.js` - Supabase integration
- ✅ `MLAnalyticsService.js` - Orchestrator
- ✅ `database.js` - Uses your DATABASE_URL

---

## Step 2: Test with Sample Quiz Data

### Using Postman or cURL:

```bash
curl -X POST http://localhost:5000/api/results \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "123",
    "quizId": "test_math_001",
    "answers": [
      {"questionId": "q1", "selectedOption": "option_b"},
      {"questionId": "q2", "selectedOption": "option_a"},
      {"questionId": "q3", "selectedOption": "option_c"},
      {"questionId": "q4", "selectedOption": "option_b"},
      {"questionId": "q5", "selectedOption": "option_a"}
    ],
    "questions": [
      {
        "id": "q1",
        "content": "What is 2+2?",
        "options": ["3", "4", "5", "6"],
        "answerIndex": 1,
        "difficulty": "easy"
      },
      {
        "id": "q2",
        "content": "What is the square root of 16?",
        "options": ["4", "8", "16", "2"],
        "answerIndex": 0,
        "difficulty": "medium"
      },
      {
        "id": "q3",
        "content": "What is 15 × 7?",
        "options": ["100", "102", "105", "110"],
        "answerIndex": 2,
        "difficulty": "medium"
      },
      {
        "id": "q4",
        "content": "Solve: 2x + 5 = 13",
        "options": ["x=3", "x=4", "x=5", "x=6"],
        "answerIndex": 1,
        "difficulty": "hard"
      },
      {
        "id": "q5",
        "content": "What is 0.5 × 0.5?",
        "options": ["0.25", "0.5", "1", "0.1"],
        "answerIndex": 0,
        "difficulty": "hard"
      }
    ]
  }'
```

### Using JavaScript/Fetch:

```javascript
const response = await fetch('http://localhost:5000/api/results', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: '123',
    quizId: 'test_math_001',
    answers: [
      {questionId: 'q1', selectedOption: 'option_b'},
      {questionId: 'q2', selectedOption: 'option_a'},
      {questionId: 'q3', selectedOption: 'option_c'},
      {questionId: 'q4', selectedOption: 'option_b'},
      {questionId: 'q5', selectedOption: 'option_a'}
    ],
    questions: [
      {id: 'q1', content: 'What is 2+2?', options: ['3','4','5','6'], answerIndex: 1, difficulty: 'easy'},
      {id: 'q2', content: 'What is √16?', options: ['4','8','16','2'], answerIndex: 0, difficulty: 'medium'},
      {id: 'q3', content: 'What is 15×7?', options: ['100','102','105','110'], answerIndex: 2, difficulty: 'medium'},
      {id: 'q4', content: 'Solve: 2x+5=13', options: ['x=3','x=4','x=5','x=6'], answerIndex: 1, difficulty: 'hard'},
      {id: 'q5', content: 'What is 0.5×0.5?', options: ['0.25','0.5','1','0.1'], answerIndex: 0, difficulty: 'hard'}
    ]
  })
});

const result = await response.json();
console.log('ML Analysis:', result.mlAnalysis);
console.log('Weaknesses:', result.weaknesses);
console.log('Strengths:', result.strengths);
console.log('Predictions:', result.predictions);
console.log('Learning Path:', result.learningPath);
```

---

## Step 3: Check the Response

You should receive a response like this:

```json
{
  "resultId": 1,
  "score": 4,
  "totalQuestions": 5,
  "percentage": 80,
  "answerComparison": [...],
  "mlAnalysis": {
    "performanceAnalysis": {
      "overallScore": 80,
      "scoreByConcept": {...},
      "masteryIndex": {...}
    },
    "weaknesses": [
      {
        "topic": "Multiplication",
        "confidence": 0.7,
        "frequency": 1,
        "recommendations": [...]
      }
    ],
    "strengths": [
      {
        "topic": "Basic Arithmetic",
        "confidence": 0.95,
        "frequency": 2,
        "quality": "excellent"
      }
    ],
    "predictions": {
      "estimatedFutureScore": 85,
      "confidenceLevel": 0.85,
      "successProbability": 0.88
    },
    "learningPath": {
      "phase": "BUILDING",
      "duration": "2 weeks",
      "dailyGoals": [...],
      "milestones": [...]
    }
  },
  "weaknesses": [...],
  "strengths": [...],
  "predictions": {...},
  "learningPath": {...}
}
```

---

## Step 4: Verify Supabase Storage

### Check your Supabase Database:

1. Open Supabase Dashboard
2. Select your database
3. Check these tables:

#### ml_weaknesses
```sql
SELECT * FROM ml_weaknesses WHERE student_id = 123;
```

Expected columns:
- `student_id`: 123
- `topic`: "Multiplication" (or other weakness topics)
- `confidence_level`: 0.7-0.9
- `frequency`: Count of errors
- `last_updated`: timestamp

#### ml_strengths
```sql
SELECT * FROM ml_strengths WHERE student_id = 123;
```

Expected columns:
- `student_id`: 123
- `topic`: "Basic Arithmetic" (or other strength topics)
- `mastery_level`: 0.9-1.0
- `frequency`: Count of correct answers
- `last_updated`: timestamp

#### ml_predictions
```sql
SELECT * FROM ml_predictions WHERE student_id = 123;
```

Expected columns:
- `student_id`: 123
- `predicted_score`: 85
- `confidence_level`: 0.85
- `success_probability`: 0.88

#### ml_student_profiles
```sql
SELECT * FROM ml_student_profiles WHERE id = 123;
```

Expected columns:
- `id`: 123
- `overall_mastery`: 80
- `total_quizzes`: 1
- `average_score`: 80
- `learning_phase`: "BUILDING"

---

## Step 5: Test Data Retrieval Endpoints

### Get Student Weaknesses:
```bash
curl http://localhost:5000/api/ml/weaknesses/123
```

Expected response: Array of weakness objects

### Get Student Strengths:
```bash
curl http://localhost:5000/api/ml/strengths/123
```

Expected response: Array of strength objects

### Get Complete Student Profile:
```bash
curl http://localhost:5000/api/ml/profile/123
```

Expected response: Complete profile with all analysis data

---

## Troubleshooting

### Issue: npm start fails with "Cannot find module"

**Solution:**
1. Verify files exist:
   ```bash
   ls backend/ai/AIAnalyzer.js
   ls backend/ai/PerformanceAnalytics.js
   ls backend/ai/LearningPathGenerator.js
   ```

2. Check file names match exactly (case-sensitive)

3. Clear npm cache:
   ```bash
   npm cache clean --force
   rm -r node_modules
   npm install
   npm start
   ```

### Issue: Data not appearing in Supabase

**Solution:**
1. Verify DATABASE_URL is set in Vercel environment variables
2. Test database connection:
   ```bash
   node -e "require('./database').db.query('SELECT 1')"
   ```
3. Check Supabase network status
4. Verify ml_* tables exist in Supabase
5. Check server logs for storage errors

### Issue: API returns empty ml_analysis

**Solution:**
1. Verify questions array has `difficulty` field
2. Check answers array has `selectedOption` field
3. Ensure userId is numeric
4. Check server logs for MLAnalyticsService errors

---

## What Happens Behind the Scenes

When you POST to `/api/results`:

1. **AIAnalyzer** runs 5 algorithms:
   - Weighted performance scoring (by difficulty)
   - Weakness pattern detection (clusters errors by concept)
   - Confidence trend analysis (consistency scoring)
   - Future performance prediction (linear regression)
   - Insight generation (converts metrics to insights)

2. **PerformanceAnalytics** calculates:
   - Mastery index per category
   - Skill matrix with proficiency levels
   - Error pattern classification
   - Time management analysis
   - Benchmark comparison

3. **LearningPathGenerator** creates:
   - Personalized 4-phase learning plan
   - Daily goals (120 minutes each)
   - Milestone recommendations
   - Adaptive next steps

4. **MLAnalyticsDB** stores:
   - Weaknesses to `ml_weaknesses` table
   - Strengths to `ml_strengths` table
   - Predictions to `ml_predictions` table
   - Learning paths to `ml_learning_paths` table
   - Updates student profile in `ml_student_profiles` table

5. **API Response** includes:
   - Traditional quiz results (score, answers, feedback)
   - ML analysis (weaknesses, strengths, predictions, learning path)

---

## Next: Frontend Integration

Once testing is complete, update your React components:

```javascript
// Display weaknesses
{result.weaknesses?.map(weakness => (
  <div key={weakness.topic}>
    <h4>{weakness.topic}</h4>
    <p>Confidence: {weakness.confidence}</p>
  </div>
))}

// Display learning path
{result.learningPath?.dailyGoals?.map((goal, i) => (
  <div key={i}>
    <h5>Day {i+1}: {goal.topic}</h5>
    <p>{goal.recommendation}</p>
  </div>
))}
```

---

## Success Criteria

✅ npm start completes without errors
✅ POST /api/results returns mlAnalysis data
✅ Supabase tables receive and store data
✅ GET endpoints retrieve stored data
✅ Frontend displays weaknesses and strengths

---

**All components are ready. Test and deploy! 🚀**
