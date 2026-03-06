# AI Chatbot System Setup Guide

## Overview
The AI Chatbot system is now integrated into your STEM learning platform. It provides personalized tutoring using GPT-4, with full context from your Supabase student database.

## Features

### 🤖 AI Chatbot (`/api/chat`)
- **Backend**: OpenAI GPT-4 integration
- **Context**: Automatically fetches student learning profile, quiz history, weak/strong areas
- **Personalization**: Adjusts explanations based on Bloom's cognitive levels
- **Conversation Memory**: Maintains conversation history for context continuity

### 📚 What the Chatbot Can Do
1. Answer questions about mathematics topics
2. Explain concepts at appropriate cognitive levels
3. Suggest practice areas based on weak/strong areas
4. Provide study plan recommendations
5. Encourage student motivation
6. Track conversation history per student

## Installation & Configuration

### 1. Environment Variables

**Backend (.env file)**
```env
# OpenAI Configuration (REQUIRED for chatbot)
OPENAI_API_KEY=sk-your-openai-api-key-here

# Or use OpenAI API keys list (alternative)
OPENAI_API_KEYS=key1,key2,key3

# Database (should already be set)
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-key
```

#### How to Get OpenAI API Key:
1. Go to [OpenAI API Dashboard](https://platform.openai.com/account/api-keys)
2. Create a new API key
3. Copy the key and add to `.env` as `OPENAI_API_KEY`
4. Set usage limits to prevent unexpected charges

### 2. Database Setup

**Create the chat_conversations table:**

**Option A: Run migration (recommended)**
```bash
cd stem-project/backend
npm run migrate
```

**Option B: Manual SQL (in Supabase Dashboard)**

1. Go to Supabase Dashboard > SQL Editor
2. Create a new query and paste:
```sql
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
CREATE INDEX IF NOT EXISTS idx_chat_conversations_created_at ON chat_conversations(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_time ON chat_conversations(user_id, created_at DESC);
```

3. Click "Run" button
4. Table is ready!

**Note**: `user_id` is INTEGER (1, 2, 3... matching your user system), NOT UUID

### 3. Install Dependencies

**Backend:**
```bash
cd stem-project/backend
npm install  # openai library is already listed in package.json
```

**Frontend:**
```bash
cd stem-project
npm install  # All dependencies already in package.json
```

### 4. Start the System

**Backend:**
```bash
cd stem-project/backend
npm run dev
# Server runs on http://localhost:8000
```

**Frontend:**
```bash
cd stem-project
npm start
# App runs on http://localhost:3000
```

## API Endpoints

### POST `/api/chat/send-message`
**Send a message to the AI chatbot**

Request:
```json
{
  "userId": 123,
  "message": "Làm thế nào để giải phương trình bậc 2?",
  "conversationHistory": [
    {"role": "user", "content": "..."},
    {"role": "assistant", "content": "..."}
  ]
}
```

Response:
```json
{
  "success": true,
  "message": "Để giải phương trình bậc 2...",
  "studentContextUsed": {
    "topicsAttempted": ["Phương trình", "Đa thức"],
    "weakAreas": ["Hệ phương trình"],
    "strongAreas": ["Đa thức"],
    "recentScore": 7.5,
    "recommendedDifficulty": "normal"
  }
}
```

### GET `/api/chat/history/:userId`
**Fetch chat history for a student**

Response:
```json
{
  "userId": 123,
  "conversationCount": 5,
  "conversations": [
    {
      "id": 1,
      "user_message": "...",
      "assistant_message": "...",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### DELETE `/api/chat/clear/:userId`
**Clear all chat history for a user**

Response:
```json
{
  "success": true,
  "message": "Chat history cleared"
}
```

## Frontend Integration

### How It Works

1. **Floating Button** - 🤖 emoji button appears on every page
2. **Click to Open** - Opens chat interface when clicked
3. **Context Awareness** - Message includes student's learning data
4. **Conversation Memory** - Previous messages shown for context

### UIComponents

- **AIChat.jsx** - Main chat component with floating button
- **AIChat.css** - Responsive styling (works on mobile/desktop)

### Usage

The ChatBot is automatically integrated into your app. Students see:
1. Floating 🤖 button in bottom-right corner
2. Click to open chat panel
3. Type questions and get responses
4. Clear chat history when needed
5. See personalized learning context

## Student Learning Context

The chatbot automatically fetches and uses:

(**From user_learning_profiles**)
- Cognitive levels (Bloom's taxonomy stages)
- Weak areas to focus on
- Strong areas to build upon
- Topics attempted
- Proficiency status

(**From recent quizzes**)
- Last 5 quiz scores
- Topic performance
- Recent AI coaching feedback

(**From ml_performance_records**)
- Average score across all attempts
- Most practiced topics
- Performance trends

## System Prompt

The AI is instructed to:
- Be an expert Vietnamese mathematics tutor
- Adjust explanations to student's cognitive level
- Reference their specific weak/strong areas
- Give targeted recommendations
- Encourage and motivate
- Be conversational and supportive
- Guide toward mastery, not quick answers

## Cost Estimation

**OpenAI GPT-4 Turbo Pricing** (as of Jan 2024):
- Input: $0.01 / 1K tokens
- Output: $0.03 / 1K tokens

**Estimated cost per message:**
- Average message: 200 input tokens + 300 output tokens = $0.011
- $1 = ~90 conversations

**Cost management:**
1. Set API key usage limits in OpenAI dashboard
2. Monitor usage in OpenAI console
3. Consider GPT-3.5 Turbo for lower costs ($0.001/$0.002)

## Troubleshooting

### "AI service not available"
- Check `OPENAI_API_KEY` is set in `.env`
- Verify OpenAI account has API access
- Check API quota/billing in OpenAI dashboard

### "Too many requests"
- OpenAI rate limiting triggered
- Wait a moment and retry
- Check API key limits and upgrade if needed

### Chat history not persisting
- Ensure `chat_conversations` table was created
- Check Supabase RLS policies are configured
- Verify user_id matches authenticated user

### Chatbot doesn't recognize student context
- Verify student has completed at least one quiz
- Check if `user_learning_profiles` table has data for the user
- Make sure quiz results were saved properly

## Next Steps

1. ✅ Test the chatbot on a sample student account
2. ✅ Customize system prompt if needed (in chatbot.js)
3. ✅ Monitor OpenAI API costs
4. ✅ Gather student feedback and iterate
5. ✅ Consider UI improvements based on usage

## Advanced Configuration

### Customize Chatbot Personality

Edit `/backend/routes/chatbot.js`, line ~78 (systemPrompt):

```javascript
const systemPrompt = `You are an expert Vietnamese mathematics tutor...
// Add custom instructions here
`;
```

### Use Different OpenAI Models

Change the model in chatbot.js:
```javascript
model: 'gpt-4-turbo',  // Options: gpt-4, gpt-4-turbo, gpt-3.5-turbo
```

### Add Custom Context

Extend the `studentContext` section (line ~50) to include:
- Learning preferences
- Study time availability
- Achievement goals
- Preferred explanation styles

## Database Schema

**chat_conversations table:**
```sql
- id (BIGSERIAL PRIMARY KEY)
- user_id (INTEGER FOREIGN KEY)
- user_message (TEXT)
- assistant_message (TEXT)
- student_context_used (JSONB)
  - weak_areas: string[]
  - strong_areas: string[]
  - cognitive_levels: object
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

## Security Considerations

1. **RLS Enabled** - Students can only see their own conversations
2. **API Key Protection** - Never commit .env to git
3. **Context Privacy** - Student data not sent to external services (stays in conversation)
4. **Rate Limiting** - Implemented per-user
5. **Token Limits** - GPT-4 max tokens set to 1500

## Future Enhancements

1. **Multi-language support** - Extend beyond Vietnamese
2. **Voice chat** - Add speech-to-text input
3. **Document upload** - Allow students to upload materials for context
4. **Conversation analytics** - Track common questions and pain points
5. **Offline mode** - Cache responses for offline access
6. **Custom training** - Fine-tune on math curriculum
7. **Peer comparison** - Show common struggles across cohort

---

**Support**: For issues, check the chatbot route logs at `/stem-project/backend/server.js` line 130+
