/**
 * Supabase Schema Migration
 * 
 * Run this SQL in your Supabase dashboard to create the quiz_results table
 * This enables intelligent quiz selection based on historical data
 */

-- Create quiz_results table
CREATE TABLE IF NOT EXISTS quiz_results (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  quiz_id TEXT NOT NULL DEFAULT 'personalized',
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

-- Enable RLS (Row Level Security)
ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;

-- Create RLS policy: Users can only see their own results
CREATE POLICY "Users can view their own quiz results" ON quiz_results
  FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own quiz results" ON quiz_results
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- Grant permissions
GRANT SELECT, INSERT ON quiz_results TO authenticated;
GRANT SELECT ON quiz_results TO anon;

-- Optional: Create a view for analytics
CREATE OR REPLACE VIEW quiz_results_stats AS
SELECT
  user_id,
  COUNT(*) as total_quizzes,
  ROUND(AVG(overall_score)::numeric, 2) as avg_score,
  MAX(overall_score) as best_score,
  MAX(created_at) as last_quiz_date,
  JSONB_OBJECT_AGG(
    COALESCE((topic_performance::jsonb)->>'topic', 'Unknown'),
    (topic_performance::jsonb)
  ) as topic_stats
FROM quiz_results
GROUP BY user_id;

GRANT SELECT ON quiz_results_stats TO authenticated;
GRANT SELECT ON quiz_results_stats TO anon;
