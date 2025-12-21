const app = require('../../stem-project/backend/server');

module.exports = (req, res) => {
  try {
    const originalUrl = req.url;
    const prefix = '/api/backend';
    
    // Strip the /api/backend prefix so Express routes (which are mounted at /auth, /api, etc.) match.
    if (req.url && req.url.startsWith(prefix)) {
      req.url = req.url.slice(prefix.length) || '/';
    }
    
    console.log(`[backend-slug] ${req.method} ${originalUrl} -> ${req.url}`);
    
    // Call Express app
    return app(req, res);
  } catch (err) {
    console.error('[backend-slug] Error:', err && err.message ? err.message : err);
    if (err && err.stack) console.error('[backend-slug] Stack:', err.stack);
    res.status(500).json({ error: 'Internal server error', details: err && err.message });
  }
};
