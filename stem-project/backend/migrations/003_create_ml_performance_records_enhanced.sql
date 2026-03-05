-- ========================================
-- ML Performance Records - Enhanced Version
-- For Adaptive Quiz and AI Feedback
-- ========================================
-- This table stores detailed performance metrics after each quiz
-- Used to generate AI feedback, track progress, and personalize future quizzes

-- Main table: ml_performance_records
-- Tracks every quiz attempt with comprehensive metrics
CREATE TABLE IF NOT EXISTS ml_performance_records (
  id BIGSERIAL PRIMARY KEY,
  
  -- User reference
  user_id BIGINT NOT NULL,
  student_id INT,  -- Reference to ml_student_profiles if exists
  
  -- Quiz identification
  result_id BIGINT,  -- Link to quiz_results table if exists
  quiz_id VARCHAR(100),  -- e.g., "contest1", "contest2", "adaptive"
  exam_id INT,  -- 1-3 (normal/easy), 4-5 (hard)
  
  -- Performance metrics
  score INT NOT NULL DEFAULT 0,  -- Raw score (points)
  percentage DECIMAL(5,2) NOT NULL DEFAULT 0,  -- 0-100.00
  max_score INT DEFAULT 20,  -- Usually 20 questions
  
  -- Topic and difficulty tracking
  topic VARCHAR(255),  -- e.g., "Đa thức", "Phương trình"
  difficulty_level INT,  -- Bloom's level: 1-4 (Knowledge to Analysis)
  
  -- Cognitive breakdown (JSON) - tracks performance by Bloom's level
  -- {
  --   "level1": { "correct": 5, "total": 5, "points": 10 },
  --   "level2": { "correct": 4, "total": 6, "points": 6 },
  --   "level3": { "correct": 3, "total": 4, "points": 6 },
  --   "level4": { "correct": 2, "total": 3, "points": 2 }
  -- }
  cognitive_breakdown JSONB DEFAULT '{}',
  
  -- Topic mastery (JSON) - tracks performance per topic
  -- {
  --   "Đa thức": { "score": 75, "total_questions": 4, "last_attempted": timestamp },
  --   "Phương trình": { "score": 60, "total_questions": 5, "last_attempted": timestamp }
  -- }
  topic_mastery JSONB DEFAULT '{}',
  
  -- Weak topics from this quiz
  weak_topics JSONB DEFAULT '[]',  -- Array of topics with <60% accuracy
  
  -- Strong topics from this quiz
  strong_topics JSONB DEFAULT '[]',  -- Array of topics with ≥80% accuracy
  
  -- Improvement metrics (trends)
  -- {
  --   "trend": "improving|stable|declining",
  --   "compared_to_last": -5.0,  -- % change from previous quiz
  --   "momentum": 0.8,  -- Rate of improvement
  --   "estimated_next_score": 82.5
  -- }
  trend_metrics JSONB DEFAULT '{}',
  
  -- Time analysis
  time_on_task JSONB DEFAULT '{}',  -- { "total_seconds": 180, "per_question_avg": 9 }
  
  -- Answer details (for AI analysis)
  answers JSONB DEFAULT '{}',  -- { "q1": 0, "q2": 1, ... }
  
  -- Metadata for analytics
  quiz_type VARCHAR(50),  -- "adaptive" | "contest" | "practice"
  completion_rate DECIMAL(5,2) DEFAULT 100,  -- % of quiz completed
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_ml_performance_user_id ON ml_performance_records(user_id);
CREATE INDEX IF NOT EXISTS idx_ml_performance_exam_id ON ml_performance_records(exam_id);
CREATE INDEX IF NOT EXISTS idx_ml_performance_topic ON ml_performance_records(topic);
CREATE INDEX IF NOT EXISTS idx_ml_performance_created_at ON ml_performance_records(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ml_performance_user_created ON ml_performance_records(user_id, created_at DESC);

-- Create a view for quick user analytics
CREATE OR REPLACE VIEW ml_performance_summary AS
SELECT 
  user_id,
  COUNT(*) as total_quizzes,
  COUNT(DISTINCT topic) as unique_topics_attempted,
  ROUND(AVG(percentage)::numeric, 2) as average_score,
  MAX(percentage) as highest_score,
  MIN(percentage) as lowest_score,
  MAX(created_at) as last_quiz_date,
  JSON_BUILD_OBJECT(
    'level1_avg', ROUND(AVG((cognitive_breakdown->>'level1_correct')::numeric), 2),
    'level2_avg', ROUND(AVG((cognitive_breakdown->>'level2_correct')::numeric), 2),
    'level3_avg', ROUND(AVG((cognitive_breakdown->>'level3_correct')::numeric), 2),
    'level4_avg', ROUND(AVG((cognitive_breakdown->>'level4_correct')::numeric), 2)
  ) as cognitive_averages
FROM ml_performance_records
GROUP BY user_id;

-- Create a view for trend analysis
CREATE OR REPLACE VIEW ml_performance_trends AS
SELECT 
  user_id,
  topic,
  COUNT(*) as attempts,
  ROUND(AVG(percentage)::numeric, 2) as avg_topic_score,
  MAX(percentage) as best_topic_score,
  MIN(percentage) as worst_topic_score,
  MAX(created_at) as last_attempt
FROM ml_performance_records
WHERE topic IS NOT NULL
GROUP BY user_id, topic
ORDER BY user_id, avg_topic_score DESC;

-- Enable RLS (Row Level Security)
ALTER TABLE ml_performance_records ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own performance records" 
  ON ml_performance_records
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own performance records" 
  ON ml_performance_records
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own performance records" 
  ON ml_performance_records
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON ml_performance_records TO authenticated;
GRANT SELECT ON ml_performance_records TO anon;
GRANT SELECT ON ml_performance_summary TO authenticated;
GRANT SELECT ON ml_performance_trends TO authenticated;

-- ========================================
-- Helper: Initialize user in ml_performance_records on new signup
-- (Run this trigger after creating a new user)
-- ========================================
-- Note: This trigger creates a first record when user signs up
-- Optional: You can call this via backend instead of trigger

CREATE OR REPLACE FUNCTION initialize_ml_performance_for_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert initial placeholder record
  INSERT INTO ml_performance_records (
    user_id,
    quiz_id,
    score,
    percentage,
    quiz_type,
    cognitive_breakdown
  ) VALUES (
    NEW.id,
    'initial',
    0,
    0,
    'initial',
    '{"level1": {"correct": 0, "total": 0, "points": 0}, "level2": {"correct": 0, "total": 0, "points": 0}, "level3": {"correct": 0, "total": 0, "points": 0}, "level4": {"correct": 0, "total": 0, "points": 0}}'::jsonb
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-initialize on new user signup (optional)
-- Uncomment if you want automatic initialization
-- DROP TRIGGER IF NOT EXISTS trigger_init_ml_perf ON auth.users;
-- CREATE TRIGGER trigger_init_ml_perf
-- AFTER INSERT ON auth.users
-- FOR EACH ROW
-- EXECUTE FUNCTION initialize_ml_performance_for_user();

-- ========================================
-- Sample Query: Get student's weak areas from last 3 quizzes
-- ========================================
-- SELECT 
--   user_id,
--   weak_topics,
--   created_at
-- FROM ml_performance_records
-- WHERE user_id = YOUR_USER_ID
-- ORDER BY created_at DESC
-- LIMIT 3;

-- ========================================
-- Sample Query: Track improvement over time
-- ========================================
-- SELECT 
--   DATE(created_at) as quiz_date,
--   COUNT(*) as quizzes_taken,
--   ROUND(AVG(percentage), 2) as avg_daily_score,
--   MAX(percentage) as best_daily_score
-- FROM ml_performance_records
-- WHERE user_id = YOUR_USER_ID
-- GROUP BY DATE(created_at)
-- ORDER BY quiz_date DESC;
