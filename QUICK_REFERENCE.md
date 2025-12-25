# Quick Reference - STEM Quiz Platform

## 🚀 Quick Start

### Local Development
```bash
# Terminal 1: Backend
cd stem-project/backend
npm start

# Terminal 2: Frontend
cd stem-project
npm start
```

### Server Runs On
- Backend: `http://localhost:3000`
- Frontend: `http://localhost:3000` (via npm)

---

## API Quick Reference

### Submit Quiz (Core Endpoint)
```bash
curl -X POST http://localhost:3000/api/results \
  -H "Content-Type: application/json" \
  -d '{
    "userId": null,
    "quizId": "biology-101",
    "answers": [0, 1, 2, 0, 1],
    "questions": [
      {"id": "q1", "correctAnswer": 0, "options": ["A", "B", "C", "D"]},
      ...
    ],
    "timeTaken": 120
  }'
```

**Response**: 
```json
{
  "resultId": 12,
  "score": 0,
  "totalQuestions": 10,
  "summary": {
    "overall": "Bạn đạt 0/10 (Không đạt)...",
    "strengths": [...],
    "weaknesses": [],
    "plan": [...]
  }
}
```

### Get Quiz History
```bash
curl http://localhost:3000/api/history/user/1
```

### Generate Adaptive Quiz
```bash
curl -X POST http://localhost:3000/api/adaptive/generate \
  -H "Content-Type: application/json" \
  -d '{"userId": 1, "preferredDifficulty": "intermediate"}'
```

---

## Database Info

### Guest User
- **ID**: 1
- **Purpose**: Anonymous quiz submissions
- **Email**: minhnamlankhue@gmail.com
- **Username**: Nguyễn Tuấn Minh

### Database Files
- **Local**: `data/quiz.db` (SQLite)
- **Cloud**: PostgreSQL (via DATABASE_URL)

### Tables
- `users` - User accounts
- `results` - Quiz results
- `learning_plans` - 3-day study plans

---

## Environment Variables

```env
# Required
PORT=3000

# Optional but Recommended
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=eyJ...

# Production Only
DATABASE_URL=postgres://...
JWT_SECRET=your-secret
```

---

## Key Features

✅ Anonymous quiz submission (uses guest id=1)  
✅ AI analysis in Vietnamese  
✅ Weak area detection  
✅ 3-day learning plans  
✅ Supabase recommendations  
✅ Adaptive quiz generation  
✅ Quiz history tracking  

---

## Common Tasks

### Add New Quiz
1. Add questions to `data/questions_updated.json`
2. Implement fetch in `/api/questions/new-quiz-id`
3. Test via GET `/api/questions/new-quiz-id`

### Test Anonymous Submission
```bash
curl -X POST http://localhost:3000/api/results \
  -H "Content-Type: application/json" \
  -d '{"userId": null, ...}'  # Will use guest user (id=1)
```

### Check Server Logs
Watch the terminal where `npm start` is running - all requests logged

### Debug Database
```bash
sqlite3 data/quiz.db "SELECT * FROM results LIMIT 5;"
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Port 3000 in use | Kill process: `Get-Process node \| Stop-Process` |
| Quiz not saving | Check server logs, verify user_id is numeric |
| AI analysis slow | OpenAI API might be slow, check API key |
| Supabase not saving | Check credentials in .env, verify network |
| Frontend not loading | Check CORS in backend, verify frontend URL in allowedOrigins |

---

## Testing

### Quick Test
```bash
node test-e2e.js
```

### Verify Complete Flow
```bash
node verify-complete-flow.js
```

---

## Files Structure

```
stem-project/
├── backend/
│   ├── server.js              # Main server
│   ├── initialize-guest.js    # Guest user setup
│   ├── routes/
│   │   ├── quiz.js            # Question endpoints
│   │   ├── results.js         # Quiz submission (MODIFIED)
│   │   ├── adaptive.js        # Personalized quizzes
│   │   └── history.js         # Quiz history
│   ├── ai/
│   │   ├── analyzer.js        # AI analysis
│   │   └── MLAnalyticsService.js
│   ├── data/
│   │   ├── quiz.db            # SQLite database
│   │   └── questions.json
│   └── database.js            # DB connection
│
├── src/
│   ├── pages/
│   │   ├── QuizPage.jsx       # Quiz interface
│   │   ├── ResultPage.jsx     # Results display
│   │   └── QuizList.jsx       # Quiz selection
│   ├── components/
│   │   └── AICoach.jsx        # AI feedback display
│   └── contexts/
│       └── AuthContext.js     # User context
│
├── DEPLOYMENT.md      # Deployment guide
├── SYSTEM_STATUS.md   # Current status
└── SESSION_COMPLETE.md # This session summary
```

---

## Production Deployment

### Vercel
1. Set environment variables in Vercel dashboard
2. Connect GitHub repository
3. Deploy: `vercel --prod`

### Environment Variables Needed
```
DATABASE_URL
SUPABASE_URL
SUPABASE_ANON_KEY
OPENAI_API_KEY
JWT_SECRET
```

---

## Support

**For issues**:
1. Check server logs
2. Review SYSTEM_STATUS.md
3. Verify environment variables
4. Check database with: `sqlite3 data/quiz.db ".tables"`

**Current Status**: ✅ All systems operational

