// Test script: test-random-contest.js
// Run from stem-project/backend folder: node test-random-contest.js

const { loadQuestionsForQuiz } = require('./ai/analyzer');

function showSample(result) {
  if (!result || !result.questions) return console.log('No questions returned');
  const key = result.contestKey;
  const q = result.questions[0];
  console.log('contestKey=', key, 'questionsCount=', result.questions.length);
  if (q) {
    console.log('  first.id=', q.id);
    console.log('  question (vn)=', q.question);
    console.log('  english_question=', q.english_question);
    console.log('  options=', Array.isArray(q.options) ? q.options.slice(0,4) : q.options);
    console.log('  english_options=', Array.isArray(q.english_options) ? q.english_options.slice(0,4) : q.english_options);
  }
}

(async () => {
  console.log('\n=== Random selections (10 runs) ===');
  for (let i = 0; i < 10; i++) {
    const r = loadQuestionsForQuiz('random');
    process.stdout.write(`#${i + 1}: `);
    showSample(r);
  }

  console.log('\n=== Specific contest checks (1..5) ===');
  for (let id = 1; id <= 5; id++) {
    const r = loadQuestionsForQuiz(String(id));
    process.stdout.write(`contest ${id}: `);
    showSample(r);
  }

  console.log('\n=== Default / no id (should behave like random) ===');
  const d = loadQuestionsForQuiz(undefined);
  showSample(d);

  console.log('\nDone.');
})();
