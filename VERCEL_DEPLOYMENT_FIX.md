# Vercel Deployment Fix - Backend Dependencies

## Problem Found
The Vercel deployment was failing because `@supabase/supabase-js` wasn't being installed on the Vercel serverless environment.

**Error:**
```
Cannot find module '@supabase/supabase-js'
Require stack:
- /var/task/stem-project/backend/routes/results.js
```

## Root Cause
The `vercel.json` build command didn't include installing backend dependencies:

**Before:**
```json
"buildCommand": "npm install && cd stem-project && npm install && npm run build"
```

**After:**
```json
"buildCommand": "npm install && cd stem-project && npm install && cd backend && npm install && cd .. && npm run build"
```

## What Changed
Added `cd backend && npm install` to ensure backend dependencies (`@supabase/supabase-js`, `pg`, `sqlite3`, etc.) are installed.

## Deployment Steps

### 1. File Already Updated
The `vercel.json` has been updated with the correct build command.

### 2. Redeploy on Vercel

**Option A: Push a new commit (recommended)**
```bash
git add vercel.json
git commit -m "fix: install backend dependencies during Vercel build"
git push origin main
```
This will automatically trigger a new deployment on Vercel.

**Option B: Manual redeploy**
1. Go to [Vercel Dashboard](https://vercel.com)
2. Select your project
3. Go to **Deployments** 
4. Find the latest deployment
5. Click **Redeploy**

### 3. Verify the Fix

Once redeployed, check:

1. **Diagnostics Endpoint:**
   ```bash
   curl https://mathz-jett-8a2.vercel.app/api/adaptive/diagnostics
   ```
   Should show `"available": true` for Supabase

2. **Check Deployment Logs:**
   - Go to Vercel → Deployments → Latest
   - Check Logs
   - Should see: `[DB] ✅ Supabase client initialized`

3. **Verify No Errors:**
   - Search logs for "Cannot find module"
   - Should NOT appear anymore

## Files Modified
- ✅ `vercel.json` - Added backend npm install to build command

## Expected Results After Fix
- ✅ `@supabase/supabase-js` module installed on Vercel
- ✅ Supabase connection works on production
- ✅ Learning profiles save correctly
- ✅ Topic feedback with emoji displays
- ✅ Learning profile page loads user data
- ✅ All adaptive features work

## Troubleshooting

### Still seeing the error?
1. **Hard refresh cache:**
   - Clear browser cache
   - Or open incognito window
   
2. **Force new deployment:**
   ```bash
   git commit --allow-empty -m "Trigger Vercel rebuild"
   git push origin main
   ```

3. **Check Vercel build logs:**
   - Deployment → View Logs
   - Look for "npm install" execution in backend directory

### Package size too large?
If backend is too large, Vercel might timeout. Solution:
```bash
# Remove unnecessary files
rm -rf stem-project/backend/node_modules/.bin
npm install --omit=dev  # Remove dev dependencies
```

## Architecture After Fix

```
Vercel Deployment
  ↓
api/[...path].js (entry point)
  ↓
stem-project/backend/server.js (Express app)
  ↓
Routes + Services
  ├─ /api/adaptive/* → adaptive.js (with Supabase)
  ├─ /api/auth/* → auth.js (with Supabase)
  └─ /api/results/* → results.js (with Supabase)
  ↓
Supabase ✅ (now connected!)
  ├─ user_learning_profiles
  ├─ quiz_results
  └─ user_history
```

---

## Testing the Complete Flow

Once deployed, test this flow:

1. **Take a Quiz**
   ```
   Go to app → Select Quiz → Submit Answers
   ```

2. **Check Result Page**
   ```
   Should see:
   - Emoji feedback: 🌟 ✅ ⚠️ ❌
   - Weak areas identified
   - AI recommendations
   ```

3. **Check Learning Profile**
   ```
   Should load:
   - Quiz history
   - Cognitive levels
   - Weak/strong areas
   - Learning path
   ```

4. **Check Server Logs**
   ```
   Should see:
   [DB] ✅ Supabase client initialized
   [Analyze] ✅ Profile saved to Supabase
   ```

---

## Quick Reference

| Issue | Before | After |
|-------|--------|-------|
| **Module Error** | Cannot find @supabase/supabase-js | ✅ Installed |
| **Supabase Connection** | ❌ Not available | ✅ Connected |
| **Learning Profiles** | Don't save | ✅ Save properly |
| **Topic Feedback** | No emoji | ✅ With emoji |

---

## Related Files

- [VERCEL_SUPABASE_SETUP.md](./VERCEL_SUPABASE_SETUP.md) - Environment variables setup
- [vercel.json](./vercel.json) - Updated build configuration
- [stem-project/backend/package.json](./stem-project/backend/package.json) - Backend dependencies
