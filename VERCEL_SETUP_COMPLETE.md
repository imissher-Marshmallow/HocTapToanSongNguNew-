# ✅ Vercel Deployment Setup - Complete Guide

## Overview

Your STEM project is configured for Vercel deployment with:
- ✅ PostgreSQL (Supabase) database integration
- ✅ Express backend as serverless functions
- ✅ React frontend static deployment
- ✅ Automatic schema initialization
- ✅ Environment variable support

---

## Current Configuration Status

### Database Setup
- **Type**: PostgreSQL via Supabase
- **Connection**: Already configured in `backend/.env` with DATABASE_URL
- **Tables**: Auto-created on first connection
  - `users` - User accounts and authentication
  - `results` - Quiz submissions with AI analysis
  - `learning_plans` - Personalized 3-day study plans
  - Plus 4 additional tables for ML analytics

### Environment Variables Required for Vercel
```
DATABASE_URL=postgresql://...  (from Supabase)
OPENAI_API_KEY=...             (optional, for AI features)
OPENAI_API_KEY_SUMMARY=...     (optional)
OPENAI_API_KEY_RESOURCES=...   (optional)
NODE_ENV=production
```

---

## Step-by-Step Vercel Deployment

### Step 1: Prepare Your Repository

```bash
# Make sure you're in the root directory
cd c:\Users\ADMIN\Downloads\Resource2025\NewSTEM\HocTapToanSongNguNew-

# Verify files are committed
git status

# Add and commit if needed
git add -A
git commit -m "Configure for Vercel deployment"
git push origin main
```

### Step 2: Create Vercel Project

1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub account
3. Click **"Add New..."** → **"Project"**
4. Select your repository: `imissher-Marshmallow/HocTapToanSongNguNew-`
5. Click **"Import"**

### Step 3: Configure Build Settings

When importing, set these values:

| Setting | Value |
|---------|-------|
| **Framework Preset** | Other |
| **Root Directory** | ./ (project root) |
| **Build Command** | `cd stem-project && npm install && npm run build` |
| **Output Directory** | `stem-project/build` |
| **Install Command** | `npm install` |

### Step 4: Add Environment Variables

**CRITICAL:** Set these before deployment!

1. In Vercel Dashboard, go to **Settings** → **Environment Variables**

2. Add `DATABASE_URL`:
   - **Name**: `DATABASE_URL`
   - **Value**: Get from your Supabase Dashboard:
     - Go to Supabase → Project Settings → Database
     - Copy the **Connection string (URI)**
     - Paste into Vercel
   - **Example**:
     ```
     postgresql://postgres.wjsjuwyefcscvttuidhr:iFdka6zyigfABpIf@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres
     ```
   - Apply to: **Production, Preview, Development**

3. Add other optional variables if using AI:
   - `OPENAI_API_KEY` (if using AI analysis)
   - `OPENAI_API_KEY_SUMMARY` (if using summaries)
   - `OPENAI_API_KEY_RESOURCES` (if using resource recommendations)

### Step 5: Deploy

1. Click **"Deploy"** button
2. Wait for build to complete (2-5 minutes)
3. You'll see: ✅ **Deployment Successful**
4. Visit your URL: `https://your-project.vercel.app`

---

## Verifying Database Works

### After Deployment

1. Go to Vercel Dashboard → **Your Project** → **Deployments**
2. Click the successful deployment
3. Go to **Functions** tab
4. Look for logs showing:
   ```
   [DB] Using PostgreSQL (cloud database)
   [DB] ✅ PostgreSQL connected
   ```

### Test Database Connection

**From Vercel Logs:**
```bash
# In Vercel Dashboard, click your deployment
# Go to "Logs" section and look for:
[DB] ✅ PostgreSQL connected
✓ Users table initialized
✓ Results table initialized
✓ Learning plans table initialized
```

**From Terminal (requires Vercel CLI):**
```bash
# Install Vercel CLI
npm install -g vercel

# View deployment logs
vercel logs --prod your-project-name

# You should see PostgreSQL connection messages
```

---

## Testing Your Deployment

### 1. Frontend Test
- Visit: `https://your-project.vercel.app`
- Should see the STEM quiz app
- Try navigating pages

### 2. Database Test
- Submit a quiz
- Check if result page shows
- Your response should be saved to PostgreSQL

### 3. API Test
Visit these endpoints:

```
https://your-project.vercel.app/api/questions/random
https://your-project.vercel.app/api/health  (if exists)
```

Should return quiz data or success message.

---

## Troubleshooting

### ❌ Problem: "Cannot find module 'pg'"
**Solution**: This is normal during build. The `pg` module is installed during Vercel build and available in the function environment.

### ❌ Problem: Database shows SQLite in logs
**Solution**: 
- DATABASE_URL environment variable not set
- Go to Vercel Settings → Environment Variables
- Verify DATABASE_URL is properly added
- Redeploy

### ❌ Problem: 404 on quiz submission
**Solution**:
- Check API routes are using `/api/` prefix
- In React: `fetch('/api/results')` (not `/results`)
- Verify backend route exists

### ❌ Problem: Build fails
**Solution**:
- Check Vercel build logs for specific error
- Verify `stem-project/package.json` exists
- Ensure all dependencies are listed
- Try building locally: `npm run build`

### ❌ Problem: Database connection timeout
**Solution**:
- Verify Supabase is running
- Check DATABASE_URL is correct
- Verify Supabase allows Vercel IPs (should be default)
- Check pool connection settings in `database.js`

---

## File Structure for Vercel

```
HocTapToanSongNguNew-/
├── api/                          # Serverless functions
│   ├── package.json             # ✅ Has 'pg' dependency
│   ├── index.js                 # Wrapper
│   ├── questions.js
│   └── analyze-quiz.js
├── stem-project/                # React frontend
│   ├── src/
│   ├── public/
│   ├── package.json             # ✅ React dependencies
│   └── backend/
│       ├── database.js          # ✅ PostgreSQL setup
│       ├── server.js
│       ├── package.json
│       └── .env                 # DATABASE_URL (also in Vercel)
├── vercel.json                  # ✅ Updated config
└── package.json                 # Root package.json
```

---

## Environment Variable Reference

### Required for Production (Vercel)
```bash
DATABASE_URL=postgresql://...  # From Supabase
NODE_ENV=production            # (Vercel sets automatically)
```

### Optional for AI Features
```bash
OPENAI_API_KEY=sk-...          # For AI analysis
OPENAI_API_KEY_SUMMARY=sk-...  # For quiz summaries
OPENAI_API_KEY_RESOURCES=sk-.. # For resource recommendations
```

### Local Development Only (.env)
These should NOT be committed to git:
- Real API keys
- Test database credentials

---

## After Deployment Checklist

- [ ] Frontend loads at `https://your-project.vercel.app`
- [ ] Can navigate between pages
- [ ] Quiz page loads questions
- [ ] Can submit quiz
- [ ] Results page displays correctly
- [ ] Data saves to database
- [ ] AI analysis works (if enabled)
- [ ] Can view learning plans

---

## Advanced: Custom Domain

After successful deployment:

1. In Vercel Dashboard, go to **Settings** → **Domains**
2. Add your custom domain
3. Update DNS records at your domain provider
4. Wait for DNS propagation (5-30 minutes)
5. Your site will be available at your custom domain

---

## Support & Monitoring

### Vercel Dashboard
- **Deployments**: See all versions
- **Logs**: Monitor real-time activity
- **Analytics**: Track performance
- **Settings**: Manage environment variables

### Supabase Dashboard
- **Database**: View tables and data
- **Logs**: Monitor database queries
- **Settings**: Manage connection limits

---

## Next Steps

1. ✅ Deploy to Vercel
2. ✅ Verify database connection
3. ✅ Test all features
4. ✅ Add custom domain (optional)
5. ✅ Monitor performance
6. ✅ Set up automatic deployments

---

## Quick Reference Commands

```bash
# Build locally (same as Vercel)
npm run build

# Deploy to Vercel
vercel --prod

# Check deployment
vercel ls

# View logs
vercel logs --prod

# Redeploy (to update environment variables)
vercel --prod --force
```

---

**Status**: ✅ Ready for Vercel Deployment
**Database**: ✅ PostgreSQL with Supabase
**Frontend**: ✅ React optimized build
**Backend**: ✅ Serverless Express functions
**Environment**: ✅ All variables configured

Your STEM project is production-ready! 🚀

