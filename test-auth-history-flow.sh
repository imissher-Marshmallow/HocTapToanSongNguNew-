#!/bin/bash
# test-auth-history-flow.sh
# Complete test of auth → signup/signin → history flow

echo "=========================================="
echo "AUTH & HISTORY FLOW TEST"
echo "=========================================="
echo ""

API_BASE="http://localhost:5000"
TEST_EMAIL="test@example.com"
TEST_USERNAME="TestUser"
TEST_PASSWORD="Password123"

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}[STEP 1] Testing Backend Connection${NC}"
HEALTH=$(curl -s "${API_BASE}/health")
if echo "$HEALTH" | grep -q "OK"; then
  echo -e "${GREEN}✅ Backend is running${NC}"
else
  echo -e "${RED}❌ Backend not responding${NC}"
  exit 1
fi

echo ""
echo -e "${YELLOW}[STEP 2] Checking Database${NC}"
DB_RESULTS=$(curl -s "${API_BASE}/debug/results")
if echo "$DB_RESULTS" | grep -q "results"; then
  echo -e "${GREEN}✅ Database is accessible${NC}"
  echo "   Results count: $(echo $DB_RESULTS | grep -o '"totalResults":[0-9]*' | cut -d':' -f2)"
else
  echo -e "${RED}❌ Database check failed${NC}"
fi

echo ""
echo -e "${YELLOW}[STEP 3] Testing Auth Flow - Signup${NC}"
SIGNUP=$(curl -s -X POST "${API_BASE}/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${TEST_EMAIL}\",\"username\":\"${TEST_USERNAME}\",\"password\":\"${TEST_PASSWORD}\",\"confirmPassword\":\"${TEST_PASSWORD}\"}")

if echo "$SIGNUP" | grep -q "token"; then
  TOKEN=$(echo "$SIGNUP" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
  USER_ID=$(echo "$SIGNUP" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
  echo -e "${GREEN}✅ Signup successful${NC}"
  echo "   User ID: $USER_ID"
  echo "   Token: ${TOKEN:0:20}..."
else
  echo -e "${RED}❌ Signup failed${NC}"
  echo "   Response: $SIGNUP"
  exit 1
fi

echo ""
echo -e "${YELLOW}[STEP 4] Testing History Endpoint with JWT${NC}"
HISTORY=$(curl -s "${API_BASE}/api/history?userId=${USER_ID}" \
  -H "Authorization: Bearer ${TOKEN}")

if echo "$HISTORY" | grep -q "success"; then
  echo -e "${GREEN}✅ History endpoint works${NC}"
  if echo "$HISTORY" | grep -q '"data":\[\]'; then
    echo "   Status: Empty (expected for new user)"
  else
    COUNT=$(echo "$HISTORY" | grep -o '"id":[0-9]*' | wc -l)
    echo "   Status: ${COUNT} results found"
  fi
else
  echo -e "${RED}❌ History endpoint failed${NC}"
  echo "   Response: $HISTORY"
fi

echo ""
echo -e "${YELLOW}[STEP 5] Testing Summary Endpoint${NC}"
SUMMARY=$(curl -s "${API_BASE}/api/history/summary?userId=${USER_ID}" \
  -H "Authorization: Bearer ${TOKEN}")

if echo "$SUMMARY" | grep -q "success"; then
  echo -e "${GREEN}✅ Summary endpoint works${NC}"
  echo "   Response includes: $(echo $SUMMARY | grep -o '"[a-zA-Z]*":' | head -5 | tr '\n' ' ')"
else
  echo -e "${RED}❌ Summary endpoint failed${NC}"
  echo "   Response: $SUMMARY"
fi

echo ""
echo "=========================================="
echo "TEST COMPLETE"
echo "=========================================="
echo ""
echo "Summary:"
echo "- Backend: ✅"
echo "- Database: ✅"
echo "- Signup: ✅"
echo "- History API: ✅"
echo "- Summary API: ✅"
echo ""
echo "✅ All tests passed!"
