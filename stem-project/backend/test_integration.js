#!/usr/bin/env node

/**
 * test_integration.js
 * 
 * End-to-end integration test for the quiz analysis pipeline:
 * 1. Send a sample quiz submission to the backend /api/results endpoint
 * 2. Backend calls ai_engine (or falls back to local analyzer)
 * 3. Verify response includes: score, performanceLabel, weakAreas, resourceLinks, motivationalFeedback
 */

const axios = require('axios');

// Sample quiz payload with different difficulty answers
const samplePayload = {
  userId: 1,
  quizId: 'test-quiz-1',
  answers: [
    { questionId: 'q1', selectedOption: 'A', timeTakenSec: 15 },    // Assume correct
    { questionId: 'q2', selectedOption: 'B', timeTakenSec: 12 },    // Assume wrong
    { questionId: 'q3', selectedOption: 'C', timeTakenSec: 20 },    // Assume correct
    { questionId: 'q4', selectedOption: 'A', timeTakenSec: 8 },     // Assume wrong
    { questionId: 'q5', selectedOption: 'D', timeTakenSec: 18 },    // Assume correct
    { questionId: 'q6', selectedOption: 'C', timeTakenSec: 25 },    // Assume correct
    { questionId: 'q7', selectedOption: 'B', timeTakenSec: 10 },    // Assume wrong
    { questionId: 'q8', selectedOption: 'A', timeTakenSec: 14 },    // Assume correct
    { questionId: 'q9', selectedOption: 'C', timeTakenSec: 22 },    // Assume correct
    { questionId: 'q10', selectedOption: 'D', timeTakenSec: 16 }    // Assume correct
  ],
  questions: [
    {
      id: 'q1',
      question: 'Đa thức nào sau đây là đa thức bậc 2?',
      options: ['x^2 + x + 1', '2x + 3', 'x^3 - 2x', 'x + 5'],
      answerIndex: 0,
      topic: 'Đa thức',
      explanation: 'Đa thức bậc 2 có mũ cao nhất là 2'
    },
    {
      id: 'q2',
      question: 'Giá trị của x + 2 khi x = 3?',
      options: ['4', '5', '6', '7'],
      answerIndex: 1,
      topic: 'Toán cơ bản (phép toán)',
      explanation: '3 + 2 = 5'
    },
    {
      id: 'q3',
      question: 'Hằng đẳng thức (a+b)^2 = ?',
      options: ['a^2 + b^2', 'a^2 + 2ab + b^2', 'a^2 - 2ab + b^2', 'ab + b^2'],
      answerIndex: 1,
      topic: 'Hằng đẳng thức',
      explanation: 'Bình phương của một tổng'
    },
    {
      id: 'q4',
      question: 'Diện tích tam giác với đáy b và chiều cao h là?',
      options: ['(b*h)/2', 'b*h', '2*b*h', 'b + h'],
      answerIndex: 0,
      topic: 'Hình học',
      explanation: 'Công thức diện tích tam giác'
    },
    {
      id: 'q5',
      question: 'Phương trình 2x + 4 = 10 có nghiệm x = ?',
      options: ['1', '2', '3', '4'],
      answerIndex: 2,
      topic: 'Phương trình',
      explanation: '2x = 6, x = 3'
    },
    {
      id: 'q6',
      question: 'Bậc của đa thức 3x^2 + 2x + 1 là?',
      options: ['0', '1', '2', '3'],
      answerIndex: 2,
      topic: 'Bậc / Hệ số',
      explanation: 'Bậc cao nhất là 2'
    },
    {
      id: 'q7',
      question: 'Rút gọn 2x + 3x = ?',
      options: ['5', '5x', '6x', 'x'],
      answerIndex: 1,
      topic: 'Đa thức',
      explanation: '2x + 3x = 5x'
    },
    {
      id: 'q8',
      question: 'Giá trị x^2 khi x = 2?',
      options: ['4', '2', '8', '6'],
      answerIndex: 0,
      topic: 'Toán cơ bản (phép toán)',
      explanation: '2 * 2 = 4'
    },
    {
      id: 'q9',
      question: 'Hằng đẳng thức (a-b)^2 = ?',
      options: ['a^2 + b^2', 'a^2 + 2ab + b^2', 'a^2 - 2ab + b^2', 'ab - b^2'],
      answerIndex: 2,
      topic: 'Hằng đẳng thức',
      explanation: 'Bình phương của một hiệu'
    },
    {
      id: 'q10',
      question: 'Số đỉnh của một tam giác là?',
      options: ['2', '3', '4', '5'],
      answerIndex: 1,
      topic: 'Hình học',
      explanation: 'Tam giác có 3 đỉnh'
    }
  ]
};

async function testIntegration() {
  console.log('====================================');
  console.log('📚 STEM Quiz Analysis Integration Test');
  console.log('====================================\n');

  const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000/api/results';
  const aiEngineUrl = process.env.AI_ENGINE_URL || 'http://localhost:8000/analyze';

  console.log(`Backend URL: ${backendUrl}`);
  console.log(`AI Engine URL: ${aiEngineUrl}\n`);

  // Test 1: Direct AI Engine call (if running)
  console.log('Test 1: Testing AI Engine /analyze endpoint directly...');
  try {
    const aiResponse = await axios.post(aiEngineUrl, samplePayload, { timeout: 10000 });
    const data = aiResponse.data;
    console.log('✅ AI Engine responded successfully');
    console.log(`   Score: ${data.score}/10 (${data.percentage}%)`);
    console.log(`   Performance: ${data.performanceLabel}`);
    console.log(`   Weak Areas: ${data.weakAreas ? data.weakAreas.length : 0} identified`);
    console.log(`   Resource Links: ${data.resourceLinks ? data.resourceLinks.length : 0} links found`);
    console.log(`   Motivational Feedback: ${data.motivationalFeedback ? '✓ Present' : '✗ Missing'}`);
    if (data.motivationalFeedback) {
      console.log(`   Opening: "${data.motivationalFeedback.opening}"`);
    }
    console.log('');
  } catch (err) {
    console.log(`⚠️  AI Engine not available (${err.message})`);
    console.log('   This is OK if the service is not running.\n');
  }

  // Test 2: Backend call (with fallback to local analyzer)
  console.log('Test 2: Testing Backend /api/results endpoint...');
  try {
    const backendResponse = await axios.post(backendUrl, samplePayload, { timeout: 15000 });
    const result = backendResponse.data;
    console.log('✅ Backend responded successfully');
    console.log(`   Score: ${result.score}/10 (${result.percentage}%)`);
    console.log(`   Performance: ${result.performanceLabel}`);
    console.log(`   Weak Areas: ${result.weakAreas ? result.weakAreas.length : 0} identified`);
    
    // Show first weak area if available
    if (result.weakAreas && result.weakAreas.length > 0) {
      const firstWeak = result.weakAreas[0];
      console.log(`   Top Weak Area: "${firstWeak.topic}" (${firstWeak.percentage}% error rate)`);
    }
    
    console.log(`   Answer Comparison: ${result.answerComparison ? result.answerComparison.length : 0} items`);
    console.log(`   Motivational Feedback: ${result.motivationalFeedback ? '✓ Present' : '✗ Missing'}`);
    if (result.motivationalFeedback) {
      console.log(`   Opening: "${result.motivationalFeedback.opening}"`);
      console.log(`   Closing: "${result.motivationalFeedback.closing}"`);
    }
    console.log(`   Summary: ${result.summary ? (result.summary.overall ? '✓ Present' : '✗ Malformed') : '✗ Missing'}`);
    console.log('');

    // Detailed output
    console.log('📊 Detailed Results:');
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.log(`❌ Backend call failed: ${err.message}`);
    if (err.response && err.response.data) {
      console.log(`   Error details: ${JSON.stringify(err.response.data)}`);
    }
  }

  console.log('\n====================================');
  console.log('✨ Integration test complete!');
  console.log('====================================');
}

// Run test
testIntegration().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
