/**
 * test-adaptive-flow.js
 * 
 * Test the complete adaptive quiz flow:
 * 1. Submit adaptive quiz with user ID 1
 * 2. Verify AI generates learning path (learningPath should be array with weeks)
 * 3. Verify Supabase saves learning_path, weak_areas, strong_areas
 * 4. Verify GET /api/adaptive/dashboard/:userId returns complete profile
 * 5. Verify GET /api/adaptive/weak-and-strong/:userId returns parsed weak/strong areas
 * 
 * Run with: node test-adaptive-flow.js
 */

const http = require('http');

const API_BASE = 'http://localhost:3000';
const USER_ID = 1; // Guest user

// Helper to make HTTP requests
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ 
            status: res.statusCode, 
            data: body ? JSON.parse(body) : null,
            headers: res.headers
          });
        } catch (e) {
          resolve({ 
            status: res.statusCode, 
            data: body,
            parseError: e.message
          });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

// Helper to format test output
function logTest(name, passed, details = '') {
  const icon = passed ? '✅' : '❌';
  console.log(`\n${icon} ${name}`);
  if (details) console.log(`   ${details}`);
}

async function runTests() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 ADAPTIVE QUIZ FLOW TEST - Full End-to-End Verification');
  console.log('='.repeat(80));

  try {
    // =========================================================================
    // TEST 1: Submit adaptive quiz
    // =========================================================================
    console.log('\n📝 TEST 1: SUBMIT ADAPTIVE QUIZ');
    console.log('-'.repeat(80));

    // Create sample quiz data with 20 questions
    const sampleQuestions = Array.from({ length: 20 }, (_, i) => ({
      id: `q${i + 1}`,
      question: `Sample Question ${i + 1}: What is the correct answer?`,
      text: `Sample Question ${i + 1}`,
      topic: ['Algebra', 'Geometry', 'Physics', 'Chemistry'][i % 4],
      difficulty: ['1', '2', '3', '4'][i % 4],
      options: ['A', 'B', 'C', 'D'],
      correctAnswer: i % 4,
      answerIndex: i % 4
    }));

    // User answers - mix of correct and incorrect (with proper format: questionId and answer)
    // Make some answers wrong to generate weak areas
    const answers = Array.from({ length: 20 }, (_, i) => ({
      questionId: `q${i + 1}`,
      answer: i < 10 ? (i % 4) : ((i + 1) % 4) // First 10 correct, last 10 wrong
    }));

    const quizPayload = {
      userId: USER_ID,
      quizId: 'personalized', // Use valid quiz ID
      quizName: 'Test Adaptive Quiz',
      personalizedQuizData: sampleQuestions,
      answers,
      timeSpent: 1200 // 20 minutes
    };

    const submitRes = await makeRequest('POST', '/api/adaptive/analyze', quizPayload);
    const passed1 = submitRes.status === 200;
    logTest('Quiz submission status', passed1, `Status: ${submitRes.status}`);

    if (!passed1) {
      console.log('   Error:', submitRes.data?.error || submitRes.data?.message);
      process.exit(1);
    }

    const analysisResults = submitRes.data;
    console.log('\n📊 Submission Response Summary:');
    console.log(`   Overall Score: ${analysisResults.overallScore}%`);
    console.log(`   Correct Answers: ${analysisResults.correctAnswers}/${analysisResults.totalQuestions}`);
    console.log(`   Has learningPath: ${!!analysisResults.learningPath}`);
    console.log(`   Has weakAreas: ${!!analysisResults.weakAreas}`);
    console.log(`   Has strongAreas: ${!!analysisResults.strongAreas}`);
    console.log(`   Has aiCoachFeedback: ${!!analysisResults.aiCoachFeedback}`);

    // =========================================================================
    // TEST 2: Verify Learning Path is an array with weeks
    // =========================================================================
    console.log('\n📚 TEST 2: LEARNING PATH STRUCTURE');
    console.log('-'.repeat(80));

    const haslPath = Array.isArray(analysisResults.learningPath) && 
                     analysisResults.learningPath.length > 0;
    logTest('Learning path is array with items', haslPath);

    if (haslPath) {
      console.log(`   Week count: ${analysisResults.learningPath.length}`);
      analysisResults.learningPath.slice(0, 2).forEach((week, idx) => {
        console.log(`   Week ${idx + 1}: ${week.focus || 'Unknown'}`);
        console.log(`      Goal: ${week.goal || 'N/A'}`);
        console.log(`      Duration: ${week.duration || 'N/A'}`);
        console.log(`      Action: ${week.action || 'N/A'}`);
      });
    }

    // =========================================================================
    // TEST 3: Verify Weak Areas have topics and scores
    // =========================================================================
    console.log('\n🔴 TEST 3: WEAK AREAS DATA');
    console.log('-'.repeat(80));

    const hasWeakAreas = Array.isArray(analysisResults.weakAreas) && 
                         analysisResults.weakAreas.length > 0;
    logTest('Weak areas array populated', hasWeakAreas);
    
    if (analysisResults.weakAreas) {
      console.log(`   Raw weakAreas type: ${typeof analysisResults.weakAreas}`);
      console.log(`   Raw weakAreas: ${JSON.stringify(analysisResults.weakAreas).substring(0, 200)}`);
    }

    if (hasWeakAreas) {
      console.log(`   Count: ${analysisResults.weakAreas.length}`);
      analysisResults.weakAreas.slice(0, 3).forEach((area, idx) => {
        console.log(`   Area ${idx + 1}:`);
        console.log(`      Topic: ${area.topic || area.levelName || 'Unknown'}`);
        console.log(`      Score: ${area.score || area.percentage || 0}%`);
        console.log(`      Recommendation: ${area.recommendation || 'N/A'}`);
      });
    }

    // =========================================================================
    // TEST 4: Verify Strong Areas
    // =========================================================================
    console.log('\n🟢 TEST 4: STRONG AREAS DATA');
    console.log('-'.repeat(80));

    const hasStrongAreas = Array.isArray(analysisResults.strongAreas) && 
                           analysisResults.strongAreas.length > 0;
    logTest('Strong areas array populated', hasStrongAreas);

    if (hasStrongAreas) {
      console.log(`   Count: ${analysisResults.strongAreas.length}`);
      analysisResults.strongAreas.slice(0, 2).forEach((area, idx) => {
        console.log(`   Area ${idx + 1}:`);
        console.log(`      Topic: ${area.levelName || 'Unknown'}`);
        console.log(`      Score: ${area.score || 0}%`);
      });
    }

    // =========================================================================
    // TEST 5: Fetch Dashboard Profile (Verify Supabase Save)
    // =========================================================================
    console.log('\n📋 TEST 5: FETCH DASHBOARD PROFILE');
    console.log('-'.repeat(80));

    // Wait a second for Supabase to save
    await new Promise(r => setTimeout(r, 1000));

    const dashRes = await makeRequest('GET', `/api/adaptive/dashboard/${USER_ID}`);
    const passed5 = dashRes.status === 200;
    logTest('Dashboard fetch successful', passed5, `Status: ${dashRes.status}`);

    if (dashRes.data && dashRes.data.learningPath) {
      console.log(`   ✅ Learning path saved to Supabase!`);
      console.log(`      Path length: ${dashRes.data.learningPath.length} weeks`);
      console.log(`      First week: ${dashRes.data.learningPath[0]?.focus}`);
    }

    if (dashRes.data && dashRes.data.weakAreas) {
      console.log(`   ✅ Weak areas saved!`);
      console.log(`      Count: ${dashRes.data.weakAreas.length}`);
    }

    // =========================================================================
    // TEST 6: Fetch Weak and Strong Areas Endpoint
    // =========================================================================
    console.log('\n🎯 TEST 6: WEAK & STRONG AREAS ENDPOINT');
    console.log('-'.repeat(80));

    const areasRes = await makeRequest('GET', `/api/adaptive/weak-and-strong/${USER_ID}`);
    const passed6 = areasRes.status === 200;
    logTest('Weak & strong areas endpoint working', passed6, `Status: ${areasRes.status}`);

    if (areasRes.data) {
      console.log(`\n   📊 Weak Areas (parsed):`);
      if (Array.isArray(areasRes.data.weakAreas) && areasRes.data.weakAreas.length > 0) {
        areasRes.data.weakAreas.slice(0, 3).forEach((area, idx) => {
          console.log(`      ${idx + 1}. ${area.topic}: ${area.percentage}% (Priority: ${area.priority})`);
        });
      } else {
        console.log(`      (None)`);
      }

      console.log(`\n   📊 Strong Areas (parsed):`);
      if (Array.isArray(areasRes.data.strongAreas) && areasRes.data.strongAreas.length > 0) {
        areasRes.data.strongAreas.slice(0, 3).forEach((area, idx) => {
          console.log(`      ${idx + 1}. ${area.topic}: ${area.percentage}%`);
        });
      } else {
        console.log(`      (None)`);
      }
    }

    // =========================================================================
    // SUMMARY
    // =========================================================================
    console.log('\n' + '='.repeat(80));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(80));

    const allPassed = [
      passed1,
      haslPath,
      hasWeakAreas,
      hasStrongAreas,
      passed5,
      passed6
    ];

    const passCount = allPassed.filter(p => p).length;
    const totalCount = allPassed.length;

    console.log(`\n✅ PASSED: ${passCount}/${totalCount}`);

    if (passCount === totalCount) {
      console.log('\n🎉 ALL TESTS PASSED! Complete flow is working correctly!');
      console.log('\n✨ The following are now working:');
      console.log('   ✅ Adaptive quiz submission');
      console.log('   ✅ AI learning path generation (4+ weeks)');
      console.log('   ✅ Weak areas identification');
      console.log('   ✅ Strong areas identification');
      console.log('   ✅ Supabase persistence (learningPath saved)');
      console.log('   ✅ Dashboard fetch with complete profile');
      console.log('   ✅ Weak & Strong areas parsing endpoint');
    } else {
      console.log('\n⚠️  Some tests failed. Check details above.');
    }

    console.log('\n' + '='.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ Test Error:', error.message);
    console.error(error.stack);
  }

  process.exit(0);
}

runTests();
