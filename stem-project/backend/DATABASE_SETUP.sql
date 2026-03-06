-- ============================================
-- COMPLETE DATABASE SETUP SCRIPT
-- ============================================
-- Run all of this SQL in Supabase dashboard
-- This creates all required tables for the system to work

-- ============================================
-- 1. User Learning Profiles Table
-- ============================================
CREATE TABLE IF NOT EXISTS user_learning_profiles (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE,
  cognitive_levels JSONB DEFAULT '{"level1": 0, "level2": 0, "level3": 0, "level4": 0}',
  proficiency_status JSONB DEFAULT '{"level1": "NOT_STARTED", "level2": "NOT_STARTED", "level3": "NOT_STARTED", "level4": "NOT_STARTED"}',
  weak_areas TEXT[] DEFAULT ARRAY[]::TEXT[],
  strong_areas TEXT[] DEFAULT ARRAY[]::TEXT[],
  topics_attempted TEXT[] DEFAULT ARRAY[]::TEXT[],
  recommendations TEXT[] DEFAULT ARRAY[]::TEXT[],
  quizzes_taken INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_learning_profiles_user_id ON user_learning_profiles(user_id);

-- ============================================
-- 2. Quiz Results Table
-- ============================================
CREATE TABLE IF NOT EXISTS quiz_results (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  quiz_id TEXT NOT NULL DEFAULT 'personalized',
  topic TEXT,
  overall_score FLOAT NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  time_spent_seconds INTEGER NOT NULL DEFAULT 0,
  topic_performance JSONB DEFAULT '{}',
  cognitive_breakdown JSONB DEFAULT '{}',
  answer_details JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_quiz_results_user_id ON quiz_results(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_created_at ON quiz_results(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_results_user_created ON quiz_results(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_results_topic ON quiz_results(topic);

-- ============================================
-- 3. ML Performance Records Table
-- ============================================
CREATE TABLE IF NOT EXISTS ml_performance_records (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  quiz_id TEXT NOT NULL,
  topic TEXT NOT NULL,
  score FLOAT NOT NULL,
  percentage FLOAT NOT NULL,
  cognitive_breakdown JSONB DEFAULT '{}',
  topic_mastery JSONB DEFAULT '{}',
  weak_topics TEXT[] DEFAULT ARRAY[]::TEXT[],
  strong_topics TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ml_performance_user_id ON ml_performance_records(user_id);
CREATE INDEX IF NOT EXISTS idx_ml_performance_topic ON ml_performance_records(topic);
CREATE INDEX IF NOT EXISTS idx_ml_performance_created_at ON ml_performance_records(created_at DESC);

-- ============================================
-- 4. AI Feedback Table
-- ============================================
CREATE TABLE IF NOT EXISTS ai_feedback (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  quiz_id TEXT NOT NULL,
  topic TEXT,
  summary TEXT,
  recommended_level TEXT DEFAULT 'normal',
  suggested_topics TEXT[] DEFAULT ARRAY[]::TEXT[],
  study_plan JSONB DEFAULT '[]',
  explainability JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_feedback_user_id ON ai_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_created_at ON ai_feedback(created_at DESC);

-- ============================================
-- 5. AI Learning Insights Table
-- ============================================
CREATE TABLE IF NOT EXISTS ai_learning_insights (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  quiz_id TEXT NOT NULL,
  topic TEXT,
  ai_summary TEXT,
  recommended_topics TEXT[] DEFAULT ARRAY[]::TEXT[],
  difficulty_adjustment TEXT DEFAULT 'normal',
  learning_plan TEXT,
  strong_areas TEXT[] DEFAULT ARRAY[]::TEXT[],
  weak_areas TEXT[] DEFAULT ARRAY[]::TEXT[],
  confidence_score FLOAT DEFAULT 0.0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_learning_insights_user_id ON ai_learning_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_learning_insights_created_at ON ai_learning_insights(created_at DESC);

-- ============================================
-- 6. Chat Conversations Table
-- ============================================
CREATE TABLE IF NOT EXISTS chat_conversations (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  user_message TEXT NOT NULL,
  assistant_message TEXT NOT NULL,
  student_context_used JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_id ON chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_created_at ON chat_conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_time ON chat_conversations(user_id, created_at DESC);

-- ============================================
-- DONE!
-- ============================================
-- All tables created successfully!
-- Your system is ready to use.
