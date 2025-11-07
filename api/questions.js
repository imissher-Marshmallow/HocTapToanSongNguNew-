// Vercel Serverless function: GET /api/questions
// Supports:
//  - /api/questions?quizId=1
//  - /api/questions?quizId=random
//  - /api/questions?quizId=contest3&grouped=true

const analyzer = require('./ai/analyzer');

module.exports = async (req, res) => {
  try {
    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    // Support query param ?quizId=... and ?grouped=true
    const q = req.query || {};
    // Also support path-style requests: /api/questions/random or /api/questions/1/grouped
    const rawPath = req.url || '';
    const segments = rawPath.split('?')[0].split('/').filter(Boolean);
    // segments might be ['api','questions','random'] if proxied; find 'questions' index
    let quizId = q.quizId || null;
    let grouped = q.grouped === 'true' || q.grouped === '1';
    const idx = segments.indexOf('questions');
    if (idx >= 0 && segments.length > idx + 1) {
      const next = segments[idx + 1];
      if (next && next !== 'questions') quizId = quizId || next;
      if (segments.length > idx + 2 && segments[idx + 2] === 'grouped') grouped = true;
    }

    // Default to random if nothing provided
    if (!quizId) quizId = 'random';

    if (grouped) {
      const groupedData = analyzer.loadGroupedQuestionsForQuiz(quizId);
      res.json(groupedData);
      return;
    }

    const questions = analyzer.loadQuestionsForQuiz(quizId);
    res.json(questions);
  } catch (err) {
    console.error('API /api/questions error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
