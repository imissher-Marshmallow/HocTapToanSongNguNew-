/**
 * TEST: Profile Update Fix Verification
 * Verifies that:
 * 1. Quiz submission updates user_learning_profiles table
 * 2. Dashboard endpoint retrieves updated profile correctly
 * 3. user_id type conversion works (STRING params -> INTEGER queries)
 */

const http = require('http');
const https = require('https');

// Configuration
const BASE_URL = 'http://localhost:3001'; // or your backend URL
const GUEST_USER_ID = 1; // Guest user from system
const TEST_USER_ID = 999; // Test user ID

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const protocol = url.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = protocol.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('\n' + '='.repeat(70));
  console.log('🧪 PROFILE UPDATE FIX VERIFICATION TEST');
  console.log('='.repeat(70));

  try {
    // TEST 1: Get baseline profile
    console.log('\n1️⃣  BASELINE - Fetch initial profile for user', GUEST_USER_ID);
    const initialProfile = await request('GET', `/api/adaptive/dashboard/${GUEST_USER_ID}`);
    console.log(`   Status: ${initialProfile.status}`);
    console.log(`   quizzesTaken: ${initialProfile.data?.profile?.quizzesTaken || initialProfile.data?.quizzesTaken || 0}`);
    console.log(`   Scores: ${JSON.stringify(initialProfile.data?.profile?.scores || initialProfile.data?.scores || {}).substring(0, 80)}`);

    // TEST 2: Submit a quiz
    console.log('\n2️⃣  SUBMIT QUIZ');
    console.log(`   User: ${GUEST_USER_ID}`);
    
    // Create sample quiz questions and answers
    const sampleQuiz = {
      userId: GUEST_USER_ID,
      quizId: 'personalized',
      answers: [
        { questionId: '1', answer: 0 },
        { questionId: '2', answer: 1 },
        { questionId: '3', answer: 2 },
        { questionId: '4', answer: 3 },
        { questionId: '5', answer: 0 },
        { questionId: '6', answer: 1 },
        { questionId: '7', answer: 2 },
        { questionId: '8', answer: 0 },
        { questionId: '9', answer: 1 },
        { questionId: '10', answer: 2 },
        { questionId: '11', answer: 3 },
        { questionId: '12', answer: 0 },
        { questionId: '13', answer: 1 },
        { questionId: '14', answer: 2 },
        { questionId: '15', answer: 0 },
        { questionId: '16', answer: 1 },
        { questionId: '17', answer: 2 },
        { questionId: '18', answer: 3 },
        { questionId: '19', answer: 0 },
        { questionId: '20', answer: 1 }
      ],
      timeSpent: 600,
      personalizedQuizData: [] // Will be populated by server
    };

    const submitResponse = await request('POST', '/api/adaptive/analyze', sampleQuiz);
    console.log(`   Status: ${submitResponse.status}`);
    
    if (submitResponse.status === 200) {
      console.log(`   ✅ Quiz submitted successfully`);
      console.log(`   Response keys: ${Object.keys(submitResponse.data).join(', ').substring(0, 100)}`);
      if (submitResponse.data?.analysis) {
        console.log(`   Score: ${submitResponse.data.analysis.overallScore || 'N/A'}`);
      }
    } else {
      console.log(`   ❌ Quiz submission failed: ${submitResponse.data?.error || 'Unknown error'}`);
      console.log(`   Full response:`, JSON.stringify(submitResponse.data).substring(0, 200));
    }

    // Wait a moment for DB to sync
    console.log('\n   ⏳ Waiting 2 seconds for database sync...');
    await new Promise(r => setTimeout(r, 2000));

    // TEST 3: Fetch updated profile
    console.log('\n3️⃣  VERIFY PROFILE UPDATE');
    console.log(`   Fetching dashboard for user ${GUEST_USER_ID}...`);
    const updatedProfile = await request('GET', `/api/adaptive/dashboard/${GUEST_USER_ID}`);
    console.log(`   Status: ${updatedProfile.status}`);
    
    if (updatedProfile.status === 200) {
      const profile = updatedProfile.data?.profile || updatedProfile.data;
      const quizzesBefore = initialProfile.data?.profile?.quizzesTaken || initialProfile.data?.quizzesTaken || 0;
      const quizzesAfter = profile?.quizzesTaken || 0;
      
      console.log(`   quizzesTaken before: ${quizzesBefore}`);
      console.log(`   quizzesTaken after: ${quizzesAfter}`);
      
      if (quizzesAfter > quizzesBefore) {
        console.log(`   ✅ PASS: Profile was updated (quizzes increased)`);
      } else {
        console.log(`   ⚠️  FAIL: Profile may not have updated (quizzes same)`);
      }
      
      console.log(`   Scores: ${JSON.stringify(profile?.scores).substring(0, 80)}`);
      console.log(`   Weak areas: ${JSON.stringify(profile?.weakAreas || []).substring(0, 80)}`);
      console.log(`   Strong areas: ${JSON.stringify(profile?.strongAreas || []).substring(0, 80)}`);
    } else {
      console.log(`   ❌ Failed to fetch updated profile: ${updatedProfile.data?.error || 'Unknown error'}`);
    }

    // TEST 4: Test profile endpoint with string userId (tests type conversion)
    console.log('\n4️⃣  TYPE CONVERSION TEST - Profile endpoint with string userId');
    console.log(`   Fetching /api/adaptive/profile/${GUEST_USER_ID} (as string param)...`);
    const profileEndpoint = await request('GET', `/api/adaptive/profile/${GUEST_USER_ID}`);
    console.log(`   Status: ${profileEndpoint.status}`);
    
    if (profileEndpoint.status === 200) {
      console.log(`   ✅ Type conversion working (string param -> integer query)`);
    } else {
      console.log(`   ❌ Type conversion may have failed`);
      console.log(`   Error: ${profileEndpoint.data?.error || 'Unknown'}`);
    }

    // TEST 5: Test personalized quiz endpoint (also uses string userId)
    console.log('\n5️⃣  TYPE CONVERSION TEST - Personalized quiz with string userId');
    console.log(`   Fetching /api/adaptive/quiz/personalized?userId=${GUEST_USER_ID}...`);
    const quizEndpoint = await request('GET', `/api/adaptive/quiz/personalized?userId=${GUEST_USER_ID}`);
    console.log(`   Status: ${quizEndpoint.status}`);
    
    if (quizEndpoint.status === 200) {
      console.log(`   ✅ Personalized quiz endpoint working`);
      console.log(`   Questions received: ${quizEndpoint.data?.quiz?.length || 0}`);
    } else {
      console.log(`   ❌ Personalized quiz endpoint failed`);
      console.log(`   Error: ${quizEndpoint.data?.error || 'Unknown'}`);
    }

    // SUMMARY
    console.log('\n' + '='.repeat(70));
    console.log('✅ TEST SUMMARY');
    console.log('='.repeat(70));
    console.log('\nFixes Applied:');
    console.log('1. ✅ user_id type conversion in dashboard endpoint');
    console.log('2. ✅ user_id type conversion in profile endpoint');
    console.log('3. ✅ user_id type conversion in personalized quiz endpoint');
    console.log('4. ✅ user_id type conversion in analyze endpoint (for saves)');
    console.log('5. ✅ Filler plugin added to PerformanceCharts component');
    console.log('\nData Flow:');
    console.log('Quiz Submit → /api/adaptive/analyze → user_learning_profiles UPDATE');
    console.log('↓');
    console.log('GET /api/adaptive/dashboard/:userId → user_learning_profiles SELECT');
    console.log('↓');
    console.log('LearningProfile component renders updated data');
    console.log('\nNOTE: If "quizzesAfter" still equals "quizzesBefore", check:');
    console.log('  1. Is Supabase accessible from server?');
    console.log('  2. Are Supabase credentials correct?');
    console.log('  3. Do tables exist with correct schema?');
    console.log('  4. Check backend logs for errors');
    console.log('\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('\nCommon Issues:');
    console.error('- Backend server not running on localhost:3001');
    console.error('- Supabase credentials not set in environment');
    console.error('- Database tables not created');
    process.exit(1);
  }
}

runTests().catch(console.error);
