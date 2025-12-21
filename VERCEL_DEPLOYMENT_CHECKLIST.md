# ✅ Vercel Deployment Checklist

## Pre-Deployment Checks

### Code Quality
- [ ] No console errors or warnings in browser
- [ ] API endpoints respond correctly
- [ ] Database connection working locally
- [ ] All routes properly configured
- [ ] Environment variables set correctly

### Testing Checklist
- [ ] Quiz page loads and displays questions
- [ ] Can submit quiz and see results
- [ ] Result page displays correctly with all sections
- [ ] Database saves quiz responses
- [ ] AI analysis works (if enabled)
- [ ] Learning plans generate correctly
- [ ] Navigation works on all pages
- [ ] Responsive design looks good on mobile

### Database Checklist
- [ ] PostgreSQL/Supabase database created
- [ ] Connection string obtained from Supabase
- [ ] Schema tables created:
  - [ ] `users` table
  - [ ] `results` table
  - [ ] `learning_plans` table
- [ ] Test data saves to database
- [ ] Can query results from database
- [ ] Database backup configured (optional)

### Configuration Files
- [ ] `vercel.json` updated with correct settings
- [ ] `api/index.js` created as serverless wrapper
- [ ] `api/package.json` has all dependencies including `pg`
- [ ] `stem-project/package.json` has all dependencies
- [ ] `stem-project/backend/package.json` has all dependencies
- [ ] `.env` file not committed to git
- [ ] `.gitignore` includes `.env` and `node_modules/`

---

## Vercel Deployment Steps

### Step 1: Prepare Repository
```bash
cd c:\Users\ADMIN\Downloads\Resource2025\NewSTEM\HocTapToanSongNguNew-
git add -A
git commit -m "Prepare for Vercel deployment"
git push origin main
```
- [ ] All changes committed
- [ ] Pushed to GitHub successfully

### Step 2: Create Vercel Project
- [ ] Go to [vercel.com](https://vercel.com)
- [ ] Sign in with GitHub
- [ ] Click "Add New Project"
- [ ] Select repository: `imissher-Marshmallow/HocTapToanSongNguNew-`
- [ ] Click "Import"

### Step 3: Configure Build Settings
- [ ] Framework Preset: **Other**
- [ ] Root Directory: **./** (blank)
- [ ] Build Command: `cd stem-project && npm install && npm run build`
- [ ] Output Directory: `stem-project/build`
- [ ] Install Command: `npm install` (default)

### Step 4: Set Environment Variables
- [ ] Add `DATABASE_URL` (from Supabase)
- [ ] (Optional) Add `OPENAI_API_KEY` for AI features
- [ ] Apply to: Production, Preview, Development
- [ ] Verify all variables are set before deploying

### Step 5: Deploy
- [ ] Click "Deploy" button
- [ ] Wait for build to complete
- [ ] Check for any build errors
- [ ] Verify deployment successful

---

## Post-Deployment Verification

### Frontend Tests
- [ ] App loads at `https://your-project.vercel.app`
- [ ] All pages accessible and display correctly
- [ ] Images load properly
- [ ] Responsive design works on mobile
- [ ] No console errors in browser

### Backend API Tests
```
Test these endpoints:

GET  https://your-project.vercel.app/api/health
GET  https://your-project.vercel.app/debug
POST https://your-project.vercel.app/api/results
```

- [ ] Health check endpoint responds
- [ ] Debug endpoint shows PostgreSQL in use
- [ ] API endpoints respond correctly
- [ ] CORS headers are proper

### Database Connection Tests
- [ ] Can submit quiz from website
- [ ] Results page displays successfully
- [ ] Data appears in Supabase dashboard
- [ ] Can query recent results
- [ ] No SQL errors in Vercel logs

### Feature Tests
- [ ] Quiz submission works end-to-end
- [ ] Score calculation correct
- [ ] Results saved to database
- [ ] Learning plans generate (if enabled)
- [ ] AI analysis works (if enabled)

---

## Monitoring & Maintenance

### Vercel Dashboard
- [ ] Monitor deployments regularly
- [ ] Check function logs for errors
- [ ] Monitor performance metrics
- [ ] Set up auto-deployments from main branch

### Supabase Dashboard
- [ ] Monitor database usage
- [ ] Check connection logs
- [ ] Verify data integrity
- [ ] Review security settings

### Automated Checks
- [ ] Set up GitHub Actions for tests (optional)
- [ ] Monitor uptime (optional)
- [ ] Set error alerts (optional)

---

## Troubleshooting Guide

### Build Fails
1. Check Vercel build logs for specific error
2. Try building locally: `npm run build`
3. Verify all dependencies in package.json
4. Check for missing files or imports

### API Not Working
1. Verify `/api/index.js` exists and is correct
2. Check `api/package.json` has `pg` and `express`
3. Verify DATABASE_URL environment variable is set
4. Check Vercel function logs

### Database Not Connecting
1. Verify DATABASE_URL is correct
2. Check Supabase is running
3. Verify connection string format
4. Check Supabase firewall allows Vercel IPs

### Frontend Not Loading
1. Check `stem-project/build/` directory exists
2. Verify `vercel.json` rewrites are correct
3. Check for 404 errors in Vercel logs
4. Try clearing browser cache

---

## Performance Optimization

### Before Going Live
- [ ] Enable gzip compression in Vercel
- [ ] Set up CDN for static assets
- [ ] Optimize images
- [ ] Minify CSS and JavaScript
- [ ] Set proper cache headers

### After Going Live
- [ ] Monitor Core Web Vitals
- [ ] Check performance metrics
- [ ] Optimize slow endpoints
- [ ] Review database query performance

---

## Security Checklist

- [ ] No sensitive data in logs
- [ ] Environment variables not in .env committed to git
- [ ] Database password secure and strong
- [ ] CORS properly configured
- [ ] API authentication in place (if needed)
- [ ] HTTPS enabled (automatic with Vercel)

---

## Rollback Plan

If deployment fails:

1. Go to Vercel Dashboard → Deployments
2. Click on previous successful deployment
3. Click "Promote to Production"
4. Verify app is working again

Alternative:
```bash
# View deployment history
vercel ls

# Rollback to specific deployment
vercel promote [deployment-id]
```

---

## Final Sign-Off

- [ ] All tests passed
- [ ] No critical errors
- [ ] Performance acceptable
- [ ] Ready for production
- [ ] Backup plan documented
- [ ] Team notified of deployment

---

**Deployment Date**: _____________
**Deployed By**: _____________
**Status**: ✅ Ready for Vercel

