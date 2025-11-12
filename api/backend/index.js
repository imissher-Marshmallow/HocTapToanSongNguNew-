const app = require('../../stem-project/backend/server');

module.exports = (req, res) => {
  // Delegate request to the Express app directly
  try {
    return app(req, res);
  } catch (err) {
    console.error('Error in backend index route:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
