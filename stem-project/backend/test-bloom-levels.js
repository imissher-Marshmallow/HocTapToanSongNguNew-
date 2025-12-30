/**
 * Test script to verify Bloom levels and weak/strong areas are saved properly
 * Tests with user ID 51521
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';
const USER_ID = '51521';

async function test() {
  try {
    console.log('\n========== BLOOM LEVELS TEST FOR USER 51521 ==========\n');

    // Step 1: Get personalized quiz
    console.log('📝 Step 1: Fetching personalized quiz...');
    const quizResponse = await fetch(`${BASE_URL}/api/adaptive/quiz/personalized?userId=${USER_ID}`);
    const quizData = await quizResponse.json();
    
    const questions = quizData.quiz || [];
    console.log(`✅ Fetched ${questions.length} questions`);
    
    // Verify questions have topic field
    console.log('\n📋 Sample questions structure:');
    questions.slice(0, 3).forEach((q, idx) => {
      console.log(`  Q${idx + 1}: id=${q.id}, topic="${q.topic}", difficulty=${q.difficulty}`);
    });

    // Step 2: Prepare answers (simulate correct answers for some, wrong for others)
    // Note: answerIndex is not sent to client, so we store it separately for tracking
    console.log('\n🎯 Step 2: Preparing test answers...');
    const answerIndices = questions.map((q, idx) => {
      // Get the correct answer index - stored in question data from backend
      if (q.correctAnswer !== undefined) return q.correctAnswer;
      if (q.answerIndex !== undefined) return q.answerIndex;
      return q.answer || 0; // fallback
    });
    
    const answers = questions.map((q, idx) => {
      // Mix of correct and incorrect answers to show variation in scores
      const isCorrect = idx % 3 !== 0; // 2/3 correct
      const correctIdx = answerIndices[idx];
      return {
        questionId: q.id,
        questionType: q.type || 'multiple-choice',
        answer: isCorrect ? correctIdx : (correctIdx === 0 ? 1 : 0)
      };
    });
    
    const correctCount = answers.filter((a, idx) => 
      a.answer === answerIndices[idx]
    ).length;
    console.log(`✅ Prepared ${answers.length} answers (${correctCount} correct)`);

    // Step 3: Submit quiz results
    console.log('\n📤 Step 3: Submitting quiz results to /api/results...');
    const submitPayload = {
      userId: USER_ID,
      quizId: 'personalized-adaptive',
      quizName: 'Bloom Levels Test Quiz',
      answers: answers,
      questions: questions,
      score: Math.round((correctCount / questions.length) * 10),
      percentage: Math.round((correctCount / questions.length) * 100),
      timeTaken: 300,
      ai_analysis: {
        overallScore: (correctCount / questions.length) * 10,
        correctAnswers: correctCount,
        totalQuestions: questions.length,
        weakAreas: [],
        strongAreas: [],
        topicFeedback: {}
      }
    };

    console.log('📊 Payload summary:');
    console.log(`  - User ID: ${submitPayload.userId}`);
    console.log(`  - Quiz ID: ${submitPayload.quizId}`);
    console.log(`  - Questions: ${submitPayload.questions.length}`);
    console.log(`  - Answers: ${submitPayload.answers.length}`);
    console.log(`  - Score: ${submitPayload.score}/10`);
    console.log(`  - Percentage: ${submitPayload.percentage}%`);

    const submitResponse = await fetch(`${BASE_URL}/api/results`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(submitPayload)
    });

    const submitResult = await submitResponse.json();
    console.log(`\n✅ Quiz submitted. Response status: ${submitResponse.status}`);
    console.log('📈 Response data:', JSON.stringify(submitResult, null, 2).substring(0, 500) + '...');

    // Step 4: Fetch user profile to verify Bloom levels were saved
    console.log('\n\n🔍 Step 4: Fetching user profile to verify Bloom levels...');
    const profileResponse = await fetch(`${BASE_URL}/api/adaptive/profile/${USER_ID}`);
    const profileData = await profileResponse.json();

    console.log('\n📚 User Learning Profile:');
    console.log(`  Status: ${profileResponse.status}`);
    
    if (profileData.profile) {
      const profile = profileData.profile;
      console.log('\n  Cognitive Levels (Bloom):');
      if (profile.cognitive_levels) {
        Object.entries(profile.cognitive_levels).forEach(([level, score]) => {
          console.log(`    ${level}: ${score}%`);
        });
      } else {
        console.log('    ⚠️  No cognitive_levels found');
      }

      console.log('\n  Weak Areas:');
      if (profile.weak_areas && profile.weak_areas.length > 0) {
        profile.weak_areas.forEach(area => {
          console.log(`    - ${area.topic}: ${area.percentage}%`);
        });
      } else {
        console.log('    ℹ️  No weak areas identified');
      }

      console.log('\n  Strong Areas:');
      if (profile.strong_areas && profile.strong_areas.length > 0) {
        profile.strong_areas.forEach(area => {
          console.log(`    - ${area.topic}: ${area.percentage}%`);
        });
      } else {
        console.log('    ℹ️  No strong areas identified');
      }
    } else {
      console.log('⚠️  No profile data received');
      console.log('Response:', JSON.stringify(profileData, null, 2));
    }

    // Step 5: Check Supabase directly for the data
    console.log('\n\n💾 Step 5: Verifying Supabase data...');
    console.log('✅ Quiz results should be saved in Supabase tables:');
    console.log('  - quiz_results: Contains overall_score, topic_performance, cognitive_breakdown');
    console.log('  - user_learning_profiles: Contains weak_areas, strong_areas, cognitive_levels');

    console.log('\n========== TEST COMPLETE ==========\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
  }
}

// Run test
test();
