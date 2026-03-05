-- ========================================
-- ADVANCED ADAPTIVE LEARNING TABLES
-- ========================================
-- Add to Supabase to support:
-- 1. Question memory (questions_seen)
-- 2. Mastery tracking
-- 3. Spaced repetition
-- 4. Question difficulty calibration
-- 5. Time analysis


-- ========================================
-- 1. Update ml_performance_records with new fields
-- ========================================

ALTER TABLE ml_performance_records
ADD COLUMN IF NOT EXISTS questions_seen BIGINT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS speed_category VARCHAR(20) DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS topic_mastery_status VARCHAR(50) DEFAULT 'not_started';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_ml_perf_topic_mastery ON ml_performance_records(user_id, topic, percentage DESC);


-- ========================================
-- 2. Topic Mastery Tracking
-- ========================================

CREATE TABLE IF NOT EXISTS topic_mastery (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  topic VARCHAR(255) NOT NULL,
  average_score DECIMAL(5,2) DEFAULT 0,
  last_three_scores DECIMAL(5,2)[] DEFAULT '{}',
  mastery_status VARCHAR(50) DEFAULT 'not_started',  -- not_started, developing, near_mastery, mastered
  mastery_date TIMESTAMP WITH TIME ZONE,
  attempts_total INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_user_topic UNIQUE(user_id, topic)
);

CREATE INDEX IF NOT EXISTS idx_mastery_user_topic ON topic_mastery(user_id, topic);
CREATE INDEX IF NOT EXISTS idx_mastery_status ON topic_mastery(user_id, mastery_status);


-- ========================================
-- 3. Spaced Repetition Scheduler
-- ========================================

CREATE TABLE IF NOT EXISTS topic_reviews (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  topic VARCHAR(255) NOT NULL,
  last_attempt_date TIMESTAMP WITH TIME ZONE,
  last_score DECIMAL(5,2),
  next_review_date TIMESTAMP WITH TIME ZONE,
  review_count INT DEFAULT 0,
  review_priority INT DEFAULT 0,  -- 0=normal, 1=high priority
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_review_schedule UNIQUE(user_id, topic)
);

CREATE INDEX IF NOT EXISTS idx_reviews_user_due ON topic_reviews(user_id, next_review_date);
CREATE INDEX IF NOT EXISTS idx_reviews_priority ON topic_reviews(user_id, review_priority DESC);


-- ========================================
-- 4. Question Difficulty Calibration
-- ========================================

CREATE TABLE IF NOT EXISTS question_stats (
  id BIGSERIAL PRIMARY KEY,
  question_id BIGINT NOT NULL UNIQUE,
  attempts INT DEFAULT 0,
  correct_attempts INT DEFAULT 0,
  correct_rate DECIMAL(5,2) DEFAULT 0,
  difficulty_original INT,  -- 1-5
  difficulty_adjusted DECIMAL(3,1),  -- Adjusted based on actual performance
  difficulty_category VARCHAR(50),  -- very_easy, easy, normal, hard, very_hard
  average_time_seconds INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_question_stats_difficulty ON question_stats(difficulty_adjusted);
CREATE INDEX IF NOT EXISTS idx_question_stats_correct_rate ON question_stats(correct_rate);


-- ========================================
-- 5. Learning Progress Curve (Historical)
-- ========================================

CREATE TABLE IF NOT EXISTS learning_progress (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  topic VARCHAR(255),
  quiz_date DATE,
  score DECIMAL(5,2),
  percentage DECIMAL(5,2),
  quiz_id VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_progress_user_date ON learning_progress(user_id, quiz_date DESC);
CREATE INDEX IF NOT EXISTS idx_progress_user_topic ON learning_progress(user_id, topic, quiz_date DESC);


-- ========================================
-- 6. ELO Rating System (Advanced)
-- ========================================

CREATE TABLE IF NOT EXISTS user_elo_ratings (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE,
  overall_rating DECIMAL(6,2) DEFAULT 1200,  -- Standard ELO starting point
  topic_ratings JSONB DEFAULT '{}',  -- {topic: rating}
  rating_history JSONB DEFAULT '[]',  -- [{date, rating, change}]
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_elo_user_rating ON user_elo_ratings(user_id, overall_rating DESC);


-- ========================================
-- 7. AI Feedback Cache
-- ========================================

CREATE TABLE IF NOT EXISTS ai_feedback (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  quiz_id VARCHAR(100),
  topic VARCHAR(255),
  feedback TEXT,
  suggestions TEXT[],
  focus_areas TEXT[],
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_feedback_user_quiz ON ai_feedback(user_id, quiz_id);


-- ========================================
-- 7b. AI Learning Insights (Post-Quiz Analysis)
-- ========================================

CREATE TABLE IF NOT EXISTS ai_learning_insights (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  quiz_id VARCHAR(100) NOT NULL,
  topic VARCHAR(255),
  ai_summary TEXT,
  recommended_topics TEXT[],
  difficulty_adjustment VARCHAR(50),  -- maintain, upgrade, downgrade
  learning_plan TEXT,
  strong_areas TEXT[],
  weak_areas TEXT[],
  confidence_score DECIMAL(3,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, quiz_id)
);

CREATE INDEX IF NOT EXISTS idx_insights_user_quiz ON ai_learning_insights(user_id, quiz_id);
CREATE INDEX IF NOT EXISTS idx_insights_user_date ON ai_learning_insights(user_id, created_at DESC);


-- ========================================
-- 8. Grants (same as ml_performance_records)
-- ========================================

GRANT SELECT, INSERT, UPDATE ON topic_mastery TO authenticated;
GRANT SELECT, INSERT, UPDATE ON topic_reviews TO authenticated;
GRANT SELECT ON question_stats TO authenticated;
GRANT SELECT, INSERT ON learning_progress TO authenticated;
GRANT SELECT, UPDATE ON user_elo_ratings TO authenticated;
GRANT SELECT, INSERT ON ai_feedback TO authenticated;
GRANT SELECT, INSERT ON ai_learning_insights TO authenticated;

-- ========================================
-- 9. Views for Analytics
-- ========================================

-- Daily Progress View
CREATE OR REPLACE VIEW daily_progress_view AS
SELECT 
  user_id,
  quiz_date,
  COUNT(*) as quizzes_count,
  ROUND(AVG(percentage)::numeric, 2) as daily_avg_score,
  MAX(percentage) as best_score,
  MIN(percentage) as worst_score
FROM learning_progress
GROUP BY user_id, quiz_date
ORDER BY user_id, quiz_date DESC;

-- Topic Mastery Overview
CREATE OR REPLACE VIEW topic_mastery_overview AS
SELECT 
  user_id,
  topic,
  mastery_status,
  average_score,
  attempts_total,
  CASE 
    WHEN mastery_status = 'mastered' THEN '✅ Mastered'
    WHEN mastery_status = 'near_mastery' THEN '⏰ Near Mastery'
    WHEN mastery_status = 'developing' THEN '📚 Developing'
    ELSE '🆕 Not Started'
  END as status_label
FROM topic_mastery
ORDER BY user_id, average_score DESC;

-- Question Difficulty Calibration View
CREATE OR REPLACE VIEW question_difficulty_calibration AS
SELECT 
  question_id,
  attempts,
  correct_rate,
  difficulty_original,
  difficulty_adjusted,
  CASE 
    WHEN correct_rate >= 80 THEN 'too_easy'
    WHEN correct_rate >= 60 THEN 'good_fit'
    WHEN correct_rate >= 40 THEN 'challenging'
    ELSE 'too_hard'
  END as calibration_status
FROM question_stats
ORDER BY correct_rate DESC;

GRANT SELECT ON daily_progress_view TO authenticated;
GRANT SELECT ON topic_mastery_overview TO authenticated;
GRANT SELECT ON question_difficulty_calibration TO authenticated;
