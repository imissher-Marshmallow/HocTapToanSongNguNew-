# Supabase Setup Guide for AI Engine

## Step 1: Get Your Database Connection String

1. Go to [supabase.com](https://supabase.com) and log in
2. Select your project
3. Click **Settings** (gear icon) → **Database** → **Connection strings**
4. Copy the **URI** format connection string

Example format:
```
postgresql://postgres.YOUR_PROJECT_ID:YOUR_PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres
```

Replace `YOUR_PASSWORD` with your actual database password.

## Step 2: Update `.env` File

Edit `ai_engine/.env`:
```
DATABASE_URL=postgresql://postgres.YOUR_PROJECT_ID:YOUR_PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres
OPENAI_API_KEY=sk-your-actual-key-here
```

## Step 3: Initialize Database Tables

Run this command from the `ai_engine` folder:

```powershell
python init_db.py
```

This will automatically create all tables (users, quiz_sessions, user_progress, etc.) in your Supabase database.

## Step 4: Verify Tables in Supabase

Go to Supabase Dashboard:
1. Click **SQL Editor** in the left sidebar
2. Run this query to check if tables exist:
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   ORDER BY table_name;
   ```

You should see these tables:
- `users`
- `quiz_sessions`
- `user_progress`
- `learning_preferences`
- `learning_resources`

## Step 5: (Optional) View Tables in Table Editor

You can also view tables in Supabase's graphical interface:
1. Go to **Table Editor** in the left sidebar
2. Each table will be listed with columns and data

### Default Tables Created:

**users**
- id (Primary Key)
- email
- username
- hashed_password
- full_name
- created_at
- is_active

**quiz_sessions**
- id (Primary Key)
- user_id (Foreign Key to users)
- quiz_id
- start_time
- end_time
- score
- total_questions
- correct_answers
- time_per_question (JSON)
- answers (JSON)
- performance_metrics (JSON)

**user_progress**
- id (Primary Key)
- user_id (Foreign Key to users)
- topic
- proficiency_level
- total_questions
- correct_answers
- avg_time_per_question
- last_updated
- weak_areas (JSON)
- strong_areas (JSON)

**learning_preferences**
- id (Primary Key)
- user_id (Foreign Key to users)
- preferred_difficulty
- preferred_topics (JSON)
- learning_style
- daily_goal_minutes
- preferred_resources (JSON)

**learning_resources**
- id (Primary Key)
- title
- description
- url
- type
- topic
- difficulty_level
- source
- created_at
- metadata (JSON)
- verified

## Step 6: Test Connection

Run this command to verify the connection works:

```powershell
cd ai_engine
python -c "from database import engine; print('Connection successful!' if engine.execute('SELECT 1') else 'Failed')"
```

## Step 7: Start the AI Engine

```powershell
cd ai_engine
python -m venv venv
.\venv\Scripts\Activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Visit http://localhost:8000/docs to see the API documentation.

## Common Issues

### Issue: "FATAL: password authentication failed"
- Make sure you replaced `YOUR_PASSWORD` with your actual database password
- Check that the connection string format is correct
- Verify project ID and region match your Supabase project

### Issue: "relation 'users' does not exist"
- Run `python init_db.py` again to create tables
- Check that the connection string is correct

### Issue: Connection timeout
- Ensure your IP is allowed in Supabase firewall (usually automatic)
- Check that you're using the correct region
- Try using the "Pooler" URL instead of direct URL if you have connection issues

## Next Steps

1. Update `.env` with your real Supabase credentials
2. Run `python init_db.py` to create tables
3. Start the FastAPI server
4. Test endpoints at http://localhost:8000/docs
5. Connect from your React frontend (calls to http://localhost:8000)