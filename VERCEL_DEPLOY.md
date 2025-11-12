Vercel deployment guide for this repository

Goal
- Deploy the frontend (React) and Node serverless API routes to Vercel.
- The Python `ai_engine` is optional and should be deployed separately (recommended) because Vercel does not reliably support long-running Python servers in monorepos.

What this change did
- Removed the ai_engine pip install step from the root `vercel-build` script so Vercel builds won't fail trying to install Python packages.
- Replaced the OpenAI key in `ai_engine/.env` with a placeholder. Please rotate the key immediately if it was leaked.

Recommended Vercel setup (quick)
1. Create a Vercel project and connect your repository.
2. In the Vercel project settings > Environment Variables set the following (add for Production and Preview as needed):
   - OPENAI_API_KEY — your OpenAI API key
   - SUPABASE_URL — your Supabase project URL (optional; if you use Supabase from ai_engine)
   - SUPABASE_KEY — your Supabase anon or service key (if required by ai_engine)

3. Build & Output settings (defaults usually work):
   - Framework Preset: "Create React App" (or "Other" if you prefer)
   - Build Command: use the repo root `npm run vercel-build` (already present)
   - Output Directory: leave default (Vercel will detect and route the static `build` under `stem-project/build` via `vercel.json` rewrites)

Notes about ai_engine (Python)
- This repo contains a Python FastAPI service at `ai_engine/` intended to run on port 8000. Vercel's serverless Python functions are not a drop-in replacement for a continuously running FastAPI service.
- Recommended approaches:
  1) Deploy `ai_engine` to a separate host that supports Python (Fly, Render, Railway, Heroku, a VM, or a container). Set `AI_ENGINE_URL` in Vercel environment variables to point to this service (example: https://ai.example.com/analyze).
  2) Replace `ai_engine` features by using serverless Node functions (the `api/` folder includes a Node analyzer you can use as-is). This is the easiest path for full deployment to Vercel.

How to deploy the ai_engine separately (short)
- Example using Uvicorn (server host):
  - create a virtualenv, install `requirements.txt`, set environment variables, and run `uvicorn main:app --host 0.0.0.0 --port 8000`.
- If using a managed host, follow the provider docs to expose an HTTPS endpoint and set that URL as `AI_ENGINE_URL` in Vercel.

Verifying after deploy
- Once Vercel has deployed:
  - The site should be available at your Vercel URL.
  - The serverless API functions under `/api/*` (for example `/api/analyze-quiz`) will be handled by the code in the `api/` folder.
  - If `AI_ENGINE_URL` is set to a running FastAPI instance, the Node backend will call it; otherwise the Node analyzer will fallback to local analysis.

Security reminder
- Rotate any exposed API keys immediately. Add secrets to Vercel via the dashboard (do NOT commit keys to the repo).

Troubleshooting
- Build fails: check Vercel build logs. If it fails installing Python, make sure you removed Python steps from `vercel-build` (this repo has that change).
- OpenAI 429: add retries or lower call frequency; optionally use a cheaper model for fallback (gpt-3.5-turbo).

If you want, I can:
- Add a small serverless wrapper in `api/` that proxies calls to `ai_engine` only when `AI_ENGINE_URL` is set (and otherwise uses the local Node analyzer), to centralize behavior and make Vercel usage seamless.
- Add a small caching layer for validated resource links.

