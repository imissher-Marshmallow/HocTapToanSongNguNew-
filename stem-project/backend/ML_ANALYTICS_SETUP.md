# ML Analytics Database Setup Guide

## Overview
Hướng dẫn thiết lập database cho ML Analytics System của ứng dụng quiz.

## 📋 Prerequisites

- **Supabase Account** với PostgreSQL database
- **Node.js v14+**
- **Thư mục backend** của project
- **Biến môi trường** `DATABASE_URL` hoặc `DATABASE_CONNECTION` được cấu hình trong `.env`

## 🚀 Quick Start

### 1. Chuẩn Bị
```bash
cd stem-project/backend
npm install
```

### 2. Chạy Migrations
```bash
npm run migrate
```

**Output mong đợi:**
```
🚀 Starting ML Analytics Migrations...

📁 Found 1 migration file(s):

▶️  Running: 001_create_ml_analytics_tables.sql
✅ Successfully executed: 001_create_ml_analytics_tables.sql

========================================
✅ All migrations completed successfully!
========================================

📊 Created ML Analytics Tables:
   • ml_error_patterns
   • ml_learning_paths
   • ml_learning_progress
   • ml_learning_recommendations
   • ml_performance_records
   • ml_predictions
   • ml_recent_strengths_view
   • ml_recent_weaknesses_view
   • ml_strengths
   • ml_student_profiles
   • ml_student_summary
   • ml_weaknesses
```

## 📊 Database Schema

### Tables Được Tạo

#### 1. `ml_student_profiles` - Hồ sơ học sinh
```
Stores: user profile, overall score, confidence metrics
```

#### 2. `ml_performance_records` - Kết quả quiz
```
Stores: quiz scores, category breakdown, difficulty analysis
```

#### 3. `ml_weaknesses` - Điểm Yếu
```
Stores: conceptual gaps, procedural errors, careless mistakes
Fields: weakness_type, concept, severity, frequency
```

#### 4. `ml_strengths` - Điểm Mạnh
```
Stores: positive insights, achievements
Fields: insight_type, message, priority, category
```

#### 5. `ml_predictions` - Dự Đoán
```
Stores: predicted scores, confidence levels, trends
```

#### 6. `ml_learning_paths` - Lộ Trình Học Tập
```
Stores: personalized learning plans with milestones and daily goals
```

#### Views Được Tạo
- `ml_student_summary` - Quick stats per student
- `ml_recent_weaknesses_view` - Latest weaknesses
- `ml_recent_strengths_view` - Latest strengths

#### Functions Được Tạo
- `get_student_ml_analysis(user_id)` - Get complete analysis
- `resolve_weakness(weakness_id)` - Mark weakness as resolved
- `get_weaknesses_by_severity(student_id, severity)` - Filter by severity

#### Triggers Được Tạo
- Auto-update student metrics on new performance
- Auto-calculate overall score

## 🔌 API Endpoints

### POST /api/ml/analyze
Run full ML analysis pipeline
```bash
curl -X POST http://localhost:5000/api/ml/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 123,
    "quizId": "quiz-001",
    "quizData": { /* quiz definition */ },
    "userAnswers": [0, 1, 2, ...]
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "ML analysis completed and stored",
  "data": {
    "score": 85.5,
    "categoryBreakdown": {...},
    "aiAnalysis": {...},
    "weaknesses": [...],
    "strengths": [...],
    "prediction": {...},
    "learningPath": {...}
  }
}
```

### GET /api/ml/profile/:userId
Get student's complete ML profile
```bash
curl http://localhost:5000/api/ml/profile/123
```

### GET /api/ml/weaknesses/:userId
Get student's weaknesses (điểm yếu)
```bash
curl "http://localhost:5000/api/ml/weaknesses/123?limit=10"
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "concept": "Linear equations",
      "weakness_type": "CONCEPTUAL_GAP",
      "severity": "HIGH",
      "frequency": 3,
      "description": "Struggles with solving linear equations",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "count": 1
}
```

### GET /api/ml/strengths/:userId
Get student's strengths (điểm mạnh)
```bash
curl "http://localhost:5000/api/ml/strengths/123?limit=10"
```

### GET /api/ml/learning-path/:userId
Get student's active learning path
```bash
curl http://localhost:5000/api/ml/learning-path/123
```

## 🧪 Testing the Setup

### 1. Check Database Connection
```bash
npm start
# Check server logs for "Features: Quiz API, Authentication, ML Integration"
```

### 2. Test Migration
```bash
npm run migrate
# Should show "✅ All migrations completed successfully!"
```

### 3. Test API Endpoint
```bash
# In another terminal:
curl http://localhost:5000/health
# Should return: { "status": "OK", "message": "Server is running" }
```

### 4. Test ML Analysis
```bash
curl -X POST http://localhost:5000/api/ml/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "quizId": "test-quiz-1",
    "quizData": {
      "questions": [
        {"id": 1, "correctAnswer": 0, "category": "Algebra", "difficulty": "medium"}
      ]
    },
    "userAnswers": [0]
  }'
```

## 🔍 Verifying Data in Supabase

### Check Tables in Supabase Console
1. Go to Supabase Dashboard
2. Navigate to "SQL Editor"
3. Run queries:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'ml_%';

-- Check student profiles
SELECT * FROM ml_student_profiles;

-- Check recent weaknesses
SELECT * FROM ml_recent_weaknesses_view LIMIT 10;

-- Check recent strengths
SELECT * FROM ml_recent_strengths_view LIMIT 10;

-- Get student analysis
SELECT * FROM get_student_ml_analysis(1);
```

## 📝 Environment Variables

Cần có trong `.env`:

```env
# Database Configuration
DATABASE_URL=postgresql://user:password@db.supabase.co:5432/postgres
# hoặc
DATABASE_CONNECTION=postgresql://user:password@db.supabase.co:5432/postgres

# Server Port
PORT=5000

# Node Environment
NODE_ENV=development
```

## 🛠️ Troubleshooting

### Migration Fails with "Connection refused"
```bash
# Check .env DATABASE_URL
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

### Tables Already Exist Error
Migration script uses `CREATE TABLE IF NOT EXISTS` so it's safe to re-run:
```bash
npm run migrate
```

### Permission Denied on Functions
Ensure database user has `FUNCTION` create permissions. In Supabase, use the main authenticated role.

### Can't Connect from Localhost
Check if:
1. Supabase database is not in IP allowlist - Supabase allows all IPs by default
2. Connection string is correct in `.env`
3. Database credentials are valid

## 📚 Data Flow

```
Quiz Submission
    ↓
POST /api/results
    ↓
AIAnalyzer (5 algorithms)
    ↓
PerformanceAnalytics
    ↓
LearningPathGenerator
    ↓
MLAnalyticsService (orchestrator)
    ↓
MLAnalyticsDB.storeMLAnalysis()
    ↓
PostgreSQL Tables ← Stores weaknesses, strengths, predictions
    ↓
GET /api/ml/profile/:userId ← Retrieve analysis for dashboard
```

## 🎯 Next Steps

1. **Integrate with Frontend**
   - Update ResultPage.jsx to fetch ML analysis
   - Display weaknesses (điểm yếu) and strengths (điểm mạnh)
   - Show learning path recommendations

2. **Create Analytics Dashboard**
   - Show progress over time
   - Display weakness resolution
   - Track learning path completion

3. **Monitor Performance**
   - Track prediction accuracy
   - Monitor database query times
   - Set up alerts for data quality issues

## 📞 Support

Issues or questions?
- Check database.js for pool configuration
- Review MLAnalyticsService.js for analysis flow
- Check Supabase logs for SQL errors
