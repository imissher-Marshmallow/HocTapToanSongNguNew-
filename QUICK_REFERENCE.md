# 🎯 Quick Reference Card

Print this or keep it handy while developing!

---

## Start Anywhere - Pick Your Command

```
┌─────────────────────────────────────────────────────────────┐
│                   STARTUP COMMANDS                           │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  🚀 Full Stack (All Services)                               │
│     npm run dev                                              │
│     Ports: 3000, 5000, 8000                                 │
│                                                               │
│  📱 Frontend Only                                            │
│     npm run dev:frontend                                    │
│     Port: 3000                                              │
│                                                               │
│  🔌 Backend Only                                            │
│     npm run dev:backend                                     │
│     Port: 5000                                              │
│                                                               │
│  🤖 AI Engine Only                                          │
│     npm run dev:ai                                          │
│     Port: 8000 → http://localhost:8000/docs                │
│                                                               │
│  📦 Production Mode                                         │
│     npm run build && npm start                              │
│     Ports: 3000, 5000                                       │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Service Ports & URLs

```
┌──────────────┬──────────┬─────────────────────────────────┐
│ Service      │ Port     │ URL                             │
├──────────────┼──────────┼─────────────────────────────────┤
│ Frontend     │ 3000     │ http://localhost:3000           │
│ Backend      │ 5000     │ http://localhost:5000           │
│ AI Engine    │ 8000     │ http://localhost:8000           │
│ AI Docs      │ 8000     │ http://localhost:8000/docs      │
└──────────────┴──────────┴─────────────────────────────────┘
```

---

## Common npm Commands

```
Development
  npm run dev              All services
  npm run dev:frontend     React only
  npm run dev:backend      Node only
  npm run dev:ai           Python only

Building
  npm run build            Build for production
  npm run vercel-build     CI/CD build

Setup
  npm install              Install all dependencies
  npm run ai:setup         Setup Python venv
  npm run ai:init          Initialize database
  npm run check            Verify setup

Cleanup
  npm run clean            Remove builds & node_modules
```

---

## File Locations

```
Project Files
  stem-project/            Frontend (React)
  stem-project/backend/    Backend (Node.js)
  ai_engine/               AI Engine (Python)
  package.json             Root npm configuration

Config Files
  .env.example             Environment template
  ai_engine/.env           AI engine secrets
  vercel.json              Deployment config

Documentation
  README_STARTUP.md        Overview
  STARTUP_GUIDE.md         Detailed guide
  STARTUP_HANDBOOK.md      Complete reference
  SETUP_SUMMARY.md         This summary
```

---

## Environment Variables Checklist

```
Frontend (stem-project/.env)
  [ ] REACT_APP_API_URL=http://localhost:5000
  [ ] REACT_APP_AI_ENGINE_URL=http://localhost:8000

Backend (stem-project/backend/.env)
  [ ] PORT=5000
  [ ] NODE_ENV=development
  [ ] OPENAI_API_KEY=sk-...

AI Engine (ai_engine/.env)
  [ ] DATABASE_URL=postgresql://...
  [ ] OPENAI_API_KEY=sk-...
```

---

## Troubleshooting Quick Fixes

```
Problem: Port already in use
Fix: PORT=3001 npm run dev:frontend

Problem: Module not found
Fix: npm install

Problem: Python error
Fix: npm run ai:setup

Problem: Database connection error
Fix: Check ai_engine/.env file

Problem: Services won't start together
Fix: Start in 3 separate terminals with individual commands
```

---

## Development Workflow

```
Step 1: npm run dev              Start everything
Step 2: Open http://localhost:3000   Use the app
Step 3: Edit code               Changes auto-reload
Step 4: Check logs              See output in terminal
Step 5: Test API                Use http://localhost:8000/docs
Step 6: Ctrl+C when done        Stop all services
```

---

## Testing the Stack

```javascript
// In browser console:

// Test backend
fetch('http://localhost:5000/api/questions')
  .then(r => r.json())
  .then(d => console.log(d))

// Test AI engine  
fetch('http://localhost:8000/health')
  .then(r => r.json())
  .then(d => console.log(d))
```

---

## Deploy Commands

```
Frontend
  npm run vercel-build && git push

Backend  
  Deploy stem-project/backend/ to Railway/Render
  Start: npm start
  Port: 5000

AI Engine
  Deploy ai_engine/ to Railway/Python
  Start: uvicorn main:app --host 0.0.0.0 --port 8000
```

---

## Important Folders

```
stem-project/           ← Frontend React app
├── src/
│   ├── pages/         Quiz, Landing, Results
│   ├── components/    UI components
│   └── translations/  i18n files
├── public/            Static files
└── build/             Production build

stem-project/backend/   ← Node.js API
├── server.js          Express server
├── routes/            API endpoints
└── ai/                AI integration

ai_engine/              ← Python AI
├── main.py            FastAPI app
├── models.py          Database models
├── ml.py              ML functions
└── .env               Database URL
```

---

## Database

```
Type: PostgreSQL (via Supabase)
Tables:
  - users
  - quiz_sessions
  - user_progress
  - learning_preferences
  - learning_resources

Connection: ai_engine/.env → DATABASE_URL
Command: npm run ai:init
```

---

## Key Hotkeys

```
Dev Server:
  Ctrl+C              Stop services
  Ctrl+Shift+R        Hard refresh browser (clear cache)
  F12                 Open DevTools
  Ctrl+Shift+I        Open DevTools (Windows)

Recommended Setup:
  Terminal 1: npm run dev:frontend
  Terminal 2: npm run dev:backend
  Terminal 3: npm run dev:ai
  Browser:   http://localhost:3000
```

---

## Memory

```
Port 3000  → Frontend (React)
Port 5000  → Backend (Node)
Port 8000  → AI Engine (Python)

Dev        → npm run dev
Build      → npm run build
Start      → npm start
Check      → npm run check
```

---

**Bookmark this file! Print it! Share it!** 📌

For full details, see: `STARTUP_HANDBOOK.md`