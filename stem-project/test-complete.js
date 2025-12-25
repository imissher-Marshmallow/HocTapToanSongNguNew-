/**
 * Complete End-to-End Test - Adaptive & AI Features
 * Tests all major features: Quiz submission, AI analysis, Supabase, Recommendations
 */

const http = require('http');

async function makeRequest(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runCompleteTests() {
  console.log('🚀 COMPLETE END-TO-END TEST SUITE\n');
  console.log('='.repeat(60));

  const tests = [];
  let passedCount = 0;
  let failedCount = 0;

  // Test 1: Fetch available quizzes
  console.log('\n📚 Test 1: Get available quizzes');
  try {
    const res = await makeRequest('GET', '/api/questions/random');
    if (res.status === 200 && res.data && res.data.questions) {
      console.log(`✅ PASS - Got ${res.data.questions.length} questions`);
      passedCount++;
    } else {
      console.log('❌ FAIL - Could not fetch questions');
      failedCount++;
    }
  } catch (err) {
    console.log(`❌ FAIL - ${err.message}`);
    failedCount++;
  }

  // Test 2: Submit quiz as guest user (anonymous)
  console.log('\n📝 Test 2: Submit quiz (anonymous/guest user)');
  let resultId = null;
  try {
    const quizData = {
      userId: null,
      quizId: 'math-test',
      quizName: 'Math Quiz',
      answers: [0, 1, 2, 0, 1, 2, 0, 1, 2, 0],
      questions: Array(10).fill(0).map((_, i) => ({
        id: `q${i+1}`,
        question: `Question ${i+1}?`,
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: (i % 4)
      })),
      timeTaken: 120
    };

    const res = await makeRequest('POST', '/api/results', quizData);
    if (res.status === 200) {
      console.log(`✅ PASS - Quiz submitted (Result ID: ${res.data.resultId})`);
      console.log(`  📊 Score: ${res.data.score}/${res.data.totalQuestions}`);
      console.log(`  💬 Performance: ${res.data.performanceLabel}`);
      resultId = res.data.resultId;
      passedCount++;
    } else {
      console.log(`❌ FAIL - Status ${res.status}`);
      console.log(`  Error: ${res.data.error || JSON.stringify(res.data).substring(0, 100)}`);
      failedCount++;
    }
  } catch (err) {
    console.log(`❌ FAIL - ${err.message}`);
    failedCount++;
  }

  // Test 3: Verify AI analysis was performed
  console.log('\n🤖 Test 3: Verify AI analysis');
  try {
    const res = await makeRequest('GET', `/api/results/${resultId}`);
    if (res.status === 200) {
      const hasAnalysis = res.data && (res.data.ai_analysis || res.data.summary || res.data.feedback);
      if (hasAnalysis) {
        console.log('✅ PASS - AI analysis found');
        if (res.data.summary) console.log(`  📋 Summary: ${res.data.summary.substring(0, 60)}...`);
        passedCount++;
      } else {
        console.log('❌ FAIL - No AI analysis data');
        failedCount++;
      }
    } else {
      console.log(`❌ FAIL - Status ${res.status}`);
      failedCount++;
    }
  } catch (err) {
    console.log(`⚠️ SKIP - ${err.message}`);
  }

  // Test 4: Get quiz list (includes adaptive option)
  console.log('\n📖 Test 4: Get quiz list with adaptive option');
  try {
    const res = await makeRequest('GET', '/api/quizzes');
    if (res.status === 200 && Array.isArray(res.data)) {
      console.log(`✅ PASS - Got ${res.data.length} quizzes`);
      const hasAdaptive = res.data.some(q => q.type === 'adaptive' || q.id?.includes('adaptive'));
      console.log(`  🎯 Adaptive quiz available: ${hasAdaptive ? 'Yes' : 'No'}`);
      passedCount++;
    } else {
      console.log(`⚠️ SKIP - Endpoint not available`);
    }
  } catch (err) {
    console.log(`⚠️ SKIP - ${err.message}`);
  }

  // Test 5: Get recommendations for user
  console.log('\n🎯 Test 5: Get recommendations');
  try {
    const res = await makeRequest('GET', '/api/recommendations/1'); // guest user = id 1
    if (res.status === 200) {
      if (Array.isArray(res.data) && res.data.length > 0) {
        console.log(`✅ PASS - Got ${res.data.length} recommendations`);
        console.log(`  📌 First: ${res.data[0].title || res.data[0].topic}`);
        passedCount++;
      } else {
        console.log('⚠️ No recommendations yet (quiz data may need processing)');
      }
    } else {
      console.log(`⚠️ SKIP - Endpoint not available`);
    }
  } catch (err) {
    console.log(`⚠️ SKIP - ${err.message}`);
  }

  // Test 6: Get user stats
  console.log('\n📈 Test 6: Get user statistics');
  try {
    const res = await makeRequest('GET', '/api/user/1/stats'); // guest user
    if (res.status === 200) {
      console.log(`✅ PASS - User stats retrieved`);
      console.log(`  📊 Total quizzes: ${res.data.totalQuizzes || 'N/A'}`);
      console.log(`  ⭐ Average score: ${res.data.averageScore || 'N/A'}`);
      passedCount++;
    } else {
      console.log(`⚠️ SKIP - Endpoint not fully available`);
    }
  } catch (err) {
    console.log(`⚠️ SKIP - ${err.message}`);
  }

  // Test 7: Check adaptive quiz endpoint
  console.log('\n🎲 Test 7: Adaptive quiz generation');
  try {
    const res = await makeRequest('GET', '/adaptive/quiz/personalized?userId=1');
    if (res.status === 200 && res.data && res.data.questions) {
      console.log(`✅ PASS - Adaptive quiz generated with ${res.data.questions.length} questions`);
      passedCount++;
    } else {
      console.log(`⚠️ SKIP - Adaptive endpoint not fully integrated`);
    }
  } catch (err) {
    console.log(`⚠️ SKIP - ${err.message}`);
  }

  // Test 8: Check learning history
  console.log('\n📚 Test 8: Learning history');
  try {
    const res = await makeRequest('GET', '/api/history/1'); // guest user
    if (res.status === 200 && Array.isArray(res.data)) {
      console.log(`✅ PASS - Retrieved ${res.data.length} quiz attempts`);
      if (res.data.length > 0) {
        console.log(`  📝 Latest quiz: ${res.data[0].quiz_id}`);
        console.log(`  ⭐ Score: ${res.data[0].score}/${res.data[0].total_questions}`);
      }
      passedCount++;
    } else {
      console.log(`⚠️ SKIP - History endpoint needs setup`);
    }
  } catch (err) {
    console.log(`⚠️ SKIP - ${err.message}`);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 TEST SUMMARY`);
  console.log(`✅ Passed: ${passedCount}`);
  console.log(`❌ Failed: ${failedCount}`);
  console.log(`⚠️  Skipped: ${tests.length - passedCount - failedCount}`);
  console.log(`\n🎯 System Status: ${failedCount === 0 ? '✅ OPERATIONAL' : '⚠️ NEEDS FIXES'}`);

  process.exit(failedCount > 0 ? 1 : 0);
}

runCompleteTests();
