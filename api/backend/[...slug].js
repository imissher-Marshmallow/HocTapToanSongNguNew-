const app = require('../../stem-project/backend/server');

module.exports = (req, res) => {
  try {
    const prefix = '/api/backend';
    const originalUrl = req.url;
    if (req.url && req.url.startsWith(prefix)) {
      req.url = req.url.slice(prefix.length) || '/';
    }
    console.log(`[backend/slug] Incoming: ${req.method} ${originalUrl} -> ${req.url}`);
    
    // Wrap res.json to log responses
    const originalJson = res.json.bind(res);
    res.json = function(data) {
      console.log(`[backend/slug] Response: ${res.statusCode}`, data && data.error ? data.error : 'OK');
      return originalJson(data);
    };
    
    return app(req, res);
  } catch (err) {
    console.error('Error in backend catch-all route:', err && err.message ? err.message : err);
    console.error('Stack:', err && err.stack);
    res.status(500).json({ error: 'Internal server error', details: err && err.message });
  }
};
