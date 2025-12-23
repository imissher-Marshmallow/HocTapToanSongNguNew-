# Database Setup for Enhanced Quiz Analysis

## Supabase SQL Script

Run this SQL in your Supabase SQL Editor to create the `quiz_attempts` table for storing detailed quiz submission data, feedback, and analysis results.

### Create quiz_attempts Table

```sql
-- Create quiz_attempts table to store all quiz submission details
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  quiz_id TEXT NOT NULL,
  
  -- Basic quiz info
  overall_score FLOAT NOT NULL,
  correct_answers INT NOT NULL,
  total_questions INT NOT NULL,
  time_spent_seconds INT,
  
  -- Question-level details
  answers JSONB NOT NULL,  -- Array of { questionId, answer, correct, topicName, difficulty, explanation }
  
  -- Cognitive level analysis
  cognitive_analysis JSONB NOT NULL,  -- { levels: [...] } with scores and statuses
  
  -- Topic-by-topic analysis
  topic_analysis JSONB,  -- Array of { topic, percentage, performance, correct, total, feedback }
  
  -- Detailed feedback
  overall_feedback TEXT,
  topic_feedback JSONB,  -- { [topicName]: { strengths, weaknesses, improvements, resources } }
  
  -- Learning profile changes
  cognitive_levels JSONB,
  proficiency_status JSONB,
  weak_areas TEXT[] DEFAULT '{}',
  strong_areas TEXT[] DEFAULT '{}',
  recommendations TEXT[] DEFAULT '{}',
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Indexes for fast queries
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_created_at ON quiz_attempts(created_at);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_quiz ON quiz_attempts(user_id, quiz_id);

-- Enable RLS (Row Level Security)
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own quiz attempts
CREATE POLICY "Users can view their own quiz attempts"
ON quiz_attempts FOR SELECT
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own quiz attempts"
ON quiz_attempts FOR INSERT
WITH CHECK (auth.uid()::text = user_id);
```

### Steps to Set Up

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the entire SQL script above
5. Click **Run**
6. Verify that the table is created by checking the **Tables** section in the sidebar

### Table Structure Explanation

#### Main Fields:
- **user_id**: Links to authenticated user
- **quiz_id**: Type of quiz taken (personalized, contest1, etc.)
- **overall_score**: Calculated overall performance percentage
- **correct_answers**: Number of questions answered correctly
- **total_questions**: Total questions in the quiz
- **time_spent_seconds**: How long the student spent on the quiz

#### Analysis Fields:
- **cognitive_analysis**: Stores cognitive level breakdown (Knowledge, Comprehension, Application, Analysis)
- **topic_analysis**: Per-topic performance metrics
- **topic_feedback**: Detailed feedback for each topic with strengths, weaknesses, improvements, and resource suggestions
- **overall_feedback**: Motivational feedback message

#### Learning Profile:
- **cognitive_levels**: Student's cognitive level scores (level1-4)
- **proficiency_status**: Student's proficiency status for each level
- **weak_areas**: Topics where student needs improvement
- **strong_areas**: Topics where student excels
- **recommendations**: Personalized learning recommendations

### Accessing the Data

After students complete quizzes, you can query the data:

```sql
-- View all quiz attempts for a user
SELECT * FROM quiz_attempts 
WHERE user_id = 'user-id-here' 
ORDER BY created_at DESC;

-- Get latest quiz attempt
SELECT * FROM quiz_attempts 
WHERE user_id = 'user-id-here' 
ORDER BY created_at DESC 
LIMIT 1;

-- View topic feedback for latest quiz
SELECT user_id, quiz_id, topic_feedback, created_at
FROM quiz_attempts 
WHERE user_id = 'user-id-here' 
ORDER BY created_at DESC 
LIMIT 1;

-- Aggregate performance across all quizzes
SELECT 
  user_id,
  COUNT(*) as total_quizzes,
  AVG(overall_score) as average_score,
  MAX(overall_score) as best_score,
  MIN(overall_score) as lowest_score,
  SUM(time_spent_seconds) as total_time
FROM quiz_attempts
GROUP BY user_id;
```

### Note on Existing user_learning_profiles

The existing `user_learning_profiles` table still stores the latest profile state. The `quiz_attempts` table stores historical data for each quiz submission, allowing you to:

- See detailed feedback for each quiz
- Track progress over time
- View answer history and explanations
- Generate reports on learning patterns

Both tables work together:
- **user_learning_profiles**: Latest profile summary
- **quiz_attempts**: Detailed quiz-by-quiz history
