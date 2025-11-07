// Vercel serverless function wrapper for Express backend
// Import the Express app from the backend server
const app = require('../stem-project/backend/server');

// Export for Vercel serverless deployment
module.exports = app;
