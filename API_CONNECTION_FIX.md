# 🔧 API Connection Fix - COMPLETED ✅

## Issues Found & Fixed

### 1. **Frontend API Base URL Not Configured**
- **Problem**: Frontend was using relative URLs (`/api/questions`) but needs full URL
- **Solution**: Added environment variables to specify backend URL
- **File**: `stem-project/.env`

### 2. **CORS Configuration Issues**
- **Problem**: Backend CORS was too permissive
- **Solution**: Configured explicit CORS origins (localhost:3000, localhost:5000)
- **File**: `stem-project/backend/server.js`

### 3. **Missing Root Endpoint**
- **Problem**: "Cannot GET /" when trying to access backend directly
- **Solution**: Added root endpoint that returns JSON status
- **File**: `stem-project/backend/server.js`

### 4. **Environment Variables Missing**
- **Problem**: Backend and frontend didn't have .env files
- **Solution**: Created .env files in both directories
- **Files**: 
  - `stem-project/.env`
  - `stem-project/backend/.env`

---

## Files Created/Modified

### ✅ `stem-project/.env` (NEW)
```env
REACT_APP_API_BASE_URL=http://localhost:5000
REACT_APP_AI_ENGINE_URL=http://localhost:8000
```

### ✅ `stem-project/backend/.env` (NEW)
```env
PORT=5000
OPENAI_API_KEY=
```

### ✅ `stem-project/src/pages/QuizPage.jsx` (MODIFIED)
Changed fetch calls to use environment variable:
```javascript
const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';
const endpoint = `${apiBaseUrl}/api/questions/${quizKey}`;
fetch(endpoint)
```

### ✅ `stem-project/backend/server.js` (MODIFIED)
Added:
- Root endpoint handler
- Explicit CORS configuration
- 404 error handler
- URL encoding middleware

---

## How to Restart

### Option 1: Kill and Restart All Services
```bash
# Press Ctrl+C in the running terminal

# Then restart
npm run dev
```

### Option 2: Restart Individual Services (in separate terminals)
```bash
# Terminal 1 - Frontend
cd stem-project
npm start

# Terminal 2 - Backend
cd stem-project/backend
npm start

# Terminal 3 - AI Engine
cd ai_engine
python -m uvicorn main:app --reload --port 8000
```

---

## Testing After Restart

### 1. **Check Backend is Running**
```bash
# In browser console or terminal:
curl http://localhost:5000
# Expected response: {"message":"Quiz API Server","status":"running"}
```

### 2. **Check API Endpoints**
```bash
# Health check
curl http://localhost:5000/health
# Expected: {"status":"OK","message":"Server is running"}

# Questions endpoint
curl http://localhost:5000/api/questions/2
# Expected: JSON with questions array
```

### 3. **Test in Browser**
- Open http://localhost:3000
- Click "Start Test"
- Check browser Console (F12) for errors
- If no errors, you should see quiz questions load

### 4. **Monitor Console**
Watch for these messages:
```
✅ [dev:backend] Server running on port 5000
✅ [dev:frontend] Compiled successfully!
✅ [dev:ai] Application startup complete.
```

---

## Troubleshooting

### "Cannot GET /api/questions"
- Check: Is backend running on port 5000?
- Check: Browser Console for CORS errors
- Fix: Restart backend

### "SyntaxError: Unexpected token '<', "<!DOCTYPE""
- Means backend sent HTML instead of JSON
- Usually happens when endpoint doesn't exist
- Check backend routes are loaded correctly
- Restart backend and frontend

### "Error: Could not establish connection"
- Browser extension issue or network problem
- Check: No browser extensions blocking requests
- Check: Firewall allowing localhost:5000

### "PORT is not recognized"
- Windows PowerShell env var issue
- Should be fixed by cross-env
- Restart terminal if issue persists

---

## Architecture Diagram

```
User Browser (localhost:3000)
         ↓
    React App
         ↓
  fetch() to API Base URL
         ↓
Node.js Backend (localhost:5000)
         ↓
    Express Router
         ↓
   /api/questions/:id
         ↓
  AI Analyzer Module
         ↓
  Quiz Data from JSON
```

---

## Environment Variables Summary

| Variable | Purpose | Location |
|----------|---------|----------|
| `REACT_APP_API_BASE_URL` | Backend URL for frontend | `stem-project/.env` |
| `REACT_APP_AI_ENGINE_URL` | AI Engine URL (future) | `stem-project/.env` |
| `PORT` | Backend listen port | `stem-project/backend/.env` |
| `OPENAI_API_KEY` | LLM key (optional) | `stem-project/backend/.env` |

---

## Key Changes

1. **Fetch URLs**: Now use `process.env.REACT_APP_API_BASE_URL`
2. **CORS**: Explicitly configured for localhost:3000 and 5000
3. **Root Handler**: GET / returns JSON
4. **Error Handler**: 404 returns JSON (not HTML)
5. **.env Files**: Both frontend and backend now have env config

---

## Next Steps

1. ✅ Restart services
2. ✅ Open http://localhost:3000
3. ✅ Take a quiz and verify flow
4. ✅ Check DevTools (F12) → Network tab for API calls
5. ✅ Verify responses are JSON (not HTML)

**All systems should now connect properly!** 🚀
