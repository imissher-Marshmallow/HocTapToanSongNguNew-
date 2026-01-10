#!/usr/bin/env node

/**
 * Test script to verify complete Bloom level flow:
 * 1. Submit quiz results with /api/results
 * 2. Verify Supabase is updated with cognitive_levels
 * 3. Fetch profile with /api/adaptive/profile
 * 4. Verify Bloom levels are returned
 */

const fetch = require('node-fetch');

const TEST_USER_ID = 51521;
const API_BASE = 'http://localhost:3000';

async function testBloomFlow() {
  console.log('='.repeat(60));
  console.log('🧪 Testing Complete Bloom Level Flow');
  console.log('='.repeat(60));
  console.log(`User ID: ${TEST_USER_ID}`);
  console.log(`API Base: ${API_BASE}`);
  
  // Sample quiz results
  const quizResults = {
    userId: TEST_USER_ID,
    quizId: 'test-bloom-flow',
    quizName: 'Test Bloom Flow',
    answers: [0, 1, 2, 0, 1, 2, 3, 0, 1, 2],
    questions: [
      { id: 1, difficulty: 1, topic: 'Topic A', correctAnswer: 0, answerIndex: 0, options: ['A', 'B', 'C', 'D'] },
      { id: 2, difficulty: 2, topic: 'Topic B', correctAnswer: 1, answerIndex: 1, options: ['A', 'B', 'C', 'D'] },
      { id: 3, difficulty: 3, topic: 'Topic C', correctAnswer: 2, answerIndex: 2, options: ['A', 'B', 'C', 'D'] },
      { id: 4, difficulty: 4, topic: 'Topic D', correctAnswer: 0, answerIndex: 0, options: ['A', 'B', 'C', 'D'] },
      { id: 5, difficulty: 1, topic: 'Topic A', correctAnswer: 1, answerIndex: 1, options: ['A', 'B', 'C', 'D'] },
      { id: 6, difficulty: 2, topic: 'Topic B', correctAnswer: 2, answerIndex: 2, options: ['A', 'B', 'C', 'D'] },
      { id: 7, difficulty: 3, topic: 'Topic C', correctAnswer: 3, answerIndex: 3, options: ['A', 'B', 'C', 'D'] },
      { id: 8, difficulty: 4, topic: 'Topic D', correctAnswer: 0, answerIndex: 0, options: ['A', 'B', 'C', 'D'] },
      { id: 9, difficulty: 1, topic: 'Topic A', correctAnswer: 1, answerIndex: 1, options: ['A', 'B', 'C', 'D'] },
      { id: 10, difficulty: 2, topic: 'Topic B', correctAnswer: 2, answerIndex: 2, options: ['A', 'B', 'C', 'D'] }
    ],
    score: 7,
    percentage: 70,
    ai_analysis: { overallScore: 7 },
    timeTaken: 300
  };

  try {
    // STEP 1: Submit results to save Bloom levels
    console.log('\n📝 STEP 1: Submitting quiz results to /api/results');
    console.log('-'.repeat(60));
    
    const resultsRes = await fetch(`${API_BASE}/api/results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(quizResults)
    });

    if (!resultsRes.ok) {
      console.error(`❌ Results submission failed: ${resultsRes.status}`);
      const errText = await resultsRes.text();
      console.error('Error:', errText);
      process.exit(1);
    }

    const resultsData = await resultsRes.json();
    console.log('✅ Results submitted successfully');
    console.log('Response:', JSON.stringify(resultsData, null, 2));

    // Wait a moment for database to sync
    console.log('\n⏳ Waiting 2 seconds for database to sync...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // STEP 2: Fetch profile to verify Bloom levels are stored
    console.log('\n📊 STEP 2: Fetching profile from /api/adaptive/profile/:userId');
    console.log('-'.repeat(60));

    const profileRes = await fetch(`${API_BASE}/api/adaptive/profile/${TEST_USER_ID}`);
    
    if (!profileRes.ok) {
      console.error(`❌ Profile fetch failed: ${profileRes.status}`);
      const errText = await profileRes.text();
      console.error('Error:', errText);
      process.exit(1);
    }

    const profile = await profileRes.json();
    console.log('✅ Profile fetched successfully');
    console.log('\n📈 BLOOM LEVELS:');
    console.log(JSON.stringify(profile.scores, null, 2));
    console.log('\n📊 PROFICIENCY STATUS:');
    console.log(JSON.stringify(profile.proficiency, null, 2));
    console.log('\n❌ WEAK AREAS:');
    console.log(JSON.stringify(profile.weakAreas, null, 2));
    console.log('\n✅ STRONG AREAS:');
    console.log(JSON.stringify(profile.strongAreas, null, 2));

    // STEP 3: Verify bloom levels are NOT default (0%)
    console.log('\n🔍 VERIFICATION:');
    console.log('-'.repeat(60));
    
    const bloomLevels = profile.scores;
    const hasAnyBloomData = Object.values(bloomLevels).some(v => v > 0);
    
    if (hasAnyBloomData) {
      console.log('✅ SUCCESS! Bloom levels are being calculated and stored');
      console.log('   Level 1 (Knowledge):', bloomLevels.level1 + '%');
      console.log('   Level 2 (Comprehension):', bloomLevels.level2 + '%');
      console.log('   Level 3 (Application Low):', bloomLevels.level3 + '%');
      console.log('   Level 4 (Analysis High):', bloomLevels.level4 + '%');
    } else {
      console.log('❌ FAILURE! Bloom levels are still 0% - data not being saved');
    }

    // Also fetch via dashboard endpoint (what LearningProfile uses)
    console.log('\n📱 STEP 3: Fetching via /api/adaptive/dashboard/:userId (used by LearningProfile)');
    console.log('-'.repeat(60));

    const dashboardRes = await fetch(`${API_BASE}/api/adaptive/dashboard/${TEST_USER_ID}`);
    
    if (!dashboardRes.ok) {
      console.error(`❌ Dashboard fetch failed: ${dashboardRes.status}`);
      const errText = await dashboardRes.text();
      console.error('Error:', errText);
      process.exit(1);
    }

    const dashboard = await dashboardRes.json();
    console.log('✅ Dashboard fetched successfully');
    console.log('\n📈 BLOOM LEVELS FROM DASHBOARD:');
    console.log(JSON.stringify(dashboard.profile.scores, null, 2));
    console.log('\n📊 PROFICIENCY FROM DASHBOARD:');
    console.log(JSON.stringify(dashboard.profile.proficiency, null, 2));

    console.log('\n' + '='.repeat(60));
    console.log('🎯 TEST COMPLETE');
    console.log('='.repeat(60));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testBloomFlow();
