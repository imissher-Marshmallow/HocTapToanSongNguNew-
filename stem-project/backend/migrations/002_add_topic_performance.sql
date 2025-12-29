-- Add topic_performance tracking to user_learning_profiles
-- This stores per-topic skill levels after each adaptive quiz

ALTER TABLE user_learning_profiles 
ADD COLUMN IF NOT EXISTS topic_performance JSONB DEFAULT '{}';

-- topic_performance structure:
-- {
--   "topic_name": {
--     "skill_level": 0-4 (1=remember, 2=understand, 3=apply, 4=analyze),
--     "accuracy": 0-100,
--     "questions_total": N,
--     "questions_correct": N,
--     "last_updated": ISO timestamp
--   },
--   ...
-- }

ALTER TABLE user_learning_profiles 
ADD COLUMN IF NOT EXISTS topics_attempted JSONB DEFAULT '[]';

-- topics_attempted tracks the order and count of topics tested
-- Used to determine when user has completed 5 topics for first time

ALTER TABLE user_learning_profiles 
ADD COLUMN IF NOT EXISTS first_quiz_completed BOOLEAN DEFAULT FALSE;

-- first_quiz_completed: Set to TRUE after user completes first adaptive quiz
-- This triggers the AI insights generation in learning profile
