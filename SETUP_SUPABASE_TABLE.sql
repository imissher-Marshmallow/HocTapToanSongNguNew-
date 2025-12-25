-- Create user_learning_profiles table in Supabase
-- Run this SQL in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS user_learning_profiles (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE,
  cognitive_levels JSONB DEFAULT '{"level1": 0, "level2": 0, "level3": 0, "level4": 0}'::jsonb,
  proficiency_status JSONB DEFAULT '{"level1": "NOT_STARTED", "level2": "NOT_STARTED", "level3": "NOT_STARTED", "level4": "NOT_STARTED"}'::jsonb,
  weak_areas TEXT[] DEFAULT ARRAY[]::text[],
  strong_areas TEXT[] DEFAULT ARRAY[]::text[],
  recommendations TEXT[] DEFAULT ARRAY[]::text[],
  learning_path JSONB,
  quizzes_taken INTEGER DEFAULT 0,
  last_quiz_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  last_updated TIMESTAMP DEFAULT NOW(),
  CONSTRAINT user_id_positive CHECK (user_id > 0)
);

-- Create index for faster queries
CREATE INDEX idx_user_learning_profiles_user_id ON user_learning_profiles(user_id);

-- Create trigger to auto-update last_updated timestamp
CREATE OR REPLACE FUNCTION update_last_updated()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_last_updated
BEFORE UPDATE ON user_learning_profiles
FOR EACH ROW
EXECUTE FUNCTION update_last_updated();

-- Insert guest user profile (user_id = 1)
INSERT INTO user_learning_profiles (user_id, cognitive_levels, proficiency_status, quizzes_taken)
VALUES (
  1,
  '{"level1": 0, "level2": 0, "level3": 0, "level4": 0}'::jsonb,
  '{"level1": "NOT_STARTED", "level2": "NOT_STARTED", "level3": "NOT_STARTED", "level4": "NOT_STARTED"}'::jsonb,
  0
)
ON CONFLICT (user_id) DO NOTHING;

-- Grant permissions (if using RLS)
-- For development, you can disable RLS
-- ALTER TABLE user_learning_profiles DISABLE ROW LEVEL SECURITY;

-- Or set RLS policies
-- CREATE POLICY "Users can view their own profile"
--   ON user_learning_profiles FOR SELECT
--   USING (true);  -- Allow all for development

-- CREATE POLICY "Users can update their own profile"
--   ON user_learning_profiles FOR UPDATE
--   USING (true);  -- Allow all for development

-- CREATE POLICY "Admins can insert profiles"
--   ON user_learning_profiles FOR INSERT
--   WITH CHECK (true);  -- Allow all for development
