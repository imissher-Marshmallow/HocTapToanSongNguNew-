# Vercel Deployment Setup

## Database Configuration

### Step 1: Set DATABASE_URL Environment Variable on Vercel

1. Go to your Vercel dashboard
2. Select your project
3. Go to **Settings → Environment Variables**
4. Add a new environment variable:
   - **Name:** `DATABASE_URL`
   - **Value:** Copy your Supabase connection string from Supabase Dashboard → Settings → Database → Connection Strings → URI
   - Example: `postgresql://user:password@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres`

### Step 2: Rebuild and Redeploy

Once `DATABASE_URL` is set, redeploy your app:
```bash
git push origin main
```

Vercel will:
- Install all dependencies including `pg`
- Connect to Supabase PostgreSQL
- Create database tables automatically
- Start using cloud storage

### Step 3: Verify Connection

After deployment, check your Vercel logs:
```bash
vercel logs --prod
```

You should see:
```
[DB] Using PostgreSQL (cloud database)
[DB] ✅ PostgreSQL connected
✓ Users table ready
✓ Results table ready
✓ Learning plans table ready
```

## Troubleshooting

**Problem:** `[DB] Using SQLite (local database)` appears in logs
- **Solution:** Make sure `DATABASE_URL` is set in Vercel environment variables

**Problem:** `Cannot find module 'pg'`
- **Solution:** This is normal — `pg` is only installed on Vercel during build. It won't be in your local node_modules unless you run `npm install pg`.

**Problem:** PostgreSQL connection fails
- **Solution:** 
  1. Verify `DATABASE_URL` is correct (copy directly from Supabase)
  2. Check Supabase is running and accessible
  3. Add Vercel's IP to Supabase firewall if required

## Switching Between Local and Cloud

- **Local development:** Use SQLite (automatic fallback if DATABASE_URL not set)
- **Vercel production:** Set DATABASE_URL → uses PostgreSQL automatically

Same code works everywhere!
