# 🚀 QUICK ACTION GUIDE

## Right Now - Test the System

### Step 1: Open Browser
```
http://localhost:3000
```

### Step 2: You should see:
- ✅ Quiz list with available quizzes
- ✅ Language selector (English/Vietnamese)
- ✅ Start buttons enabled

### Step 3: Take a Quiz
1. Click "Start Test" on any quiz
2. Wait for questions to load from backend
3. Answer some questions
4. Click "Submit" at the bottom
5. See your results

### Step 4: Debug if Issues
```
Press F12 → Console tab

Look for:
❌ Red errors = Problem
⚠️ Yellow warnings = OK
📡 Network tab = See API calls
```

---

## If Something Doesn't Work

### Problem: Page doesn't load
```
Check: Is http://localhost:3000 responding?
Fix: Restart with Ctrl+C, then npm run dev
```

### Problem: Questions don't appear
```
Check: F12 → Console
Look for: "Error fetching questions"
Fix: See API_CONNECTION_FIX.md
```

### Problem: Service won't start
```
Windows: Make sure using PowerShell (not CMD)
Restart: Ctrl+C, then npm run dev
Update: npm install
```

### Problem: Port already in use
```
Find process: netstat -ano | findstr :5000
Kill process: taskkill /PID <PID> /F
Or use different port: PORT=5001 npm run dev:backend
```

---

## File Locations for Reference

| File | Purpose |
|------|---------|
| `stem-project/src/pages/QuizPage.jsx` | Main quiz page (where API is called) |
| `stem-project/backend/server.js` | Backend server setup |
| `stem-project/backend/routes/quiz.js` | API endpoints |
| `stem-project/.env` | Frontend config |
| `stem-project/backend/.env` | Backend config |

---

## Environment Variables to Remember

```
Frontend needs: REACT_APP_API_BASE_URL=http://localhost:5000
Backend needs:  PORT=5000
```

---

## All Running? ✅

You should see in terminal:
```
[dev:backend] Server running on port 5000
[dev:ai] Application startup complete.
[dev:frontend] Compiled successfully!
```

---

## Documentation Files

- 📖 `API_CONNECTION_FIX.md` - How API connection was fixed
- 📖 `SYSTEM_STATUS.md` - Current system status & troubleshooting
- 📖 `WINDOWS_FIX.md` - How Windows compatibility was fixed
- 📖 `QUICK_REFERENCE.md` - Command reference card
- 📖 `README_STARTUP.md` - Project overview

---

## Common Commands

```bash
# Start everything
npm run dev

# Start individual service
npm run dev:frontend
npm run dev:backend
npm run dev:ai

# Check setup
npm run check

# Build for production
npm run build

# Deploy to Vercel
vercel deploy
```

---

## Test API from Command Line

```bash
# Test backend is running
curl http://localhost:5000/health

# Get questions
curl http://localhost:5000/api/questions/2

# Test AI engine
curl http://localhost:8000/health
```

---

## Emergency Restart

```bash
# Kill all processes
Ctrl+C

# Clean reinstall
npm run clean
npm install

# Start fresh
npm run dev
```

---

## You're All Set! 🎉

- ✅ All 3 services running
- ✅ API connections configured
- ✅ Environment variables set
- ✅ CORS configured
- ✅ Ready to use

### Open http://localhost:3000 and start testing!
