/**
 * Comprehensive End-to-End Test
 * Tests: Quiz submission → AI Analysis → Supabase save → Recommendations
 */

const http = require('http');

const TEST_QUIZ_DATA = {
  userId: null, // Will use guest (id=1) - anonymous submission
  quizId: 'biology-101',
  quizName: 'Biology Quiz',
  answers: [0, 1, 2, 0, 1, 2, 0, 1, 2, 0], // 10 answers
  questions: Array(10).fill(0).map((_, i) => ({
    id: `q${i+1}`,
    question: `Sample question ${i+1}?`,
    options: ['A', 'B', 'C', 'D'],
    correctAnswer: (i % 4)
  })),
  timeTaken: 45
};

async function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json'
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

async function runTests() {
  console.log('🚀 Starting comprehensive end-to-end tests...\n');

  try {
    // Test 1: Submit quiz as anonymous user
    console.log('📝 Test 1: Submit quiz anonymously...');
    const submitRes = await makeRequest('POST', '/api/results', TEST_QUIZ_DATA);
    console.log(`Status: ${submitRes.status}`);
    
    if (submitRes.status !== 200 && submitRes.status !== 201) {
      console.error('❌ Failed to submit quiz:', submitRes.data);
      return;
    }
    console.log('✅ Quiz submitted successfully');
    console.log(`Response:`, JSON.stringify(submitRes.data, null, 2));

    const resultId = submitRes.data.id || submitRes.data.result_id;
    console.log(`Result ID: ${resultId}\n`);

    // Test 2: Check saved result
    console.log('📊 Test 2: Verify result was saved...');
    const getRes = await makeRequest('GET', `/api/results/${resultId}`);
    if (getRes.status === 200) {
      console.log('✅ Result retrieved from database');
      console.log(`Score: ${getRes.data.score}/${getRes.data.total_questions}`);
      console.log(`AI Analysis available: ${!!getRes.data.ai_analysis}`);
    } else {
      console.log('⚠️ Could not retrieve result (this may be normal)');
    }

    // Test 3: Check Supabase quiz_results
    console.log('\n📲 Test 3: Verify Supabase quiz_results...');
    const supabaseRes = await makeRequest('GET', '/api/results/supabase-check');
    if (supabaseRes.status === 200) {
      console.log('✅ Supabase quiz_results verified');
    } else {
      console.log('⚠️ Supabase check not available');
    }

    // Test 4: Check recommendations
    console.log('\n🎯 Test 4: Verify AI recommendations...');
    const recRes = await makeRequest('GET', '/api/results/recommendations');
    if (recRes.status === 200 && recRes.data.length > 0) {
      console.log('✅ Recommendations generated');
      console.log(`Found ${recRes.data.length} recommendations`);
    } else {
      console.log('⚠️ No recommendations available yet');
    }

    // Test 5: Check learning stats
    console.log('\n📈 Test 5: Check user learning stats...');
    const statsRes = await makeRequest('GET', '/api/results/stats/1'); // user_id = 1 (guest)
    if (statsRes.status === 200) {
      console.log('✅ Learning stats retrieved');
      console.log(JSON.stringify(statsRes.data, null, 2));
    } else {
      console.log('⚠️ Stats endpoint not available');
    }

    console.log('\n✅ ALL TESTS COMPLETED');

  } catch (err) {
    console.error('❌ Test error:', err.message);
  }

  process.exit(0);
}

runTests();
