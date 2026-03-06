-- Migration: Create chat_conversations table for AI chatbot
-- Purpose: Store conversation history between students and GPT-4
-- Note: user_id is INTEGER (1, 2, 3...) matching your user system

CREATE TABLE IF NOT EXISTS chat_conversations (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  user_message TEXT NOT NULL,
  assistant_message TEXT NOT NULL,
  student_context_used JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster user lookups
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_id ON chat_conversations(user_id);

-- Create index for timestamp lookups
CREATE INDEX IF NOT EXISTS idx_chat_conversations_created_at ON chat_conversations(created_at);

-- Create composite index for user + time queries
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_time ON chat_conversations(user_id, created_at DESC);

-- OPTIONAL: Add comment explaining user_id type
COMMENT ON TABLE chat_conversations IS 'AI Chatbot conversation history. user_id is INTEGER matching the application user system (1, 2, 3...), not auth.users UUID';

-- Note: RLS policies require proper authentication setup
-- If using Supabase Auth with UUID users, create policies like:
-- ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can view own chat conversations"
--   ON chat_conversations FOR SELECT USING (user_id = auth.uid());
-- For now, relying on application-level access control via user_id parameter
