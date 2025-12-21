# 🚀 AI ENGINE SETUP - CRITICAL FOR PRODUCTION

## ⚠️ IMPORTANT: The Backend Now Requires the AI Engine Running!

As of commit `dbf9bf5f`, the Node.js backend **CALLS** the Python AI Engine (port 8000) to get:
1. **Real AI-generated motivational feedback** (emotional, personalized, NOT templated)
2. **Real web-searched learning resources** (from AI web search, NOT hardcoded lists)

## Quick Start

### Step 1: Set Up Python Virtual Environment

```bash
cd ai_engine

# Create virtual environment
python -m venv venv

# Activate it
# On Windows:
venv\Scripts\activate

# On Mac/Linux:
source venv/bin/activate
```

### Step 2: Install Dependencies

```bash
pip install -r requirements.txt
```

### Step 3: Set Environment Variables

Create/update `.env` file in `ai_engine/` folder:

```dotenv
# Database (Supabase or PostgreSQL)
DATABASE_URL=postgresql://postgres.wjsjuwyefcscvttuidhr:iFdka6zyigfABpIf@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres

# OpenAI API Key (for web search + motivational feedback)
OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE

# Auto-create users if not found (optional)
AUTO_CREATE_USERS=true
```

### Step 4: Run the AI Engine

```bash
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete
```

### Step 5: Verify It's Working

Test the health endpoint:
```bash
curl http://localhost:8000/health
```

Should return:
```json
{
  "status": "healthy",
  "service": "AI Engine - Deep Learning With Love",
  "timestamp": "2025-11-14T..."
}
```

## How It Works

### When a Student Submits a Quiz:

1. **Frontend** → sends quiz answers to **Node Backend** (`/api/analyze-quiz`)
2. **Node Backend** (analyzer.js):
   - Scores the quiz
   - Identifies weak areas
   - **Calls Python AI Engine** for resources + motivational feedback
   - Returns full analysis to frontend

3. **Python AI Engine** (main.py):
   - Uses `web_search_resources.py` to find REAL learning materials
   - Uses OpenAI to generate PERSONALIZED feedback
   - Scrapes VietJack, Khan Academy for actual URLs
   - Returns resources + motivation in JSON

4. **Frontend** displays:
   - Strengths/weaknesses/plan (from summary)
   - Real learning resource links (from AI web search)
   - Personalized motivational feedback (from AI)

## Production Deployment

### Option A: Same Server (Recommended for Small Scale)

Run both services on same machine:
```bash
# Terminal 1: Node backend (port 5000)
cd stem-project/backend
npm start

# Terminal 2: Python AI Engine (port 8000)
cd ai_engine
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

### Option B: Separate Servers

**Server A (Node Backend):**
```bash
cd stem-project/backend
npm start
```

**Server B (Python AI Engine):**
```bash
cd ai_engine
export AI_ENGINE_URL=http://SERVER_A_IP:5000  # If calling back to Node
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

Update Node backend `.env`:
```
AI_ENGINE_URL=http://SERVER_B_IP:8000
```

### Option C: Docker

Build images:
```bash
# Node backend
cd stem-project/backend
docker build -t math-backend .
docker run -p 5000:5000 math-backend

# Python AI Engine
cd ai_engine
docker build -t math-ai-engine .
docker run -p 8000:8000 math-ai-engine
```

### Option D: Vercel + Render.com (Recommended for Cloud)

**Vercel** (Node backend):
- Deploy `stem-project/` to Vercel
- Set env var: `AI_ENGINE_URL=https://math-ai-engine.onrender.com`

**Render.com** (Python AI Engine):
- Deploy `ai_engine/` as background service to Render.com
- Keep port 8000
- Will auto-start and stay running

## Troubleshooting

### Error: "AI Engine error" in logs

**Problem:** Backend can't reach AI Engine
```
[Analyzer] AI Engine error (ECONNREFUSED). AI Engine may not be running at http://localhost:8000
```

**Solution:**
1. Check if ai_engine is running: `curl http://localhost:8000/health`
2. If not running, start it: `cd ai_engine && python -m uvicorn main:app --port 8000`
3. If error persists, check firewall is allowing port 8000

### Error: "OPENAI_API_KEY not found"

**Problem:** ai_engine can't access OpenAI API
```
WARNING: No OPENAI_API_KEY in environment
```

**Solution:**
1. Create `.env` in `ai_engine/` folder
2. Add your OpenAI API key: `OPENAI_API_KEY=sk-proj-...`
3. Restart ai_engine

### Resources are empty or fallback

**Problem:** Web search not working
```
[Resources] AI Engine returned no resources for: Đa thức
```

**Solution:**
1. Verify OpenAI key is valid
2. Check ai_engine has internet access
3. Try manually: `curl "http://localhost:8000/resources?topic=Đa%20thức"`

### Motivational feedback is templated

**Problem:** Falling back to template messages instead of AI-generated
```
[Analyzer] Using fallback motivational feedback
```

**Solution:**
1. Ensure ai_engine is running
2. Check OpenAI API key is valid and has credits
3. Review ai_engine logs for errors

## File Structure

```
ai_engine/
  ├── main.py                    # FastAPI server, /analyze endpoint
  ├── web_search_resources.py    # Gets real resources + motivation from AI
  ├── ml.py                      # ML analysis (weak areas, proficiency)
  ├── requirements.txt           # Python dependencies
  ├── .env                       # OpenAI key, Database URL
  └── README.md

stem-project/backend/
  ├── ai/
  │   ├── analyzer.js            # Calls ai_engine for resources + feedback
  │   └── webSearchResources.js  # Routes to ai_engine endpoints
  └── server.js

stem-project/src/
  └── pages/
      └── ResultPage.jsx         # Displays AI feedback + resources
```

## Key Functions

### `web_search_resources.py`

```python
def get_resources_for_topic(topic: str) -> list:
    # Uses OpenAI + web scraping to find REAL learning resources
    # Returns: [{'title': '...', 'url': 'https://...', 'source': 'VietJack'}]

def generate_motivational_feedback(score, label, weak_areas) -> dict:
    # Uses OpenAI to generate PERSONALIZED emotional feedback
    # Returns: {'opening': '...', 'body': '...', 'closing': '...'}
```

### `analyzer.js` (Node backend)

```javascript
// NEW: Calls ai_engine for AI-generated resources
const resources = await getResourcesForTopic(topic);

// NEW: Calls ai_engine for personalized motivation
const motivation = await callAIEngineForMotivation(score, weakAreas);
```

## Next Steps

1. ✅ Set up Python environment
2. ✅ Add OpenAI API key to `.env`
3. ✅ Run: `python -m uvicorn main:app --port 8000`
4. ✅ Test: `curl http://localhost:8000/health`
5. ✅ Backend will auto-connect when students submit quizzes

---

**Important:** Without the AI Engine running, resources and motivational feedback will fall back to hardcoded lists. For the FULL AI experience, you MUST have `ai_engine` running on port 8000.

Commit: `dbf9bf5f` - Integration complete!
