const analyzer = require('../ai/analyzer');

// Simple debug endpoint to verify random contest selection in production
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // Force a random selection each request
    const result = analyzer.loadQuestionsForQuiz('random');
    const contestKey = result && result.contestKey ? result.contestKey : null;
    const contestIndex = result && result.contestIndex ? result.contestIndex : null;
    const contestName = result && result.contestName ? result.contestName : null;
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.json({ contestKey, contestIndex, contestName, timestamp: Date.now(), note: 'Use this endpoint to verify contest selection/randomness in production' });
  } catch (err) {
    console.error('Debug /api/debug/contest error:', err);
    res.status(500).json({ error: 'internal' });
  }
};
