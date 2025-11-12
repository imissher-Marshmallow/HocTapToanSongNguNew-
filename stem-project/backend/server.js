require('dotenv').config();
const express = require('express');
const cors = require('cors');
const quizRoutes = require('./routes/quiz');
const authRoutes = require('./routes/auth');
const resultsRoutes = require('./routes/results');
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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Quiz API Server', status: 'running', features: ['Quiz', 'Auth', 'ML'] });
});

// Routes
app.use('/auth', authRoutes);
app.use('/api', quizRoutes);
app.use('/api/results', resultsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running', timestamp: new Date() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

// Only start server if not in serverless environment
if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Features: Quiz API, Authentication, ML Integration`);
  });
}

// Export app for serverless deployment
module.exports = app;
