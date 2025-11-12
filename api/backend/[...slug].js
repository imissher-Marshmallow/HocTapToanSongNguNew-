const app = require('../../stem-project/backend/server');

module.exports = (req, res) => {
  try {
    const prefix = '/api/backend';
    if (req.url && req.url.startsWith(prefix)) {
      req.url = req.url.slice(prefix.length) || '/';
    }
    return app(req, res);
  } catch (err) {
    console.error('Error in backend catch-all route:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
