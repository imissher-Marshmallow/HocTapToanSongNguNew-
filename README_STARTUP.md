# 🎓 Deep Learning With Love - AI-Powered Learning Platform

A comprehensive educational platform combining **React frontend**, **Node.js backend**, and **Python AI microservice** for personalized mathematics learning.

## 📋 Quick Start

### For Development
```powershell
npm run dev
```
Starts all three services:
- **Frontend**: http://localhost:3000 (React)
- **Backend**: http://localhost:5000 (Node.js API)
- **AI Engine**: http://localhost:8000 (Python + FastAPI)

### For Production
```powershell
npm run build
npm start
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   React Frontend (3000)                 │
│              (Quiz UI, Progress Dashboard)              │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP Requests
         ┌───────────────┴───────────────┐
         │                               │
┌────────▼──────────────────┐   ┌───────▼──────────────────┐
│  Node.js Backend (5000)   │   │ Python AI Engine (8000)  │
│  • Quiz endpoints          │   │ • Recommendations        │
│  • User management         │   │ • Analytics              │
│  • Session tracking        │   │ • Resource aggregation   │
└────────┬──────────────────┘   └───────┬──────────────────┘
         │                              │
         └──────────────┬───────────────┘
                        │ Database
              ┌─────────▼──────────┐
              │ Supabase PostgreSQL │
              │  (Quiz Data, Users) │
              └────────────────────┘
```

---

## 📁 Project Structure

```
HocTapToanSongNguNew-/
├── stem-project/              # React Frontend
│   ├── src/
│   │   ├── pages/             # Quiz, Landing, Results
│   │   ├── components/        # UI Components
│   │   ├── contexts/          # Language Context
│   │   └── translations/      # i18n
│   ├── backend/               # Node.js API Server
│   │   ├── server.js
│   │   ├── routes/
│   │   └── ai/
│   └── package.json
│
├── ai_engine/                 # Python AI Microservice
│   ├── main.py               # FastAPI app
│   ├── models.py             # Database models
│   ├── ml.py                 # ML/Analytics
│   ├── scraper.py            # Content aggregation
│   ├── requirements.txt
│   └── README.md
│
├── package.json              # Root npm scripts
├── STARTUP_GUIDE.md          # This file
├── .env.example              # Environment variables template
└── README.md                 # Project documentation
```

---

## 🚀 Commands Reference

### Development
```powershell
npm run dev              # Start all services
npm run dev:frontend    # React frontend only
npm run dev:backend     # Node backend only
npm run dev:ai          # Python AI engine only
```

### Production
```powershell
npm run build           # Build frontend
npm start              # Start frontend + backend (production mode)
```

### AI Engine
```powershell
npm run ai:setup       # First-time setup
npm run ai:init        # Initialize database
npm run ai:check       # Verify setup
```

---

## 🔧 Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 19 | Interactive UI, Real-time updates |
| **Backend** | Node.js + Express | RESTful API, Session management |
| **AI/Analytics** | Python + FastAPI | ML predictions, Recommendations |
| **Database** | Supabase (PostgreSQL) | User data, Quiz history, Progress |
| **Deployment** | Vercel + Railway | Serverless frontend + Backend API |

---

## 🎯 Features

### For Students
- ✅ Interactive quiz interface with real-time feedback
- ✅ Personalized learning recommendations
- ✅ Progress tracking and performance analytics
- ✅ Anti-cheat detection in exam mode
- ✅ Multilingual support (English/Vietnamese)

### For Teachers/Admins
- ✅ Student progress dashboard
- ✅ Quiz management interface
- ✅ Performance analytics
- ✅ Resource curation

### AI-Powered
- 🤖 Weak area detection
- 🤖 Personalized exercise recommendations
- 🤖 Learning pattern analysis
- 🤖 Content aggregation from trusted sources

---

## 🔐 Security

- ✅ CORS configured for secure cross-origin requests
- ✅ Environment variables for sensitive data (`.env` in `.gitignore`)
- ✅ Server-side API keys (never exposed to frontend)
- ✅ Database passwords protected in Supabase
- ✅ Authentication-ready architecture

---

## 🌐 Deployment

### Frontend → Vercel
```powershell
npm run vercel-build
git push origin main
# Automatic deployment on push
```

### Backend → Railway/Render
Deploy `stem-project/backend` with:
- Environment: Node.js
- Start command: `npm start`
- Port: 5000 (default)

### AI Engine → Railway/Render/Fly.io
Deploy `ai_engine` with:
- Environment: Python 3.8+
- Install: `pip install -r requirements.txt && python init_db.py`
- Start: `uvicorn main:app --host 0.0.0.0 --port 8000`

---

## 📚 Documentation

- **`STARTUP_GUIDE.md`** - Detailed startup instructions
- **`ai_engine/README.md`** - AI microservice documentation
- **`ai_engine/QUICK_START.md`** - AI engine setup (5 min)
- **`ai_engine/FRONTEND_INTEGRATION.md`** - React integration examples
- **`ai_engine/SUPABASE_SETUP.md`** - Database configuration

---

## 🛠️ Troubleshooting

### Port conflicts?
```powershell
# Change port for any service
PORT=3001 npm run dev:frontend    # Frontend on 3001
PORT=5001 npm run dev:backend     # Backend on 5001
```

### Dependencies not installing?
```powershell
npm install
npm run postinstall
```

### Python virtual environment issues?
```powershell
cd ai_engine
rm -r venv
python -m venv venv
.\venv\Scripts\Activate
pip install -r requirements.txt
```

### Database connection failing?
```powershell
cd ai_engine
# Update .env with correct Supabase URL
python init_db.py
```

---

## 📞 Support

For issues or questions:
1. Check `STARTUP_GUIDE.md` for common problems
2. Review environment variables in `.env.example`
3. Run `npm run ai:check` to verify setup
4. Check service logs for error messages

---

## 🎓 Learning Resources

- [React Documentation](https://react.dev)
- [FastAPI Documentation](https://fastapi.tiangolo.com)
- [Supabase Documentation](https://supabase.com/docs)
- [Express.js Guide](https://expressjs.com)

---

## 📝 License

This project is part of "Deep Learning With Love" - an educational initiative to make personalized learning accessible to all.

---

**Ready to start? Run `npm run dev` and happy coding! 🚀**