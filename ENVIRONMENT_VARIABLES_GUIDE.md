# 🔑 Environment Variables Setup Guide

## Overview
Your backend now supports **separate OpenAI API keys** for different agents to avoid RPM (Requests Per Minute) limits. This allows you to balance workload across multiple API keys.

---

## Environment Variables

### Primary Keys (New - Recommended)

#### 1. `OPENAI_API_KEY_SUMMARY`
- **Purpose**: Used for AI summary generation (callLLMGenerateSummary)
- **Agent**: Summary generation engine
- **Type**: OpenAI API Key (sk-proj-...)
- **Required**: No (falls back to OPENAI_API_KEY)
- **Where Used**: `stem-project/backend/ai/analyzer.js` line 13-15
- **Example**:
  ```
  OPENAI_API_KEY_SUMMARY=sk-proj-xxxxx...
  ```

#### 2. `OPENAI_API_KEY_RESOURCES`
- **Purpose**: Used for resource recommendations and web search
- **Agent**: Resource fetching engine
- **Type**: OpenAI API Key (sk-proj-...)
- **Required**: No (falls back to OPENAI_API_KEY)
- **Where Used**: `stem-project/backend/ai/webSearchResources.js` line 14-16
- **Example**:
  ```
  OPENAI_API_KEY_RESOURCES=sk-proj-yyyyy...
  ```

### Fallback Key (Legacy Support)

#### 3. `OPENAI_API_KEY`
- **Purpose**: Fallback key if dedicated keys not provided
- **Type**: OpenAI API Key (sk-proj-...)
- **Required**: No (system works without it)
- **Fallback For**: Both SUMMARY and RESOURCES if specific keys not set
- **Example**:
  ```
  OPENAI_API_KEY=sk-proj-zzzzz...
  ```

---

## Usage Patterns

### Pattern 1: Single API Key (Simple)
If you only have one key, just set:
```env
OPENAI_API_KEY=sk-proj-xxxxx...
```
Both summary and resources will use this key.

### Pattern 2: Two Keys (Recommended)
If you have two keys to balance load:
```env
OPENAI_API_KEY_SUMMARY=sk-proj-key1...
OPENAI_API_KEY_RESOURCES=sk-proj-key2...
```
This separates summary workload from resource recommendations.

### Pattern 3: Three Keys (Maximum)
If you have three keys:
```env
OPENAI_API_KEY_SUMMARY=sk-proj-key1...
OPENAI_API_KEY_RESOURCES=sk-proj-key2...
OPENAI_API_KEY=sk-proj-key3...  # Fallback if neither above set
```

### Pattern 4: No Keys (Fallback Mode)
System works without any keys:
```env
# No OpenAI keys set - uses curated resources and fallback summaries
```

---

## How It Works

### Summary Generation
```
analyzeQuiz()
  ↓
callLLMGenerateSummary() 
  ↓
Uses OPENAI_API_KEY_SUMMARY or OPENAI_API_KEY
  ↓
Returns AI-generated feedback
```

### Resource Generation
```
analyzeQuiz()
  ↓
getResourcesForTopic()
  ↓
Uses OPENAI_API_KEY_RESOURCES or OPENAI_API_KEY
  ↓
Returns curated learning links
```

---

## Adding to Vercel

### Step 1: Go to Vercel Project Settings
1. Open https://vercel.com/dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**

### Step 2: Add Environment Variables

#### If using one key:
```
Name: OPENAI_API_KEY
Value: sk-proj-xxxxx...
Environment: Production, Preview, Development
```

#### If using two keys:
```
Name: OPENAI_API_KEY_SUMMARY
Value: sk-proj-key1...
Environment: Production, Preview, Development

Name: OPENAI_API_KEY_RESOURCES
Value: sk-proj-key2...
Environment: Production, Preview, Development
```

#### If using all three:
```
Name: OPENAI_API_KEY_SUMMARY
Value: sk-proj-key1...

Name: OPENAI_API_KEY_RESOURCES
Value: sk-proj-key2...

Name: OPENAI_API_KEY
Value: sk-proj-key3...
```

### Step 3: Redeploy
After adding env vars:
1. Click **Deployments**
2. Click the three dots on latest deployment
3. Select **Redeploy**
4. Or just `git push origin main` to trigger auto-redeploy

---

## API Usage Estimates

Based on typical usage (100 quizzes/day):

### Summary Generation (callLLMGenerateSummary)
- **Calls per day**: ~100
- **Tokens per call**: ~100-300
- **Total tokens/day**: ~15,000-30,000
- **Cost**: ~$0.0005-$0.001/day

### Resource Generation (getResourcesForTopic)
- **Calls per day**: ~0 (uses curated resources, no LLM)
- **Tokens per day**: 0 (not using OpenAI)
- **Cost**: $0

### Total Estimated Cost
- **With summary**: ~$0.015-$0.03/month
- **Without summary**: $0 (uses fallback)

---

## RPM Limits by Plan

| Plan | RPM Limit | Tokens/Min |
|------|-----------|-----------|
| Free | 3 | 90,000 |
| Pay-as-you-go | 3,000 | 1,000,000 |
| Pro | 10,000 | 5,000,000 |

### Why Multiple Keys?
If you have 100 concurrent users:
- **Single key**: 100 requests hit same RPM limit (3,000 RPM = 3 requests/sec)
- **Two keys**: 50 requests per key (more stable)
- **Three keys**: 33-34 requests per key (best distribution)

---

## Files That Use These Keys

### analyzer.js
- **Lines 12-23**: Initialize OpenAI Summary client
- **Line 187**: Call LLM with OPENAI_API_KEY_SUMMARY
- **Console output**: Logs which keys were detected

### webSearchResources.js
- **Lines 14-16**: Initialize OpenAI Resources client
- **Lines 18-25**: Log detected keys

### .env (Local)
```
# Example for local development
OPENAI_API_KEY_SUMMARY=sk-proj-...
OPENAI_API_KEY_RESOURCES=sk-proj-...
OPENAI_API_KEY=sk-proj-... # fallback
```

---

## Troubleshooting

### Issue: "LLM returned 401 Unauthorized"
**Cause**: API key invalid or expired
**Solutions**:
1. Check key validity at https://platform.openai.com/api-keys
2. Verify correct environment variable name:
   - Summary: `OPENAI_API_KEY_SUMMARY`
   - Resources: `OPENAI_API_KEY_RESOURCES`
   - Fallback: `OPENAI_API_KEY`
3. Check Vercel env vars are set (not just .env)
4. Redeploy after changing env vars

### Issue: "No OpenAI API keys found"
**Cause**: All keys are empty or not set
**Solution**: Set at least one of the above keys

### Issue: High API costs
**Cause**: Single key handling too many requests
**Solution**: Split to multiple keys using Pattern 2 or 3

### Issue: Resource links not working
**Cause**: Most likely using curated resources (no API call)
**Solution**: This is fine - curated resources don't require API key

---

## Getting OpenAI API Keys

1. Go to: https://platform.openai.com/api-keys
2. Click **"Create new secret key"**
3. Copy the key (appears only once)
4. Add to Vercel environment variables

### You Can Have Multiple Keys
- Create as many keys as needed
- Use different keys for different agents
- Delete old keys anytime

---

## Best Practices

✅ **DO:**
- Use separate keys for summary and resources (if possible)
- Rotate keys regularly (delete old ones)
- Set env vars in Vercel, not just .env
- Redeploy after changing env vars
- Monitor API usage at OpenAI dashboard

❌ **DON'T:**
- Commit .env with real keys to git
- Share API keys publicly
- Use same key across all services if possible
- Forget to redeploy after env changes
- Leave old unused keys lying around

---

## Testing

### Test Summary Key
```bash
curl -X POST http://localhost:5000/api/analyze-quiz \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test",
    "quizId": "random",
    "answers": [{"questionId": 1, "selectedOption": "A"}]
  }'
```

### Check Logs
```bash
# Local
npm start  # Look for key detection messages

# Vercel
# Go to Deployments → Function Logs
# Look for: "OPENAI_API_KEY_SUMMARY detected" etc.
```

---

## Summary

| Variable | Purpose | Fallback | Required |
|----------|---------|----------|----------|
| `OPENAI_API_KEY_SUMMARY` | AI summaries | OPENAI_API_KEY | No |
| `OPENAI_API_KEY_RESOURCES` | Resource fetch | OPENAI_API_KEY | No |
| `OPENAI_API_KEY` | Fallback for both | None | No |

**Recommendation**: Use all three keys if available for best performance and cost distribution.

---

**Last Updated**: 2025-01-XX
**Version**: 1.0
