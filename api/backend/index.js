const app = require('../../stem-project/backend/server');

module.exports = (req, res) => {
  // Debug logging to help diagnose 404 routing issues
  try {
    console.log('[proxy:index] incoming', req.method, 'url=', req.url, 'originalUrl=', req.originalUrl || null, 'headers.origin=', req.headers && req.headers.origin);
    const prefix = '/api/backend';
    if (req.url && req.url.startsWith(prefix)) {
      const old = req.url;
      req.url = req.url.slice(prefix.length) || '/';
      console.log('[proxy:index] rewritten url', old, '->', req.url);
    }
    return app(req, res);
  } catch (err) {
    console.error('Error in backend index route:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
