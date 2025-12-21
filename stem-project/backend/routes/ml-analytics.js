/**
 * ML Analytics API Routes
 * 
 * Endpoints:
 *  POST   /api/ml/analyze       - Run full ML analysis on quiz results
 *  GET    /api/ml/profile/:userId  - Get student's ML profile with weaknesses, strengths
 *  GET    /api/ml/weaknesses/:userId - Get student's weaknesses (điểm yếu)
 *  GET    /api/ml/strengths/:userId  - Get student's strengths (điểm mạnh)
 *  GET    /api/ml/learning-path/:userId - Get active learning path
 */

const express = require('express');
const router = express.Router();
const MLAnalyticsService = require('../ai/MLAnalyticsService');

/**
 * POST /api/ml/analyze
 * Run complete ML analysis pipeline on quiz results
 */
router.post('/analyze', async (req, res) => {
  try {
    const { userId, quizId, quizData, userAnswers } = req.body;
    
    if (!userId || !quizId || !quizData || !userAnswers) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, quizId, quizData, userAnswers'
      });
    }
    
    // Initialize service with database pool
    const { pool } = require('../database');
    const mlService = new MLAnalyticsService(pool);
    
    // Run analysis and store to PostgreSQL
    const result = await mlService.analyzeAndStore(
      userId,
      quizId,
      quizData,
      userAnswers
    );
    
    res.json({
      success: true,
      message: 'ML analysis completed and stored',
      data: result.analysis
    });
    
  } catch (error) {
    console.error('ML Analyze Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/ml/profile/:userId
 * Get complete student ML profile with analysis history
 */
router.get('/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const { pool } = require('../database');
    const mlService = new MLAnalyticsService(pool);
    
    const profile = await mlService.getStudentProfile(userId);
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Student profile not found'
      });
    }
    
    res.json({
      success: true,
      data: profile
    });
    
  } catch (error) {
    console.error('Get Profile Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/ml/weaknesses/:userId
 * Get student's weaknesses (điểm yếu)
 */
router.get('/weaknesses/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    
    const { pool } = require('../database');
    const mlService = new MLAnalyticsService(pool);
    
    const weaknesses = await mlService.getStudentWeaknesses(userId, limit);
    
    res.json({
      success: true,
      data: weaknesses,
      count: weaknesses.length
    });
    
  } catch (error) {
    console.error('Get Weaknesses Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/ml/strengths/:userId
 * Get student's strengths (điểm mạnh)
 */
router.get('/strengths/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    
    const { pool } = require('../database');
    const mlService = new MLAnalyticsService(pool);
    
    const strengths = await mlService.getStudentStrengths(userId, limit);
    
    res.json({
      success: true,
      data: strengths,
      count: strengths.length
    });
    
  } catch (error) {
    console.error('Get Strengths Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/ml/learning-path/:userId
 * Get student's active learning path
 */
router.get('/learning-path/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const { pool } = require('../database');
    const mlService = new MLAnalyticsService(pool);
    
    const learningPath = await mlService.getActiveLearningPath(userId);
    
    if (!learningPath) {
      return res.status(404).json({
        success: false,
        error: 'No active learning path found'
      });
    }
    
    res.json({
      success: true,
      data: learningPath
    });
    
  } catch (error) {
    console.error('Get Learning Path Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/ml/resolve-weakness/:weaknessId
 * Mark weakness as resolved
 */
router.post('/resolve-weakness/:weaknessId', async (req, res) => {
  try {
    const { weaknessId } = req.params;
    
    const { pool } = require('../database');
    const mlService = new MLAnalyticsService(pool);
    
    await mlService.resolveWeakness(weaknessId);
    
    res.json({
      success: true,
      message: 'Weakness marked as resolved'
    });
    
  } catch (error) {
    console.error('Resolve Weakness Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
