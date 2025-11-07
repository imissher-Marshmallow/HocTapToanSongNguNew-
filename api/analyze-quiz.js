const analyzer = require('./ai/analyzer');

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }
    const payload = req.body;
    if (!payload) {
      res.status(400).json({ error: 'Missing JSON body' });
      return;
    }

    const result = await analyzer.analyzeQuiz(payload);
    res.json(result);
  } catch (err) {
    console.error('API /api/analyze-quiz error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
