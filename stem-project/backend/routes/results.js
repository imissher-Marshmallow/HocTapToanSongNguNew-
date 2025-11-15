const express = require('express');
const jwt = require('jsonwebtoken');
const { dbHelpers } = require('../database');
const { analyzeQuiz } = require('../ai/analyzer');

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

    // Initialize result save with placeholder score (will be updated with AI analysis)
    const totalQuestions = answers.length;
    let resultId = null;
    let placeholderScore = 0; // placeholder - will be updated after analyzer runs
    
    try {
      resultId = await dbHelpers.saveResult(
        finalUserId,
        quizId,
        placeholderScore,
        totalQuestions,
        answers,
        [], // will be filled by AI
        {}, // will be filled by AI
        {}  // will be filled by AI
      );
      console.log(`[Results] Saved placeholder result ${resultId}`);
    } catch (dbErr) {
      console.warn('[Results] Failed to save initial result:', dbErr.message);
      // Continue anyway - we'll still analyze and return result
    }

    // Call AI analyzer (local Node.js - no external service)
    // ✅ Uses OpenAI directly, Vercel-ready, <5s execution
    const analyzerPayload = {
      userId: finalUserId,
      quizId,
      answers,
      questions: questions || []
    };

    let aiResult = null;
    try {
      // ✅ Local analyzer: Now uses OpenAI SDK directly (no Python service)
      aiResult = await analyzeQuiz(analyzerPayload);
      console.log('[Results] Local analyzer completed successfully');
    } catch (err) {
      console.error('[Results] Local analyzer failed:', err.message);
      // Fallback response
      aiResult = {
        score: 0,
        performanceLabel: 'Không xác định',
        weakAreas: [],
        feedback: [],
        recommendations: [],
        summary: null,
        motivationalFeedback: null
      };
    }

    // Extract actual score from AI analyzer (coerce to number)
    const actualScore = Number(aiResult.score) || 0;
    const weakAreas = aiResult.weakAreas || [];
    const summary = aiResult.summary || {};

    // Debug logging: show values we'll save
    console.log('[Results] debug values:', {
      finalUserId,
      quizId,
      answersLength: Array.isArray(answers) ? answers.length : 0,
      resultId,
      placeholderScore,
      aiScore: aiResult && typeof aiResult.score !== 'undefined' ? aiResult.score : null
    });

    // Update result with AI-generated score and analysis
    if (resultId && aiResult) {
      try {
        // Save AI analysis first
        await dbHelpers.saveAIAnalysis(resultId, aiResult);
        console.log(`[Results] Saved AI analysis for result ${resultId}`);

        // Update score and weak_areas in results table using dbHelpers.updateResult
        try {
          await dbHelpers.updateResult(resultId, {
            score: actualScore,
            weakAreas,
            feedback: summary,
            recommendations: aiResult.recommendations || []
          });
          console.log(`[Results] Updated result ${resultId} with score ${actualScore}`);
        } catch (updErr) {
          console.warn('[Results] Failed to update score via dbHelpers.updateResult:', updErr.message);
        }

        // Generate and save learning plan from the AI summary
        if (summary && summary.plan && Array.isArray(summary.plan) && summary.plan.length > 0) {
          try {
            for (let dayNum = 1; dayNum <= Math.min(summary.plan.length, 5); dayNum++) {
              const planItem = summary.plan[dayNum - 1];
              const topics = (planItem && planItem.step) ? [planItem.step] : [];
              const exercises = (planItem && planItem.action) ? [planItem.action] : [];
              
              await dbHelpers.saveLearningPlan(resultId, finalUserId, dayNum, topics, exercises);
            }
            console.log(`[Results] Saved ${Math.min(summary.plan.length, 5)} learning plan days for result ${resultId}`);
          } catch (planErr) {
            console.warn('[Results] Failed to save learning plan:', planErr.message);
          }
        }

      } catch (updateErr) {
        console.error('[Results] Failed to update result with AI data:', updateErr.message);
      }
    }

    // Build answer comparison from questions
    const answerComparison = answers.map((answer) => {
      const question = questions?.find(q => q.id === answer.questionId);
      if (!question) return null;
      return {
        questionId: answer.questionId,
        question: question.content || question.question,
        userAnswer: answer.selectedOption,
        correctAnswer: question.options[question.answerIndex],
        isCorrect: question.options.indexOf(answer.selectedOption) === question.answerIndex,
        explanation: question.explanation || ''
      };
    }).filter(x => x !== null);

    // Return comprehensive result to frontend
    const fullResult = {
      resultId,
      score: actualScore,
      totalQuestions,
      percentage: totalQuestions > 0 ? Math.round((actualScore / totalQuestions) * 100) : 0,
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
