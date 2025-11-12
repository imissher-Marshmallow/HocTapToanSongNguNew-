const express = require('express');
const jwt = require('jsonwebtoken');
const { dbHelpers } = require('../database');
const { analyzeQuiz } = require('../ai/analyzer');
const axios = require('axios');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware to extract and verify JWT token
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    // For now, allow anonymous (use default userId)
    req.userId = 'anonymous';
    return next();
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
  } catch (err) {
    req.userId = 'anonymous';
  }
  next();
};

// POST /api/results - Store exam result and trigger AI analysis
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { userId, quizId, answers, questions } = req.body;
    const finalUserId = userId || req.userId || 'anonymous';

    if (!quizId || !answers || !Array.isArray(answers)) {
      return res.status(400).json({ error: 'Missing required fields: quizId, answers' });
    }

    // Calculate score (number of correct answers)
    let score = 0;
    const answerComparison = [];
    
    answers.forEach((answer) => {
      const question = questions?.find(q => q.id === answer.questionId);
      if (question) {
        const selectedIndex = question.options.indexOf(answer.selectedOption);
        const isCorrect = selectedIndex === question.answerIndex;
        if (isCorrect) score++;
        
        answerComparison.push({
          questionId: answer.questionId,
          question: question.content,
          userAnswer: answer.selectedOption,
          correctAnswer: question.options[question.answerIndex],
          isCorrect,
          explanation: question.explanation || ''
        });
      }
    });

    // Save initial result to database
    const totalQuestions = answers.length;
    const resultId = await dbHelpers.saveResult(
      finalUserId,
      quizId,
      score,
      totalQuestions,
      answers,
      [], // will be filled by AI
      [], // will be filled by AI
      []  // will be filled by AI
    );

    // Call AI analyzer to get detailed feedback
    const analyzerPayload = {
      userId: finalUserId,
      quizId,
      answers,
      questions: questions || []
    };

    let aiResult = null;
    try {
      // Try external AI engine first (Python FastAPI at port 8000)
      const aiEngineUrl = process.env.AI_ENGINE_URL || 'http://localhost:8000/analyze';
      const resp = await axios.post(aiEngineUrl, analyzerPayload, { timeout: 15000 });
      aiResult = resp.data;
      console.log('ai_engine responded successfully');

      // If AI returned an error marker (e.g., invalid OPENAI key), merge gracefully
      if (aiResult && aiResult.error && aiResult.error.code === 401) {
        console.warn('ai_engine indicated LLM auth error:', aiResult.error.message);
        // Call local analyzer but preserve ai_result fields where available
        const local = await analyzeQuiz(analyzerPayload);
        // Merge without overwriting non-empty fields from local analyzer
        aiResult = Object.assign({}, local, aiResult);
      }
    } catch (err) {
      console.warn('ai_engine call failed, falling back to local analyzer:', err && err.message ? err.message : err);
      // Fallback to the local JS analyzer
      try {
        aiResult = await analyzeQuiz(analyzerPayload);
      } catch (innerErr) {
        console.error('local analyzer also failed:', innerErr);
        aiResult = {
          score: score,
          performanceLabel: 'Không xác định',
          weakAreas: [],
          feedback: [],
          recommendations: [],
          summary: null,
          motivationalFeedback: null
        };
      }
    }

    // Save AI analysis back to database
    await dbHelpers.saveAIAnalysis(resultId, aiResult);

    // Return comprehensive result to frontend
    const fullResult = {
      resultId,
      score,
      totalQuestions,
      percentage: Math.round((score / totalQuestions) * 100),
      answerComparison,
      ...aiResult // includes summary, feedback, recommendations, weakAreas
    };

    res.json(fullResult);
  } catch (error) {
    console.error('Error saving result:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// GET /api/results/:resultId - Retrieve a specific result
router.get('/:resultId', authMiddleware, async (req, res) => {
  try {
    const { resultId } = req.params;
    const result = await dbHelpers.getResultById(resultId);
    
    if (!result) {
      return res.status(404).json({ error: 'Result not found' });
    }

    // Verify user owns this result (if userId check is implemented)
    // if (result.user_id !== req.userId) { return res.status(403).json({ error: 'Unauthorized' }); }

    // Parse JSON fields
    result.answers = JSON.parse(result.answers || '[]');
    result.weak_areas = JSON.parse(result.weak_areas || '[]');
    result.feedback = JSON.parse(result.feedback || '[]');
    result.recommendations = JSON.parse(result.recommendations || '[]');
    result.ai_analysis = JSON.parse(result.ai_analysis || '{}');

    res.json(result);
  } catch (error) {
    console.error('Error fetching result:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// GET /api/results - Get all results for a user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId || 'anonymous';
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    
    const results = await dbHelpers.getUserResults(userId, limit);
    
    // Parse JSON fields for each result
    const parsedResults = results.map(r => ({
      ...r,
      answers: JSON.parse(r.answers || '[]'),
      weak_areas: JSON.parse(r.weak_areas || '[]'),
      feedback: JSON.parse(r.feedback || '[]'),
      recommendations: JSON.parse(r.recommendations || '[]'),
      ai_analysis: JSON.parse(r.ai_analysis || '{}')
    }));

    res.json(parsedResults);
  } catch (error) {
    console.error('Error fetching results:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

module.exports = router;
