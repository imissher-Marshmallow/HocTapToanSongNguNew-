-- ========================================
-- QUICK REFERENCE: ML Performance Setup
-- ========================================
-- Copy each section below and run separately in Supabase SQL Editor
-- Located: Supabase Console → Your Project → SQL Editor → New Query

-- ========================================
-- STEP 1: Create ml_performance_records Table
-- ========================================
-- ⏱️ ~2-3 seconds to execute

-- Drop old table if it exists (to switch from UUID to numeric user_id)
DROP TABLE IF EXISTS ml_performance_records CASCADE;

CREATE TABLE ml_performance_records (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  student_id INT,
  result_id BIGINT,
  quiz_id VARCHAR(100),
  exam_id INT,
  score INT NOT NULL DEFAULT 0,
  percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
  max_score INT DEFAULT 20,
  topic VARCHAR(255),
  difficulty_level INT,
  cognitive_breakdown JSONB DEFAULT '{}',
  topic_mastery JSONB DEFAULT '{}',
  weak_topics JSONB DEFAULT '[]',
  strong_topics JSONB DEFAULT '[]',
  trend_metrics JSONB DEFAULT '{}',
  time_on_task JSONB DEFAULT '{}',
  answers JSONB DEFAULT '{}',
  quiz_type VARCHAR(50),
  completion_rate DECIMAL(5,2) DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- STEP 2: Create Indexes (for performance)
-- ========================================
-- ⏱️ ~1 second each

CREATE INDEX IF NOT EXISTS idx_ml_perf_user_id ON ml_performance_records(user_id);
CREATE INDEX IF NOT EXISTS idx_ml_perf_exam_id ON ml_performance_records(exam_id);
CREATE INDEX IF NOT EXISTS idx_ml_perf_topic ON ml_performance_records(topic);
CREATE INDEX IF NOT EXISTS idx_ml_perf_created ON ml_performance_records(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ml_perf_user_created ON ml_performance_records(user_id, created_at DESC);

-- ========================================
-- STEP 3: Create Analytical Views
-- ========================================

-- View 1: User Summary (quick analytics)
CREATE OR REPLACE VIEW ml_performance_summary AS
SELECT 
  user_id,
  COUNT(*) as total_quizzes,
  COUNT(DISTINCT topic) as unique_topics_attempted,
  ROUND(AVG(percentage)::numeric, 2) as average_score,
  MAX(percentage) as highest_score,
  MIN(percentage) as lowest_score,
  MAX(created_at) as last_quiz_date
FROM ml_performance_records
GROUP BY user_id;

-- View 2: Topic Trends
CREATE OR REPLACE VIEW ml_performance_trends AS
SELECT 
  user_id,
  topic,
  COUNT(*) as attempts,
  ROUND(AVG(percentage)::numeric, 2) as avg_score,
  MAX(percentage) as best_score,
  MIN(percentage) as worst_score,
  MAX(created_at) as last_attempt
FROM ml_performance_records
WHERE topic IS NOT NULL
GROUP BY user_id, topic
ORDER BY user_id, avg_score DESC;

-- ========================================
-- STEP 4: Row Level Security (RLS)
-- ========================================

-- ⚠️ NOTE: RLS is disabled because you're using numeric user_id instead of auth.uuid
-- If you need RLS later with numeric IDs, implement security in your application logic
-- ALTER TABLE ml_performance_records ENABLE ROW LEVEL SECURITY;

-- ========================================
-- STEP 5: Grant Permissions
-- ========================================

GRANT SELECT, INSERT, UPDATE ON ml_performance_records TO authenticated;
GRANT SELECT, INSERT, UPDATE ON ml_performance_records TO anon;
GRANT SELECT ON ml_performance_summary TO authenticated;
GRANT SELECT ON ml_performance_summary TO anon;
GRANT SELECT ON ml_performance_trends TO authenticated;
GRANT SELECT ON ml_performance_trends TO anon;

-- ========================================
-- VERIFICATION QUERIES
-- Run these to confirm everything works
-- ========================================

-- Check 1: Table exists
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'ml_performance_records';

-- Check 2: Columns are correct
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'ml_performance_records'
ORDER BY ordinal_position;

-- Check 3: RLS is enabled
SELECT schemaname, tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'ml_performance_records';

-- Check 4: Views are created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'VIEW' 
AND table_name LIKE 'ml_performance%';

-- Check 5: Indexes are created
SELECT indexname FROM pg_indexes 
WHERE schemaname = 'public' AND tablename = 'ml_performance_records';

-- ========================================
-- OPTIONAL: Sample Insert (for testing)
-- ========================================
-- Just replace user_id with your numeric user ID (1, 2, 3, etc.)

INSERT INTO ml_performance_records (
  user_id, 
  quiz_id, 
  exam_id, 
  topic, 
  score, 
  percentage, 
  max_score,
  cognitive_breakdown,
  topic_mastery,
  weak_topics,
  strong_topics,
  quiz_type
) VALUES (
  1,  -- Change to your user ID (numeric: 1, 2, 3, etc.)
  'contest1',
  1,
  'Đa thức',
  16,
  80.00,
  20,
  '{
    "level1": {"correct": 5, "total": 5, "points": 10},
    "level2": {"correct": 4, "total": 6, "points": 6},
    "level3": {"correct": 3, "total": 4, "points": 6},
    "level4": {"correct": 2, "total": 3, "points": 2}
  }'::jsonb,
  '{
    "Đa thức": {"correct": 4, "total": 5, "score": 80},
    "Phương trình": {"correct": 2, "total": 5, "score": 40}
  }'::jsonb,
  '[
    {"topic": "Phương trình", "score": 40, "total_questions": 5, "priority": 100}
  ]'::jsonb,
  '[
    {"topic": "Đa thức", "score": 80, "can_advance": true}
  ]'::jsonb,
  'adaptive'
);

-- ========================================
-- QUERY EXAMPLES: How to use the data
-- ========================================
-- Replace user_id with your numeric user ID (1, 2, 3, etc.)

-- Example 1: Get user's last 5 quizzes
SELECT user_id, quiz_id, topic, percentage, created_at 
FROM ml_performance_records 
WHERE user_id = 1
ORDER BY created_at DESC
LIMIT 5;

-- Example 2: Get weak areas from last quiz
SELECT user_id, weak_topics, strong_topics, created_at
FROM ml_performance_records 
WHERE user_id = 1
ORDER BY created_at DESC
LIMIT 1;

-- Example 3: Average score per topic (all time)
SELECT 
  user_id,
  topic,
  ROUND(AVG(percentage)::numeric, 2) as avg_score,
  COUNT(*) as attempts
FROM ml_performance_records 
WHERE user_id = 1
GROUP BY user_id, topic
ORDER BY avg_score ASC;

-- Example 4: Cognitive level performance (last quiz)
WITH latest_quiz AS (
  SELECT DISTINCT ON (user_id) 
    user_id, 
    cognitive_breakdown, 
    created_at
  FROM ml_performance_records
  WHERE user_id = 1
  ORDER BY user_id, created_at DESC
)
SELECT 
  user_id,
  cognitive_breakdown->'level1'->>'points' as level1_points,
  cognitive_breakdown->'level2'->>'points' as level2_points,
  cognitive_breakdown->'level3'->>'points' as level3_points,
  cognitive_breakdown->'level4'->>'points' as level4_points,
  created_at
FROM latest_quiz;

-- Example 5: Trend analysis (improving or declining)
WITH quiz_scores AS (
  SELECT 
    user_id, 
    percentage, 
    created_at,
    LAG(percentage) OVER (PARTITION BY user_id ORDER BY created_at) as prev_score
  FROM ml_performance_records
  WHERE user_id = 1
)
SELECT 
  user_id,
  percentage,
  prev_score,
  (percentage - prev_score) as change,
  CASE 
    WHEN (percentage - prev_score) > 5 THEN '📈 Improving'
    WHEN (percentage - prev_score) < -5 THEN '📉 Declining'
    ELSE '➡️ Stable'
  END as trend,
  created_at
FROM quiz_scores
ORDER BY created_at DESC;

-- ========================================
-- JSON Field Examples (Reference only - not executable SQL)
-- ========================================

-- cognitive_breakdown structure:
-- {
--   "level1": {"correct": 5, "total": 5, "points": 10},
--   "level2": {"correct": 4, "total": 6, "points": 6},
--   "level3": {"correct": 3, "total": 4, "points": 6},
--   "level4": {"correct": 2, "total": 3, "points": 2}
-- }

-- topic_mastery structure:
-- {
--   "Đa thức": {"correct": 4, "total": 5, "score": 80},
--   "Phương trình": {"correct": 2, "total": 5, "score": 40},
--   "Hàm số": {"correct": 5, "total": 5, "score": 100}
-- }

-- weak_topics structure:
-- [
--   {"topic": "Phương trình", "score": 40, "total_questions": 5, "priority": 60},
--   {"topic": "Hình học", "score": 55, "total_questions": 5, "priority": 45}
-- ]

-- strong_topics structure:
-- [
--   {"topic": "Đa thức", "score": 80, "can_advance": true},
--   {"topic": "Hàm số", "score": 100, "can_advance": true}
-- ]

-- trend_metrics structure:
-- {
--   "trend": "improving",
--   "compared_to_last": 5.50,
--   "momentum": 0.055,
--   "estimated_next_score": 85.50
-- }

-- time_on_task structure:
-- {
--   "total_seconds": 540,
--   "per_question_avg": 27,
--   "time_efficiency": "1.0"
-- }
