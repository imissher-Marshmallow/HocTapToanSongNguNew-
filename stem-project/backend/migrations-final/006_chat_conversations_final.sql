-- ============================================================================
-- Migration 006: Chat Conversations Table (Final)
-- Purpose: Store GPT-4 chatbot conversation history with student context
-- ============================================================================

-- Drop existing table if it exists (CAREFUL - only for development)
-- DROP TABLE IF EXISTS public.chat_conversations CASCADE;

-- ============================================================================
-- CREATE CHAT_CONVERSATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.chat_conversations (
  -- Primary key
  id BIGSERIAL PRIMARY KEY,
  
  -- User reference (INTEGER, not UUID - matches your user_id system)
  user_id INTEGER NOT NULL,
  
  -- Conversation content
  user_message TEXT NOT NULL,
  assistant_message TEXT NOT NULL,
  
  -- Context used for AI response 
  student_context_used JSONB,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for fetching conversations by user_id
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_id 
  ON public.chat_conversations(user_id);

-- Index for sorting by creation date
CREATE INDEX IF NOT EXISTS idx_chat_conversations_created_at 
  ON public.chat_conversations(created_at DESC);

-- Composite index for common queries (user + time)
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_created 
  ON public.chat_conversations(user_id, created_at DESC);

-- ============================================================================
-- SET TABLE PERMISSIONS (RLS - Row Level Security)
-- ============================================================================

-- Enable RLS
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own conversations
DROP POLICY IF EXISTS "Users can view own conversations" ON public.chat_conversations;
CREATE POLICY "Users can view own conversations"
  ON public.chat_conversations
  FOR SELECT
  USING (user_id = CAST(current_setting('request.jwt.claims', true)::json->>'sub' AS INTEGER) OR user_id::text = current_setting('request.jwt.claims', true)::json->>'user_id');

-- Policy: Users can only insert their own conversations
DROP POLICY IF EXISTS "Users can insert own conversations" ON public.chat_conversations;
CREATE POLICY "Users can insert own conversations"
  ON public.chat_conversations
  FOR INSERT
  WITH CHECK (user_id = CAST(current_setting('request.jwt.claims', true)::json->>'sub' AS INTEGER) OR user_id::text = current_setting('request.jwt.claims', true)::json->>'user_id');

-- Policy: Users can update their own conversations
DROP POLICY IF EXISTS "Users can update own conversations" ON public.chat_conversations;
CREATE POLICY "Users can update own conversations"
  ON public.chat_conversations
  FOR UPDATE
  USING (user_id = CAST(current_setting('request.jwt.claims', true)::json->>'sub' AS INTEGER) OR user_id::text = current_setting('request.jwt.claims', true)::json->>'user_id')
  WITH CHECK (user_id = CAST(current_setting('request.jwt.claims', true)::json->>'sub' AS INTEGER) OR user_id::text = current_setting('request.jwt.claims', true)::json->>'user_id');

-- Policy: Users can delete their own conversations
DROP POLICY IF EXISTS "Users can delete own conversations" ON public.chat_conversations;
CREATE POLICY "Users can delete own conversations"
  ON public.chat_conversations
  FOR DELETE
  USING (user_id = CAST(current_setting('request.jwt.claims', true)::json->>'sub' AS INTEGER) OR user_id::text = current_setting('request.jwt.claims', true)::json->>'user_id');

-- ============================================================================
-- VERIFICATION QUERIES (Run these to verify the setup)
-- ============================================================================

-- Check table exists:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chat_conversations';

-- Check columns:
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'chat_conversations';

-- Check indexes:
-- SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'chat_conversations';

-- Count rows:
-- SELECT COUNT(*) FROM public.chat_conversations;

-- ============================================================================
-- NOTES
-- ============================================================================
-- - user_id is INTEGER matching your application's 1,2,3... user system
-- - No foreign key to users table (your users table may have different structure)
-- - student_context_used stores JSONB with weak_areas, strong_areas, recent scores, etc.
-- - RLS policies ensure users can only see their own conversations
-- - Indexes created for common queries: fetch by user_id, order by time
-- - TIMESTAMP WITH TIME ZONE recommended for reliable date handling
