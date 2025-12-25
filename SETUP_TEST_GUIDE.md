# 🚀 Quick Setup & Test Guide

## Port Configuration

Your backend runs on **port 5000** (not 3001 or 3000):
- Backend: `localhost:5000`
- Frontend: `localhost:3000` (or `localhost:5000` if configured)

See `backend/package.json` line 7: `"start": "cross-env PORT=5000 node server.js"`

---

## How to Run Everything

### **Terminal 1 - Start Backend**
```bash
cd stem-project/backend
npm install
npm start
```

Wait for this output:
```
Server running on port 5000
Features: Quiz API, Authentication, ML Integration
```

### **Terminal 2 - Start Frontend**
```bash
cd stem-project
npm install
npm start
```

Wait for this output:
```
Compiled successfully!
Local: http://localhost:3000
```

### **Terminal 3 - Run Test**
```bash
cd stem-project/backend
node test-userid-1.js
```

---

## Expected Test Output

If everything works:
```
======================================================================
🧪 PROFILE UPDATE TEST - User ID 1
======================================================================

1️⃣  GET INITIAL PROFILE
   Status: 200
   Quizzes taken: 0
   Sample scores: {"level1":0,"level2":0...

2️⃣  SUBMIT QUIZ
   Status: 200
   ✅ Quiz submitted
   Score: 55
   Has weakAreas: true
   Sample weak area: {"topic":"Algebra","score":11...

   ⏳ Waiting 2 seconds for database update...

3️⃣  GET UPDATED PROFILE
   Status: 200
   Quizzes taken: 1
   Sample scores: {"level1":25,"level2":20...

4️⃣  VERIFICATION
   ✅ PASS: Profile updated! (0 → 1 quizzes)
   ✅ Weak areas: [{"topic":"Geometry"...
   ✅ Strong areas: [{"topic":"Algebra"...

======================================================================
✅ TEST COMPLETE
```

---

## Troubleshooting

### **If backend fails to start**
```
Error: Port 5000 already in use
```
**Solution**: Kill the process using port 5000
```powershell
# Windows PowerShell
Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess | Stop-Process -Force

# Or just change port in backend/package.json
# "start": "cross-env PORT=5001 node server.js"
```

### **If test says "Connection refused"**
```
Error: connect ECONNREFUSED 127.0.0.1:5000
```
**Solution**: Make sure backend is running
```bash
# Check if it's running
netstat -ano | findstr :5000

# If not running, start it
cd backend && npm start
```

### **If test shows wrong data**
```
❌ FAIL: Profile not updated (still 0 quizzes)
```
**Solution**: Check Supabase connection
- Verify `.env` has correct SUPABASE_URL and SUPABASE_ANON_KEY
- Check if `user_learning_profiles` table exists
- Check server logs for Supabase errors

---

## Quick Test Steps (3 minutes)

1. **Open 3 terminals** side by side

2. **Terminal 1 - Backend**
   ```bash
   cd c:\Users\ADMIN\Downloads\Resource2025\STEMProjectReal\stem-project\backend
   npm start
   ```
   Wait for "Server running on port 5000"

3. **Terminal 2 - Frontend** (optional, for visual testing)
   ```bash
   cd c:\Users\ADMIN\Downloads\Resource2025\STEMProjectReal\stem-project
   npm start
   ```
   Wait for "Compiled successfully!"

4. **Terminal 3 - Run Test**
   ```bash
   cd c:\Users\ADMIN\Downloads\Resource2025\STEMProjectReal\stem-project\backend
   node test-userid-1.js
   ```

5. **Check output**:
   - ✅ If you see `✅ PASS`, everything works!
   - ❌ If you see error, check troubleshooting above

---

## What the Test Does

1. Gets initial learning profile for user 1
2. Submits a 20-question quiz
3. Waits 2 seconds for database to update
4. Gets profile again
5. Checks if quiz count increased (0 → 1)
6. Reports success or failure

---

## Manual Testing (If you prefer)

Instead of running the test script:

1. Go to http://localhost:3000 in browser
2. Take an Adaptive Quiz (answer some questions)
3. Click Submit
4. Check Result Page:
   - ✅ Shows topic feedback with emoji?
   - ✅ Shows weakness severity badges?
5. Go to Learning Profile
6. Check if quiz count increased
7. Check if weak areas populated

---

## Files Ready to Deploy

Once test passes:

```bash
# Build for production
cd stem-project
npm run build

# Deploy to Vercel/Netlify
vercel --prod
# OR
netlify deploy --prod
```

---

**Let me know when you run it and what happens!** 🚀
