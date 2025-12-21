require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const quizRoutes = require('./routes/quiz');
const adaptiveRoutes = require('./routes/adaptive');

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================
// SECURITY MIDDLEWARE
// ============================================

// Security headers
app.use(helmet());

// CORS - Configured
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://mathz-jett-8a2.vercel.app'
    : ['http://localhost:3000', 'http://localhost:5000'],
  credentials: true,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
};
app.use(cors(corsOptions));

// Rate limiting - Global
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parser with size limits
app.use(express.json({ limit: '1mb' }));

// ============================================
// ROUTES
// ============================================

// Legacy quiz routes (backward compatible)
app.use('/api', quizRoutes);

// NEW: Adaptive learning routes
app.use('/api/adaptive', adaptiveRoutes);

// ============================================
// HEALTH CHECK & MONITORING
// ============================================

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    version: '2.0',
    features: ['adaptive-learning', 'security-hardened']
  });
});

// ============================================
// ERROR HANDLER
// ============================================

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║  STEM Quiz Server - Adaptive Learning Edition         ║
║  Running on port ${PORT}                           ║
║  Features:                                             ║
║  ✓ Adaptive Assessment (4 cognitive levels)           ║
║  ✓ Personalized Quiz Generation                       ║
║  ✓ Learning Profile Management                        ║
║  ✓ Security Hardened                                  ║
╚════════════════════════════════════════════════════════╝
  `)
});
