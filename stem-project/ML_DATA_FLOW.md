# ML Analytics Data Flow - Architecture

## Complete Data Pipeline

```
┌─────────────────────────────────────────────────────────────────────┐
│                    QUIZ SUBMISSION                                   │
│  POST /api/results with userId, quizId, answers, questions           │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
         ┌───────────────────────────────────┐
         │  STEP 1: Save Initial Result      │
         │  ├─ resultId generated            │
         │  ├─ placeholder score = 0         │
         │  ├─ Store to results table        │
         │  └─ Get ready for analysis        │
         └────────────┬──────────────────────┘
                      │
         ┌────────────┴────────────┐
         │                         │
         ▼                         ▼
   ┌──────────────┐         ┌──────────────────────────┐
   │  Traditional │         │  ML ANALYTICS PIPELINE   │
   │  Analyzer    │         │  (NEW - runs in parallel)│
   │  (analyzer)  │         └────────┬─────────────────┘
   │              │                  │
   │ Returns:     │    ┌─────────────┼─────────────┐
   │ - score      │    │             │             │
   │ - weakAreas  │    ▼             ▼             ▼
   │ - summary    │  ┌──────────┐ ┌──────────────┐ ┌──────────────────┐
   └──────┬───────┘  │AIAnalyzer│ │Performance  │ │LearningPathGen   │
          │          │          │ │Analytics    │ │                  │
          │          │5 ALGOS:  │ │             │ │PHASES:           │
          │          │1. Weighted│ │Calculates: │ │FOUNDATION        │
          │          │   Scoring │ │- Mastery   │ │BUILDING          │
          │          │2. Pattern │ │- Skill     │ │ADVANCING         │
          │          │   Detection│ │  Matrix    │ │MASTERY           │
          │          │3. Confidence│ │- Errors   │ │                  │
          │          │   Trend   │ │- Time Mgmt │ │Generates:        │
          │          │4. Prediction│ │- Benchmark│ │- Daily Goals     │
          │          │5. Insights │ │            │ │- Milestones      │
          │          │            │ │Returns:    │ │- Recommendations │
          │          │Returns:    │ │AnalyticObj │ │                  │
          │          │AnalysisObj │ └────┬───────┘ │Returns: PathObj  │
          │          └────┬───────┘      │         └────┬─────────────┘
          │               │              │              │
          │               └──────────┬───┴──────────┬───┘
          │                          │              │
          │            ┌─────────────▼──────────────▼───┐
          │            │  MLAnalyticsService             │
          │            │  Combines all results:          │
          │            │  - performanceAnalysis (obj)    │
          │            │  - weaknesses (array)           │
          │            │  - strengths (array)            │
          │            │  - predictions (obj)            │
          │            │  - learningPath (obj)           │
          │            │  - errorPatterns (obj)          │
          │            │  - timeAnalysis (obj)           │
          │            └────────┬──────────────────────┘
          │                     │
          │        ┌────────────┴────────────┐
          │        │                         │
          ▼        ▼                         ▼
   ┌─────────┐  ┌──────────────────────┐  ┌──────────────────┐
   │RESPONSE │  │ ASYNC STORAGE        │  │Database Pool     │
   │TO CLIENT│  │ (Non-blocking)       │  │(from Supabase)   │
   │         │  │                      │  └────────┬─────────┘
   │Returns: │  │MLAnalyticsDB runs:   │           │
   │{        │  │1. storeMLAnalysis()  │           │
   │ score   │  │2. storeWeaknesses()  │  ┌────────▼─────────────┐
   │ percent │  │3. storeStrengths()   │  │  TRANSACTION         │
   │ answers │  │4. storePredictions() │  │  ┌─────────────────┐ │
   │ mlAnaly-│  │5. storeLearning()    │  │  │ml_student_prof  │ │
   │ sis     │  │6. updateMetrics()    │  │  │ml_weaknesses    │ │
   │ weaknes │  │                      │  │  │ml_strengths     │ │
   │ strengths│ │Via MLAnalyticsDB()   │  │  │ml_predictions   │ │
   │predic-  │  │Connection pooling    │  │  │ml_performance   │ │
   │ learning│  │Error handling        │  │  │ml_learning_path │ │
   │}        │  │Rollback on failure   │  │  └─────────────────┘ │
   └────┬────┘  └──────────────────────┘  │                      │
        │                                  │  SUPABASE POSTGRES   │
        │                                  │  (Your Database)     │
        │                                  └──────────────────────┘
        │
        ▼
   ┌─────────────────────────────────┐
   │  Frontend Receives Full Data     │
   │  ├─ Display score               │
   │  ├─ Show answer review          │
   │  ├─ Show weaknesses (from ML)    │
   │  ├─ Show strengths (from ML)     │
   │  ├─ Show predictions (from ML)   │
   │  └─ Show learning plan (from ML) │
   └─────────────────────────────────┘
        │
        ▼
   ┌──────────────────────────────────┐
   │  LATER: Get Endpoints            │
   │  /api/ml/weaknesses/:userId      │
   │  /api/ml/strengths/:userId       │
   │  /api/ml/profile/:userId         │
   │  /api/ml/learning-path/:userId   │
   └──────────────────────────────────┘
```

---

## Data Structures

### INPUT: Quiz Submission

```javascript
POST /api/results
{
  "userId": "123",           // Numeric user ID (required)
  "quizId": "math_101",      // Quiz identifier
  "answers": [               // User's selections
    {
      "questionId": "q1",
      "selectedOption": "option_b"
    },
    {
      "questionId": "q2",
      "selectedOption": "option_a"
    },
    // ... more answers
  ],
  "questions": [             // Question metadata
    {
      "id": "q1",
      "content": "What is 2+2?",
      "options": ["3", "4", "5", "6"],
      "answerIndex": 1,      // Correct answer index
      "difficulty": "easy",  // or: medium, hard, very hard
      "concept": "Basic Arithmetic",  // Optional, used for categorization
      "explanation": "2+2=4 because..."
    },
    // ... more questions
  ]
}
```

### PROCESSING: AIAnalyzer Algorithms

#### Algorithm 1: Weighted Scoring
```javascript
// Easy questions: 0.5x points
// Medium questions: 1x points
// Hard questions: 1.5x points
// Very hard questions: 2x points

const weights = {
  'easy': 0.5,
  'medium': 1,
  'hard': 1.5,
  'very hard': 2
};

// Score calculation
let totalWeight = 0;
let earnedWeight = 0;
questions.forEach((q, i) => {
  const weight = weights[q.difficulty] || 1;
  totalWeight += weight;
  if (answers[i].correct) {
    earnedWeight += weight;
  }
});
const score = Math.round((earnedWeight / totalWeight) * 100);
```

#### Algorithm 2: Weakness Pattern Detection
```javascript
// Groups errors by concept/topic
const errorsByTopic = {};
questions.forEach((q, i) => {
  if (!answers[i].correct) {
    const topic = q.concept || 'Unknown';
    if (!errorsByTopic[topic]) {
      errorsByTopic[topic] = { errors: 0, questions: [] };
    }
    errorsByTopic[topic].errors++;
    errorsByTopic[topic].questions.push(q);
  }
});

// Creates weakness objects
const weaknesses = Object.entries(errorsByTopic).map(([topic, data]) => ({
  topic,
  frequency: data.errors,
  confidence: Math.min(0.9, data.errors / totalQuestions),
  questions: data.questions,
  recommendations: generateRecommendations(topic)
}));
```

#### Algorithm 3: Confidence Trend Analysis
```javascript
// Calculates consistency of performance
const scores = answers.map((a, i) => a.correct ? 1 : 0);

// Standard deviation (volatility)
const mean = scores.reduce((a, b) => a + b) / scores.length;
const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
const stdDev = Math.sqrt(variance);

// Consistency score (0-1, higher = more consistent)
const consistencyScore = Math.max(0, 1 - stdDev);

const trend = {
  consistencyScore,  // 0-1: how steady is performance
  volatility: stdDev,  // How much it varies
  improving: scores[scores.length - 1] > scores[0],  // Getting better?
  confidence: consistencyScore * 0.9 + 0.1  // Scale to 0.1-1.0
};
```

#### Algorithm 4: Future Performance Prediction
```javascript
// Simple linear regression
// x = question number, y = correct/incorrect
const n = scores.length;
const sumX = Array.from({length: n}, (_, i) => i + 1).reduce((a, b) => a + b);
const sumY = scores.reduce((a, b) => a + b);
const sumXY = scores.reduce((sum, y, i) => sum + (i + 1) * y, 0);
const sumX2 = Array.from({length: n}, (_, i) => i + 1)
  .reduce((sum, x) => sum + x * x, 0);

const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
const intercept = (sumY - slope * sumX) / n;

// R-squared (confidence)
const predictions = Array.from({length: n}, (_, i) => 
  slope * (i + 1) + intercept
);
const residuals = scores.map((y, i) => y - predictions[i]);
const rSquared = 1 - (residuals.reduce((s, r) => s + r * r, 0) / 
  ((sumY * sumY / n) || 1));

const prediction = {
  estimatedFutureScore: Math.min(100, Math.max(0, 
    slope * (n + 5) + intercept
  )) * 100,  // 5 quizzes ahead
  trend: slope > 0 ? 'improving' : 'declining',
  confidenceLevel: Math.max(0.5, Math.min(1, Math.abs(rSquared)))
};
```

#### Algorithm 5: Insight Generation
```javascript
// Converts metrics to actionable insights
function generateInsights(analysis) {
  const insights = [];
  
  // Strength insights
  if (analysis.overallScore > 80) {
    insights.push({
      type: 'STRENGTH',
      message: 'Excellent performance!',
      actionable: true
    });
  }
  
  // Weakness insights
  if (analysis.weaknesses.length > 0) {
    analysis.weaknesses.forEach(w => {
      insights.push({
        type: 'WEAKNESS',
        message: `Focus on ${w.topic}`,
        frequency: w.frequency,
        recommendations: w.recommendations
      });
    });
  }
  
  // Trend insights
  if (analysis.prediction.trend === 'improving') {
    insights.push({
      type: 'POSITIVE',
      message: 'Your performance is improving!'
    });
  }
  
  return insights;
}
```

### PROCESSING: PerformanceAnalytics

```javascript
class PerformanceAnalytics {
  // Mastery Index (0-100 per category)
  calculateMasteryIndex(concept, correctCount, totalCount) {
    return (correctCount / totalCount) * 100;
  }

  // Skill Matrix (proficiency levels)
  generateSkillMatrix(masteryIndex) {
    if (masteryIndex >= 85) return 'mastered';
    if (masteryIndex >= 70) return 'proficient';
    if (masteryIndex >= 50) return 'developing';
    return 'beginner';
  }

  // Error Pattern Analysis
  analyzeErrorPatterns(errors) {
    const patterns = {
      conceptual: 0,    // Misunderstood concept
      calculation: 0,   // Math/computation error
      reading: 0,       // Misread question
      logical: 0,       // Logic error
      unknown: 0        // Unknown reason
    };
    // Classify each error
    return patterns;
  }

  // Time Management (response time analysis)
  analyzeTimeManagement(timeTaken, totalTime) {
    // Average time per question
    const avgTimePerQuestion = totalTime / questionCount;
    return {
      paceAnalysis: avgTimePerQuestion > 60 ? 'slow' : 'fast',
      rushedQuestions: [],  // Questions answered too quickly
      slowQuestions: []     // Questions answered too slowly
    };
  }

  // Benchmark Comparison
  compareWithBenchmark(userScore, cohortScores) {
    const percentile = (userScore > cohortScores).length / cohortScores.length;
    return {
      percentile: Math.round(percentile * 100),
      comparison: percentile > 0.5 ? 'above average' : 'below average'
    };
  }

  // Comprehensive Report
  generateDetailedReport(analysis) {
    return {
      summary: {
        totalScore: analysis.score,
        masteryByCategory: analysis.masteryIndex,
        errorBreakdown: analysis.errorPatterns,
        timeManagement: analysis.timeAnalysis,
        peerComparison: analysis.benchmark
      },
      details: {
        strengths: analysis.strengths,
        weaknesses: analysis.weaknesses,
        recommendations: analysis.recommendations
      }
    };
  }
}
```

### PROCESSING: LearningPathGenerator

```javascript
class LearningPathGenerator {
  generatePersonalizedPath(studentData) {
    const phase = this._determinePhase(studentData.score);
    
    return {
      phase,  // FOUNDATION / BUILDING / ADVANCING / MASTERY
      duration: '2 weeks',
      milestones: this._createMilestones(phase, studentData.weaknesses),
      dailyGoals: this._generateDailyGoals(phase),
      successMetrics: this._defineSuccessMetrics(phase),
      recommendations: this._generateAdaptiveRecommendations(phase, studentData)
    };
  }

  _determinePhase(score) {
    if (score < 50) return 'FOUNDATION';
    if (score < 70) return 'BUILDING';
    if (score < 85) return 'ADVANCING';
    return 'MASTERY';
  }

  _createMilestones(phase, weaknesses) {
    return weaknesses.map(w => ({
      title: `Master ${w.topic}`,
      duration: '120 minutes',
      topics: [w.topic],
      exercises: generateExercises(w.topic, phase),
      successCriteria: generateCriteria(phase)
    }));
  }

  _generateDailyGoals(phase) {
    return Array.from({length: 14}, (_, i) => ({
      day: i + 1,
      duration: '120 minutes',
      topic: selectTopicForDay(i),
      targetAccuracy: getTargetForPhase(phase),
      recommendation: getRecommendationForDay(i, phase)
    }));
  }

  _generateAdaptiveRecommendations(phase, data) {
    return [
      `Start with: ${data.weaknesses[0]?.topic || 'Basic concepts'}`,
      `Focus on: ${phase} level materials`,
      `Daily practice: 120 minutes minimum`,
      `Target accuracy: ${getTargetForPhase(phase)}%`
    ];
  }
}
```

### OUTPUT: MLAnalyticsService Response

```javascript
{
  success: true,
  analysis: {
    // From AIAnalyzer
    performanceAnalysis: {
      overallScore: 80,
      weightedScore: 82,
      scoreByDifficulty: {
        easy: 100,
        medium: 80,
        hard: 60,
        'very hard': 40
      }
    },

    // Weaknesses detected
    weaknesses: [
      {
        topic: "Hard Concepts",
        confidence: 0.85,
        frequency: 2,
        errorRate: 0.67,
        recommendations: [
          "Review hard difficulty materials",
          "Practice 5-10 more hard questions"
        ]
      }
    ],

    // Strengths identified
    strengths: [
      {
        topic: "Easy Arithmetic",
        confidence: 1.0,
        frequency: 3,
        quality: "excellent"
      },
      {
        topic: "Medium Concepts",
        confidence: 0.8,
        frequency: 2,
        quality: "good"
      }
    ],

    // Future performance
    predictions: {
      estimatedFutureScore: 85,
      trend: 'improving',
      confidenceLevel: 0.88,
      successProbability: 0.88,
      recommendedNextLevel: 'advanced'
    },

    // Learning path
    learningPath: {
      phase: "BUILDING",
      duration: "2 weeks",
      totalMinutes: 1680,
      milestones: [
        {
          title: "Master Hard Concepts",
          duration: "120 minutes",
          topic: "Hard",
          exercises: ["Exercise 1", "Exercise 2"],
          successCriteria: "80% accuracy"
        }
      ],
      dailyGoals: [
        {
          day: 1,
          duration: 120,
          topic: "Hard Concepts Review",
          targetAccuracy: 75,
          recommendation: "Start with basics, then tackle harder problems"
        }
        // ... 13 more days
      ],
      successMetrics: {
        minimumAccuracy: 75,
        masteryThreshold: 85,
        completionCriteria: "Complete all 14 days"
      }
    },

    // Error analysis
    errorPatterns: {
      conceptual: 2,
      calculation: 1,
      reading: 0,
      logical: 1,
      unknown: 0
    },

    // Time analysis
    timeAnalysis: {
      totalTime: 180000,  // milliseconds
      averagePerQuestion: 36000,  // ms
      fastQuestions: [],
      slowQuestions: [
        { questionId: 'q4', time: 60000, difficulty: 'hard' }
      ]
    }
  }
}
```

### OUTPUT: API Response

```javascript
{
  // Quiz result data
  resultId: 1,
  score: 4,
  totalQuestions: 5,
  percentage: 80,
  answerComparison: [
    {
      questionId: 'q1',
      question: 'What is 2+2?',
      userAnswer: '4',
      correctAnswer: '4',
      isCorrect: true,
      explanation: '2+2=4'
    },
    // ... more answers
  ],

  // Traditional AI analysis (backward compatibility)
  summary: {...},
  weakAreas: [...],
  recommendations: [...],

  // NEW: ML Analytics data
  mlAnalysis: {
    performanceAnalysis: {...},
    weaknesses: [...],
    strengths: [...],
    predictions: {...},
    learningPath: {...},
    errorPatterns: {...},
    timeAnalysis: {...}
  },

  // Convenience fields (duplicates from mlAnalysis)
  weaknesses: [...],
  strengths: [...],
  predictions: {...},
  learningPath: {...}
}
```

### DATABASE: Storage in Supabase

#### ml_student_profiles
```javascript
{
  id: 123,
  total_quizzes: 1,
  overall_mastery: 80,
  average_score: 80,
  learning_phase: 'BUILDING',
  last_quiz_id: 'math_101',
  last_updated: '2024-01-15T10:30:00Z',
  total_learning_time: 120,  // minutes
  next_goal: 'Master Hard Concepts'
}
```

#### ml_weaknesses
```javascript
{
  id: 1,
  student_id: 123,
  topic: 'Hard Concepts',
  confidence_level: 0.85,
  frequency: 2,
  error_rate: 0.67,
  first_occurrence: '2024-01-15T10:30:00Z',
  last_occurrence: '2024-01-15T10:30:00Z',
  recommended_actions: ['Review materials', 'Practice 10 more questions'],
  quiz_id: 'math_101',
  created_at: '2024-01-15T10:30:00Z'
}
```

#### ml_strengths
```javascript
{
  id: 1,
  student_id: 123,
  topic: 'Easy Arithmetic',
  mastery_level: 1.0,
  frequency: 3,
  quality: 'excellent',
  first_shown: '2024-01-15T10:30:00Z',
  quiz_id: 'math_101',
  created_at: '2024-01-15T10:30:00Z'
}
```

#### ml_predictions
```javascript
{
  id: 1,
  student_id: 123,
  predicted_score: 85,
  confidence_level: 0.88,
  success_probability: 0.88,
  trend: 'improving',
  recommended_level: 'advanced',
  created_at: '2024-01-15T10:30:00Z',
  valid_until: '2024-02-15T10:30:00Z'
}
```

#### ml_learning_paths
```javascript
{
  id: 1,
  student_id: 123,
  phase: 'BUILDING',
  duration_days: 14,
  total_minutes: 1680,
  focus_topics: ['Hard Concepts'],
  target_accuracy: 80,
  status: 'active',
  created_at: '2024-01-15T10:30:00Z',
  updated_at: '2024-01-15T10:30:00Z',
  milestones: [
    { day: 1, topic: 'Hard Concepts Review', minutes: 120 }
    // ... more milestones
  ]
}
```

---

## Flow Summary

1. **Input**: User submits quiz (answers + questions)
2. **Processing**: 5 algorithms run in parallel
3. **Analysis**: Generates insights, weaknesses, strengths, predictions
4. **Storage**: Asynchronously stores to Supabase (non-blocking)
5. **Response**: Returns complete analysis to frontend immediately
6. **Retrieval**: Frontend can fetch data anytime via GET endpoints

---

## Key Design Decisions

✅ **Async Storage**: Data is stored to Supabase asynchronously, so API responds immediately
✅ **Parallel Processing**: ML algorithms run in parallel with traditional analyzer
✅ **Transaction Safety**: All database writes are in a transaction with rollback
✅ **Error Handling**: If ML storage fails, API still responds with analysis
✅ **Backward Compatibility**: Traditional analyzer results still included in response
✅ **Scalable**: Pool connections and batched writes for performance

---
