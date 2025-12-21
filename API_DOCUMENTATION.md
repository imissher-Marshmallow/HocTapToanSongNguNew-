# Quiz Backend API Documentation

## Overview
This document describes the backend APIs for quiz submission and history tracking.

## Endpoints

### 1. Submit Quiz Results
**Endpoint:** `POST /api/submit-quiz`

Saves quiz submission results to the database.

**Request Body:**
```json
{
  "userId": 123,
  "quizId": 1,
  "answers": [
    {
      "questionId": "q1",
      "selectedAnswer": "Option A",
      "isCorrect": true,
      "topic": "Algebra",
      "timeTaken": 45
    }
  ],
  "score": 8.5,
  "timeTaken": 900,
  "timeLimit": 1800
}
```

**Response:**
```json
{
  "success": true,
  "resultId": 456,
  "message": "Quiz submitted successfully",
  "data": {
    "score": 8.5,
    "totalScore": 10,
    "correctAnswers": 17,
    "totalQuestions": 20,
    "accuracy": "85.00",
    "timeTaken": 900,
    "timeLimit": 1800,
    "weakAreas": ["Geometry", "Trigonometry"]
  }
}
```

### 2. Get User Quiz History
**Endpoint:** `GET /api/user-history?userId=123`

Fetches all quiz attempts for a user.

**Query Parameters:**
- `userId` (required): The user ID
- `type` (optional): Set to "weakness" to get weakness data instead

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 456,
      "quizName": "Math Quiz",
      "score": 8.5,
      "totalScore": 10,
      "timeTaken": 900,
      "date": "2025-11-15T14:30:00Z",
      "status": "passed",
      "correctAnswers": 17,
      "totalQuestions": 20,
      "accuracy": 85,
      "weakAreas": ["Geometry"]
    }
  ]
}
```

### 3. Get User Weakness Areas
**Endpoint:** `GET /api/user-history?userId=123&type=weakness`

Fetches aggregated weakness areas from all quiz attempts.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "topic": "Geometry",
      "frequency": 3
    },
    {
      "topic": "Trigonometry",
      "frequency": 2
    }
  ]
}
```

## Database Schema

### Results Table
Stores quiz attempt results with the following structure:

```
results {
  id: INTEGER PRIMARY KEY
  user_id: INTEGER (FK to users)
  quiz_id: TEXT
  score: INTEGER (0-10 scale)
  total_questions: INTEGER
  answers: JSONB [{questionId, selectedAnswer, isCorrect, topic, timeTaken}]
  weak_areas: JSONB [string]
  feedback: JSONB {correctAnswers, accuracy, ...}
  recommendations: JSONB [string]
  ai_analysis: JSONB
  created_at: TIMESTAMP
}
```

## Score Scale
- All scores are stored and returned on a **0-10 scale**
- Previously used 0-100 scale has been replaced
- History page displays scores as "X/10"
- Charts and analytics should use the 0-10 scale

## Implementation Notes

1. **Database Integration:**
   - Uses Supabase PostgreSQL in production
   - Falls back to SQLite for local development
   - Automatic schema creation on first run

2. **Score Conversion:**
   - Quiz analyzer calculates: `score = (correct / total) * 10`
   - All database queries return scores already in /10 scale
   - Frontend should display as "8.5/10" format

3. **Chat Feature:**
   - Chat is implemented in Study Mode (`/study-mode`)
   - Uses Framer Motion for animations
   - Supports multi-language (Vietnamese/English)
   - AI responses are generated with random helpful messages

4. **Frontend Integration:**
   - History page fetches from `/api/user-history?userId=X`
   - Displays attempts with /10 scale scores
   - Shows accuracy percentage, time taken, weak areas
   - Falls back to mock data if API fails

## Testing

To test locally:

```bash
# 1. Set environment variables
export DATABASE_URL="your-supabase-connection-string"
export OPENAI_API_KEY="your-openai-key"

# 2. Start backend
npm start

# 3. Make API request
curl -X POST http://localhost:5000/api/submit-quiz \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "quizId": 1,
    "answers": [...],
    "score": 8,
    "timeTaken": 900,
    "timeLimit": 1800
  }'
```

## Frontend Components Updated

### History.jsx
- Fetches real data from `/api/user-history`
- Converts timestamps correctly
- Displays /10 scale scores
- Shows accuracy percentage

### Study.jsx
- Has built-in AI Chat tab
- Supports timer, tasks, resources, notes
- Multi-language support

### QuizPage.jsx
- Modified to save scores via `analyzeQuiz` endpoint
- Scores saved directly to database as /10 scale
- User quiz attempts tracked automatically

## Next Steps

1. **Analytics Dashboard:**
   - Add recharts visualization
   - Display score trends over time
   - Show performance by topic

2. **Learning Home:**
   - Display real weakness data from database
   - Show motivational messages based on performance
   - Create adaptive learning paths

3. **Resources Page:**
   - Already redesigned with modern UI
   - Can add topic-specific resources

## Error Handling

All endpoints return error responses with appropriate HTTP status codes:
- 400: Missing required parameters
- 405: Method not allowed
- 500: Server/database error

Errors include a `success: false` flag and error message for debugging.
