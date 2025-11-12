const app = require('../../stem-project/backend/server');

module.exports = (req, res) => {
  // Strip the /api/backend prefix so Express routes (which are mounted at /auth, /api, etc.) match.
  try {
    const prefix = '/api/backend';
    if (req.url && req.url.startsWith(prefix)) {
      req.url = req.url.slice(prefix.length) || '/';
    }
    return app(req, res);
  } catch (err) {
    console.error('Error in backend index route:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
