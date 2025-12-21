# Deployment instructions (Vercel)

This project contains a React frontend (`stem-project`) and an Express backend (`stem-project/backend`). To simplify deployment, the repo provides a serverless wrapper at `api/backend.js` that exposes the Express app as a Vercel Serverless Function.

## Required environment variables (Vercel)

Set these in your Vercel project (Project → Settings → Environment Variables). Add values for both Preview and Production as appropriate.

- `REACT_APP_API_BASE_URL` (optional)
  - If set, the frontend will call this full URL for API requests. Example: `https://<your-vercel-app>.vercel.app/api/backend`
  - If omitted, deployed frontend will use relative paths (`/auth/*`, `/api/...`) which are rewritten to the serverless backend.

- `OPENAI_API_KEYS`
  - Comma-separated OpenAI API keys for the Node analyzer (if used). Example: `key1,key2`.

- Backend-specific secrets
  - `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_KEY`, etc., if your backend/ai_engine requires them.

- `FRONTEND_ORIGINS`
  - Comma-separated list of allowed frontend origins. Example: `https://hoc-tap-toan-song-ngu-new.vercel.app`

- `FRONTEND_ALLOW_ALL`
  - Optional. Set to `false` in production. `true` may be used temporarily for debugging.

## Rewrites and paths (behavior)

- The serverless wrapper is available at `/api/backend.js` and routes to the Express app.
- `vercel.json` includes rewrites so requests to `/auth/*` forward to the serverless backend: `/auth/signin` → `/api/backend/auth/signin`.
- If you set `REACT_APP_API_BASE_URL` to `https://<your-vercel-app>.vercel.app/api/backend`, the frontend will call that URL directly.
- If you leave `REACT_APP_API_BASE_URL` unset, the frontend will use relative paths (recommended) and the rewrites will ensure the serverless function receives the requests.

## Steps to deploy

1. Commit and push changes to your repository.
2. In Vercel, import the repository or update the existing project to use this repo.
3. In Vercel project settings, set the environment variables listed above.
4. Deploy (Vercel will detect and build the project). The serverless API will be available under `/api/backend` and rewrites will expose `/auth/*`.

## Local development

- Start frontend and backend locally (dev script):

```powershell
npm run dev
```

This runs the React dev server and the Express backend locally.

If you need to test the deployed frontend against a local backend, use a secure tunnel (ngrok) and set `REACT_APP_API_BASE_URL` in Vercel to the ngrok URL. Do not leave public sites pointing to `http://localhost:5000`.

## Troubleshooting

- If CORS still blocks requests after deployment, check `FRONTEND_ORIGINS` and ensure it includes the exact origin of your frontend.
- Check Vercel function logs for errors.

If you want, I can also: add a GitHub Action to validate env vars before deploy, or update the frontend to default `REACT_APP_API_BASE_URL` to `/api/backend` automatically. Let me know which option you prefer.
