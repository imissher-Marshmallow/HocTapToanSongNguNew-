const serverless = require('serverless-http');
const app = require('../stem-project/backend/server');

module.exports = app;
module.exports.handler = serverless(app);
