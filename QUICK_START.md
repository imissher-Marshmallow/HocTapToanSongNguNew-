# Quick Start Guide - AI Quiz Analysis System

## 🚀 Start All Services (3 terminals)

### Terminal 1: AI Engine
```powershell
cd c:\Users\ADMIN\Downloads\Resource2025\NewSTEM\HocTapToanSongNguNew-\ai_engine
.\venv\Scripts\Activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
Expected: `Uvicorn running on http://0.0.0.0:8000`

### Terminal 2: Backend
```powershell
cd c:\Users\ADMIN\Downloads\Resource2025\NewSTEM\HocTapToanSongNguNew-\stem-project\backend
npm install axios
$env:OPENAI_API_KEY = "sk-your-key-here"
npm run dev
```
Expected: `Server running on port 5000`

### Terminal 3: Frontend
```powershell
cd c:\Users\ADMIN\Downloads\Resource2025\NewSTEM\HocTapToanSongNguNew-\stem-project
npm install
npm start
```
Expected: Opens browser at http://localhost:3000

---

## ✅ What You Get

When a student submits a quiz, they receive:

### 1. **Score & Grade**
```
Score: 8/10 (80%)
Performance: Giỏi (Excellent)
```

### 2. **Weak Areas Analysis**
```
- Phương trình: 60% error rate (HIGH priority)
- Hình học: 25% error rate (MEDIUM priority)
```

### 3. **Learning Resource Links**
For each weak area:
- VietJack lesson: https://vietjack.com/toan-8/...
- Khan Academy video: https://www.khanacademy.org/math/...
- Practice exercises and mini-quizzes

### 4. **Motivational Feedback**
```
Opening: "✅ Tốt lắm! Bạn đã đạt yêu cầu học tập."

Body: "Bạn đã nắm được kiến thức cơ bản tốt. 
Chỉ cần luyện tập thêm một chút ở những chủ đề yếu, 
bạn sẽ đạt kết quả tuyệt vời!"

Closing: "Cứ tiếp tục nỗ lực, bạn sẽ tất yếu thành công! 💪"
```

### 5. **Learning Plan**
```
Day 1-2: Learn Phương trình (Equations)
  Resources: https://vietjack.com/.../phuong-trinh-bac-nhat-mot-an.jsp
  Duration: 1-2 hours/day

Day 3-4: Practice more with exercises
  Resources: https://vietjack.com/.../phuong-trinh-nang-cao.jsp
  Duration: 2-3 hours/day
```

---

## 📊 Performance Grades

| Score | Grade | Emoji | Label |
|-------|-------|-------|-------|
| 8-10 | Giỏi | 🌟 | Excellent |
| 6-7.99 | Đạt | ✅ | Satisfactory |
| 5-5.99 | Trung bình | 📚 | Average |
| <5 | Không đạt | 💡 | Not Passing |

---

## 🧪 Test the System

### Option 1: Run Integration Test
```powershell
cd stem-project\backend
node test_integration.js
```

### Option 2: Manual Test with PowerShell
```powershell
$payload = @{
  userId = 1
  quizId = 'test-1'
  answers = @(
    @{ questionId = 'q1'; selectedOption = 'A'; timeTakenSec = 10 },
    @{ questionId = 'q2'; selectedOption = 'B'; timeTakenSec = 15 }
  )
  questions = @(
    @{ id = 'q1'; question = 'Test Q1'; options = @('A','B','C'); answerIndex = 0; topic = 'Đa thức' },
    @{ id = 'q2'; question = 'Test Q2'; options = @('A','B','C'); answerIndex = 1; topic = 'Hình học' }
  )
}

$json = $payload | ConvertTo-Json -Depth 10
Invoke-RestMethod -Uri http://localhost:5000/api/results -Method Post -Body $json -ContentType 'application/json' | ConvertTo-Json -Depth 10
```

---

## 📝 Files Changed/Created

### New Files
- `backend/ai/webSearchResources.js` - Resource links + motivational feedback
- `backend/test_integration.js` - End-to-end test script
- `ai_engine/web_search_resources.py` - Python resource search module
- `AI_ENGINE_INTEGRATION.md` - Complete integration guide

### Modified Files
- `backend/ai/analyzer.js` - Added web search integration, motivational feedback
- `backend/routes/results.js` - Added axios, ai_engine fallback logic
- `backend/package.json` - Added axios dependency
- `ai_engine/main.py` - Added /analyze endpoint with full ML pipeline

---

## 🔍 Monitoring & Debugging

### Check AI Engine Health
```powershell
Invoke-RestMethod -Uri http://localhost:8000/health
# Response: {"status":"healthy","service":"AI Engine - Deep Learning With Love",...}
```

### Check Backend Health
```powershell
curl -s http://localhost:5000/health
# Should return server running status
```

### View Backend Logs
Look for:
- `ai_engine responded successfully` - AI Engine working
- `falling back to local analyzer` - AI Engine unavailable (OK)
- `Error generating summary` - LLM issue (non-critical, fallback used)

### View AI Engine Logs
Look for:
- `POST /analyze` - Endpoint called
- `ML: predict_weak_areas` - ML model running
- `save via SQLAlchemy` - Database persistence
- `Warning: failed to persist` - DB issue

---

## 🎯 Feature Checklist

- [x] Score calculation (0-10 scale)
- [x] Performance grading (Giỏi/Đạt/Trung bình/Không đạt)
- [x] Weak area detection (ML-based)
- [x] Learning resource links (VietJack, Khan Academy)
- [x] Motivational feedback (personalized)
- [x] Learning plan generation
- [x] Question-by-question feedback
- [x] Database persistence (SQLite/Supabase)
- [x] LLM integration (OpenAI)
- [x] AI Engine service (Python FastAPI)
- [x] Backend fallback logic
- [x] End-to-end testing

---

## 🐛 Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| Port 5000/8000 already in use | Kill existing process: `netstat -ano` then `taskkill /PID` |
| `axios not found` | Run `npm install axios` in backend |
| `no module named main` | Check ai_engine folder path in uvicorn command |
| Resource links all generic | Check question topics match CURATED_RESOURCES keys |
| No motivational feedback | Verify performanceLabel calculation (score >= 8 for Giỏi) |
| LLM 401 error | Verify OPENAI_API_KEY is set and valid |

---

## 📚 Next Steps for Users

1. **Sign up** at http://localhost:3000
2. **Take a quiz** (30-60 minutes)
3. **Submit answers** and wait 3-5 seconds
4. **View results** with:
   - Your score and grade
   - Weak areas identified
   - Study links for each weak area
   - Personalized learning plan
5. **Follow the plan** and retake quiz in 1-2 weeks
6. **Track progress** across multiple quizzes

---

## 📞 Support

- **Documentation**: See `AI_ENGINE_INTEGRATION.md` for full details
- **Tests**: Run `test_integration.js` to verify setup
- **Logs**: Check console output of each service
- **Issues**: Check GitHub issues or project documentation

---

**Last Updated**: November 11, 2025  
**Status**: ✅ Ready for Testing
