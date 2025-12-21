# Vercel Deployment Guide

This guide will help you deploy your STEM Project to Vercel with both frontend (React) and backend (Express API) working together.

## What I've Configured

### ✅ Files Updated:

1. **`api/index.js`** - Created serverless wrapper for Express backend
2. **`stem-project/backend/server.js`** - Updated to export app for serverless deployment
3. **`vercel.json`** - Simplified configuration for proper routing
4. **`package.json`** - Added commands for running both frontend and backend together

### ✅ New Commands:

- `npm start` - Runs **both** frontend and backend together (for production)
- `npm run dev` - Development mode (already working on Replit)
- `npm run vercel-build` - Build command for Vercel deployment

---

## Deployment Steps

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Push your code to GitHub** (if not already done):
   ```bash
   git add .
   git commit -m "Configure for Vercel deployment"
   git push
   ```

2. **Go to Vercel**:
   - Visit [vercel.com](https://vercel.com)
   - Sign in with your GitHub account
   - Click "Add New Project"

3. **Import your repository**:
   - Select your GitHub repository
   - Click "Import"

4. **Configure Build Settings**:
   - **Framework Preset**: Other
   - **Root Directory**: Leave blank (use project root)
   - **Build Command**: `npm run vercel-build`
   - **Output Directory**: `stem-project/build`
   - **Install Command**: `npm install`

5. **Add Environment Variables** (if needed):
   - Click "Environment Variables"
   - Add any secrets like `OPENAI_API_KEY` if you're using AI features
   - Example:
     - Name: `OPENAI_API_KEY`
     - Value: `your-api-key-here`

6. **Deploy**:
   - Click "Deploy"
   - Wait for deployment to complete (usually 2-3 minutes)

7. **Test your deployment**:
   - Visit the provided URL (e.g., `https://your-project.vercel.app`)
   - Test the API endpoint: `https://your-project.vercel.app/api/health`

### Option 2: Deploy via Vercel CLI

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   vercel --prod
   ```

4. **Follow the prompts**:
   - Link to existing project or create new one
   - Confirm settings
   - Wait for deployment

---

## How It Works

### Frontend (React)
- Built with `npm run build` in the `stem-project` folder
- Outputs to `stem-project/build`
- Served as static files by Vercel

### Backend (Express API)
- Located in `api/index.js` (serverless wrapper)
- Uses code from `stem-project/backend/`
- Runs as Vercel Serverless Function
- All API routes accessible at `/api/*`

### Routing
- `/api/*` → Backend serverless function
- `/*` → React frontend (static files)
- React Router handles client-side routing

---

## Testing Locally

### Test Development Mode:
```bash
npm run dev
```
This runs both frontend (port 5000) and backend (port 3000) separately.

### Test Production Mode Locally:
```bash
# First, build the frontend
npm run build

# Then run both frontend and backend
npm start
```
This serves the built frontend on port 5000 and backend on port 3000.

---

## Troubleshooting

### Issue: Getting 404 errors
**Solution**: Make sure all API routes in your frontend use `/api/` prefix:
```javascript
// ✅ Correct
fetch('/api/analyze-quiz')

// ❌ Wrong
fetch('/analyze-quiz')
```

### Issue: Environment variables not working
**Solution**: Add them in Vercel Dashboard → Settings → Environment Variables

### Issue: API routes not working
**Solution**: 
1. Check that all API routes are defined in `stem-project/backend/routes/quiz.js`
2. Make sure they're using the `/api` prefix in the router
3. Test the API endpoint directly: `https://your-app.vercel.app/api/health`

### Issue: Build fails on Vercel
**Solution**:
1. Check build logs in Vercel Dashboard
2. Make sure all dependencies are in `package.json`
3. Try building locally first: `npm run vercel-build`

---

## Important Notes

1. **API Routes**: All backend routes must use `/api/` prefix
2. **Environment Variables**: Set them in Vercel Dashboard, not just `.env` files
3. **Database**: If using a database, make sure it's accessible from Vercel
4. **CORS**: The backend is configured to allow all origins. Adjust in production if needed.

---

## Commands Reference

| Command | Description |
|---------|-------------|
| `npm run dev` | Run development mode (frontend + backend) |
| `npm run build` | Build frontend for production |
| `npm start` | Run production mode locally (both servers) |
| `npm run vercel-build` | Build command for Vercel deployment |

---

## Next Steps After Deployment

1. ✅ Test all features on the deployed URL
2. ✅ Add custom domain (optional) in Vercel Dashboard
3. ✅ Set up automatic deployments from your main branch
4. ✅ Monitor analytics and logs in Vercel Dashboard

---

## Support

If you encounter issues:
- Check Vercel deployment logs
- Test the API endpoint directly
- Verify environment variables are set
- Contact Vercel support or check their [documentation](https://vercel.com/docs)
