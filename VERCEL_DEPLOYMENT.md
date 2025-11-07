# Vercel Deployment Configuration

## Configuration Summary

### Build Settings (in Vercel Dashboard)

**Framework Preset:** `Create React App`

**Build Command:**
```bash
cd stem-project && npm install && npm run build
```

**Output Directory:**
```
stem-project/build
```

**Install Command:**
```bash
npm install
```

**Root Directory:** 
Leave as `.` (project root)

### Environment Variables

Add the following environment variable in your Vercel Project Settings:

| Name | Value |
|------|-------|
| `OPENAI_API_KEY` | Your OpenAI API key (starts with sk-) |
| `CI` | `false` (to treat warnings as warnings, not errors) |

**Important:** Set `CI=false` to prevent build failures from ESLint warnings during deployment.

### vercel.json Configuration

The project includes a `vercel.json` file with the following configuration:

```json
{
  "version": 2,
  "name": "stem-project",
  "builds": [
    {
      "src": "stem-project/package.json",
      "use": "@vercel/static-build",
      "config": {
        "zeroConfig": false,
        "buildCommand": "npm run build",
        "distDir": "build"
      }
    },
    {
      "src": "api/*.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    },
    {
      "handle": "filesystem"
    },
    {
      "src": "/(.*)",
      "dest": "stem-project/build/$1"
    }
  ]
}
```

## API Folder Structure

The `/api` folder now has its own `package.json` and all necessary dependencies:

```
api/
├── package.json          # API dependencies (openai, dotenv)
├── analyze-quiz.js       # POST /api/analyze-quiz
├── questions.js          # GET /api/questions
├── ai/
│   └── analyzer.js       # AI analysis logic
└── data/
    ├── questions_updated.json
    └── feedback.json
```

This structure ensures Vercel can install API dependencies independently.

## Deployment Steps

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Configure for Vercel deployment"
   git push origin main
   ```

2. **Import to Vercel:**
   - Go to https://vercel.com
   - Click "New Project"
   - Import your GitHub repository
   - Configure settings as described above

3. **Set Environment Variables:**
   - In Vercel Dashboard → Project → Settings → Environment Variables
   - Add `OPENAI_API_KEY` with your API key
   - Add `CI` set to `false`

4. **Deploy:**
   - Vercel will automatically deploy on push to main branch
   - Or click "Deploy" button in Vercel Dashboard

## What Was Fixed

### ESLint Errors (Build Failures)
✅ Removed unused import `Brain` from NavBar.jsx
✅ Removed unused variable `isScrolled` from NavBar.jsx
✅ Removed unused variable `isLandingPage` from NavBar.jsx
✅ Removed unused variables `expandedIds` and `toggleExpanded` from ResultPage.jsx

### API Configuration
✅ Created separate `package.json` in `/api` folder
✅ Copied analyzer.js and all dependencies to `/api/ai`
✅ Copied data files to `/api/data`
✅ Updated import paths to use relative paths within API folder
✅ Configured dotenv to work in serverless environment

## Testing Locally

Before deploying, test the build locally:

```bash
cd stem-project
npm run build
```

If successful, you'll see "Compiled successfully" message.

## Post-Deployment

After deployment, your app will be available at:
- `https://your-project-name.vercel.app`

API endpoints will be:
- `https://your-project-name.vercel.app/api/questions`
- `https://your-project-name.vercel.app/api/analyze-quiz`

## Troubleshooting

**Build Fails with ESLint Errors:**
- Set `CI=false` in environment variables

**API Returns 500 Error:**
- Check OPENAI_API_KEY is set correctly
- Check Vercel logs for detailed error messages

**Questions Not Loading:**
- Verify `/api/data/questions_updated.json` exists
- Check browser console for API errors
