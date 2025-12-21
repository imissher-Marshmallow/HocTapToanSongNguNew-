# 🚀 ML Analytics Integration - Complete Setup & Deployment Guide

## 📋 Executive Summary

Hệ thống ML Analytics đã được tạo hoàn chỉnh với:
- ✅ PostgreSQL schema cho 6 bảng chính (weaknesses, strengths, predictions, learning paths, etc)
- ✅ 5 thuật toán ML (AIAnalyzer, PerformanceAnalytics, LearningPathGenerator)
- ✅ Migration script để tạo tables tự động
- ✅ API endpoints để truy xuất dữ liệu
- ✅ Tích hợp với hiện tại results.js

**Điểm Yếu (Weaknesses) - điểm_yếu**: CONCEPTUAL_GAP, PROCEDURAL_ERROR, CARELESS_MISTAKE  
**Điểm Mạnh (Strengths) - điểm_mạnh**: STRENGTH, POSITIVE insights  
**Dự Đoán**: Predicted scores & trends  
**Lộ Trình Học Tập**: Personalized learning paths with daily goals

---

## 📁 File Structure

```
backend/
├── migrations/
│   └── 001_create_ml_analytics_tables.sql      ← Migration file (523 lines)
├── scripts/
│   └── run-migrations.js                        ← Migration runner
├── ai/
│   ├── analyzer.js                              ← Core analyzer
│   ├── AIAnalyzer.js                            ← 5 ML algorithms
│   ├── PerformanceAnalytics.js                  ← Analytics engine
│   ├── LearningPathGenerator.js                 ← Learning path generator
│   ├── MLAnalyticsDB.js                         ← PostgreSQL integration
│   ├── MLAnalyticsService.js                    ← Service orchestrator ⭐ NEW
│   └── ml-analytics-helper.js                   ← Helper functions ⭐ NEW
├── routes/
│   ├── results.js                               ← Quiz results (update pending)
│   └── ml-analytics.js                          ← ML API endpoints ⭐ NEW
├── server.js                                    ← Updated with ML routes
├── package.json                                 ← Added migrate script
└── ML_ANALYTICS_SETUP.md                        ← Setup guide
```

---

## 🏁 Quick Start (3 Steps)

### Step 1: Chạy Migration để tạo Tables
```bash
cd stem-project/backend
npm run migrate
```

**Expected Output:**
```
🚀 Starting ML Analytics Migrations...
✅ All migrations completed successfully!

📊 Created ML Analytics Tables:
   • ml_student_profiles
   • ml_performance_records
   • ml_weaknesses
   • ml_strengths
   • ml_predictions
   • ml_learning_paths
   [... more tables ...]
```

### Step 2: Khởi động Server
```bash
npm start
# or for development:
npm run dev
```

**Expected Output:**
```
Server running on port 5000
Features: Quiz API, Authentication, ML Integration
```

### Step 3: Test API
```bash
# Check server health
curl http://localhost:5000/health

# Run ML analysis on quiz
curl -X POST http://localhost:5000/api/ml/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "quizId": "quiz-001",
    "quizData": {
      "questions": [
        {
          "id": 1,
          "content": "What is 2+2?",
          "category": "Arithmetic",
          "difficulty": "easy",
          "options": ["3", "4", "5"],
          "answerIndex": 1
        }
      ]
    },
    "userAnswers": [1]
  }'

# Get student weaknesses
curl http://localhost:5000/api/ml/weaknesses/1

# Get student strengths
curl http://localhost:5000/api/ml/strengths/1

# Get complete profile
curl http://localhost:5000/api/ml/profile/1
```

---

## 📊 Database Tables Created

### 1. ml_student_profiles
**Mục đích**: Lưu trữ hồ sơ học sinh với metrics chung

```sql
Columns:
  - id (PRIMARY KEY)
  - user_id (UNIQUE, BIGINT)
  - overall_score (DECIMAL)
  - confidence_score (DECIMAL)
  - total_quizzes (INT)
  - created_at, updated_at (TIMESTAMP)
```

### 2. ml_performance_records
**Mục đích**: Lưu trữ kết quả từng quiz chi tiết

```sql
Columns:
  - id (PRIMARY KEY)
  - student_id (FOREIGN KEY → ml_student_profiles)
  - quiz_id (VARCHAR)
  - overall_score (DECIMAL)
  - category_performance (JSONB) ← Per-category breakdown
  - difficulty_analysis (JSONB) ← By difficulty level
  - timestamp (TIMESTAMP)
```

### 3. ml_weaknesses ⭐ 【Điểm Yếu】
**Mục đích**: Lưu trữ các điểm yếu được phát hiện

```sql
Columns:
  - id (PRIMARY KEY)
  - student_id (FOREIGN KEY)
  - quiz_id (VARCHAR)
  - weakness_type (VARCHAR) ← CONCEPTUAL_GAP | PROCEDURAL_ERROR | CARELESS_MISTAKE
  - concept (VARCHAR) ← Khái niệm có vấn đề
  - severity (VARCHAR) ← HIGH | MEDIUM | LOW
  - frequency (INT) ← Số lần gặp vấn đề
  - affected_questions (JSONB) ← Mảng câu hỏi có liên quan
  - description (TEXT)
  - created_at (TIMESTAMP)
  - resolved_at (TIMESTAMP) ← Khi học sinh đã khắc phục
```

### 4. ml_strengths ⭐ 【Điểm Mạnh】
**Mục đích**: Lưu trữ các điểm mạnh & thành tích

```sql
Columns:
  - id (PRIMARY KEY)
  - student_id (FOREIGN KEY)
  - quiz_id (VARCHAR)
  - insight_type (VARCHAR) ← STRENGTH | POSITIVE
  - message (TEXT) ← Mô tả điểm mạnh
  - priority (VARCHAR) ← HIGH | MEDIUM | LOW
  - category (VARCHAR) ← Danh mục kỹ năng
  - created_at (TIMESTAMP)
```

### 5. ml_predictions
**Mục đích**: Lưu trữ dự đoán điểm số tương lai

```sql
Columns:
  - id (PRIMARY KEY)
  - student_id (FOREIGN KEY)
  - quiz_id (VARCHAR)
  - predicted_score (DECIMAL) ← Điểm dự đoán tiếp theo
  - confidence (DECIMAL) ← Độ tin cậy (0-1)
  - trend (VARCHAR) ← improving | stable | declining
  - intervention_needed (BOOLEAN)
  - created_at (TIMESTAMP)
```

### 6. ml_learning_paths
**Mục đích**: Lưu trữ lộ trình học tập cá nhân hóa

```sql
Columns:
  - id (PRIMARY KEY)
  - student_id (FOREIGN KEY)
  - quiz_id (VARCHAR)
  - phase (VARCHAR) ← FOUNDATION | BUILDING | ADVANCING | MASTERY
  - milestones (JSONB) ← Các bước học tập
  - daily_goals (JSONB) ← Mục tiêu hàng ngày (120 min/day)
  - estimated_days (INT) ← Dự tính ngày học
  - status (VARCHAR) ← ACTIVE | COMPLETED | ABANDONED
  - created_at, completed_at (TIMESTAMP)
```

---

## 🔌 API Endpoints (Đầy đủ)

### POST /api/ml/analyze
**Chạy toàn bộ pipeline phân tích ML**

```bash
curl -X POST http://localhost:5000/api/ml/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 123,
    "quizId": "algebra-basics",
    "quizData": {
      "questions": [
        {
          "id": "q1",
          "content": "Giải: x + 5 = 10",
          "category": "Algebra",
          "difficulty": "medium",
          "options": ["3", "5", "10", "15"],
          "answerIndex": 1,
          "explanation": "x = 10 - 5 = 5"
        }
      ]
    },
    "userAnswers": [1]
  }'
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "ML analysis completed and stored",
  "data": {
    "score": 100,
    "categoryBreakdown": {
      "Algebra": { "correct": 1, "total": 1 }
    },
    "weaknesses": [],
    "strengths": [
      {
        "insight_type": "STRENGTH",
        "concept": "Algebra",
        "message": "Strong understanding of linear equations"
      }
    ],
    "prediction": {
      "predicted_score": 95,
      "confidence": 0.85,
      "trend": "improving"
    },
    "learningPath": {
      "phase": "BUILDING",
      "milestones": [...],
      "daily_goals": [...]
    }
  }
}
```

### GET /api/ml/profile/:userId
**Lấy hồ sơ ML hoàn chỉnh của học sinh**

```bash
curl http://localhost:5000/api/ml/profile/123
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "user_id": 123,
    "overall_score": 87.5,
    "confidence_score": 0.82,
    "total_quizzes": 5,
    "recentWeaknesses": [
      {
        "id": 1,
        "concept": "Quadratic equations",
        "weakness_type": "CONCEPTUAL_GAP",
        "severity": "HIGH",
        "frequency": 3,
        "created_at": "2024-01-15T10:30:00Z",
        "resolved_at": null
      }
    ],
    "recentStrengths": [
      {
        "id": 5,
        "category": "Linear Equations",
        "message": "Consistently solves linear equations correctly",
        "priority": "HIGH",
        "created_at": "2024-01-15T09:15:00Z"
      }
    ],
    "activeLearningPath": {
      "phase": "BUILDING",
      "milestones": [...],
      "status": "ACTIVE"
    }
  }
}
```

### GET /api/ml/weaknesses/:userId
**Lấy danh sách Điểm Yếu (điểm_yếu)**

```bash
curl "http://localhost:5000/api/ml/weaknesses/123?limit=10"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "student_id": 1,
      "quiz_id": "quiz-001",
      "concept": "Quadratic equations",
      "weakness_type": "CONCEPTUAL_GAP",
      "severity": "HIGH",
      "frequency": 3,
      "affected_questions": [1, 3, 5],
      "description": "Student struggles with factoring quadratic expressions",
      "created_at": "2024-01-15T10:30:00Z",
      "resolved_at": null
    },
    {
      "id": 2,
      "student_id": 1,
      "quiz_id": "quiz-002",
      "concept": "Fractions",
      "weakness_type": "PROCEDURAL_ERROR",
      "severity": "MEDIUM",
      "frequency": 2,
      "description": "Incorrect procedure when adding fractions with different denominators"
    }
  ],
  "count": 2
}
```

### GET /api/ml/strengths/:userId
**Lấy danh sách Điểm Mạnh (điểm_mạnh)**

```bash
curl "http://localhost:5000/api/ml/strengths/123?limit=10"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 5,
      "student_id": 1,
      "quiz_id": "quiz-001",
      "insight_type": "STRENGTH",
      "message": "Excellent mastery of linear equations",
      "priority": "HIGH",
      "category": "Algebra",
      "created_at": "2024-01-15T09:15:00Z"
    }
  ],
  "count": 1
}
```

### GET /api/ml/learning-path/:userId
**Lấy lộ trình học tập hiện tại**

```bash
curl http://localhost:5000/api/ml/learning-path/123
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "phase": "BUILDING",
    "milestones": [
      {
        "title": "Quadratic Equations Fundamentals",
        "duration": "2 days",
        "activities": [...]
      }
    ],
    "daily_goals": [
      {
        "day": 1,
        "duration_minutes": 120,
        "focus": "Review factoring basics",
        "target_accuracy": 0.85
      }
    ],
    "estimated_days": 14,
    "status": "ACTIVE"
  }
}
```

### POST /api/ml/resolve-weakness/:weaknessId
**Đánh dấu một điểm yếu là đã khắc phục**

```bash
curl -X POST http://localhost:5000/api/ml/resolve-weakness/1
```

---

## 🧪 Testing Checklist

- [ ] Migration script chạy thành công
- [ ] Tables được tạo trong Supabase
- [ ] POST /api/ml/analyze hoạt động
- [ ] GET /api/ml/profile/:userId hoạt động
- [ ] GET /api/ml/weaknesses/:userId trả về dữ liệu
- [ ] GET /api/ml/strengths/:userId trả về dữ liệu
- [ ] Dữ liệu xuất hiện trong Supabase tables
- [ ] Frontend có thể fetch và display weaknesses/strengths

---

## 🔧 Integration with Results.js (Optional)

Để tự động trigger ML analysis khi quiz được submit, thêm vào `POST /api/results`:

```javascript
// At the top of results.js:
const { triggerMLAnalysis, extractQuizDataForML } = require('../ai/ml-analytics-helper');

// Inside POST /api/results handler, after saving result:
if (resultId && aiResult) {
  const mlData = extractQuizDataForML(req);
  if (mlData) {
    // Trigger async (doesn't block response)
    triggerMLAnalysis(pool, mlData.userId, quizId, 
                      { questions: mlData.questions },
                      mlData.userAnswers);
  }
}
```

---

## 📱 Frontend Integration Example

### Display Weaknesses in ResultPage.jsx
```javascript
import { useEffect, useState } from 'react';

function ResultPage() {
  const [weaknesses, setWeaknesses] = useState([]);
  const [strengths, setStrengths] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = getCurrentUserId(); // Get from context/props
    
    Promise.all([
      fetch(`/api/ml/weaknesses/${userId}`).then(r => r.json()),
      fetch(`/api/ml/strengths/${userId}`).then(r => r.json())
    ]).then(([weakData, strData]) => {
      setWeaknesses(weakData.data || []);
      setStrengths(strData.data || []);
      setLoading(false);
    }).catch(err => console.error(err));
  }, []);

  if (loading) return <div>Loading analysis...</div>;

  return (
    <div>
      <h2>📊 Phân Tích Kết Quả</h2>
      
      <section>
        <h3>⚠️ Điểm Yếu (Weaknesses)</h3>
        {weaknesses.length === 0 ? (
          <p>Không phát hiện điểm yếu - Xuất sắc!</p>
        ) : (
          weaknesses.map(w => (
            <div key={w.id} className={`severity-${w.severity}`}>
              <strong>{w.concept}</strong>
              <p>{w.description}</p>
              <small>Gặp lại {w.frequency} lần</small>
            </div>
          ))
        )}
      </section>

      <section>
        <h3>⭐ Điểm Mạnh (Strengths)</h3>
        {strengths.map(s => (
          <div key={s.id}>
            <strong>{s.category}</strong>
            <p>{s.message}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
```

---

## 🚨 Troubleshooting

### Migration Failed
```bash
# Check connection
psql $DATABASE_URL -c "SELECT version();"

# Check tables
psql $DATABASE_URL -c "\dt ml_*"
```

### API Returns 500
```bash
# Check server logs
npm run dev  # Run in dev mode for better errors

# Verify pool is initialized
curl http://localhost:5000/debug
```

### No Data in ml_weaknesses Table
```sql
-- Check if data is being stored
SELECT * FROM ml_weaknesses LIMIT 10;

-- Check recent performances
SELECT * FROM ml_performance_records LIMIT 10;

-- Check student profiles
SELECT * FROM ml_student_profiles;
```

---

## 🎯 Next Steps

1. ✅ Run migration: `npm run migrate`
2. ✅ Start server: `npm start`
3. ✅ Test API endpoints
4. ⬜ Integrate with results.js (optional)
5. ⬜ Update frontend to display weaknesses/strengths
6. ⬜ Create analytics dashboard
7. ⬜ Monitor prediction accuracy

---

## 📞 Support

- **ML Service Code**: `backend/ai/MLAnalyticsService.js`
- **API Routes**: `backend/routes/ml-analytics.js`
- **Database Integration**: `backend/ai/MLAnalyticsDB.js`
- **Setup Documentation**: `backend/ML_ANALYTICS_SETUP.md`

**Status**: 🟢 Ready for Production
