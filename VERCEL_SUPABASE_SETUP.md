# Vercel + Supabase Integration Setup

## Problem Identified
Supabase is not available on Vercel production because environment variables are missing.

**Error on Vercel logs:**
```
[DB] - SUPABASE_URL: ❌ Missing
[DB] - SUPABASE_ANON_KEY: ❌ Missing
```

This causes:
- ❌ Learning profiles don't save
- ❌ Topic feedback shows without emoji
- ❌ Learning profile page doesn't load
- ✅ But quizzes still work (fallback to SQLite)

---

## Solution: Add Environment Variables to Vercel

### Step 1: Get Your Supabase Credentials

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → This is your `SUPABASE_URL`
   - **anon public** key → This is your `SUPABASE_ANON_KEY`

Example:
```
SUPABASE_URL=https://abc123xyz.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 2: Add to Vercel Environment Variables

1. Go to [Vercel Dashboard](https://vercel.com)
2. Select your project **mathz-jett** 
3. Go to **Settings** → **Environment Variables**
4. Add two new variables:

| Name | Value |
|------|-------|
| `SUPABASE_URL` | `https://your-project.supabase.co` |
| `SUPABASE_ANON_KEY` | `eyJhbGc...` (your anon key) |

**Important:** Add to all environments (Production, Preview, Development)

### Step 3: Redeploy

1. Go to **Deployments**
2. Click **Redeploy** on your latest deployment
3. OR push a new commit to trigger automatic redeploy

### Step 4: Verify Connection

Check the logs by visiting:
```
https://mathz-jett-8a2.vercel.app/api/adaptive/diagnostics
```

**Expected response when fixed:**
```json
{
  "supabase": {
    "available": true,
    "url": "✅ Set",
    "key": "✅ Set"
  },
  "message": "System is ready for adaptive learning"
}
```

**Current response (broken):**
```json
{
  "supabase": {
    "available": false,
    "url": "❌ Missing",
    "key": "❌ Missing"
  },
  "message": "Supabase not configured - check environment variables"
}
```

---

## What Gets Fixed Once Supabase is Connected

✅ **Learning Profiles**
- User profiles automatically save after each quiz
- Progress tracked across sessions
- Cognitive levels updated

✅ **Topic Feedback**
- Shows emoji-enhanced feedback (🌟 ✅ ⚠️ ❌)
- AI-generated personalized suggestions
- Performance metrics displayed

✅ **Learning Profile Page**
- Dashboard loads with user data
- Weak areas identified
- Strong areas highlighted
- Learning path generated

✅ **Adaptive Quiz**
- Personalized questions based on performance
- Next quiz adapted to weak areas
- Difficulty adjusted automatically

---

## Troubleshooting

### Still shows "Supabase not available"?

1. **Clear cache:**
   - Go to Vercel → Deployments → Redeploy
   - Or push a new commit

2. **Check credentials:**
   - Make sure you copied `anon public` key (not service_role)
   - URL should be `https://xxx.supabase.co` (with https)

3. **Check environment in Vercel:**
   - Settings → Environment Variables
   - Both variables should be listed for all environments

4. **View Vercel logs:**
   - Go to Vercel → Deployments → Select latest
   - Click "View Logs"
   - Search for "SUPABASE_URL"

### Learning profile still doesn't load?

1. Make sure Supabase table exists:
   ```sql
   -- Run in Supabase SQL Editor
   SELECT * FROM user_learning_profiles;
   ```

2. If table doesn't exist, run [SETUP_SUPABASE_TABLE.sql](./SETUP_SUPABASE_TABLE.sql)

3. Check if guest user (id=1) has a profile:
   ```sql
   SELECT * FROM user_learning_profiles WHERE user_id = 1;
   ```

---

## Testing the Fix

Once Supabase is connected:

1. **Test Endpoint:**
   ```bash
   curl https://mathz-jett-8a2.vercel.app/api/adaptive/diagnostics
   ```
   Should show `"available": true`

2. **Take a Quiz:**
   - Go to app → Take any quiz
   - Submit answers
   - Check if feedback has emoji

3. **Check Learning Profile:**
   - Go to Learning Profile page
   - Should load with your quiz history
   - Should show weak/strong areas

---

## Files That Check for Supabase

These files now have better logging to help diagnose issues:

- `backend/database.js` - Logs all environment variables at startup
- `backend/routes/adaptive.js` - New `/api/adaptive/diagnostics` endpoint
- `backend/routes/adaptive.js` - Better error handling when Supabase unavailable

---

## Questions?

If still not working after these steps:
1. Run the `/api/adaptive/diagnostics` endpoint
2. Check Vercel logs for the exact error
3. Verify Supabase project is active (not paused)
4. Check that `user_learning_profiles` table exists in Supabase
