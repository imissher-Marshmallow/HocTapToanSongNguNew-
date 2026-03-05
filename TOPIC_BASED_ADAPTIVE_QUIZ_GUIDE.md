# Topic-Based Adaptive Quiz Integration Guide

## 📋 Overview

This is the new adaptive quiz flow where:
- **User selects a TOPIC only** (no difficulty buttons)
- **System determines difficulty** based on past performance
- **Results are saved** with full metrics to `ml_performance_records`
- **Profile data** shows unpolished JSON with all metrics

## 🔄 Complete Flow

```
User Signs Up
    ↓
ml_performance_records initialized (empty record)
    ↓
User clicks "Choose Topic" → TopicSelector.jsx
    ↓
User picks topic (e.g., "Đại số")
    ↓
System checks: Has user done this topic before?
    ├─ No → Use easy difficulty (exam_id 1-3)
    ├─ Score < 60% → Use easy (exam_id 1-3)
    ├─ Score 60-75% → Use normal (exam_id 2-3)
    └─ Score ≥ 75% → Use hard (exam_id 4-5)
    ↓
Load questions from questions_updated.json
    filtered by: topic + exam_id
    ↓
User takes quiz (10 questions)
    ↓
Submit answers
    ↓
System calculates:
    - Score & percentage
    - Cognitive breakdown (by Bloom's level)
    - Topic mastery
    - Weak topics (score < 60%)
    - Strong topics (score ≥ 80%)
    - Trend metrics (improving/declining/stable)
    ↓
Save to ml_performance_records
    ↓
Return results + feedback
    ↓
User sees score, weak areas
    ↓
Can view profile → returns unpolished JSON structure
```

---

## 🛠️ Setup Instructions

### Step 1: Add Route to App.js

```javascript
import TopicSelector from './components/TopicSelector';
import AdaptiveQuiz from './pages/AdaptiveQuiz'; // Already exists

// In your App.js routes:
<Route path="/topic-selector" element={<TopicSelector />} />
<Route path="/adaptive-quiz" element={<AdaptiveQuiz />} />
```

### Step 2: Create Button to Access TopicSelector

```javascript
// In LearningHome or Dashboard
<button 
  onClick={() => navigate('/topic-selector')}
  className="btn-topic-selector"
>
  📚 Choose Topic & Practice
</button>
```

### Step 3: Update AdaptiveQuiz to Handle Topic-Based Quizzes

The AdaptiveQuiz.jsx component should already work because it accepts:
```javascript
location.state = {
  questions: [...],
  topicName: "Đại số",
  difficulty: "easy",
  userId: 1
}
```

### Step 4: Save Results After Quiz

In your quiz submission handler (AdaptiveQuiz.jsx or results.js):

```javascript
const saveQuizResults = async (quizData) => {
  const performanceRecord = {
    user_id: userId,
    quiz_id: `quiz-${topicName}-${Date.now()}`,
    topic: topicName,
    exam_id: difficulty_level, // 1-5
    score: userScore,
    percentage: (userScore / totalQuestions) * 100,
    max_score: totalQuestions,
    cognitive_breakdown: calculateCognitiveBreakdown(answers),
    topic_mastery: calculateTopicMastery(answers),
    weak_topics: identifyWeakTopics(topicMastery),
    strong_topics: identifyStrongTopics(topicMastery),
    trend_metrics: calculateTrends(userId, currentScore),
    time_on_task: calculateTimeMetrics(startTime, endTime),
    quiz_type: 'topic-based'
  };

  const response = await fetch('/api/adaptive/quiz/save-results', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(performanceRecord)
  });

  return await response.json();
};
```

---

## 📊 API Endpoints

### 1. Get All Topics
**GET** `/api/adaptive/topics?userId=1`

Returns:
```json
[
  {
    "chapterId": 1,
    "name": "Đa thức nhiều biến",
    "isAvailable": true,
    "mode": "normal",
    "totalQuestions": 45,
    "userProgress": {
      "attempts": 3,
      "lastScore": 75,
      "averageScore": 70,
      "lastAttemptedAt": "2025-03-05T10:30:00Z",
      "status": "developing"
    }
  },
  {
    "chapterId": 2,
    "name": "Phân thức đại số",
    "isAvailable": true,
    "mode": "normal",
    "totalQuestions": 50,
    "userProgress": null  // Never attempted
  }
]
```

### 2. Get Smart Difficulty
**GET** `/api/adaptive/quiz/smart-difficulty/1/Đại số`

Returns:
```json
{
  "userId": 1,
  "topicName": "Đại số",
  "difficulty": "normal",
  "examIds": [2, 3],
  "reasoning": "Good progress (avg 72%). Moving to harder questions.",
  "previousAttempts": 3
}
```

### 3. Generate Quiz by Topic
**POST** `/api/adaptive/quiz/by-topic`

Body:
```json
{
  "userId": 1,
  "topicName": "Đại số",
  "examIds": [2, 3],
  "numQuestions": 10
}
```

Response:
```json
{
  "quizId": "quiz-Đại số-1741234567",
  "topicName": "Đại số",
  "totalQuestions": 10,
  "examIdDistribution": { "2": 5, "3": 5 },
  "questions": [
    {
      "id": 1,
      "question": "...",
      "options": [...],
      "topic": "...",
      "difficulty": "2",
      "exam_id": 2
    }
  ]
}
```

---

## 💾 Profile API - Returns Unpolished JSON

**GET** `/api/adaptive/profile/:userId`

Returns full ml_performance_records data (unpolished JSON):

```json
{
  "userId": 1,
  "scores": {
    "level1": 10,
    "level2": 8,
    "level3": 5,
    "level4": 2
  },
  "proficiency": {
    "level1": "BEGINNING",
    "level2": "DEVELOPING",
    "level3": "DEVELOPING",
    "level4": "NOT_STARTED"
  },
  "weakAreas": [
    {
      "topic": "Phương trình",
      "score": 45,
      "attempts": 2,
      "priority": 100
    }
  ],
  "strongAreas": [
    {
      "topic": "Đa thức",
      "score": 85,
      "attempts": 3,
      "masterySince": "2025-03-01"
    }
  ],
  "recommendations": [
    "Focus on Phương trình - you scored 45% on last attempt",
    "Keep practicing Đa thức - you're doing great!"
  ],
  "learningPath": null,
  "quizzesTaken": 5,
  "lastUpdated": "2025-03-05T10:30:00Z",
  "createdAt": "2025-03-01T00:00:00Z"
}
```

### Profile also contains raw ml_performance_records:

**GET** `/api/ml-performance/:userId`

```json
{
  "records": [
    {
      "id": 1,
      "user_id": 1,
      "quiz_id": "quiz-Đại số-1234567",
      "topic": "Đại số",
      "score": 8,
      "percentage": 80.0,
      "max_score": 10,
      "exam_id": 2,
      "cognitive_breakdown": {
        "level1": {"correct": 3, "total": 3, "points": 10},
        "level2": {"correct": 3, "total": 3, "points": 6},
        "level3": {"correct": 2, "total": 3, "points": 6},
        "level4": {"correct": 0, "total": 1, "points": 0}
      },
      "topic_mastery": {
        "Phương trình bậc một": {"correct": 2, "total": 3, "score": 67},
        "Phương trình bậc hai": {"correct": 1, "total": 2, "score": 50}
      },
      "weak_topics": [
        {"topic": "Phương trình bậc hai", "score": 50, "total_questions": 2, "priority": 80}
      ],
      "strong_topics": [
        {"topic": "Phương trình bậc một", "score": 67, "total_questions": 3, "priority": 20}
      ],
      "trend_metrics": {
        "trend": "stable",
        "compared_to_last": 5.0,
        "momentum": 0,
        "estimated_next_score": 80
      },
      "time_on_task": {
        "total_seconds": 540,
        "per_question_avg": 54,
        "time_efficiency": "0.95"
      },
      "quiz_type": "topic-based",
      "created_at": "2025-03-05T10:30:00Z"
    }
  ]
}
```

---

## 🎯 Topics Available

From `questions_updated.json`:

1. **Đa thức nhiều biến** (chapterId: 1) - 45 questions
2. **Phân thức đại số** (chapterId: 2) - 50 questions
3. **Hàm số và đồ thị** (chapterId: 3) - 48 questions
4. **Hình học trực quan** (chapterId: 4) - 52 questions
5. **Tam giác, tứ giác** (chapterId: 5) - 55 questions

Difficulty Levels (exam_id):
- **1**: Very Easy (NB - Nhận biết)
- **2**: Easy (TH - Thông hiểu)
- **3**: Normal (VDT - Vận dụng)
- **4**: Hard (VDC - Vận dụng cao)
- **5**: Very Hard (Chứng minh, bài toán phức tạp)

---

## 📈 How Scoring Works

### Bloom's Cognitive Levels:
- **Level 1 (Knowledge)**: +10 points if 80%+ correct, +6 if 60-79%, etc.
- **Level 2 (Understanding)**: Same scoring
- **Level 3 (Application)**: Same scoring
- **Level 4 (Analysis)**: Same scoring

### Weak Topics (Identified as):
- Score < 60% on a subtopic
- Marked for next quiz recommendation

### Strong Topics (Identified as):
- Score ≥ 80% on a subtopic
- Can skip or use for confidence building

---

## 🚀 Next Steps

1. **Update App.js** with the new routes
2. **Test TopicSelector** component
3. **Test quiz generation** with different difficulties
4. **Verify results saving** in Supabase
5. **Check profile endpoint** returns correct JSON
6. **Build UI** to display weak/strong topics to user

---

## 📝 Important Notes

- `ml_performance_records` table initialized for each user at signup
- Profile data is **unpolished JSON** - raw data for AI/analytics
- Difficulty is **automatically selected** - user only picks topic
- Results saved **after each quiz** with full metrics
- Can fetch **all quiz history** for user using profile endpoint
- Weak topics are **prioritized** for next quiz recommendations
