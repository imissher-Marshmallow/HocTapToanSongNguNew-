# ML Analytics System - Database & Integration Guide

## 📊 Architecture Overview

```
Frontend (React)
    ↓
AI Analyzer (5 Algorithms)
    ↓
Performance Analytics
    ↓
Learning Path Generator
    ↓
Supabase (PostgreSQL)
```

## 🗄️ Database Schema

### Tables Structure

#### 1. **students** - User Profiles with ML Features
```sql
- Stores: User profiles, aggregate metrics, learning velocity
- Key Columns: 
  - user_id (unique identifier)
  - average_score, best_score, worst_score
  - learning_velocity (rate of improvement)
  - consistency_score (performance stability)
  - current_phase (FOUNDATION, BUILDING, ADVANCING, MASTERY)
  - recommended_focus (JSON array of concepts)
```

#### 2. **performance_records** - Quiz Attempts & Results
```sql
- Stores: Individual quiz attempts with detailed metrics
- Key Columns:
  - student_id (foreign key to students)
  - quiz_id, quiz_name
  - score, percentage, time_taken_seconds
  - category_performance (JSONB: per-category metrics)
  - difficulty_analysis (JSONB: by difficulty level)
  - learning_curve (JSONB: question-by-question progress)
```

#### 3. **weakness_patterns** - Conceptual Gaps Detection
```sql
- Stores: Identified knowledge gaps and learning weaknesses
- Key Columns:
  - student_id, concept, severity (HIGH/MEDIUM/LOW)
  - error_frequency, error_type
  - affected_questions (JSON array of question IDs)
  - status (ACTIVE, IMPROVING, RESOLVED)
  - first_detected, last_improved timestamps
```

#### 4. **category_mastery** - Per-Category Performance
```sql
- Stores: Mastery level for each learning category
- Key Columns:
  - student_id, category_name
  - total_attempts, correct_answers, mastery_percentage
  - mastery_level (MASTERED, PROFICIENT, DEVELOPING, BEGINNER)
  - trend (improving, stable, declining)
  - trend_history (JSONB: historical data for graphs)
```

#### 5. **learning_paths** - Personalized Learning Plans
```sql
- Stores: Auto-generated learning roadmaps
- Key Columns:
  - student_id, quiz_id
  - phase (FOUNDATION, BUILDING, ADVANCING, MASTERY)
  - status (ACTIVE, COMPLETED, ABANDONED)
  - milestones (JSONB: learning milestones with activities)
  - daily_goals (JSONB: daily learning objectives)
  - success_metrics (JSONB: target metrics)
  - estimated_completion_date
```

#### 6. **ai_insights** - Generated Analysis & Recommendations
```sql
- Stores: AI-generated insights and findings
- Key Columns:
  - student_id, performance_record_id
  - insight_type (STRENGTH, WEAKNESS, PATTERN, CAUTION)
  - message, priority (LOW/MEDIUM/HIGH/CRITICAL)
  - predictions (JSONB: predicted scores, mastery time)
  - recommendations (JSONB: action items)
  - classification (e.g., ADVANCED_IMPROVING, DEVELOPING_STRUGGLING)
```

#### 7. **predictions** - ML Model Predictions
```sql
- Stores: Predictive analytics results
- Key Columns:
  - student_id
  - prediction_type (NEXT_SCORE, TIME_TO_MASTERY, STAGNATION_RISK)
  - predicted_value, confidence (0-1)
  - actual_value (filled later for validation)
  - was_accurate (for model improvement)
```

#### 8. **learning_recommendations** - Specific Action Items
```sql
- Stores: Personalized action recommendations
- Key Columns:
  - student_id, ai_insight_id
  - action_type (INTENSIVE_REVIEW, PRACTICE_PROBLEMS, CHANGE_APPROACH)
  - target_concept, priority
  - estimated_time_minutes, target_accuracy
  - suggested_resources (JSONB)
  - was_followed, followed_at
  - result (JSONB: outcome after following)
```

#### 9. **learning_progress** - Daily Progress Tracking
```sql
- Stores: Daily/milestone progress snapshots
- Key Columns:
  - student_id, milestone_date
  - quizzes_completed, average_daily_score
  - minutes_studied, confidence_rating, engagement_rating
  - concepts_practiced (JSONB array)
  - weaknesses_targeted (JSONB array)
  - notes (text)
```

#### 10. **cohort_benchmarks** - Comparative Analytics
```sql
- Stores: Cohort-level statistics for comparison
- Key Columns:
  - cohort_name, cohort_size
  - average_score, median_score, std_dev
  - category_benchmarks (JSONB: by category)
  - phase_distribution (JSONB: distribution across phases)
```

## 🔄 Data Flow

### 1. Quiz Completion
```
User submits quiz
    ↓
Backend receives answers + questions
    ↓
AIAnalyzer processes data (5 algorithms)
    ↓
PerformanceAnalytics generates detailed report
    ↓
LearningPathGenerator creates personalized path
    ↓
SupabaseMLAnalytics pushes all data
    ↓
Database stores in normalized tables
```

### 2. Data Storage Process

```javascript
// In MLAnalyticsAPI.analyzeAndStore():

1. Run AIAnalyzer.analyzeResults()
   - Weighted Performance Analysis
   - Weakness Pattern Clustering
   - Learning Path Recommendation
   - Confidence Trend Analysis
   - Predictive Remediation

2. Run PerformanceAnalytics
   - Skill Matrix generation
   - Error Pattern Analysis
   - Time Management Analysis
   - Comparative Analytics

3. Run LearningPathGenerator
   - Determine learning phase
   - Generate milestones
   - Create daily goals
   - Define success metrics

4. Push to Supabase:
   - Create/Update student record
   - Store performance record
   - Store weakness patterns
   - Update category mastery
   - Store learning path
   - Generate and store insights
   - Store predictions
   - Generate and store recommendations
```

## 🚀 Setup Instructions

### 1. Create Supabase Project
```bash
# Visit: https://supabase.com
# Create new project
# Save project URL and API key
```

### 2. Environment Variables
```bash
# .env file in backend/
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
```

### 3. Initialize Database
```bash
# Copy supabase_ml_analytics.sql to Supabase SQL Editor
# Execute the entire SQL script to create:
# - 10 tables
# - 3 views
# - 2 functions
# - Triggers for automatic updates
# - Indexes for performance
```

### 4. Install Dependencies
```bash
npm install @supabase/supabase-js
```

### 5. Backend Integration
```javascript
// In backend/routes/results.js

const MLAnalyticsAPI = require('../api/MLAnalyticsAPI');

// When quiz is submitted:
const result = await MLAnalyticsAPI.analyzeAndStore(
  userId,
  quizId,
  answers,
  questions,
  { timeTaken: 1200 }
);

// Return comprehensive analysis with Supabase storage confirmation
res.json(result);
```

### 6. Frontend Display
```javascript
// In ResultPage.jsx

// Use analysis data:
- analysis.performance → Score display, charts
- analysis.weaknesses → Weakness cards
- analysis.insights → AI insights panel
- learningPath → Learning recommendations
- analysis.prediction → Score prediction
```

## 📈 ML Algorithms

### 1. Weighted Performance Analysis
```
Score = Σ(correct_answer × difficulty_weight) / total_weight

- Easy: 0.5x
- Medium: 1x
- Hard: 1.5x
- Very Hard: 2x
```

### 2. Weakness Clustering
```
IF error_count_in_concept >= 2:
  → CONCEPTUAL GAP (severity based on frequency)
ELSE:
  → Procedural error OR careless mistake
```

### 3. Learning Velocity
```
velocity = (current_score - previous_score) / time_interval

IF velocity > 5: Ready for harder problems
IF velocity < -5: Change approach needed
IF velocity ≈ 0: Plateau detected
```

### 4. Confidence Score
```
confidence = (correct_answers / total) * 0.9 + 
             (answer_quality / 100) * 0.1

Trend = slope of confidence over time
```

### 5. Predictive Remediation
```
next_score_prediction = 
  base_performance 
  - (high_severity_gaps × 5)
  + (confidence_trend × 2)

time_to_mastery = 
  (target_score - current) / improvement_rate
```

## 🔍 Querying Data

### Get Student Profile
```sql
SELECT * FROM student_summary WHERE user_id = 123;

-- Returns: All key metrics for dashboard
```

### Get Active Weaknesses
```sql
SELECT * FROM weakness_patterns 
WHERE student_id = 45 AND status = 'ACTIVE' 
ORDER BY severity DESC;

-- Returns: List of active conceptual gaps
```

### Get Learning Progress
```sql
SELECT * FROM category_mastery 
WHERE student_id = 45 
ORDER BY mastery_percentage DESC;

-- Returns: Category mastery breakdown
```

### Get Latest Insights
```sql
SELECT * FROM ai_insights 
WHERE student_id = 45 
ORDER BY generated_at DESC 
LIMIT 5;

-- Returns: 5 most recent AI insights
```

### Use Built-in Functions
```sql
-- Get comprehensive analytics
SELECT * FROM get_student_analytics(123);

-- Returns: Profile, weaknesses, insights, recommendations

-- Calculate student's percentile
SELECT calculate_percentile_rank(123);
```

## 📊 Views for Analytics

### student_summary
```
Combines key student metrics into single view
- total_quizzes, average_score, best_score
- learning_velocity, consistency_score
- current_phase, active_weaknesses count
- last_quiz_date
```

### category_performance_summary
```
Shows mastery for each category
- Sorted by mastery_percentage
- Includes trend direction
- Groups by student
```

### active_learning_paths
```
Shows all active learning paths
- Includes student info
- Ordered by creation date
- Shows phase and status
```

## 🎯 Performance Optimization

### Indexes
```sql
-- Covering indexes for common queries:
idx_student_id (student_id)
idx_perf_student_timestamp (student_id, timestamp)
idx_weakness_student_status (student_id, status)
idx_mastery_student_category (student_id, category_name)
```

### Query Tips
```sql
-- Use JSONB for flexible data:
SELECT metadata->'improvement_rate' FROM insights;

-- Aggregate with JSON functions:
SELECT json_agg(...) for list responses
SELECT json_build_object(...) for structured data
```

## 🐛 Debugging

### Check Supabase Connection
```javascript
const health = await MLAnalyticsAPI.healthCheck();
console.log(health);
```

### View Database Logs
```
Supabase Dashboard → Logs → Postgres
```

### Test Data Insertion
```sql
-- Insert test student
INSERT INTO students (user_id) VALUES (9999);

-- Insert test performance record
INSERT INTO performance_records (
  student_id, quiz_id, score, overall_score
) VALUES (
  (SELECT id FROM students WHERE user_id = 9999),
  'test-quiz',
  85,
  85.0
);
```

## 📚 Resources

- [Supabase Docs](https://supabase.com/docs)
- [PostgreSQL JSONB](https://www.postgresql.org/docs/current/datatype-json.html)
- [Machine Learning Concepts](https://en.wikipedia.org/wiki/Machine_learning)

---

**Last Updated:** Nov 17, 2025
**Status:** Production Ready
