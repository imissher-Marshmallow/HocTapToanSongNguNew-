# 🎯 Complete Startup Handbook

## TL;DR - Get Running in 30 Seconds

```powershell
npm install
npm run dev
# Visit: http://localhost:3000
```

---

## 🚀 All Startup Options

### Option 1: Full Stack (Everything Together) ⭐ RECOMMENDED

```powershell
npm run dev
```

**Starts:**
- Frontend (React) on http://localhost:3000
- Backend (Node) on http://localhost:5000  
- AI Engine (Python) on http://localhost:8000

**Use When:** You're developing all parts and want everything running.

---

### Option 2: Production Mode (Vercel-like)

```powershell
npm run build
npm start
```

**Starts:**
- Frontend (served from build/) on http://localhost:3000
- Backend (Node) on http://localhost:5000

**Use When:** You want to test how it will work in production.

---

### Option 3: Frontend Only

```powershell
npm run dev:frontend
```

Or directly:
```powershell
cd stem-project
npm start
```

**Runs on:** http://localhost:3000

**Use When:** 
- Working on React components
- Don't need backend/AI features right now
- Faster startup time

---

### Option 4: Backend Only

```powershell
npm run dev:backend
```

Or directly:
```powershell
cd stem-project/backend
npm run dev
```

**Runs on:** http://localhost:5000

**Use When:**
- Testing API endpoints
- Don't need frontend running
- Using Postman/curl for testing

---

### Option 5: AI Engine Only

```powershell
npm run dev:ai
```

Or directly:
```powershell
cd ai_engine
python -m uvicorn main:app --reload --port 8000
```

**Runs on:** http://localhost:8000

**API Docs:** http://localhost:8000/docs

**Use When:**
- Testing ML/recommendation features
- Working on analytics
- Debugging database queries

---

### Option 6: Custom Combinations

Start individual services in separate terminals:

**Terminal 1:**
```powershell
npm run dev:frontend
```

**Terminal 2:**
```powershell
npm run dev:backend
```

**Terminal 3:**
```powershell
npm run dev:ai
```

All three services will work together!

---

## 📋 Complete Command Reference

### Starting Services
| Command | What Starts | Port | Use Case |
|---------|-----------|------|----------|
| `npm run dev` | All 3 services | 3000, 5000, 8000 | Full development |
| `npm run dev:frontend` | React only | 3000 | UI development |
| `npm run dev:backend` | Node only | 5000 | API development |
| `npm run dev:ai` | Python only | 8000 | ML/analytics |
| `npm start` | Frontend (prod) + Backend | 3000, 5000 | Production-like |

### Building & Setup
| Command | What It Does |
|---------|------------|
| `npm install` | Install root + all dependencies |
| `npm run build` | Build frontend for production |
| `npm run build:frontend` | Build React only |
| `npm run build:backend` | Install backend deps |
| `npm run vercel-build` | Full CI/CD build |
| `npm run ai:setup` | Setup Python virtual environment |
| `npm run ai:init` | Initialize database tables |
| `npm run ai:check` | Verify environment setup |
| `npm run check` | Check project setup |
| `npm run clean` | Remove all node_modules & builds |

---

## 🔄 Service Communication Flow

When all services are running together:

```
Browser (Port 3000)
    ↓ HTTP
React Frontend
    ↓ fetch('http://localhost:5000/api/...')
Node Backend (Port 5000)
    ↓ HTTP/Internal Calls
Python AI Engine (Port 8000)
    ↓ SQL Queries
Supabase PostgreSQL Database
```

### Environment Variables
- Frontend automatically uses `REACT_APP_API_URL=http://localhost:5000`
- Frontend automatically uses `REACT_APP_AI_ENGINE_URL=http://localhost:8000`
- Backend reads `PORT=5000` from `.env`
- AI Engine reads `DATABASE_URL` from `.env`

---

## 🎓 Typical Development Scenarios

### Scenario 1: Build a New Quiz Page Component

```powershell
npm run dev:frontend
# React dev server at http://localhost:3000
# Your changes auto-reload
```

### Scenario 2: Debug an API Endpoint

```powershell
# Terminal 1
npm run dev:backend

# Terminal 2 (test API with curl or Postman)
curl http://localhost:5000/api/questions/random
```

### Scenario 3: Work on ML Recommendations

```powershell
npm run dev:ai
# FastAPI at http://localhost:8000/docs
# Test endpoints interactively
```

### Scenario 4: Full Feature Development (All Services)

```powershell
npm run dev
# Everything running, changes auto-reload
# Test user flow end-to-end
```

### Scenario 5: Pre-Deployment Testing (Production Mode)

```powershell
npm run build          # Build React for production
npm start              # Start in production mode
# Test as it would run on Vercel
```

---

## 🐛 Debugging & Troubleshooting

### Service Won't Start?

**Check if port is in use:**
```powershell
# Find what's using port 3000
netstat -ano | findstr :3000

# Kill the process (replace PID)
taskkill /PID 12345 /F
```

**Use different port:**
```powershell
PORT=3001 npm run dev:frontend
PORT=5001 npm run dev:backend
```

### Dependencies Missing?

```powershell
npm install                           # Install root
cd stem-project && npm install        # Install frontend
cd ../stem-project/backend && npm install  # Install backend
cd ../../ai_engine && pip install -r requirements.txt  # Install Python
```

### Python Virtual Environment Issues?

```powershell
cd ai_engine
rm -r venv                           # Remove old venv
python -m venv venv                  # Create new
.\venv\Scripts\Activate              # Activate
pip install -r requirements.txt      # Install packages
python init_db.py                    # Setup database
```

### Database Connection Error?

```powershell
cd ai_engine

# Check .env file
cat .env

# Should have:
# DATABASE_URL=postgresql://...
# OPENAI_API_KEY=sk-...

# Then try:
python init_db.py
```

### Services Not Talking to Each Other?

```powershell
# Test frontend → backend
curl http://localhost:5000/health

# Test backend → AI engine
curl http://localhost:8000/health

# Test browser console (DevTools)
# Check CORS errors
# Check network tab
```

---

## 📊 Service Status Check

Run the verification script:

```powershell
npm run check
```

This checks:
- ✓ All directories exist
- ✓ Configuration files present
- ✓ Environment variables set
- ✓ Node/Python packages installed
- ✓ Scripts available

---

## 🚢 Deployment Commands

### Build for Deployment

```powershell
npm run build
```

Creates optimized production build:
- `stem-project/build/` - React static files
- Ready for Vercel/Netlify

### Deploy Frontend (Vercel)

```powershell
npm run vercel-build
git add .
git commit -m "Deploy"
git push origin main
# Automatic Vercel deployment
```

### Deploy Backend (Railway/Render)

1. Connect repository
2. Set environment: Node.js
3. Set command: `npm start`
4. Set port: 5000
5. Add env vars (OPENAI_API_KEY, etc.)
6. Deploy!

### Deploy AI Engine (Railway/Python)

1. Connect repository  
2. Set environment: Python 3.8+
3. Set command: `pip install -r requirements.txt && python init_db.py && uvicorn main:app --host 0.0.0.0 --port 8000`
4. Add env vars (DATABASE_URL, OPENAI_API_KEY)
5. Deploy!

---

## 🎯 Quick Decision Tree

**I want to...**

- **...start everything and develop** → `npm run dev`
- **...work on frontend UI only** → `npm run dev:frontend`
- **...test API endpoints** → `npm run dev:backend`
- **...develop ML features** → `npm run dev:ai`
- **...test production build** → `npm run build && npm start`
- **...check setup is correct** → `npm run check`
- **...initialize database** → `npm run ai:init`
- **...fresh install everything** → `npm install && npm run build`
- **...clean and reinstall** → `npm run clean && npm install`

---

## 🎓 Example: Complete Development Session

```powershell
# 1. Clone/enter project
cd HocTapToanSongNguNew-

# 2. Install everything
npm install

# 3. Verify setup
npm run check

# 4. Start development
npm run dev
# Now all three services are running!

# 5. Open in browser
# Frontend: http://localhost:3000
# Backend: http://localhost:5000
# AI API: http://localhost:8000/docs

# 6. Make changes
# Edit React files → auto-reloads
# Edit Node files → auto-restarts (nodemon)
# Edit Python files → auto-reloads (uvicorn)

# 7. Test the integration
# Click through quiz in UI
# Watch network requests in DevTools
# Check terminal output for errors

# 8. When done
# Ctrl+C to stop all services
```

---

## 🔗 Port Reference

| Service | Port | Technology | Hot Reload |
|---------|------|------------|-----------|
| Frontend | 3000 | React | ✓ Yes |
| Backend | 5000 | Node.js | ✓ Yes (nodemon) |
| AI Engine | 8000 | Python | ✓ Yes (uvicorn) |

---

## 📞 Need Help?

1. **Check docs**: `STARTUP_GUIDE.md`, `README_STARTUP.md`
2. **Run verification**: `npm run check`
3. **Check logs**: Look at terminal output
4. **Reset everything**: `npm run clean && npm install`

---

**You're all set! Pick a startup option and let's code! 🚀**