require('dotenv').config();
const express = require('express');
const cors = require('cors');
const quizRoutes = require('./routes/quiz');
const authRoutes = require('./routes/auth');
const resultsRoutes = require('./routes/results');
const historyRoutes = require('./routes/history');
const mlAnalyticsRoutes = require('./routes/ml-analytics');
const adaptiveRoutes = require('./routes/adaptive');
const { db } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration
// Allow configuring frontend origins via FRONTEND_ORIGINS env var (comma-separated).
// Example: FRONTEND_ORIGINS="http://localhost:3000,https://mathz-jett-8a2.vercel.app"
const defaultOrigins = ['http://localhost:3000', 'http://localhost:5000', 'http://127.0.0.1:3000', 'http://127.0.0.1:5000'];
const envOrigins = (process.env.FRONTEND_ORIGINS || '').split(',').map(s => s && s.trim()).filter(Boolean);
const allowedOrigins = Array.from(new Set([...defaultOrigins, ...envOrigins]));

const corsOptions = {
  origin: function (origin, callback) {
    // If no origin (e.g., server-to-server or curl), allow
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    // Allow all origins when FRONTEND_ALLOW_ALL is set to 'true' (useful for quick testing only)
    if (String(process.env.FRONTEND_ALLOW_ALL || '').toLowerCase() === 'true') {
      return callback(null, true);
    }
    console.warn(`CORS rejection for origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));
// Ensure preflight requests are handled for all routes
app.options('*', cors(corsOptions));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[Express] ${req.method} ${req.path} ${req.query && Object.keys(req.query).length > 0 ? '?' + Object.entries(req.query).map(([k,v]) => `${k}=${v}`).join('&') : ''}`);
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Quiz API Server', status: 'running', features: ['Quiz', 'Auth', 'ML'] });
});

// Routes - Order matters! More specific routes first
// Support multiple path prefixes for compatibility
// /auth, /api/auth, /backend/auth, /api/backend/auth
app.use('/auth', authRoutes);
app.use('/api/auth', authRoutes);
app.use('/backend/auth', authRoutes);
app.use('/api/backend/auth', authRoutes);

app.use('/api/history', historyRoutes);  // Must come BEFORE /api for /summary to work
app.use('/backend/api/history', historyRoutes);
app.use('/api/backend/api/history', historyRoutes);

app.use('/api/ml', mlAnalyticsRoutes);   // ML Analytics routes
app.use('/backend/api/ml', mlAnalyticsRoutes);
app.use('/api/backend/api/ml', mlAnalyticsRoutes);

// Adaptive learning routes - multiple path variants
app.use('/adaptive', adaptiveRoutes);
app.use('/api/adaptive', adaptiveRoutes);
app.use('/backend/adaptive', adaptiveRoutes);
app.use('/api/backend/adaptive', adaptiveRoutes);
app.use('/backend/api/adaptive', adaptiveRoutes);
app.use('/api/backend/api/adaptive', adaptiveRoutes);

app.use('/api', quizRoutes);
app.use('/backend/api', quizRoutes);
app.use('/api/backend/api', quizRoutes);

app.use('/api/results', resultsRoutes);
app.use('/backend/api/results', resultsRoutes);
app.use('/api/backend/api/results', resultsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running', timestamp: new Date() });
});

// Debug endpoint - returns non-sensitive runtime info to help with CORS / env debugging
app.get('/debug', (req, res) => {
  try {
    const frontendEnv = process.env.FRONTEND_ORIGINS || '';
    const allowedOrigins = Array.from(new Set([...(frontendEnv ? frontendEnv.split(',').map(s => s.trim()).filter(Boolean) : []), 'http://localhost:3000', 'http://localhost:5000', 'http://127.0.0.1:3000', 'http://127.0.0.1:5000']));
    const frontendAllowAll = String(process.env.FRONTEND_ALLOW_ALL || 'false').toLowerCase() === 'true';
    const openaiSet = Boolean(process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEYS);
    const nodeEnv = process.env.NODE_ENV || 'development';
    const originHeader = req.get('origin') || null;

    return res.json({
      status: 'ok',
      nodeEnv,
      allowedOrigins,
      frontendAllowAll,
      openaiKeyPresent: openaiSet,
      requestOrigin: originHeader,
      timestamp: new Date()
    });
  } catch (e) {
    return res.status(500).json({ error: 'debug endpoint error', details: e && e.message });
  }
});

// Debug endpoint - inspect all results in database
app.get('/debug/results', async (req, res) => {
  try {
    const results = await dbHelpers.getAllResults();
    res.json({
      status: 'ok',
      totalResults: results.length,
      results: results.map(r => ({
        id: r.id,
        user_id: r.user_id,
        quiz_id: r.quiz_id,
        score: r.score,
        created_at: r.created_at
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

// Only start server if not in serverless environment
if (require.main === module) {
  // Initialize guest user on startup
  const { initializeGuestUser } = require('./initialize-guest');
  initializeGuestUser().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Features: Quiz API, Authentication, ML Integration`);
    });
  }).catch(err => {
    console.error('Failed to initialize guest user:', err);
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT} (guest user setup skipped)`);
    });
  });
}

// Export app for serverless deployment
module.exports = app;
