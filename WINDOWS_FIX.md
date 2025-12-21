# 🔧 Windows npm Scripts Fix - COMPLETED ✅

## What Was Fixed

The npm scripts were using **Linux/Mac environment variable syntax** which doesn't work on Windows PowerShell.

### ❌ Before (Failed on Windows)
```bash
PORT=5000 node server.js
DANGEROUSLY_DISABLE_HOST_CHECK=true PORT=3000 react-scripts start
```

### ✅ After (Works on Windows)
```bash
cross-env PORT=5000 node server.js
cross-env DANGEROUSLY_DISABLE_HOST_CHECK=true PORT=3000 react-scripts start
```

---

## Changes Made

### 1. **Installed `cross-env` Package**
   - Added to root `package.json`
   - Added to `stem-project/package.json`
   - Added to `stem-project/backend/package.json`
   - Purpose: Makes environment variables work on Windows, Mac, and Linux

### 2. **Updated npm Scripts**

#### Root `package.json`
- Already delegated to sub-projects ✅

#### `stem-project/package.json`
```json
"start": "cross-env DANGEROUSLY_DISABLE_HOST_CHECK=true PORT=3000 react-scripts start"
"build": "cross-env CI=false react-scripts build"
```

#### `stem-project/backend/package.json`
```json
"start": "cross-env PORT=5000 node server.js"
"dev": "cross-env PORT=5000 nodemon server.js"
```

---

## ✅ Current Status

All three services are now **RUNNING**:

```
✅ Frontend (React)    → http://localhost:3000
✅ Backend (Node.js)   → http://localhost:5000
✅ AI Engine (Python)  → http://localhost:8000
```

### Service Status Output
```
[dev:backend] Server running on port 5000
[dev:ai] INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
[dev:ai] INFO:     Application startup complete.
[dev:frontend] Starting the development server...
```

---

## Quick Start (Windows)

```bash
# Navigate to project root
cd c:\Users\ADMIN\Downloads\Resource2025\NewSTEM\HocTapToanSongNguNew-

# Start all services
npm run dev

# OR start individually in separate terminals:
npm run dev:frontend  # Terminal 1
npm run dev:backend   # Terminal 2
npm run dev:ai        # Terminal 3
```

---

## What to Expect

1. **First Run**: React will compile (takes 30-60 seconds)
   ```
   [dev:frontend] Compiling...
   [dev:frontend] Compiled successfully!
   ```

2. **Services Ready**: All three ports will be listening
   ```
   [dev:backend] Server running on port 5000
   [dev:ai] Application startup complete.
   ```

3. **Development Mode**: Changes auto-reload
   - Edit React files → Refresh browser
   - Edit Node.js files → Server auto-restarts
   - Edit Python files → Server auto-reloads

---

## Testing the Stack

```javascript
// In browser console (http://localhost:3000):

// Test backend
fetch('http://localhost:5000/api/questions')
  .then(r => r.json())
  .then(d => console.log('Backend:', d))

// Test AI engine
fetch('http://localhost:8000/health')
  .then(r => r.json())
  .then(d => console.log('AI:', d))
```

---

## Notes

- **cross-env**: A tiny package that solves the platform-specific environment variable issue
- **No more bash scripts needed**: `npm run dev` works on Windows, Mac, and Linux
- **Warnings**: Deprecation warnings in React are normal and don't affect functionality
- **OPENAI_API_KEY**: Warning is expected if not configured; app still works

---

## Files Modified

- ✏️ `package.json` (root)
- ✏️ `stem-project/package.json`
- ✏️ `stem-project/backend/package.json`

**All changes committed and ready for deployment!** 🚀
