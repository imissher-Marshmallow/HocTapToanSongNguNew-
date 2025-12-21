// insert-test-result.js
// Adds a test quiz result for userId=1 to Supabase/PostgreSQL
require('dotenv').config();
const { dbHelpers } = require('./database');

async function main() {
  const userId = 1;
  const quizId = 'mathz-demo-quiz';
  const score = 8;
  const totalQuestions = 10;
  const answers = [
    { questionId: 1, selectedOption: 'A', timeTakenSec: 12 },
    { questionId: 2, selectedOption: 'B', timeTakenSec: 15 },
    { questionId: 3, selectedOption: 'C', timeTakenSec: 10 },
    { questionId: 4, selectedOption: 'D', timeTakenSec: 20 },
    { questionId: 5, selectedOption: 'A', timeTakenSec: 18 },
    { questionId: 6, selectedOption: 'B', timeTakenSec: 14 },
    { questionId: 7, selectedOption: 'C', timeTakenSec: 11 },
    { questionId: 8, selectedOption: 'D', timeTakenSec: 17 },
    { questionId: 9, selectedOption: 'A', timeTakenSec: 13 },
    { questionId: 10, selectedOption: 'B', timeTakenSec: 16 }
  ];
  const weakAreas = ['Algebra', 'Geometry'];
  const feedback = { summary: 'Good job!', strengths: ['Calculation'], weaknesses: ['Algebra'] };
  const recommendations = ['Review algebra basics', 'Practice geometry problems'];

  try {
    const resultId = await dbHelpers.saveResult(
      userId,
      quizId,
      score,
      totalQuestions,
      answers,
      weakAreas,
      feedback,
      recommendations
    );
    console.log(`✅ Inserted test result with id: ${resultId}`);
  } catch (err) {
    console.error('❌ Failed to insert test result:', err.message);
  }
  process.exit(0);
}

main();
