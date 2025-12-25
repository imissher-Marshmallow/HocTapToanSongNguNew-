/**
 * Comprehensive System Test
 * Tests all major features: Quiz submission, AI analysis, Supabase, Adaptive learning, Recommendations
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

async function runTests() {
  console.log('🧪 COMPREHENSIVE SYSTEM TEST\n');
  console.log('='.repeat(60));

  try {
    // Test 1: Fetch Quiz Questions
    console.log('\n📚 TEST 1: Fetch Quiz Questions');
    console.log('-'.repeat(60));
    const questionsRes = await makeRequest('GET', '/api/questions/biology-101');
    if (questionsRes.status === 200) {
      const count = questionsRes.data.questions ? questionsRes.data.questions.length : questionsRes.data.length;
      console.log(`✅ Fetched ${count} questions`);
    } else {
      console.log(`⚠️ Status: ${questionsRes.status}`);
    }

    // Test 2: Submit Quiz (Anonymous User - Guest ID 1)
    console.log('\n📝 TEST 2: Submit Quiz (Anonymous/Guest User)');
    console.log('-'.repeat(60));
    const quizData = {
      userId: null, // Will use guest user
      quizId: 'biology-101',
      answers: Array(10).fill(0).map((_, i) => i % 3),
      questions: Array(10).fill(0).map((_, i) => ({
        id: `q${i+1}`,
        question: `Question ${i+1}?`,
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: i % 4
      })),
      timeTaken: 120
    };

    const submitRes = await makeRequest('POST', '/api/results', quizData);
    console.log(`Status: ${submitRes.status}`);
    if (submitRes.status === 200) {
      console.log('✅ Quiz submitted successfully');
      console.log(`  Score: ${submitRes.data.score}/${submitRes.data.totalQuestions}`);
      console.log(`  AI Analysis: ${submitRes.data.summary ? '✅ Generated' : '❌ Missing'}`);
      console.log(`  Weak Areas: ${submitRes.data.weakAreas?.length || 0} identified`);
      console.log(`  Recommendations: ${submitRes.data.recommendations?.length || 0} provided`);
    } else {
      console.log('❌ Failed:', submitRes.data);
    }

    // Test 3: Get Quiz History
    console.log('\n📊 TEST 3: Fetch User Quiz History');
    console.log('-'.repeat(60));
    const historyRes = await makeRequest('GET', '/api/history/user/1');
    if (historyRes.status === 200 && historyRes.data.results) {
      console.log(`✅ Retrieved ${historyRes.data.results.length} quiz results`);
      const latest = historyRes.data.results[0];
      if (latest) {
        console.log(`  Latest quiz: ${latest.quiz_id}`);
        console.log(`  Score: ${latest.score}/${latest.total_questions}`);
      }
    } else {
      console.log(`⚠️ Status: ${historyRes.status}`);
    }

    // Test 4: Check Adaptive Quiz Features
    console.log('\n🎯 TEST 4: Adaptive Quiz - Generate Personalized Quiz');
    console.log('-'.repeat(60));
    const adaptiveRes = await makeRequest('POST', '/api/adaptive/generate', {
      userId: 1,
      preferredDifficulty: 'intermediate',
      focusAreas: ['biology', 'chemistry']
    });
    
    if (adaptiveRes.status === 200) {
      console.log('✅ Adaptive quiz generated');
      console.log(`  Questions: ${adaptiveRes.data.questions?.length || 0}`);
      console.log(`  Difficulty: ${adaptiveRes.data.difficulty || 'N/A'}`);
      console.log(`  Focus areas: ${adaptiveRes.data.focus_areas?.join(', ') || 'N/A'}`);
    } else {
      console.log(`⚠️ Status: ${adaptiveRes.status}`);
    }

    // Test 5: Get AI Recommendations
    console.log('\n💡 TEST 5: AI Recommendations & Learning Roadmap');
    console.log('-'.repeat(60));
    const recommendRes = await makeRequest('GET', '/api/adaptive/recommendations/1');
    if (recommendRes.status === 200) {
      console.log('✅ Recommendations retrieved');
      console.log(`  Recommended quizzes: ${recommendRes.data.recommendedQuizzes?.length || 0}`);
      console.log(`  Learning path available: ${!!recommendRes.data.learningPath}`);
      console.log(`  Topics to review: ${recommendRes.data.topicsToReview?.length || 0}`);
    } else {
      console.log(`⚠️ Status: ${recommendRes.status}`);
    }

    // Test 6: Check Learning Plans
    console.log('\n📖 TEST 6: Learning Plans & Study Path');
    console.log('-'.repeat(60));
    const plansRes = await makeRequest('GET', '/api/history/learning-plans/1');
    if (plansRes.status === 200) {
      console.log('✅ Learning plans retrieved');
      console.log(`  Plans: ${Array.isArray(plansRes.data) ? plansRes.data.length : 'N/A'}`);
    } else {
      console.log(`⚠️ Status: ${plansRes.status}`);
    }

    // Test 7: User Profile/Stats
    console.log('\n👤 TEST 7: User Profile & Performance Stats');
    console.log('-'.repeat(60));
    const statsRes = await makeRequest('GET', '/api/history/user-stats/1');
    if (statsRes.status === 200) {
      console.log('✅ User stats retrieved');
      console.log(`  Total quizzes: ${statsRes.data.totalQuizzes || 0}`);
      console.log(`  Average score: ${statsRes.data.averageScore || 0}%`);
      console.log(`  Best score: ${statsRes.data.bestScore || 0}%`);
      console.log(`  Weak areas: ${statsRes.data.weakAreas?.length || 0}`);
    } else {
      console.log(`⚠️ Status: ${statsRes.status}`);
    }

    // Test 8: ML Analytics (if available)
    console.log('\n🧠 TEST 8: ML Analytics & Performance Analysis');
    console.log('-'.repeat(60));
    const mlRes = await makeRequest('GET', '/api/ml/performance/1');
    if (mlRes.status === 200) {
      console.log('✅ ML analysis available');
      console.log(`  Performance predictions: ${!!mlRes.data.predictions}`);
      console.log(`  Skill matrix: ${!!mlRes.data.skillMatrix}`);
    } else if (mlRes.status === 404) {
      console.log('⚠️ ML Analytics endpoint not available (optional feature)');
    } else {
      console.log(`⚠️ Status: ${mlRes.status}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ COMPREHENSIVE TEST COMPLETE');
    console.log('='.repeat(60));

  } catch (err) {
    console.error('\n❌ Test error:', err.message);
  }

  setTimeout(() => process.exit(0), 1000);
}

// Wait for server to be ready
setTimeout(runTests, 2000);
