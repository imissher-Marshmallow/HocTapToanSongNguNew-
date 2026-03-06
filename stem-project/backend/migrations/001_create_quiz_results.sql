/**
 * Supabase Schema Migration
 * 
 * Run this SQL in your Supabase dashboard to create the quiz_results table
 * This enables intelligent quiz selection based on historical data
 */

-- Create quiz_results table
CREATE TABLE IF NOT EXISTS quiz_results (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  quiz_id TEXT NOT NULL DEFAULT 'personalized',
  topic TEXT,
  overall_score FLOAT NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  time_spent_seconds INTEGER NOT NULL DEFAULT 0,
  
  -- Topic performance (JSON)
  topic_performance JSONB DEFAULT '{}',
  
  -- Cognitive level breakdown (JSON)
  cognitive_breakdown JSONB DEFAULT '{}',
  
  -- Answer details for review (JSON array)
  answer_details JSONB DEFAULT '[]',
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_quiz_results_user_id ON quiz_results(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_created_at ON quiz_results(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_results_user_created ON quiz_results(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_results_topic ON quiz_results(topic);

-- Note: Not using Supabase RLS since user_id is INTEGER (application-managed)
-- Access control should be handled at application level via checking user_id parameter
