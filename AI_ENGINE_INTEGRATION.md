# AI-Powered Quiz Analysis System - Integration Guide

## Overview

This system provides intelligent analysis of student quiz submissions using:
- **Frontend**: React-based quiz interface with authentication
- **Backend**: Express.js server with multiple analysis options
- **AI Engine**: Python FastAPI service with ML-powered weak area detection
- **Database**: SQLite (local) or Supabase (cloud)
- **AI Feedback**: OpenAI GPT-4o-mini for natural language summaries
- **Resources**: Curated learning links from VietJack, Khan Academy, etc.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   React Frontend (port 3000)                │
│         (Quiz UI, Auth, Results Display)                    │
└────────────────────┬────────────────────────────────────────┘
                     │ POST /api/results
                     │
┌────────────────────▼────────────────────────────────────────┐
│              Express Backend (port 5000)                    │
│  ┌─ routes/results.js                                       │
│  │  - Score calculation                                     │
│  │  - Call ai_engine (with fallback to local analyzer)     │
│  │  - Save to SQLite DB                                     │
│  └─ ai/analyzer.js (fallback)                              │
│     - Local scoring and analysis                            │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP POST (optional)
                     │
        ┌────────────▼─────────────┐
        │ AI Engine (port 8000)    │
        │ FastAPI (Python)         │
        │ ┌───────────────────────┐│
        │ │ /analyze endpoint     ││
        │ │ - ML prediction       ││
        │ │ - Resource search     ││
        │ │ - Motivational text   ││
        │ │ - Save to DB          ││
        │ └───────────────────────┘│
        └────────────────────┬──────┘
                             │
                    ┌────────▼────────┐
                    │   Supabase DB   │
                    │   or SQLite      │
                    └─────────────────┘
```

## Key Features

### 1. **Performance-Based Grading**
- **8-10**: Giỏi (Excellent) 🌟
- **6-7.99**: Đạt (Satisfactory) ✅
- **5-5.99**: Trung bình (Average) 📚
- **<5**: Không đạt (Not Passing) 💡

### 2. **Weak Area Detection (ML)**
Uses scikit-learn RandomForest to identify:
- Topics with >50% error rate (high severity)
- Topics with 25-50% error rate (medium severity)
- Topics with <25% error rate (low severity)

### 3. **Learning Resource Links**
Provides curated links for each weak area:
- **VietJack**: https://vietjack.com/ (Vietnamese)
- **Khan Academy**: https://www.khanacademy.org/ (English)
- Specific lesson URLs based on topic

### 4. **Motivational Feedback**
Personalized messages based on performance:
- Opens with emoji and encouragement
- Highlights specific weak areas
- Provides actionable study plan
- Closes with inspirational message

### 5. **Question-by-Question Feedback**
For each wrong answer:
- Reason for incorrect answer
- Suggestions for improvement
- Steps to correct approach
- Links to supporting materials

## Setup Instructions

### Prerequisites
- Node.js 14+ with npm
- Python 3.8+ with pip
- OpenAI API key (optional, for LLM-enhanced feedback)
- Supabase account (optional, for cloud DB)

### 1. Backend Setup

```bash
cd stem-project/backend
npm install
# Create .env file with:
# OPENAI_API_KEY=sk-...
# JWT_SECRET=your-secret-key
# AI_ENGINE_URL=http://localhost:8000/analyze (optional)
npm run dev
```

### 2. AI Engine Setup

```bash
cd ai_engine
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create .env file with:
# DATABASE_URL=sqlite:///./quiz.db
# Or for Supabase: postgresql://user:pass@host/db
# SUPABASE_URL=https://your-project.supabase.co
# SUPABASE_KEY=your-anon-key
# OPENAI_API_KEY=sk-...

uvicorn main:app --reload --port 8000
```

### 3. Frontend Setup

```bash
cd stem-project
npm install
npm start  # Runs at http://localhost:3000
```

## API Endpoints

### Backend Results Endpoint

**POST** `/api/results`

Request body:
```json
{
  "userId": 1,
  "quizId": "math-101",
  "answers": [
    {
      "questionId": "q1",
      "selectedOption": "A",
      "timeTakenSec": 15
    }
  ],
  "questions": [
    {
      "id": "q1",
      "question": "2 + 2 = ?",
      "options": ["3", "4", "5", "6"],
      "answerIndex": 1,
      "topic": "Toán cơ bản",
      "explanation": "2 + 2 = 4"
    }
  ]
}
```

Response body:
```json
{
  "resultId": 123,
  "score": 8,
  "totalQuestions": 10,
  "percentage": 80,
  "performanceLabel": "Giỏi",
  "answerComparison": [
    {
      "questionId": "q1",
      "question": "2 + 2 = ?",
      "userAnswer": "4",
      "correctAnswer": "4",
      "isCorrect": true,
      "explanation": "2 + 2 = 4"
    }
  ],
  "weakAreas": [
    {
      "topic": "Phương trình",
      "severity": "high",
      "percentage": 60,
      "correct": 2,
      "total": 5,
      "wrong": 3
    }
  ],
  "recommendations": [
    {
      "topic": "Phương trình",
      "nextQuestions": ["q15", "q16", "q17", "q18", "q19"]
    }
  ],
  "summary": {
    "overall": "Bạn đạt 8/10 (Giỏi). Điểm yếu chính: Phương trình (60%)...",
    "strengths": [
      "Đa thức: Đúng 5/5 (100%). Tiếp tục phát huy."
    ],
    "weaknesses": [
      "Phương trình: Sai 3/5 (60%). Cần thêm luyện tập."
    ],
    "plan": [
      "Ngày 1-2: Ôn Phương trình - Tài liệu: https://vietjack.com/toan-8/phuong-trinh-bac-nhat-mot-an.jsp - Thời lượng: 1-2 giờ/ngày"
    ]
  },
  "motivationalFeedback": {
    "opening": "✅ Tốt lắm! Bạn đã đạt yêu cầu học tập.",
    "body": "Bạn đã nắm được kiến thức cơ bản tốt...",
    "closing": "Cứ tiếp tục nỗ lực, bạn sẽ tất yếu thành công! 💪",
    "overall_message": "..."
  }
}
```

### AI Engine Analyze Endpoint

**POST** `/analyze`

Same request/response format as backend, but runs full ML pipeline and resource search.

## Testing

### Run Integration Test

```bash
cd stem-project/backend
node test_integration.js
```

This will:
1. Send a sample quiz to AI Engine (if running)
2. Send the same quiz to Backend
3. Display detailed results including:
   - Score and performance label
   - Identified weak areas
   - Resource links
   - Motivational messages

### Manual API Test (PowerShell)

```powershell
$payload = @{
  userId = 1
  quizId = 'test'
  answers = @(@{ questionId = 'q1'; selectedOption = 'A'; timeTakenSec = 10 })
  questions = @(@{ id = 'q1'; question = 'Test?'; options = @('A','B'); answerIndex = 0; topic = 'General' })
}

Invoke-RestMethod -Uri http://localhost:5000/api/results -Method Post `
  -Body ($payload | ConvertTo-Json -Depth 10) `
  -ContentType 'application/json'
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  email VARCHAR UNIQUE,
  username VARCHAR UNIQUE,
  hashed_password VARCHAR,
  full_name VARCHAR,
  created_at DATETIME,
  is_active BOOLEAN
);
```

### Quiz Sessions Table
```sql
CREATE TABLE quiz_sessions (
  id INTEGER PRIMARY KEY,
  user_id INTEGER FOREIGN KEY,
  quiz_id VARCHAR,
  start_time DATETIME,
  end_time DATETIME,
  score FLOAT,
  total_questions INTEGER,
  correct_answers INTEGER,
  time_per_question JSON,
  answers JSON,
  performance_metrics JSON,
  created_at DATETIME
);
```

### Results Table
```sql
CREATE TABLE results (
  id INTEGER PRIMARY KEY,
  user_id VARCHAR,
  quiz_id VARCHAR,
  score FLOAT,
  total_questions INTEGER,
  weak_areas JSON,
  feedback JSON,
  recommendations JSON,
  ai_analysis JSON,
  created_at DATETIME
);
```

## Environment Variables

### Backend (.env)
```
PORT=5000
JWT_SECRET=your-secret-key-change-in-prod
OPENAI_API_KEY=sk-...
AI_ENGINE_URL=http://localhost:8000/analyze
DATABASE_URL=sqlite:///./data/quiz.db
```

### AI Engine (.env)
```
DATABASE_URL=sqlite:///./quiz.db
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
OPENAI_API_KEY=sk-...
```

### Frontend (.env)
```
REACT_APP_API_BASE_URL=http://localhost:5000
```

## Troubleshooting

### Issue: "AI Engine not responding"
- Verify uvicorn is running on port 8000: `python -m uvicorn main:app --port 8000`
- Check firewall allows localhost:8000
- Backend will automatically fall back to local analyzer

### Issue: "No resource links showing"
- Verify web_search_resources.py is in ai_engine folder
- Check that topics in questions match curated resource keys
- Add missing topics to CURATED_RESOURCES dict

### Issue: "Motivational feedback missing"
- Verify generateMotivationalFeedback function is called
- Check performanceLabel is correctly calculated (8+, 6-7.99, 5-5.99, <5)
- Ensure webSearchResources.js is imported in analyzer.js

### Issue: "Can't connect to Supabase"
- Verify SUPABASE_URL and SUPABASE_KEY are correct
- Install supabase client: `pip install supabase`
- Check database tables exist in Supabase dashboard

## Performance Benchmarks

- Quiz submission to response: ~1-3 seconds (local analyzer)
- With AI Engine + web search: ~3-5 seconds
- With LLM feedback generation: +2-5 seconds
- Database save: <500ms

## Future Enhancements

- [ ] Adaptive difficulty based on weak areas
- [ ] Real-time websocket updates during analysis
- [ ] Integration with more resource providers
- [ ] Multi-language support (Chinese, Spanish, French)
- [ ] Progress tracking across multiple quizzes
- [ ] Leaderboards and peer comparison
- [ ] Video explanation generation
- [ ] Mobile app version

## Support

For issues or questions:
1. Check logs in backend/ai_engine console output
2. Review error responses in browser DevTools
3. Test individual endpoints with test_integration.js
4. Check GitHub issues or project documentation

---

**Version**: 1.0.0  
**Last Updated**: November 11, 2025  
**Maintained by**: Deep Learning With Love Team
