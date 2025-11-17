-- ========================================
-- ML Analytics Database Schema for Supabase (PostgreSQL)
-- ========================================
-- This schema optimizes storage and querying of ML-based learning analytics
-- Using normalized tables for better performance and flexibility

-- 1. Students Table (User Profiles)
CREATE TABLE IF NOT EXISTS students (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Basic Stats
  total_quizzes INT DEFAULT 0,
  total_score DECIMAL(10,2) DEFAULT 0,
  average_score DECIMAL(5,2) DEFAULT 0,
  best_score INT DEFAULT 0,
  worst_score INT DEFAULT 100,
  
  -- ML Features
  learning_velocity DECIMAL(5,2) DEFAULT 0,  -- Rate of improvement
  consistency_score DECIMAL(5,2) DEFAULT 0,   -- How consistent performance is
  confidence_trend DECIMAL(5,2) DEFAULT 0,    -- Overall confidence level
  
  -- Learning Phase (FOUNDATION, BUILDING, ADVANCING, MASTERY)
  current_phase VARCHAR(20) DEFAULT 'FOUNDATION',
  
  -- Recommended Focus Areas (JSON array of concepts)
  recommended_focus JSONB DEFAULT '[]'::jsonb,
  
  INDEX idx_user_id (user_id),
  INDEX idx_current_phase (current_phase),
  INDEX idx_average_score (average_score)
);

-- 2. Performance Records (Quiz Attempts)
CREATE TABLE IF NOT EXISTS performance_records (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  quiz_id VARCHAR(100) NOT NULL,
  quiz_name VARCHAR(255),
  
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  score DECIMAL(5,2),
  total_questions INT,
  percentage DECIMAL(5,2),
  time_taken_seconds INT,
  
  -- Performance Metrics (stored as normalized values)
  overall_score DECIMAL(5,2),
  confidence_score DECIMAL(5,2),
  
  -- Category-level performance (stored as JSONB for flexibility)
  category_performance JSONB DEFAULT '{}'::jsonb,
  
  -- Difficulty level performance
  difficulty_analysis JSONB DEFAULT '{}'::jsonb,
  
  -- Learning curve (array of {questionId, isCorrect, difficulty})
  learning_curve JSONB DEFAULT '[]'::jsonb,
  
  INDEX idx_student_id (student_id),
  INDEX idx_quiz_id (quiz_id),
  INDEX idx_timestamp (timestamp),
  INDEX idx_score (score)
);

-- 3. Weakness Patterns (Conceptual Gaps Detection)
CREATE TABLE IF NOT EXISTS weakness_patterns (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  quiz_id VARCHAR(100),
  
  -- Concept/Topic with gap
  concept VARCHAR(255) NOT NULL,
  
  -- Severity level (HIGH, MEDIUM, LOW)
  severity VARCHAR(10),
  
  -- How many errors in this concept
  error_frequency INT DEFAULT 1,
  
  -- Types of errors
  error_type VARCHAR(50), -- CONCEPTUAL, PROCEDURAL, CARELESS, etc.
  
  -- Affected question IDs (array)
  affected_questions JSONB DEFAULT '[]'::jsonb,
  
  -- When this weakness was first detected
  first_detected TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- When this weakness was last improved
  last_improved TIMESTAMP,
  
  -- Status (ACTIVE, IMPROVING, RESOLVED)
  status VARCHAR(20) DEFAULT 'ACTIVE',
  
  INDEX idx_student_id (student_id),
  INDEX idx_concept (concept),
  INDEX idx_severity (severity),
  INDEX idx_status (status)
);

-- 4. Category Mastery (Per-Category Performance Tracking)
CREATE TABLE IF NOT EXISTS category_mastery (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  
  category_name VARCHAR(100) NOT NULL,
  
  total_attempts INT DEFAULT 0,
  correct_answers INT DEFAULT 0,
  mastery_percentage DECIMAL(5,2) DEFAULT 0,
  
  -- Mastery levels: MASTERED (85+), PROFICIENT (70-85), DEVELOPING (50-70), BEGINNER (<50)
  mastery_level VARCHAR(20),
  
  -- Trend (improving, stable, declining)
  trend VARCHAR(20) DEFAULT 'stable',
  trend_score DECIMAL(5,2) DEFAULT 0, -- Slope of linear regression
  
  last_practiced TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Historical trend data
  trend_history JSONB DEFAULT '[]'::jsonb,
  
  INDEX idx_student_id (student_id),
  INDEX idx_category_name (category_name),
  INDEX idx_mastery_level (mastery_level),
  INDEX idx_trend (trend)
);

-- 5. Learning Paths (Personalized Learning Plans)
CREATE TABLE IF NOT EXISTS learning_paths (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  
  quiz_id VARCHAR(100),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Phase of learning (FOUNDATION, BUILDING, ADVANCING, MASTERY)
  phase VARCHAR(20),
  
  -- Status (ACTIVE, COMPLETED, ABANDONED)
  status VARCHAR(20) DEFAULT 'ACTIVE',
  
  -- Estimated completion date
  estimated_completion_date TIMESTAMP,
  
  -- Actual completion date
  completed_at TIMESTAMP,
  
  -- Milestones (array of {id, title, duration, status, activities})
  milestones JSONB DEFAULT '[]'::jsonb,
  
  -- Daily goals (array of {day, activity, estimated_time})
  daily_goals JSONB DEFAULT '[]'::jsonb,
  
  -- Success metrics
  success_metrics JSONB DEFAULT '{}'::jsonb,
  
  -- Timeline data
  timeline_data JSONB DEFAULT '{}'::jsonb,
  
  INDEX idx_student_id (student_id),
  INDEX idx_status (status),
  INDEX idx_phase (phase)
);

-- 6. AI Insights (Generated Analysis & Recommendations)
CREATE TABLE IF NOT EXISTS ai_insights (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  
  performance_record_id BIGINT REFERENCES performance_records(id) ON DELETE CASCADE,
  
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Insight type (STRENGTH, WEAKNESS, PATTERN, CAUTION, POSITIVE, IMPROVEMENT)
  insight_type VARCHAR(50),
  
  -- Human-readable message
  message TEXT,
  
  -- Priority level (LOW, MEDIUM, HIGH, CRITICAL)
  priority VARCHAR(20),
  
  -- Predictions
  predictions JSONB DEFAULT '{}'::jsonb,
  
  -- Recommendations for actions
  recommendations JSONB DEFAULT '[]'::jsonb,
  
  -- Trend data
  trend_data JSONB DEFAULT '{}' ::jsonb,
  
  -- Classification of student (e.g., ADVANCED_IMPROVING, DEVELOPING_STRUGGLING)
  classification VARCHAR(50),
  
  -- Was this insight acted upon?
  acted_upon BOOLEAN DEFAULT FALSE,
  acted_upon_at TIMESTAMP,
  
  INDEX idx_student_id (student_id),
  INDEX idx_type (insight_type),
  INDEX idx_priority (priority),
  INDEX idx_generated_at (generated_at)
);

-- 7. Predictions (ML Prediction Storage)
CREATE TABLE IF NOT EXISTS predictions (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Prediction type (NEXT_SCORE, TIME_TO_MASTERY, STAGNATION_RISK, IMPROVEMENT_POTENTIAL)
  prediction_type VARCHAR(50),
  
  -- Predicted value
  predicted_value DECIMAL(10,2),
  
  -- Confidence score (0-1)
  confidence DECIMAL(3,2),
  
  -- Actual value (filled in later if applicable)
  actual_value DECIMAL(10,2),
  
  -- Whether prediction was accurate
  was_accurate BOOLEAN,
  
  -- Additional metadata
  metadata JSONB DEFAULT '{}' ::jsonb,
  
  INDEX idx_student_id (student_id),
  INDEX idx_prediction_type (prediction_type),
  INDEX idx_created_at (created_at)
);

-- 8. Learning Recommendations (Specific Action Items)
CREATE TABLE IF NOT EXISTS learning_recommendations (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  ai_insight_id BIGINT REFERENCES ai_insights(id) ON DELETE CASCADE,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Action type (INTENSIVE_REVIEW, PRACTICE_PROBLEMS, CHANGE_APPROACH, etc.)
  action_type VARCHAR(50),
  
  -- Target concept or category
  target_concept VARCHAR(255),
  
  -- Priority (CRITICAL, HIGH, MEDIUM, LOW)
  priority VARCHAR(20),
  
  -- Why this is recommended
  reason TEXT,
  
  -- Estimated time needed (minutes)
  estimated_time_minutes INT,
  
  -- Target accuracy/mastery
  target_accuracy INT,
  
  -- Suggested resources
  suggested_resources JSONB DEFAULT '[]'::jsonb,
  
  -- Was recommendation followed?
  was_followed BOOLEAN DEFAULT FALSE,
  followed_at TIMESTAMP,
  
  -- Result of following recommendation
  result JSONB DEFAULT '{}'::jsonb,
  
  INDEX idx_student_id (student_id),
  INDEX idx_action_type (action_type),
  INDEX idx_priority (priority),
  INDEX idx_was_followed (was_followed)
);

-- 9. Learning Progress (Track Progress Over Time)
CREATE TABLE IF NOT EXISTS learning_progress (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  
  milestone_date DATE NOT NULL,
  
  -- Daily metrics
  quizzes_completed INT DEFAULT 0,
  average_daily_score DECIMAL(5,2),
  concepts_practiced JSONB DEFAULT '[]'::jsonb,
  weaknesses_targeted JSONB DEFAULT '[]'::jsonb,
  
  -- Time spent learning (minutes)
  minutes_studied INT DEFAULT 0,
  
  -- Mood/Confidence (1-5 scale)
  confidence_rating INT,
  engagement_rating INT,
  
  -- Progress notes
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_student_id (student_id),
  INDEX idx_milestone_date (milestone_date)
);

-- 10. Cohort Benchmarks (For Comparative Analytics)
CREATE TABLE IF NOT EXISTS cohort_benchmarks (
  id BIGSERIAL PRIMARY KEY,
  
  cohort_name VARCHAR(100),
  cohort_size INT,
  
  -- Benchmark statistics
  average_score DECIMAL(5,2),
  median_score DECIMAL(5,2),
  std_dev DECIMAL(5,2),
  
  -- Category benchmarks
  category_benchmarks JSONB DEFAULT '{}'::jsonb,
  
  -- Phase distribution
  phase_distribution JSONB DEFAULT '{}'::jsonb,
  
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_cohort_name (cohort_name)
);

-- ========================================
-- VIEWS for Analytics
-- ========================================

-- View: Student Summary (Latest metrics for dashboard)
CREATE OR REPLACE VIEW student_summary AS
SELECT 
  s.id,
  s.user_id,
  s.total_quizzes,
  s.average_score,
  s.best_score,
  s.worst_score,
  s.learning_velocity,
  s.consistency_score,
  s.current_phase,
  s.recommended_focus,
  (SELECT COUNT(*) FROM weakness_patterns WHERE student_id = s.id AND status = 'ACTIVE') as active_weaknesses,
  (SELECT MAX(timestamp) FROM performance_records WHERE student_id = s.id) as last_quiz_date,
  s.updated_at
FROM students s;

-- View: Category Performance Summary
CREATE OR REPLACE VIEW category_performance_summary AS
SELECT 
  student_id,
  category_name,
  total_attempts,
  correct_answers,
  mastery_percentage,
  mastery_level,
  trend,
  trend_score,
  last_practiced
FROM category_mastery
ORDER BY student_id, mastery_percentage DESC;

-- View: Active Learning Paths
CREATE OR REPLACE VIEW active_learning_paths AS
SELECT 
  lp.*,
  s.user_id,
  s.average_score
FROM learning_paths lp
JOIN students s ON lp.student_id = s.id
WHERE lp.status = 'ACTIVE'
ORDER BY lp.created_at DESC;

-- ========================================
-- FUNCTIONS for Common Operations
-- ========================================

-- Function: Update student learning velocity
CREATE OR REPLACE FUNCTION update_learning_velocity(p_student_id BIGINT)
RETURNS DECIMAL AS $$
DECLARE
  v_velocity DECIMAL;
BEGIN
  WITH recent_scores AS (
    SELECT score, ROW_NUMBER() OVER (ORDER BY timestamp DESC) as rn
    FROM performance_records
    WHERE student_id = p_student_id
    ORDER BY timestamp DESC
    LIMIT 2
  )
  SELECT 
    CASE 
      WHEN COUNT(*) < 2 THEN 0
      ELSE MAX(score) FILTER (WHERE rn = 1) - MAX(score) FILTER (WHERE rn = 2)
    END
  INTO v_velocity
  FROM recent_scores;
  
  UPDATE students SET learning_velocity = v_velocity WHERE id = p_student_id;
  RETURN v_velocity;
END;
$$ LANGUAGE plpgsql;

-- Function: Calculate average score for student
CREATE OR REPLACE FUNCTION calculate_student_averages(p_student_id BIGINT)
RETURNS TABLE (avg_score DECIMAL, best_score INT, worst_score INT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ROUND(AVG(score)::NUMERIC, 2),
    MAX(score)::INT,
    MIN(score)::INT
  FROM performance_records
  WHERE student_id = p_student_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Get student profile with all analytics
CREATE OR REPLACE FUNCTION get_student_analytics(p_user_id BIGINT)
RETURNS TABLE (
  student_id BIGINT,
  user_id BIGINT,
  total_quizzes INT,
  average_score DECIMAL,
  current_phase VARCHAR,
  active_weaknesses INT,
  recent_insights JSON,
  category_mastery JSON,
  recommendations JSON
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.user_id,
    s.total_quizzes,
    s.average_score,
    s.current_phase,
    (SELECT COUNT(*) FROM weakness_patterns WHERE student_id = s.id AND status = 'ACTIVE')::INT,
    (SELECT json_agg(json_build_object(
      'type', ai.insight_type,
      'message', ai.message,
      'priority', ai.priority
    )) FROM ai_insights ai WHERE ai.student_id = s.id ORDER BY ai.generated_at DESC LIMIT 5)::JSON,
    (SELECT json_agg(json_build_object(
      'category', cm.category_name,
      'percentage', cm.mastery_percentage,
      'level', cm.mastery_level
    )) FROM category_mastery cm WHERE cm.student_id = s.id)::JSON,
    (SELECT json_agg(json_build_object(
      'action', lr.action_type,
      'priority', lr.priority,
      'reason', lr.reason
    )) FROM learning_recommendations lr WHERE lr.student_id = s.id AND lr.was_followed = FALSE LIMIT 5)::JSON
  FROM students s
  WHERE s.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- INDEXES for Performance
-- ========================================

CREATE INDEX IF NOT EXISTS idx_perf_student_timestamp ON performance_records(student_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_weakness_student_status ON weakness_patterns(student_id, status);
CREATE INDEX IF NOT EXISTS idx_mastery_student_category ON category_mastery(student_id, category_name);
CREATE INDEX IF NOT EXISTS idx_insight_student_type ON ai_insights(student_id, insight_type);
CREATE INDEX IF NOT EXISTS idx_recommendation_student_priority ON learning_recommendations(student_id, priority);

-- ========================================
-- Triggers for Automatic Updates
-- ========================================

-- Trigger: Update student updated_at on performance_records insert
CREATE OR REPLACE FUNCTION update_student_on_performance()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE students 
  SET updated_at = CURRENT_TIMESTAMP,
      total_quizzes = (SELECT COUNT(*) FROM performance_records WHERE student_id = NEW.student_id)
  WHERE id = NEW.student_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_student_on_performance
AFTER INSERT ON performance_records
FOR EACH ROW EXECUTE FUNCTION update_student_on_performance();

-- Trigger: Update weakness status when pattern resolves
CREATE OR REPLACE FUNCTION check_weakness_status()
RETURNS TRIGGER AS $$
BEGIN
  -- If recent performance shows 85%+ in this concept, mark as improving
  IF NEW.error_frequency = 1 THEN
    UPDATE weakness_patterns 
    SET status = 'IMPROVING'
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_weakness_status
AFTER UPDATE ON weakness_patterns
FOR EACH ROW EXECUTE FUNCTION check_weakness_status();
