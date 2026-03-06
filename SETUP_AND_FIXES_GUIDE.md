# STEM Platform Database & Setup Fix Guide

## Fixed Issues

✅ **ChatBot userId error** - Fixed in AIChat.jsx  
✅ **Database column errors** - Removed explainability column, fixed answeredCount  
✅ **Topic tracking** - Now properly records "Attempted" status  
✅ **PerformanceAnalytics singleton** - Fixed double instantiation  

---

## Running the Application

### 1. Install Dependencies
```bash
cd stem-project
npm install
```

### 2. Set Environment Variables

Create `.env` file in `stem-project/` root:
```env
REACT_APP_API_BASE_URL=http://localhost:5000
REACT_APP_ENV=development
```

Create `.env` file in `stem-project/backend/`:
```env
PORT=5000
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_api_key
JWT_SECRET=your_jwt_secret_change_in_production
DATABASE_URL=your_postgres_url (optional)
```

### 3. Database Setup - CRITICAL STEP

#### Option A: Supabase Dashboard (Recommended)

1. Go to Supabase Dashboard → Your Project
2. Click **SQL Editor** (left sidebar)
3. Create a new query and paste: [006_chat_conversations_final.sql](./backend/migrations-final/006_chat_conversations_final.sql)
4. Click **Run**

#### Option B: Using Supabase CLI
```bash
cd stem-project/backend
supabase migration up
```

#### Option C: Using psql (if PostgreSQL installed locally)
```bash
psql -h your_host -U your_user -d your_db -f ./migrations-final/006_chat_conversations_final.sql
```

### 4. Verify Database Tables

Run these in Supabase SQL Editor:

```sql
-- Check chat_conversations table
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'chat_conversations';

-- Check columns
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'chat_conversations';

-- Verify indexes
SELECT indexname FROM pg_indexes 
WHERE schemaname = 'public' AND tablename = 'chat_conversations';
```

Expected output:
- Table exists: `chat_conversations`
- Columns: id (BIGSERIAL), user_id (INTEGER), user_message (TEXT), assistant_message (TEXT), student_context_used (JSONB), created_at (TIMESTAMP WITH TIME ZONE), updated_at (TIMESTAMP WITH TIME ZONE)
- Indexes: idx_chat_conversations_user_id, idx_chat_conversations_created_at, etc.

---

## Starting the Backend

```bash
cd stem-project/backend
node server.js
```

You should see:
```
✓ PostgreSQL connection established
✓ Supabase client initialized successfully
API running on http://localhost:5000
```

---

## Starting the Frontend

```bash
cd stem-project
npm start
```

The app will open on `http://localhost:3000`

---

## Testing the Fixes

### Test 1: ChatBot userId Error ✅
1. Login with a student account
2. Click the 🤖 robot icon (bottom right)
3. Send a message
4. **Expected**: Message sends successfully (no "Missing userId" error)

### Test 2: Topic Tracking ✅
1. Go to Topic Selector
2. Complete an adaptive quiz
3. Return to Topic Selector
4. **Expected**: Topic shows **"✅ Attempted Once"** or **"✅ Attempted Nx"** badge

### Test 3: Database Saving ✅
After completing a quiz, check logs:
- Should see: `✅ Saved to ml_performance_records`
- Should see: `✅ Saved to ai_feedback`
- Should see: `✅ Updated Bloom levels`

---

## Database Schema Summary

### chat_conversations (New)
```sql
- id: BIGSERIAL PRIMARY KEY
- user_id: INTEGER (your 1,2,3... system)
- user_message: TEXT
- assistant_message: TEXT
- student_context_used: JSONB (weak_areas, strong_areas, scores, etc.)
- created_at: TIMESTAMP WITH TIME ZONE
- updated_at: TIMESTAMP WITH TIME ZONE
```

### user_learning_profiles (Existing)
```sql
- topics_attempted: TEXT[] (tracks which topics user attempted)
- cognitive_levels: JSONB (level1-4 points)
- proficiency_status: JSONB (NOT_STARTED, STARTING, etc.)
- weak_areas: TEXT[] (topics to focus on)
- strong_areas: TEXT[] (topics mastered)
```

### ml_performance_records (Existing)
```sql
- topic: TEXT (matches chapter names exactly)
- percentage: NUMERIC (0-100)
- created_at: TIMESTAMP (for ordering attempts)
- All records with same topic+user_id = attempt history
```

### quiz_results (Existing)
```sql
- overall_score: NUMERIC
- correct_answers: INTEGER
- total_questions: INTEGER
- topic_performance: JSONB (topic scores)
- answer_details: JSONB (student answers)
```

---

## Common Issues & Solutions

### Issue: "Missing userId or message" in ChatBot
**Fixed in:** AIChat.jsx (~line 70)
- Now checks localStorage.getItem('userId') as fallback
- Validates userId exists before POST request
- Type-casts to integer: `parseInt(finalUserId)`

### Issue: "Column topic does not exist" 
**Status:** ✅ FIXED
- Changed line 326 in results.js to pass `topicName` from state
- Ensured `recordedTopic` is defined from `location.state.topic`

### Issue: "Column explainability does not exist"
**Fixed in:** results.js (~line 927)
- Removed explainability object from ai_feedback insert
- ai_feedback only stores: summary, recommended_level, suggested_topics, study_plan

### Issue: "answeredCount is not defined"
**Fixed in:** results.js (~line 660)
- Changed to use `answers.length` instead of undefined variable
- Properly calculates completion_rate

### Issue: "PerformanceAnalytics is not a constructor"
**Fixed in:** MLAnalyticsService.js (~line 17)
- Removed `new` keyword since PerformanceAnalytics is already a singleton
- Changed: `this.analyticsEngine = PerformanceAnalytics;`

### Issue: Topic selector shows "Not Attempted" after completing quiz
**Fixed in:**  
- TopicSelector.jsx: Now passes topic at multiple levels
- AdaptiveQuiz.jsx: Retrieves topic from location.state.quiz.topic
- results.js: Backend receives and stores topic correctly

---

## Deployment Checklist

Before deploying to production:

- [ ] Set all environment variables
- [ ] Run database migrations
- [ ] Verify all 4 required tables exist (user_learning_profiles, ai_feedback, ml_performance_records, chat_conversations)
- [ ] Test signup creates all 4 tables automatically
- [ ] Test quiz completion updates topics_attempted
- [ ] Test chatbot sends/receives messages (check browser console)
- [ ] Test topic tracker shows "Attempted" badges
- [ ] Check server logs for no red errors

---

## API Endpoints Summary

### Chat Endpoints
- `POST /api/chat/send-message` - Send message, get GPT-4 response
- `GET /api/chat/history/:userId` - Fetch conversation history
- `DELETE /api/chat/clear/:userId` - Clear chat for user

### Quiz Endpoints
- `POST /api/results` - Submit quiz, trigger AI analysis
- `POST /api/adaptive/quiz/by-topic` - Generate quiz for topic
- `GET /api/adaptive/topics` - Get all topics with user progress
- `GET /api/adaptive/quiz/smart-difficulty/:userId/:topic` - Get difficulty

### Auth Endpoints
- `POST /auth/signup` - Auto-creates all tables + 4 collections
- `POST /auth/login` - Login user
- `GET /auth/me` - Get current user

---

## Files Changed in This Fix

✅ stem-project/src/components/AIChat.jsx (userId fix)  
✅ stem-project/src/components/TopicSelector.jsx (topic passing)  
✅ stem-project/src/pages/AdaptiveQuiz.jsx (topic retrieval)  
✅ stem-project/backend/routes/results.js (database columns, answeredCount)  
✅ stem-project/backend/ai/MLAnalyticsService.js (PerformanceAnalytics singleton)  
✅ stem-project/backend/migrations-final/006_chat_conversations_final.sql (NEW)  

---

## Need Help?

Check these places for logs:
1. **Frontend Console**: Browser DevTools → Console tab (F12)
2. **Backend Console**: Terminal running `node server.js`
3. **Supabase Logs**: Supabase Dashboard → Logs → Server logs

Common error signatures to search:
- `[Chat]` - Chat-related errors (AIChat.jsx logs)
- `[Results]` - Quiz result saving errors (results.js logs)
- `[AdaptiveQuiz]` - Quiz component errors
- `[Adaptive]` - Adaptive learning errors (adaptive.js logs)

---

**Last Updated:** March 6, 2026  
**Version:** 1.0 (All Critical Fixes Applied)
