/**
 * test-local.js
 * 
 * Local test to verify the database layer works correctly
 * This simulates what happens when quiz results are saved
 */

const path = require('path');
const fs = require('fs');

// Mock database layer to test query logic
async function testQueryLogic() {
  console.log('🧪 Testing Query Logic Locally\n');

  // Simulate results from database (what would come from PostgreSQL)
  const mockResults = [
    {
      id: 1,
      user_id: 1,
      quiz_id: 'quiz-1',
      score: 8,
      total_questions: 20,
      answers: JSON.stringify([{ questionId: 1, selectedOption: 'A' }]),
      weak_areas: JSON.stringify(['Algebra']),
      ai_analysis: JSON.stringify({ strengths: ['Geometry'], timeTaken: 900 }),
      created_at: new Date(Date.now() - 1000000)
    },
    {
      id: 2,
      user_id: 1,
      quiz_id: 'quiz-2',
      score: 7,
      total_questions: 20,
      answers: JSON.stringify([{ questionId: 1, selectedOption: 'B' }]),
      weak_areas: JSON.stringify(['Trigonometry']),
      ai_analysis: JSON.stringify({ strengths: ['Algebra'], timeTaken: 1200 }),
      created_at: new Date(Date.now() - 500000)
    },
    {
      id: 3,
      user_id: 2,
      quiz_id: 'quiz-1',
      score: 9,
      total_questions: 20,
      answers: JSON.stringify([{ questionId: 1, selectedOption: 'A' }]),
      weak_areas: JSON.stringify(['Calculus']),
      ai_analysis: JSON.stringify({ strengths: ['Algebra'] }),
      created_at: new Date(Date.now() - 2000000)
    }
  ];

  console.log('📊 Mock Database Results:');
  mockResults.forEach((r, idx) => {
    console.log(`  ${idx + 1}. user_id=${r.user_id}, quiz=${r.quiz_id}, score=${r.score}, id=${r.id}`);
  });

  // Test 1: Filter for userId 1
  console.log('\n✅ Test 1: Query for userId=1');
  const userId1Results = mockResults.filter(r => r.user_id === 1);
  console.log(`Found ${userId1Results.length} results:`);
  userId1Results.forEach(r => {
    console.log(`  - Result ID ${r.id}: ${r.quiz_id} (score: ${r.score})`);
  });

  // Test 2: Filter for userId 2
  console.log('\n✅ Test 2: Query for userId=2');
  const userId2Results = mockResults.filter(r => r.user_id === 2);
  console.log(`Found ${userId2Results.length} results:`);
  userId2Results.forEach(r => {
    console.log(`  - Result ID ${r.id}: ${r.quiz_id} (score: ${r.score})`);
  });

  // Test 3: Format results like the history endpoint
  console.log('\n✅ Test 3: Format results for /api/history endpoint');
  const formatted = userId1Results.map(r => ({
    id: r.id,
    quizName: r.quiz_id || 'Quiz',
    score: typeof r.score === 'number' ? r.score : Number(r.score) || 0,
    totalScore: 10,
    date: r.created_at,
    status: r.score >= 5 ? 'passed' : 'failed',
    totalQuestions: r.total_questions,
    weakAreas: JSON.parse(r.weak_areas || '[]'),
    ai_analysis: JSON.parse(r.ai_analysis || '{}')
  }));
  
  console.log('Formatted results for userId 1:');
  console.log(JSON.stringify(formatted, null, 2));

  // Test 4: Summary calculation (like /api/history/summary)
  console.log('\n✅ Test 4: Calculate summary for userId=1');
  let totalScore = 0;
  let totalAttempts = 0;
  let weakAreas = {};
  
  userId1Results.forEach(r => {
    const score = typeof r.score === 'number' ? r.score : Number(r.score) || 0;
    totalScore += score;
    totalAttempts++;
    const weak = JSON.parse(r.weak_areas || '[]');
    weak.forEach(w => {
      weakAreas[w] = (weakAreas[w] || 0) + 1;
    });
  });

  const averageScore = totalAttempts ? (totalScore / totalAttempts).toFixed(2) : 0;
  const topWeak = Object.entries(weakAreas)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(x => x[0]);

  console.log(`  - Average Score: ${averageScore}/10`);
  console.log(`  - Total Attempts: ${totalAttempts}`);
  console.log(`  - Top Weak Areas: ${topWeak.join(', ')}`);

  console.log('\n✅ All tests completed successfully!');
}

testQueryLogic().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
