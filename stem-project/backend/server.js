require('dotenv').config();
const express = require('express');
const cors = require('cors');
const quizRoutes = require('./routes/quiz');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', quizRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Only start server if not in serverless environment
if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export app for serverless deployment
module.exports = app;
