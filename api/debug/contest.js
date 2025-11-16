const analyzer = require('../ai/analyzer');

// Simple debug endpoint to verify random contest selection in production
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // Force a random selection each request
      const result = analyzer.loadQuestionsForQuiz('random');
      // avoid caching random responses
      res.setHeader('Cache-Control', 'no-store, max-age=0');
      res.json({
        ok: true,
        contestKey: result && result.contestKey ? result.contestKey : null,
        contestIndex: result && result.contestIndex ? result.contestIndex : null,
        contestId: result && result.contestId ? result.contestId : null,
        contestName: result && result.contestName ? result.contestName : null,
        questions: result && result.questions ? result.questions.length : 0,
        timestamp: Date.now(),
        note: 'Use this endpoint to verify contest selection/randomness in production'
      });
  } catch (err) {
    console.error('Debug /api/debug/contest error:', err);
    res.status(500).json({ error: 'internal' });
  }
};
