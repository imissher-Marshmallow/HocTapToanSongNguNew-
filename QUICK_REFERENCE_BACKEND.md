# ⚡ Quick Reference - Backend Implementation

## Three Fixes - Quick Overview

### 1️⃣ Random Quiz (Contest1 Issue)
**Status**: ✅ Working correctly
**Evidence**: All 5 contests properly randomized in code
**Test**: `curl http://localhost:5000/api/questions/random` (multiple times)

---

### 2️⃣ Anti-Cheat Scoring
**Problem**: Cheaters auto-submit with few answers but score high
**Solution**: Flag suspicious scores with `isFlaggedForCheating`

**In Response**:
```javascript
{
  score: 5,
  isFlaggedForCheating: true,
  cheatReason: "Auto-submitted with only 5/10 answers",
  isAutoSubmitted: true
}
```

**Teacher Action**: Don't count flagged scores in statistics

---

### 3️⃣ Multi-Agent API Keys
**Problem**: Single API key hits RPM limits under load
**Solution**: Separate keys for summary and resources

**Environment Variables** (Pick ONE option):

**Option A - Single Key** (Simple)
```env
OPENAI_API_KEY=sk-proj-xxxxx...
```

**Option B - Two Keys** (Recommended) ⭐
```env
OPENAI_API_KEY_SUMMARY=sk-proj-key1...
OPENAI_API_KEY_RESOURCES=sk-proj-key2...
```

**Option C - Three Keys** (Maximum)
```env
OPENAI_API_KEY_SUMMARY=sk-proj-key1...
OPENAI_API_KEY_RESOURCES=sk-proj-key2...
OPENAI_API_KEY=sk-proj-key3...
```

---

## Deployment Workflow

### 1. Local (.env)
```bash
cd stem-project/backend
echo 'OPENAI_API_KEY_SUMMARY=sk-proj-...' >> .env
echo 'OPENAI_API_KEY_RESOURCES=sk-proj-...' >> .env
npm start  # Check console for key detection
```

### 2. Test
```bash
# Test random
curl http://localhost:5000/api/questions/random

# Test anti-cheat
curl -X POST http://localhost:5000/api/analyze-quiz \
  -H "Content-Type: application/json" \
  -d '{"userId":"t","quizId":"r","answers":[{"questionId":1,"selectedOption":"A"}],"isAutoSubmitted":true}'
```

### 3. Commit
```bash
git add . && git commit -m "backend: multi-key API, anti-cheat flagging"
git push origin main
```

### 4. Vercel Settings
Dashboard → Project → Settings → Environment Variables → Add:
```
OPENAI_API_KEY_SUMMARY = sk-proj-...
OPENAI_API_KEY_RESOURCES = sk-proj-...
```

### 5. Redeploy
```bash
# Auto-redeployed by git push, OR
# Manual: Vercel Dashboard → Deployments → Latest → Redeploy
```

---

## Files Changed

| File | Lines | Change |
|------|-------|--------|
| analyzer.js | 1-40 | Multi-key init |
| analyzer.js | 187 | Use summary key |
| analyzer.js | 190-195 | Track auto-submit |
| analyzer.js | 320-328 | Flag cheating |
| analyzer.js | 427-431 | Return flags |
| webSearchResources.js | 1-30 | Multi-key init |
| QuizPage.jsx | 235 | Send isAutoSubmitted |

---

## Environment Variables

**Add to Vercel**:
1. Go to https://vercel.com/dashboard
2. Select project
3. Settings → Environment Variables
4. Add two fields:
   - Name: `OPENAI_API_KEY_SUMMARY` Value: `sk-proj-...`
   - Name: `OPENAI_API_KEY_RESOURCES` Value: `sk-proj-...`
5. Select all environments
6. Save & Redeploy

---

## Testing

```bash
# 1. Key detection
npm start
# Look for: ✓ OPENAI_API_KEY_SUMMARY detected

# 2. Random contests
curl http://localhost:5000/api/questions/random | jq .contestKey
# Run 5 times - should vary

# 3. Anti-cheat
curl -X POST http://localhost:5000/api/analyze-quiz \
  -H "Content-Type: application/json" \
  -d '{
    "userId":"test",
    "quizId":"random",
    "answers":[{"questionId":1,"selectedOption":"A"}],
    "isAutoSubmitted":true
  }' | jq '.isFlaggedForCheating'
# Expected: true
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Contest1 repeating | Normal (random), not a bug |
| 401 API error | Check key validity at openai.com |
| Env vars not working | Redeploy after setting |
| Cheat flag not showing | Check if <50% answered |

---

## Summary

✅ **All 3 issues fixed**
✅ **Code deployed locally**
✅ **Ready for Vercel**
✅ **Documentation complete**

**Next**: Add env vars to Vercel and push!

---

**Key Variable Names for Vercel**:
- `OPENAI_API_KEY_SUMMARY`
- `OPENAI_API_KEY_RESOURCES`
- `OPENAI_API_KEY` (optional fallback)
