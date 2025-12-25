/**
 * TEST: Verify Profile Update with userid=1
 * Check if quiz submission updates the learning profile for user 1
 */

const http = require('http');

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    // Backend runs on port 5000 (see package.json)
    const port = 5000;
    const options = {
      hostname: 'localhost',
      port: port,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function testProfileUpdate() {
  console.log('\n' + '='.repeat(70));
  console.log('🧪 PROFILE UPDATE TEST - User ID 1');
  console.log('='.repeat(70));

  try {
    // Step 0: Get personalized quiz first
    console.log('\n0️⃣  GET PERSONALIZED QUIZ');
    const quizRes = await request('GET', '/api/adaptive/quiz/personalized?userId=1');
    console.log(`   Status: ${quizRes.status}`);
    
    let personalizedQuizData = [];
    if (quizRes.status === 200) {
      personalizedQuizData = quizRes.data?.quiz || [];
      console.log(`   Questions received: ${personalizedQuizData.length}`);
    } else {
      console.log(`   ⚠️ Could not get personalized quiz, will use basic test`);
    }

    // Step 1: Get initial profile
    console.log('\n1️⃣  GET INITIAL PROFILE');
    const initialRes = await request('GET', '/api/adaptive/dashboard/1');
    console.log(`   Status: ${initialRes.status}`);
    const initialProfile = initialRes.data?.profile || initialRes.data;
    console.log(`   Quizzes taken: ${initialProfile?.quizzesTaken || 0}`);
    console.log(`   Sample scores: ${JSON.stringify(initialProfile?.scores).substring(0, 100)}`);

    // Step 2: Submit a quiz
    console.log('\n2️⃣  SUBMIT QUIZ');
    const quizSubmit = {
      userId: 1,
      quizId: 'personalized',
      answers: personalizedQuizData.length > 0 
        ? personalizedQuizData.map((q, i) => ({
            questionId: q.id || String(i + 1),
            answer: i % 4
          }))
        : Array.from({length: 20}, (_, i) => ({
            questionId: String(i + 1),
            answer: i % 4
          })),
      personalizedQuizData: personalizedQuizData.length > 0 ? personalizedQuizData : undefined,
      timeSpent: 300
    };

    const submitRes = await request('POST', '/api/adaptive/analyze', quizSubmit);
    console.log(`   Status: ${submitRes.status}`);
    if (submitRes.status !== 200) {
      console.log(`   ❌ Error: ${submitRes.data?.error || 'Unknown'}`);
      console.log(`   Response: ${JSON.stringify(submitRes.data).substring(0, 200)}`);
      console.log(`\n   🔍 DEBUGGING: Check backend logs for full error details`);
    } else {
      const analysis = submitRes.data;
      console.log(`   ✅ Quiz submitted`);
      console.log(`   Score: ${analysis?.analysis?.overallScore || analysis?.score || 'N/A'}`);
      console.log(`   Has weakAreas: ${!!analysis?.weakAreas?.length}`);
      if (analysis?.weakAreas?.length > 0) {
        console.log(`   Sample weak area: ${JSON.stringify(analysis.weakAreas[0]).substring(0, 150)}`);
      }
    }

    // Wait for DB
    console.log('\n   ⏳ Waiting 2 seconds for database update...');
    await new Promise(r => setTimeout(r, 2000));

    // Step 3: Get updated profile
    console.log('\n3️⃣  GET UPDATED PROFILE');
    const updatedRes = await request('GET', '/api/adaptive/dashboard/1');
    console.log(`   Status: ${updatedRes.status}`);
    const updatedProfile = updatedRes.data?.profile || updatedRes.data;
    console.log(`   Quizzes taken: ${updatedProfile?.quizzesTaken || 0}`);
    console.log(`   Sample scores: ${JSON.stringify(updatedProfile?.scores).substring(0, 100)}`);

    // Step 4: Check if profile updated
    console.log('\n4️⃣  VERIFICATION');
    const initialQuizzes = initialProfile?.quizzesTaken || 0;
    const updatedQuizzes = updatedProfile?.quizzesTaken || 0;
    
    if (updatedQuizzes > initialQuizzes) {
      console.log(`   ✅ PASS: Profile updated! (${initialQuizzes} → ${updatedQuizzes} quizzes)`);
      console.log(`   ✅ Weak areas: ${JSON.stringify(updatedProfile?.weakAreas || []).substring(0, 100)}`);
      console.log(`   ✅ Strong areas: ${JSON.stringify(updatedProfile?.strongAreas || []).substring(0, 100)}`);
    } else {
      console.log(`   ❌ FAIL: Profile not updated (still ${updatedQuizzes} quizzes)`);
      console.log(`   Check: Is Supabase connected?`);
      console.log(`   Check: Does user_learning_profiles table exist?`);
      console.log(`   Check: Check server logs for errors`);
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ TEST COMPLETE\n');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(`\nMake sure backend server is running on localhost:5000`);
    console.error(`\nTo start backend:\n  cd stem-project/backend\n  npm start\n`);
  }
}

testProfileUpdate();
