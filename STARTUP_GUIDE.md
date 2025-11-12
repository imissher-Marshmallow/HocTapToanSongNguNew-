# 🚀 Complete Startup Guide

Your project now has **multiple ways to start** depending on your use case.

## Quick Start (All Services Together)

### Development Mode (Recommended for Local Dev)
```powershell
# From root directory
npm run dev
```

This starts **three services simultaneously**:
- **Frontend (React)**: http://localhost:3000
- **Backend (Node)**: http://localhost:5000
- **AI Engine (Python)**: http://localhost:8000

### Production Mode (Simulates Vercel/Deployed)
```powershell
npm start
```

This starts only frontend and backend (no AI engine needed locally):
- **Frontend**: http://localhost:3000 (serves built files)
- **Backend**: http://localhost:5000

---

## Individual Service Startup

### Frontend Only
```powershell
npm run dev:frontend
# or
cd stem-project && npm start
```
- Runs on: http://localhost:3000
- Hot reload enabled
- Use for testing UI changes

### Backend Only
```powershell
npm run dev:backend
# or
cd stem-project/backend && npm run dev
```
- Runs on: http://localhost:5000
- Auto-restarts on code changes (nodemon)
- Use for testing API endpoints

### AI Engine Only
```powershell
npm run dev:ai
# or
cd ai_engine && python -m uvicorn main:app --reload --port 8000
```
- Runs on: http://localhost:8000
- Hot reload enabled
- API docs: http://localhost:8000/docs

---

## Build for Production

### Build Frontend
```powershell
npm run build:frontend
```
Creates `stem-project/build/` directory with optimized production files.

### Build Everything (Frontend + Backend)
```powershell
npm run build
```
Installs dependencies and builds frontend for deployment.

### Vercel Build (Used in CI/CD)
```powershell
npm run vercel-build
```
Full build pipeline including AI engine requirements.

---

## AI Engine Setup

### First-Time Setup
```powershell
npm run ai:setup
```
This:
1. Creates Python virtual environment
2. Installs dependencies from `requirements.txt`
3. Initializes Supabase database tables

### Initialize Database Only
```powershell
npm run ai:init
```

### Check Setup Status
```powershell
npm run ai:check
```
Verifies environment variables and packages are correctly set up.

---

## Service Architecture & Ports

| Service | Port | Mode | Technology |
|---------|------|------|------------|
| **Frontend** | 3000 | Dev/Prod | React + react-scripts |
| **Backend** | 5000 | Dev/Prod | Node.js + Express |
| **AI Engine** | 8000 | Dev only | Python + FastAPI |

### Firewall/Port Issues?

If a port is already in use, you can change it:

**Frontend** (port 3000):
```powershell
cd stem-project
PORT=3001 npm start
```

**Backend** (port 5000):
```powershell
cd stem-project/backend
PORT=5001 npm run dev
```

**AI Engine** (port 8000):
```powershell
cd ai_engine
python -m uvicorn main:app --reload --port 8001
```

Then update API calls in the code to use the new port.

---

## Development Workflow

### Scenario 1: Working on Frontend Only
```powershell
npm run dev:frontend
# Changes to React components are auto-reloaded
# http://localhost:3000
```

### Scenario 2: Working on Backend API
```powershell
npm run dev:backend
# Changes to Node server auto-reload with nodemon
# Test with http://localhost:5000/api/...
```

### Scenario 3: Full Stack Development
```powershell
npm run dev
# All three services running
# Frontend calls backend which calls AI engine
```

### Scenario 4: Testing API in Isolation
```powershell
npm run dev:ai
# Only Python API running
# Test with http://localhost:8000/docs
```

---

## Deployment Scenarios

### Deploy to Vercel (Frontend)
```powershell
npm run vercel-build
git add .
git commit -m "Deploy to Vercel"
git push origin main
```

Vercel automatically:
1. Runs `npm run vercel-build`
2. Detects `vercel.json` configuration
3. Deploys frontend to serverless functions
4. Serves from `stem-project/build`

### Deploy Backend Separately
Backend can be deployed to:
- **Railway** (`npm start`)
- **Render** (`npm start`)
- **Heroku** (`npm start`)
- **AWS** (`npm start`)

Use environment variables for:
- `PORT=5000` (default)
- `OPENAI_API_KEY=sk-...`
- Database credentials

### Deploy AI Engine Separately
AI engine can be deployed to:
- **Railway** (Python)
- **Render** (Python)
- **Fly.io** (Python)

Use Python environment with:
```powershell
pip install -r requirements.txt
python init_db.py
uvicorn main:app --host 0.0.0.0 --port 8000
```

---

## Environment Variables

### Development (.env)
```env
# Frontend
REACT_APP_API_URL=http://localhost:5000
REACT_APP_AI_ENGINE_URL=http://localhost:8000

# Backend
PORT=5000
OPENAI_API_KEY=sk-...

# AI Engine
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-...
```

### Production (.env or Dashboard)
```env
# Vercel/Production
REACT_APP_API_URL=https://api.yourapp.com
REACT_APP_AI_ENGINE_URL=https://ai.yourapp.com

# Backend (on Railway/Render)
OPENAI_API_KEY=sk-...

# AI Engine (on Railway/Render)
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-...
```

---

## Troubleshooting

### Port Already in Use
```powershell
# Find process using port 3000
netstat -ano | findstr :3000

# Kill process
taskkill /PID <PID> /F
```

### npm Commands Not Found
```powershell
# Install dependencies
npm install

# Reinstall concurrently
npm install concurrently --save-dev
```

### Python Virtual Environment Issues
```powershell
# Reset venv
cd ai_engine
rm -r venv
python -m venv venv
.\venv\Scripts\Activate
pip install -r requirements.txt
```

### Database Connection Error
```powershell
# Verify .env file exists in ai_engine/
cat ai_engine/.env

# Check connection
cd ai_engine
python init_db.py
```

### Services Won't Start Together
```powershell
# Try starting individually first
npm run dev:frontend   # Terminal 1
npm run dev:backend    # Terminal 2
npm run dev:ai         # Terminal 3

# Then check error messages
```

---

## Quick Reference Commands

```powershell
# Start all services
npm run dev

# Start production mode
npm start

# Build for production
npm run build

# Individual services
npm run dev:frontend
npm run dev:backend
npm run dev:ai

# AI engine commands
npm run ai:setup
npm run ai:init
npm run ai:check

# Clean install
npm run clean
npm install
npm run build
```

---

## Next Steps

1. **Run in development mode**: `npm run dev`
2. **Open frontend**: http://localhost:3000
3. **Test API**: http://localhost:5000/api/questions
4. **Check AI Engine**: http://localhost:8000/docs
5. **Make changes** - they auto-reload!
6. **Commit and deploy** when ready

---

**Happy coding! Your full-stack learning platform is ready to go! 🎓**