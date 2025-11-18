/**
 * Vercel Serverless Function Wrapper
 * 
 * This file wraps the Express backend to work as a Vercel serverless function.
 * All API routes from /api/* are handled here.
 * 
 * How it works:
 * - Vercel routes /api/* to this function
 * - We import and run the Express backend
 * - Returns HTTP responses for each request
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Import routes from backend
const quizRoutes = require('../stem-project/backend/routes/quiz');
const authRoutes = require('../stem-project/backend/routes/auth');
const resultsRoutes = require('../stem-project/backend/routes/results');
const historyRoutes = require('../stem-project/backend/routes/history');
const mlAnalyticsRoutes = require('../stem-project/backend/routes/ml-analytics');

// Create Express app
const app = express();

// CORS configuration for Vercel
const corsOptions = {
  origin: '*',
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`[API] ${req.method} ${req.path}`);
  next();
});

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'STEM Quiz API', status: 'running' });
});

app.use('/auth', authRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/ml', mlAnalyticsRoutes);
app.use('/api', quizRoutes);
app.use('/api/results', resultsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'API is running' });
});

// Debug endpoint
app.get('/debug', (req, res) => {
  res.json({
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date(),
    database: process.env.DATABASE_URL ? 'PostgreSQL' : 'SQLite (dev)'
  });
});

// Export for Vercel
module.exports = app;

// Also handle direct invocation (for local testing)
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`[API Server] Running on port ${PORT}`);
  });
}
