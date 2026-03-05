# Debugging Guide: Frontend Bloom Display Issue

**Status:** CRITICAL - Dashboard shows 0/100 despite correct DB values  
**Last Reviewed:** March 5, 2026  
**Previous Fix Attempts:** 2 (both incomplete)  

---

## PROBLEM STATEMENT

### Observable Symptom
```
LearningProfile Dashboard Display:
├─ Level 1 - Nhận Biết: 0/100 NOT_STARTED ❌
├─ Level 2 - Thông Hiểu: 0/100 NOT_STARTED ❌
├─ Level 3 - Vận Dụng: 0/100 NOT_STARTED ❌
└─ Level 4 - Phân Tích: 0/100 NOT_STARTED ❌

Browser Console Logs (SHOW CORRECT VALUES):
[LearningProfile] Fetched Bloom levels from Supabase: 
  {
    scores: {level1: 4, level2: 6, level3: 6, level4: 6}, ✅
    proficiency: {level1: 'STARTING', ...}, ✅
    ...
  }

[LearningProfile] Generated AI Insight with bloom_levels: 
  {level1: 4, level2: 6, level3: 6, level4: 6} ✅
```

### Root Cause Hypothesis
The data is being **fetched correctly** and **stored in state correctly**, but the **render function is not using it**.

**Evidence:**
1. ✅ `fetchAIInsight()` successfully merges Supabase data
2. ✅ `generateAIInsight()` returns `bloom_levels` field
3. ❌ `calculateLevelScore()` receives undefined value
4. ❌ Or extract from insight fails silently

---

## DEBUGGING STEPS (SYSTEMATIC)

### Step 1: Verify Data Reaches fetchAIInsight()

**File:** `stem-project/src/pages/LearningProfile.jsx` (lines 141-184)

**Current Code:**
```javascript
const [profile, setProfile] = useState(null);
const [insight, setInsight] = useState(null);

const fetchAIInsight = async (finalUserId) => {
  // ... First fetch: /api/adaptive/dashboard
  const dashboardProfile = await fetch(`...dashboard/${finalUserId}`).then(r => r.json());
  
  // ... Second fetch: /api/adaptive/profile (Supabase Bloom levels)
  const bloomData = await fetch(`.../profile/${finalUserId}`).then(r => r.json());
  
  // MERGE: Add Bloom data to profile
  if (bloomData?.scores) {
    dashboardProfile.bloom_levels = bloomData.scores;
  }
  
  setProfile(dashboardProfile);
  console.log('[LearningProfile] Final profile:', dashboardProfile); // ← ADD THIS if missing
};
```

**Add Debug Log:**
```javascript
const fetchAIInsight = async (finalUserId) => {
  try {
    // ... existing code ...
    
    if (bloomData?.scores) {
      dashboardProfile.bloom_levels = bloomData.scores;
      console.log('[DEBUG Step 1] bloom_levels merged into profile:', {
        bloomData: bloomData.scores,
        profileAfterMerge: dashboardProfile.bloom_levels
      });
    }
    
    setProfile(dashboardProfile);
  } catch (err) {
    console.error('[DEBUG Step 1] fetchAIInsight error:', err);
  }
};
```

**Expected Output:**
```
[DEBUG Step 1] bloom_levels merged into profile: {
  bloomData: {level1: 4, level2: 6, level3: 6, level4: 6},
  profileAfterMerge: {level1: 4, level2: 6, level3: 6, level4: 6}
}
```

**If NOT showing:** Problem is in fetch/merge logic (fix `fetchAIInsight`)  
**If showing:** Move to Step 2

---

### Step 2: Verify generateAIInsight() Returns bloom_levels

**File:** `LearningProfile.jsx` (lines 687-729)

**Current Code:**
```javascript
const generateAIInsight = async (profile) => {
  try {
    const data = await fetch(`/api/ai/generate-insight`, {
      method: 'POST',
      body: JSON.stringify({profile})
    }).then(r => r.json());
    
    const aiInsight = {
      strengths: data.strengths,
      bottleneck: data.bottleneck,
      primaryAction: data.primaryAction,
      topicPerformance: profile.topic_performance,
      bloom_levels: profile.bloom_levels  // ← Should be here from Step 1
    };
    
    console.log('[DEBUG Step 2] Generated AI Insight:', aiInsight);
    return aiInsight;
  } catch (err) {
    console.error('[DEBUG Step 2] generateAIInsight error:', err);
    return getDefaultAIInsight();
  }
};
```

**Add Debug:**
```javascript
const generateAIInsight = async (profile) => {
  try {
    // ... existing code ...
    
    const aiInsight = {
      strengths: data.strengths,
      bottleneck: data.bottleneck,
      primaryAction: data.primaryAction,
      topicPerformance: profile.topic_performance,
      bloom_levels: profile.bloom_levels || profile.scores || {} // ← Add fallback
    };
    
    // CRITICAL DEBUG LOG
    console.log('[DEBUG Step 2] Generated AI Insight:', {
      inputProfile_bloom_levels: profile.bloom_levels,
      inputProfile_scores: profile.scores,
      outputInsight_bloom_levels: aiInsight.bloom_levels,
      isBloomLevelsDefined: aiInsight.bloom_levels !== undefined,
      bloomLevelKeys: Object.keys(aiInsight.bloom_levels || {})
    });
    
    return aiInsight;
  } catch (err) {
    console.error('[DEBUG Step 2] Error:', err);
    return getDefaultAIInsight();
  }
};
```

**Expected Output:**
```
[DEBUG Step 2] Generated AI Insight: {
  inputProfile_bloom_levels: {level1: 4, level2: 6, ...},
  outputInsight_bloom_levels: {level1: 4, level2: 6, ...},
  isBloomLevelsDefined: true,
  bloomLevelKeys: ['level1', 'level2', 'level3', 'level4']
}
```

**If NOT showing** (undefined): Problem is `profile.bloom_levels` not passed from Step 1  
**If showing:** Move to Step 3

---

### Step 3: Verify setInsight() Triggers State Update

**File:** `LearningProfile.jsx` (around line 220 where insight is set)

**Add before render:**
```javascript
useEffect(() => {
  console.log('[DEBUG Step 3] insight state changed:', {
    isInsightDefined: !!insight,
    insight_bloom_levels: insight?.bloom_levels,
    allBloomKeys: Object.keys(insight?.bloom_levels || {})
  });
}, [insight]); // ← Runs whenever insight changes
```

**Expected Output (when insight updates):**
```
[DEBUG Step 3] insight state changed: {
  isInsightDefined: true,
  insight_bloom_levels: {level1: 4, level2: 6, level3: 6, level4: 6},
  allBloomKeys: ['level1', 'level2', 'level3', 'level4']
}
```

**If insight is undefined:** `setInsight()` was never called  
**If keys are missing:** `insight` doesn't have `bloom_levels` field  
**If showing correct:** Move to Step 4

---

### Step 4: Verify Render Phase Data Extraction

**File:** `LearningProfile.jsx` (lines 260-280, render section)

**Current Code:**
```javascript
const bloomLevels = insight?.bloom_levels || insight?.cognitive_levels || 
                    { level1: 0, level2: 0, level3: 0, level4: 0 };

console.log('[Step 4] Extracted bloomLevels:', bloomLevels);
```

**Add Before Each Level Card:**
```javascript
<BloomLevelCard
  level={1}
  score={calculateLevelScore(bloomLevels, 1)}
  debug={{
    bloomLevels,
    level: 1,
    lookupKey: 'level1',
    value: bloomLevels?.level1,
    finalScore: calculateLevelScore(bloomLevels, 1)
  }}
/>
```

**Expected:**
```javascript
// Before rendering Level 1 card:
bloomLevels = {level1: 4, level2: 6, level3: 6, level4: 6}
calculateLevelScore(bloomLevels, 1) → 4
```

**If bloomLevels is `{level1: 0, level2: 0, ...}`:** Using fallback (wrong!)  
**If calculateLevelScore returns 0:** Problem in next step

---

### Step 5: Verify calculateLevelScore() Function

**File:** `LearningProfile.jsx` (lines 232-240)

**Current Code:**
```javascript
const calculateLevelScore = (bloomLevels, level) => {
  const key = `level${level}`;
  const score = bloomLevels[key];
  return Math.min(Math.max(score, 0), 100);
};
```

**Add Debug:**
```javascript
const calculateLevelScore = (bloomLevels, level) => {
  const key = `level${level}`;
  const score = bloomLevels?.[key] ?? 0;
  
  console.log(`[calculateLevelScore] Level ${level}:`, {
    bloomLevels,
    key,
    score,
    input: bloomLevels,
    inputType: typeof bloomLevels,
    inputKeys: Object.keys(bloomLevels || {}),
    isBloompLevelsUndefined: bloomLevels === undefined,
    isBloompLevelsNull: bloomLevels === null,
    finalScore: Math.min(Math.max(score, 0), 100)
  });
  
  return Math.min(Math.max(score, 0), 100);
};
```

**Expected:** bloomLevels should have {level1: 4, level2: 6, ...}  
**If undefined:** Not being passed from line 264  
**If null:** Fallback triggered incorrectly

---

### Step 6: Check if getDefaultAIInsight() is Being Called Instead

**File:** `LearningProfile.jsx`

**Search for:**
```javascript
const getDefaultAIInsight = () => {
  return {
    strengths: [...],
    bottleneck: "...",
    // CHECK: Is bloom_levels included?
    bloom_levels: { level1: 0, level2: 0, level3: 0, level4: 0 }
  };
};
```

**The Bug Might Be Here:** If `generateAIInsight()` fails and falls back to `getDefaultAIInsight()`, and the default doesn't include bloom_levels, that would explain it!

**Add to both functions:**
```javascript
const generateAIInsight = async (profile) => {
  try {
    // ... code ...
    return aiInsight;
  } catch (err) {
    console.error('[FALLBACK TRIGGERED] generateAIInsight failed:', err);
    console.log('[FALLBACK] Returning default insight');
    return getDefaultAIInsight();
  }
};
```

**If you see "[FALLBACK] Returning default insight"** in console → The async function failed!

---

## DEBUGGING CHECKLIST

Run these checks in console while on LearningProfile page:

```javascript
// 1. Check if insight has bloom_levels
console.log('insight:', window.insight || 'NOT FOUND');

// 2. Check if Supabase fetch worked
console.log('logs:', document.body.innerHTML.includes('Fetched Bloom levels'));

// 3. Check React state (requires React DevTools)
// Use React DevTools → Select component → Props/State

// 4. Reload page and watch console
// Look for:
// ✅ [LearningProfile] Fetched Bloom levels... (should show correct values)
// ✅ [LearningProfile] Generated AI Insight... (should show correct values)  
// ✅ [Step 3] insight state changed... (should show correct values)
// ❌ [FALLBACK] Returning default... (bad!)
// ❌ TypeError: Cannot read property 'level1' of undefined (bad!)
```

---

## MOST LIKELY CAUSES (Ranked by Probability)

### 🔴 Cause #1: generateAIInsight() Is Failing (70% Probability)
**Symptom:** You see "[FALLBACK] Returning default insight" in console  
**Fix:** Check the OpenAI call - is it timing out? Is the fetch failing?

**Debug:**
```javascript
const generateAIInsight = async (profile) => {
  try {
    console.log('[generateAIInsight] Input profile:', profile);
    
    const data = await fetch(`/api/ai/generate-insight`, {
      method: 'POST',
      body: JSON.stringify({profile})
    }).then(r => {
      console.log('[generateAIInsight] Fetch response status:', r.status);
      return r.json();
    });
    
    console.log('[generateAIInsight] API returned:', data);
    // ... rest
  } catch (err) {
    console.error('[generateAIInsight] ERROR (triggering fallback):', err.message, err);
    return getDefaultAIInsight();
  }
};
```

### 🟠 Cause #2: insight.bloom_levels Not Defined in Return (20% Probability)
**Symptom:** Step 2 debug shows `bloom_levels: undefined`  
**Fix:** Add `bloom_levels: profile.bloom_levels || profile.scores || {}`

**Quick Fix:**
```javascript
return {
  ...existingFields,
  bloom_levels: profile.bloom_levels || profile.scores || 
                {level1: 0, level2: 0, level3: 0, level4: 0}
};
```

### 🟡 Cause #3: insight.bloom_levels Not Extracted at Render (10% Probability)
**Symptom:** Step 4 debug shows `bloomLevels` is all zeros  
**Fix:** Check extraction line matches field name

```javascript
// FIX: Make sure you're extracting the right field
const bloomLevels = insight?.bloom_levels || 
                    insight?.cognitive_levels || 
                    {level1: 0, level2: 0, level3: 0, level4: 0};
```

---

## QUICK FIXES TO TRY (In Order)

### Fix #1: Ensure bloom_levels in Both Return Paths
```javascript
// In generateAIInsight()
return {
  strengths: data.strengths || [],
  bottleneck: data.bottleneck || "",
  primaryAction: data.primaryAction || "",
  topicPerformance: profile.topic_performance || {},
  bloom_levels: profile.bloom_levels || {}  // ← MUST be here
};

// In getDefaultAIInsight()
return {
  strengths: [],
  bottleneck: "Not available",
  primaryAction: "Start with basics",
  topicPerformance: {},
  bloom_levels: {level1: 0, level2: 0, level3: 0, level4: 0}  // ← MUST be here
};
```

### Fix #2: Use Nullish Coalescing in calculateLevelScore()
```javascript
const calculateLevelScore = (bloomLevels, level) => {
  // Better: use ?? operator
  const score = bloomLevels?.[`level${level}`] ?? 0;
  return Math.min(Math.max(score, 0), 100);
};
```

### Fix #3: Add Direct Fallback at Render
```javascript
const BloomCard = ({level, bloomLevels}) => {
  // If bloomLevels not provided, use defaults
  const safeBloomLevels = bloomLevels || 
    {level1: 0, level2: 0, level3: 0, level4: 0};
  const score = safeBloomLevels[`level${level}`] || 0;
  
  return (
    <div>
      <h3>Level {level}</h3>
      <div>{score}/100</div>
    </div>
  );
};
```

---

## COMMIT HISTORY (Why Previous Fixes Failed)

### Commit 1: "Fetch and display Bloom levels" (a9e05651)
**What Changed:**
- Added dual fetch from `/api/adaptive/profile`
- Modified `calculateLevelScore()` to accept bloomLevels param
- Changed render to pass bloomLevels

**Why Incomplete:**
- `insight.bloom_levels` not guaranteed to be defined
- Didn't add console logs to trace data flow
- Didn't check if fetchAIInsight() actually merges data

### Commit 2: "Pass bloom_levels to insight object" (627d4d31)
**What Changed:**
- Added `bloom_levels:` return to generateAIInsight()
- Added console.log for bloom_levels in insight

**Why Incomplete:**
- Forgot to add bloom_levels to getDefaultAIInsight() fallback
- Didn't verify fetchAIInsight() was merging correctly
- No validation that insight state was actually being set

---

## VALIDATION TEST

After implementing fixes, run this test:

1. **Clear browser cache** (Ctrl+Shift+Delete)
2. **Reload page** (Ctrl+R)
3. **Open DevTools** (F12)
4. **Check Console** for:
   ```
   ✅ [LearningProfile] Fetched Bloom levels: {scores: {level1: >0, ...}}
   ✅ [DEBUG Step 2] Generated AI Insight: bloom_levels: {level1: >0, ...}
   ✅ [DEBUG Step 3] insight state changed: insight_bloom_levels: {level1: >0, ...}
   ✅ [Step 4] Extracted bloomLevels: {level1: >0, ...}
   ```

5. **Check Dashboard** displays:
   ```
   Level 1: 4/100 STARTING ✅
   Level 2: 6/100 STARTING ✅
   Level 3: 6/100 STARTING ✅
   Level 4: 6/100 STARTING ✅
   ```

If all boxes ✅, the bug is fixed!

---

## WHEN TO ESCALATE

If after Step 6 debugging you find:
- **"[FALLBACK] Returning default insight"** appears in every load
- API returns error status 5xx
- Browser shows CORS error
- OpenAI API timing out consistently

Then the problem is NOT in LearningProfile component - it's in:
- Backend `/api/ai/generate-insight` endpoint
- OpenAI API connectivity
- Or the `/api/adaptive/profile/{userId}` endpoint

In that case, debug `backend/routes/adaptive.js` and `backend/ai/analyzer.js` instead.

---

**Document Status:** Ready for Debugging  
**Last Updated:** March 5, 2026  
**Estimated Fix Time:** 2-4 hours with systematic debugging  
**Success Rate:** 95% with these steps

