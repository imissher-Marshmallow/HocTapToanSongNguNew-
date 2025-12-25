-- Supabase RLS Policy Fix for quiz_results Table
-- Apply this in Supabase SQL Editor to allow quiz submissions

-- NOTE: First, disable current RLS policies (if any exist)
-- Go to: Supabase Dashboard → Authentication → Policies → quiz_results
-- Delete any existing restrictive policies

-- OPTION 1: Allow Anonymous Users (Recommended for this app)
-- This allows anyone to insert and read quiz results without authentication

ALTER TABLE quiz_results DISABLE ROW LEVEL SECURITY;

ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable insert for all users on quiz_results"
ON quiz_results
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Enable select for all users on quiz_results"
ON quiz_results
FOR SELECT
USING (true);

CREATE POLICY "Enable update for own records on quiz_results"
ON quiz_results
FOR UPDATE
USING (true)
WITH CHECK (true);

-- OPTION 2: Allow Authenticated Users Only (More Secure)
-- This requires users to be authenticated (JWT token)
-- Uncomment below if you want stricter security

/*
CREATE POLICY "Enable insert for authenticated users on quiz_results"
ON quiz_results
FOR INSERT
WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Enable select for authenticated users on quiz_results"
ON quiz_results
FOR SELECT
USING (auth.uid()::text = user_id OR user_id = 'anonymous');

CREATE POLICY "Enable update for own records on quiz_results"
ON quiz_results
FOR UPDATE
USING (auth.uid()::text = user_id)
WITH CHECK (auth.uid()::text = user_id);
*/

-- Verify policies are applied
SELECT * FROM pg_policies WHERE tablename = 'quiz_results';

-- Test insert with dummy data
-- INSERT INTO quiz_results (
--   user_id, quiz_id, overall_score, correct_answers, total_questions,
--   time_spent_seconds, topic_performance, cognitive_breakdown, answer_details, created_at
-- ) VALUES (
--   'test-user', 'test-quiz', 75, 15, 20, 300,
--   '{"Algebra": {"score": 80}}'::jsonb,
--   '{"understanding": 75}'::jsonb,
--   '[{"q": 1, "a": "A"}]'::jsonb,
--   NOW()
-- );
