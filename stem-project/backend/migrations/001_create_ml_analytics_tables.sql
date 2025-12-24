-- ========================================
-- ML Analytics Tables for PostgreSQL/Supabase
-- ========================================
-- Tables for storing ML analysis results: strengths, weaknesses, predictions

-- 1. ML Student Profiles (học sinh profile)
CREATE TABLE IF NOT EXISTS ml_student_profiles (
  id SERIAL PRIMARY KEY,
  user_id BIGINT UNIQUE NOT NULL,
  overall_score DECIMAL(5,2) DEFAULT 0,
  confidence_score DECIMAL(5,2) DEFAULT 0,
  total_quizzes INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. ML Performance Records (kết quả quiz chi tiết)
CREATE TABLE IF NOT EXISTS ml_performance_records (
  id SERIAL PRIMARY KEY,
  student_id INT REFERENCES ml_student_profiles(id) ON DELETE CASCADE,
  quiz_id VARCHAR(100),
  overall_score DECIMAL(5,2),
  category_performance JSONB DEFAULT '{}',
  difficulty_analysis JSONB DEFAULT '{}',
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. ML Weaknesses (điểm yếu)
CREATE TABLE IF NOT EXISTS ml_weaknesses (
  id SERIAL PRIMARY KEY,
  student_id INT REFERENCES ml_student_profiles(id) ON DELETE CASCADE,
  quiz_id VARCHAR(100),
  perf_record_id INT REFERENCES ml_performance_records(id) ON DELETE CASCADE,
  
  -- Weakness classification
  weakness_type VARCHAR(50), -- CONCEPTUAL_GAP, PROCEDURAL_ERROR, CARELESS_MISTAKE
  concept VARCHAR(255),
  severity VARCHAR(20), -- HIGH, MEDIUM, LOW
  frequency INT,
  affected_questions JSONB DEFAULT '[]',
  description TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP
);

-- 4. ML Strengths (điểm mạnh)
CREATE TABLE IF NOT EXISTS ml_strengths (
  id SERIAL PRIMARY KEY,
  student_id INT REFERENCES ml_student_profiles(id) ON DELETE CASCADE,
  quiz_id VARCHAR(100),
  perf_record_id INT REFERENCES ml_performance_records(id) ON DELETE CASCADE,
  
  insight_type VARCHAR(50), -- STRENGTH, POSITIVE
  message TEXT,
  priority VARCHAR(20), -- LOW, MEDIUM, HIGH
  category VARCHAR(100),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. ML Predictions (dự đoán)
CREATE TABLE IF NOT EXISTS ml_predictions (
  id SERIAL PRIMARY KEY,
  student_id INT REFERENCES ml_student_profiles(id) ON DELETE CASCADE,
  quiz_id VARCHAR(100),
  
  predicted_score DECIMAL(5,2),
  confidence DECIMAL(3,2),
  trend VARCHAR(20), -- improving, stable, declining
  intervention_needed BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. ML Learning Paths (lộ trình học tập)
CREATE TABLE IF NOT EXISTS ml_learning_paths (
  id SERIAL PRIMARY KEY,
  student_id INT REFERENCES ml_student_profiles(id) ON DELETE CASCADE,
  quiz_id VARCHAR(100),
  
  phase VARCHAR(50), -- FOUNDATION, BUILDING, ADVANCING, MASTERY
  milestones JSONB DEFAULT '[]',
  daily_goals JSONB DEFAULT '[]',
  estimated_days INT,
  status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, COMPLETED, ABANDONED
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

-- ========================================
-- VIEWS for Quick Analytics
-- ========================================

-- View: Student Summary with Latest Metrics
CREATE OR REPLACE VIEW ml_student_summary AS
SELECT 
  sp.id,
  sp.user_id,
  sp.overall_score,
  sp.confidence_score,
  sp.total_quizzes,
  (SELECT COUNT(*) FROM ml_weaknesses WHERE student_id = sp.id AND resolved_at IS NULL) as active_weaknesses,
  (SELECT COUNT(*) FROM ml_strengths WHERE student_id = sp.id) as total_strengths,
  (SELECT COUNT(*) FROM ml_predictions WHERE student_id = sp.id) as total_predictions,
  (SELECT MAX(timestamp) FROM ml_performance_records WHERE student_id = sp.id) as last_quiz_date,
  sp.updated_at
FROM ml_student_profiles sp;

-- View: Recent Weaknesses by Student
CREATE OR REPLACE VIEW ml_recent_weaknesses_view AS
SELECT 
  student_id,
  concept,
  weakness_type,
  severity,
  frequency,
  description,
  created_at,
  ROW_NUMBER() OVER (PARTITION BY student_id ORDER BY created_at DESC) as rn
FROM ml_weaknesses
WHERE resolved_at IS NULL;

-- View: Recent Strengths by Student
CREATE OR REPLACE VIEW ml_recent_strengths_view AS
SELECT 
  student_id,
  category,
  message,
  priority,
  created_at,
  ROW_NUMBER() OVER (PARTITION BY student_id ORDER BY created_at DESC) as rn
FROM ml_strengths;

-- ========================================
-- FUNCTIONS for Operations
-- ========================================

-- Function: Get student summary with all ML analysis
CREATE OR REPLACE FUNCTION get_student_ml_analysis(p_user_id BIGINT)
RETURNS TABLE (
  student_id INT,
  overall_score DECIMAL,
  confidence_score DECIMAL,
  active_weaknesses INT,
  recent_strengths TEXT,
  latest_prediction DECIMAL,
  learning_phase VARCHAR
) AS $$
DECLARE
  v_student_id INT;
BEGIN
  SELECT id INTO v_student_id FROM ml_student_profiles WHERE user_id = p_user_id;
  
  IF v_student_id IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    v_student_id,
    sp.overall_score,
    sp.confidence_score,
    (SELECT COUNT(*) FROM ml_weaknesses WHERE student_id = v_student_id AND resolved_at IS NULL)::INT,
    (SELECT STRING_AGG(category, ', ') FROM (
      SELECT DISTINCT category FROM ml_strengths 
      WHERE student_id = v_student_id 
      ORDER BY created_at DESC LIMIT 5
    ) s)::TEXT,
    (SELECT predicted_score FROM ml_predictions 
     WHERE student_id = v_student_id 
     ORDER BY created_at DESC LIMIT 1)::DECIMAL,
    (SELECT phase FROM ml_learning_paths 
     WHERE student_id = v_student_id AND status = 'ACTIVE'
     ORDER BY created_at DESC LIMIT 1)::VARCHAR
  FROM ml_student_profiles sp
  WHERE sp.id = v_student_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Mark weakness as resolved
CREATE OR REPLACE FUNCTION resolve_weakness(p_weakness_id INT)
RETURNS VOID AS $$
BEGIN
  UPDATE ml_weaknesses 
  SET resolved_at = NOW()
  WHERE id = p_weakness_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Get weaknesses by severity
CREATE OR REPLACE FUNCTION get_weaknesses_by_severity(p_student_id INT, p_severity VARCHAR)
RETURNS TABLE (
  concept VARCHAR,
  weakness_type VARCHAR,
  frequency INT,
  description TEXT,
  created_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w.concept,
    w.weakness_type,
    w.frequency,
    w.description,
    w.created_at
  FROM ml_weaknesses w
  WHERE w.student_id = p_student_id 
    AND w.severity = p_severity
    AND w.resolved_at IS NULL
  ORDER BY w.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- TRIGGERS for Automatic Updates
-- ========================================

-- Trigger: Update student updated_at on performance insert
CREATE OR REPLACE FUNCTION update_student_on_performance()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE ml_student_profiles 
  SET updated_at = NOW(),
      total_quizzes = total_quizzes + 1
  WHERE id = NEW.student_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_student_on_performance ON ml_performance_records;
CREATE TRIGGER trigger_update_student_on_performance
AFTER INSERT ON ml_performance_records
FOR EACH ROW EXECUTE FUNCTION update_student_on_performance();

-- Trigger: Update student overall score on new performance
CREATE OR REPLACE FUNCTION update_student_score()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE ml_student_profiles 
  SET overall_score = (
    SELECT AVG(overall_score) FROM ml_performance_records 
    WHERE student_id = NEW.student_id
  )
  WHERE id = NEW.student_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_student_score ON ml_performance_records;
CREATE TRIGGER trigger_update_student_score
AFTER INSERT ON ml_performance_records
FOR EACH ROW EXECUTE FUNCTION update_student_score();

-- ========================================
-- INDEXES for Performance
-- ========================================

CREATE INDEX IF NOT EXISTS idx_ml_weakness_student_severity ON ml_weaknesses(student_id, severity);
CREATE INDEX IF NOT EXISTS idx_ml_weakness_student_type ON ml_weaknesses(student_id, weakness_type);
CREATE INDEX IF NOT EXISTS idx_ml_strength_student_priority ON ml_strengths(student_id, priority);
CREATE INDEX IF NOT EXISTS idx_ml_prediction_student_date ON ml_predictions(student_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ml_learning_student_status ON ml_learning_paths(student_id, status);
