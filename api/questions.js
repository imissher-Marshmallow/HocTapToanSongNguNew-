// Vercel Serverless function: GET /api/questions
// Supports:
//  - /api/questions?quizId=1
//  - /api/questions?quizId=random
//  - /api/questions?quizId=contest3&grouped=true

const analyzer = require('./ai/analyzer');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

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

    // Prevent edge/CDN caching for randomized responses so each request gets a fresh selection
    // (helps avoid a single cached contest being returned to all users)
    res.setHeader('Cache-Control', 'no-store');

    if (grouped) {
      const groupedData = analyzer.loadGroupedQuestionsForQuiz(quizId);
      res.json(groupedData);
      return;
    }

    // Use the analyzer helper which may return questions + contest metadata
    const result = analyzer.loadQuestionsForQuiz(quizId);
    // Normalize response: always include numeric `contestId` when available
    if (result && result.questions) {
      const out = Object.assign({}, result);
      if (!out.contestId) {
        // try to derive numeric id from contestIndex or contestKey
        if (out.contestIndex) out.contestId = out.contestIndex;
        else if (out.contestKey) {
          const m = String(out.contestKey).match(/contest(\d+)/);
          if (m) out.contestId = parseInt(m[1], 10);
        }
      }
      res.json(out);
    } else {
      // backward-compat: if analyzer returned an array, wrap it
      res.json({ questions: result, contestId: null, contestKey: quizId });
    }
  } catch (err) {
    console.error('API /api/questions error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
