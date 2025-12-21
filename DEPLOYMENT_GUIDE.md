# 🚀 Adaptive Learning System - Deployment Guide

## Pre-Deployment Verification

Before deploying to production, verify everything is working:

### 1. Local Testing
```bash
# Terminal 1: Start Frontend
cd stem-project
npm install
npm start
# Should open http://localhost:3000

# Terminal 2: Start Backend (if not on Vercel)
cd stem-project/backend
npm install
npm start
# Server should run on http://localhost:5000

# Test in browser:
# - Go to http://localhost:3000
# - Navigate to http://localhost:3000/adaptive/profile
# - Should see learning profile (may be empty initially)
# - Click to take quiz
# - Submit answers
# - Should see results with analysis
```

### 2. API Testing
```bash
# Test each endpoint with curl or Postman:

# Get profile
curl http://localhost:5000/api/adaptive/profile/user123

# Get personalized quiz
curl http://localhost:5000/api/adaptive/quiz/personalized

# Analyze quiz (POST)
curl -X POST http://localhost:5000/api/adaptive/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "answers": [{"questionId": "q1", "answer": "option2"}],
    "timeSpent": 45
  }'
```

### 3. Component Testing
```javascript
// In browser console, verify:
console.log('LearningProfile loaded:', typeof LearningProfile);
console.log('AdaptiveQuiz loaded:', typeof AdaptiveQuiz);
```

---

## Deployment Steps

### Step 1: Prepare Environment Variables

Create or update `.env` file in `stem-project/`:

```env
# Frontend (.env in root)
REACT_APP_API_URL=https://your-vercel-app.vercel.app
REACT_APP_API_URL_LOCAL=http://localhost:5000

# Backend (.env in backend/)
PORT=5000
NODE_ENV=production
CORS_ORIGIN=https://your-vercel-app.vercel.app,https://your-custom-domain.com
```

### Step 2: Build Frontend

```bash
cd stem-project
npm run build

# Output: build/ folder with optimized files
# Check: build/index.html, build/static/
```

### Step 3: Deploy Frontend to Vercel

**Option A: Using Vercel CLI**
```bash
npm install -g vercel
vercel

# Follow prompts:
# - Connect to GitHub
# - Select stem-project folder
# - Set environment variables
# - Deploy
```

**Option B: GitHub Integration**
1. Push to GitHub
2. Go to vercel.com
3. Import project from GitHub
4. Set environment variables in project settings
5. Deploy

**Option C: Manual Upload**
```bash
vercel --prod
```

### Step 4: Deploy Backend to Vercel Serverless

Create `vercel.json` in backend/:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "server.js"
    }
  ],
  "env": {
    "CORS_ORIGIN": "@cors_origin",
    "NODE_ENV": "production"
  }
}
```

Deploy backend:
```bash
cd backend
vercel --prod
```

### Step 5: Update API URL

After deployment, update Frontend environment:

1. Go to Vercel project settings
2. Update `REACT_APP_API_URL` to your backend URL
3. Redeploy frontend:
   ```bash
   vercel --prod
   ```

### Step 6: Database Setup (Optional - for persistence)

If using Supabase:

```sql
-- Create tables in Supabase SQL editor

-- User Learning Profiles
CREATE TABLE user_learning_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,
  level1_score INTEGER DEFAULT 0,
  level2_score INTEGER DEFAULT 0,
  level3_score INTEGER DEFAULT 0,
  level4_score INTEGER DEFAULT 0,
  quizzes_taken INTEGER DEFAULT 0,
  last_quiz_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Cognitive Level Scores
CREATE TABLE cognitive_level_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  level INTEGER (1-4) NOT NULL,
  score INTEGER (0-100) NOT NULL,
  status TEXT (MASTERED/DEVELOPING/NEEDS_WORK/NOT_READY),
  quiz_attempt_number INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES user_learning_profiles(user_id)
);

-- Quiz Attempts
CREATE TABLE quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  quiz_id TEXT DEFAULT 'personalized',
  answers JSONB,
  score INTEGER,
  time_spent INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES user_learning_profiles(user_id)
);
```

### Step 7: Enable Row-Level Security (RLS)

```sql
-- Enable RLS on tables
ALTER TABLE user_learning_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cognitive_level_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Create policies (allow users to see only their data)
CREATE POLICY "Users can view own profile"
ON user_learning_profiles FOR SELECT
USING (user_id = auth.uid()::text);

CREATE POLICY "Users can update own profile"
ON user_learning_profiles FOR UPDATE
USING (user_id = auth.uid()::text);
```

### Step 8: Update API to Use Database

In `backend/routes/adaptive.js`, replace mock data with real queries:

```javascript
// Replace mock with:
const { data: profile } = await supabase
  .from('user_learning_profiles')
  .select('*')
  .eq('user_id', userId)
  .single();

if (!profile) {
  // Create new profile
  await supabase
    .from('user_learning_profiles')
    .insert([{ user_id: userId, ... }]);
}
```

---

## Post-Deployment Testing

### 1. Verify Deployment

```bash
# Check frontend
curl https://your-vercel-app.vercel.app/
# Should return HTML

# Check backend
curl https://your-backend-url/api/adaptive/profile/test
# Should return JSON
```

### 2. Test Real Routes

1. Open frontend URL in browser
2. Navigate to `/adaptive/profile`
3. Should see profile (or empty state)
4. Click "Take Quiz"
5. Complete quiz
6. View results

### 3. Monitor Performance

In Vercel dashboard:
- Check deployment status
- Monitor function calls
- Check error logs
- Review performance metrics

### 4. Test Error Handling

```bash
# Test with invalid userId
curl https://your-backend-url/api/adaptive/profile/invalid123

# Test with missing auth (if implemented)
curl -H "Authorization: Bearer invalid_token" \
  https://your-backend-url/api/adaptive/profile/user123
```

---

## Production Configuration Checklist

```
Security
□ CORS configured correctly
□ Rate limiting enabled
□ Security headers set (Helmet.js)
□ Environment variables not exposed
□ HTTPS enforced
□ API keys rotated
□ Database backup configured

Performance
□ Frontend optimized (npm run build)
□ Images compressed
□ CSS/JS minified
□ Caching configured
□ CDN enabled (Vercel provides)

Monitoring
□ Error tracking (Sentry/LogRocket)
□ Performance monitoring (Vercel analytics)
□ User tracking (Google Analytics)
□ Uptime monitoring (Pingdom)
□ Log aggregation (LogRocket)

Database (if using)
□ Backups automated daily
□ RLS policies configured
□ Indexes created on frequent queries
□ SSL connection required
□ Encryption at rest

Authentication (if implementing)
□ Supabase Auth configured
□ JWT tokens validated
□ Password requirements set
□ Session timeout configured
□ Rate limiting on auth endpoints
```

---

## Troubleshooting Deployment

### Issue: "CORS error" on frontend
**Solution:**
1. Verify `CORS_ORIGIN` environment variable
2. Check backend CORS configuration
3. Frontend URL must be in whitelist
4. Test with `curl -H "Origin: ..."` 

### Issue: "Cannot find module" error
**Solution:**
1. Verify all dependencies in package.json
2. Run `npm install` before building
3. Check import paths
4. Ensure build files are included

### Issue: API returns 404
**Solution:**
1. Verify API URL in frontend env
2. Check routes registered in backend
3. Test route directly with curl
4. Check backend logs for errors

### Issue: Slow performance
**Solution:**
1. Check function execution time (Vercel dashboard)
2. Profile database queries
3. Add caching layer
4. Optimize quiz data loading
5. Use CDN for static assets

### Issue: Database connection errors
**Solution:**
1. Verify Supabase URL and key
2. Check database credentials
3. Ensure IP whitelist configured
4. Test connection locally first
5. Check connection pooling settings

---

## Rollback Plan

If something goes wrong:

### Quick Rollback
```bash
# Vercel automatically keeps previous deployments
# Go to Vercel dashboard → Deployments
# Click "Promote" on previous good version
```

### Manual Rollback
```bash
# Revert code
git revert HEAD

# Rebuild and redeploy
npm run build
vercel --prod
```

### Database Rollback
```bash
# Restore from backup
# In Supabase dashboard: Backups → Restore
```

---

## Maintenance Checklist (Weekly)

```
Every Week:
□ Check error logs (Vercel/Sentry)
□ Review performance metrics
□ Check database query performance
□ Monitor API response times
□ Review user feedback

Every Month:
□ Update dependencies (npm update)
□ Run security audit (npm audit)
□ Review analytics
□ Update learning path questions
□ Backup database

Every Quarter:
□ Full security review
□ Performance optimization
□ User research/feedback
□ Update deployment process
□ Plan feature releases
```

---

## Monitoring & Alerts

### Set Up Monitoring

1. **Vercel Analytics**
   - Go to project settings
   - Enable Web Analytics
   - Track page views and performance

2. **Sentry Error Tracking**
   ```javascript
   // In frontend
   import * as Sentry from "@sentry/react";
   Sentry.init({ dsn: process.env.SENTRY_DSN });
   ```

3. **Google Analytics**
   ```javascript
   // Track custom events
   gtag('event', 'quiz_completed', {
     quiz_id: 'personalized',
     score: 75
   });
   ```

### Configure Alerts

Set up notifications for:
- High error rate (>5% of requests)
- Slow response times (>2 seconds)
- Database connection failures
- API quota exceeded
- Unexpected traffic spikes

---

## Scaling Considerations

### When You Have 100+ Users
- Add database indexing on frequently queried fields
- Implement caching (Redis)
- Monitor API response times
- Consider read replicas for database

### When You Have 1000+ Users
- Implement API rate limiting
- Use CDN for static assets
- Optimize database queries
- Consider separate backend services
- Implement queue system for async tasks

### When You Have 10000+ Users
- Microservices architecture
- Message queue (RabbitMQ/Kafka)
- Multiple database replicas
- Advanced caching strategies
- Load balancer for backend
- Dedicated analytics infrastructure

---

## Support & Backup Plans

### Emergency Contacts
- Vercel Support: support@vercel.com
- Supabase Support: support@supabase.io
- OpenAI Support: help.openai.com

### Disaster Recovery Plan
1. **RTO (Recovery Time Objective):** 1 hour
2. **RPO (Recovery Point Objective):** 1 hour
3. **Backup location:** Supabase automated backups
4. **Testing:** Monthly restore test

---

## Success Metrics (Post-Deployment)

Track these metrics:

```
Technical Metrics:
- Uptime: >99.5%
- API response time: <500ms
- Frontend load time: <3s
- Error rate: <0.1%

User Metrics:
- Daily active users
- Quiz completion rate
- Average session duration
- User retention rate
- Proficiency improvement rate

Business Metrics:
- Cost per user
- Infrastructure costs
- Support ticket volume
- User satisfaction score
```

---

## Final Checklist Before Going Live

```
Code
□ All tests passing
□ No console errors
□ No warnings
□ Code reviewed
□ Documentation updated

Frontend
□ Builds successfully
□ Mobile responsive
□ Accessibility checked
□ Performance optimized
□ Styles working

Backend
□ All endpoints tested
□ Error handling works
□ Logging configured
□ Rate limiting enabled
□ CORS configured

Security
□ HTTPS enforced
□ API keys secured
□ Secrets not in code
□ CORS origin restricted
□ Rate limiting set

Infrastructure
□ Frontend deployed
□ Backend deployed
□ Database ready
□ Environment variables set
□ Backups configured

Monitoring
□ Error tracking live
□ Analytics enabled
□ Alerts configured
□ Logs aggregated
□ Health checks working

Documentation
□ API docs updated
□ Deployment guide ready
□ Troubleshooting guide ready
□ Code commented
□ README updated

Team
□ Deployment plan understood
□ Rollback procedure known
□ Support plan in place
□ Team trained
□ On-call rotation setup
```

---

## After Going Live - First Week

### Daily
- Monitor error logs
- Check performance metrics
- Review user feedback
- Be ready to fix critical issues

### After 3 Days
- Verify all features working
- Collect user feedback
- Monitor error patterns
- Optimize if needed

### After 1 Week
- Review deployment success
- Gather team feedback
- Plan next features
- Schedule retrospective

---

**Deployment Guide Version:** 1.0
**Status:** Ready for Production
**Last Updated:** 2025

You're ready to deploy! 🚀
