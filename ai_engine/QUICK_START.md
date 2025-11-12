# Quick Start: Supabase + AI Engine

## 📋 What You Need

1. **Supabase Project** (https://supabase.com)
2. **OpenAI API Key** (https://platform.openai.com/api-keys) — optional for now
3. **Python 3.8+** on your system

## 🚀 Setup Steps (5 minutes)

### 1. Get Your Supabase Connection String

1. Log in to [Supabase](https://supabase.com)
2. Open your project
3. Click **Settings** (gear icon) → **Database**
4. Go to **Connection strings**
5. Copy the **URI** (looks like `postgresql://postgres.xxxxx:xxxxx@aws-0-region.pooler.supabase.com:6543/postgres`)
6. Replace `xxxxx` password with your actual database password

### 2. Update `.env` File

Open `ai_engine/.env` and fill in your credentials:

```
# Replace with your Supabase connection string
DATABASE_URL=postgresql://postgres.YOUR_PROJECT_ID:YOUR_PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres

# Replace with your OpenAI key (optional)
OPENAI_API_KEY=sk-your-key-here
```

### 3. Create Virtual Environment (One-time)

```powershell
cd ai_engine
python -m venv venv
.\venv\Scripts\Activate
pip install -r requirements.txt
```

### 4. Initialize Database Tables

```powershell
python init_db.py
```

You should see:
```
Creating database tables...
Database tables created successfully!
```

### 5. Start the AI Engine

```powershell
uvicorn main:app --reload --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
```

### 6. Test the API

Open **http://localhost:8000/docs** in your browser to see the interactive API documentation.

## ✅ Verify Tables in Supabase

Go to your Supabase Dashboard:

1. Click **SQL Editor**
2. Run this query:
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' ORDER BY table_name;
   ```

You should see these tables:
- `learning_preferences`
- `learning_resources`
- `quiz_sessions`
- `user_progress`
- `users`

Or use **Table Editor** to view them graphically.

## 🔗 Connect From Frontend

Your React frontend (at http://localhost:3000) can now call:

```javascript
// Example: Get recommendations
const response = await fetch('http://localhost:8000/recommend/resources?topic=algebra', {
  headers: {
    'Authorization': `Bearer ${userToken}`
  }
});
const data = await response.json();
```

## 🛑 Troubleshooting

### "password authentication failed"
- Check your `.env` DATABASE_URL password is correct
- Verify you're using the Supabase password, not your account password

### "relation 'users' does not exist"
- Run `python init_db.py` again
- Check DATABASE_URL connection string

### "ModuleNotFoundError: No module named 'fastapi'"
- Activate venv: `.\venv\Scripts\Activate`
- Install deps: `pip install -r requirements.txt`

### CORS errors from frontend
- The API already has CORS enabled for http://localhost:3000
- For production, update the `origins` list in `main.py`

## 📚 What Tables Store

| Table | Purpose |
|-------|---------|
| `users` | Student profiles, authentication |
| `quiz_sessions` | Test attempts, scores, answers |
| `user_progress` | Performance per topic, weak areas |
| `learning_preferences` | Student goals, learning style |
| `learning_resources` | Books, videos, exercises links |

## 🔐 Security Notes

1. **Never** commit `.env` to git (already in `.gitignore`)
2. **Never** expose OPENAI_API_KEY in frontend code
3. In production, set DATABASE_URL in your hosting provider's dashboard (Vercel, Netlify, Railway, etc.)

## 🚀 Production Deployment

When deploying to production:

1. **Vercel/Netlify**: Deploy Python to a separate service (Railway, Render, Heroku)
2. Set environment variables in your hosting dashboard
3. Update frontend API calls to use production AI Engine URL
4. Update CORS origins in `main.py` to your production domain

Example production setup:
```env
DATABASE_URL=postgresql://...  # Set in dashboard
OPENAI_API_KEY=sk-...  # Set in dashboard
# Deploy AI Engine to: https://api.yourapp.com
# Frontend calls: fetch('https://api.yourapp.com/recommend/resources')
```

## 📞 Need Help?

- Supabase docs: https://supabase.com/docs
- FastAPI docs: https://fastapi.tiangolo.com
- Run `python check_setup.py` to verify your setup